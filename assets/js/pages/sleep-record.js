/**
 * sleep-record.js — หน้าบันทึกการนอนหลับ
 * - dslp_total_hours / dslp_eval_result / dslp_quality_score คำนวณฝั่ง server ทั้งหมด (ดู API_SPEC.md §9)
 * - ฟอร์มคำนวณค่าพรีวิวฝั่ง client เหมือนกันไว้แสดงสดระหว่างกรอก แต่ค่าจริงมาจาก response เท่านั้น
 * - เชื่อม SoyDeeAPI (assets/js/shared/api.js) จริง — ไม่มี mock/localStorage อีกต่อไป
 *
 * หมายเหตุ: toggleTheme() และ showConfirm() มาจาก assets/js/app.js (โหลดคู่กันเสมอ)
 */

/* ==============================================================================
   1. ระบบภาษา (i18n) — pattern เดียวกับ profile.js
   ============================================================================== */
const SLEEP_I18N = {
    th: {
        'page-title': 'บันทึกการนอนหลับ',
        'hero-label': 'ระยะเวลาการนอนหลับรวม',
        'eval-pending': 'กรอกเวลาเพื่อประเมิน',
        'eval-low': 'นอนน้อยไป',
        'eval-ok': 'นอนพอดี',
        'eval-high': 'นอนมากไป',
        'label-date': 'วันที่บันทึกการนอน',
        'label-start': '🌙 เวลาที่เริ่มนอน',
        'label-end': '☀️ เวลาที่ตื่นนอน',
        'err-time-order': 'เวลาตื่นนอนต้องอยู่หลังเวลาที่เริ่มนอน',
        'err-save': 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
        'label-quality': 'คุณภาพการนอน (ประเมินอัตโนมัติ)',
        'quality-bad': 'แย่',
        'quality-mid': 'ปานกลาง',
        'quality-good': 'ดี',
        'save-btn': 'บันทึกการนอนหลับ',
        'save-btn-success': 'บันทึกแล้ว ✓',
        'history-title': 'ประวัติการนอนล่าสุด',
        'history-subtitle': '7 วันล่าสุด',
        'history-empty': 'ยังไม่มีประวัติการนอนหลับ เริ่มบันทึกคืนนี้ได้เลย',
        'toast-saved': 'บันทึกการนอนหลับแล้ว'
    },
    en: {
        'page-title': 'Sleep Record',
        'hero-label': 'Total sleep duration',
        'eval-pending': 'Fill in the times to see your result',
        'eval-low': 'Too little sleep',
        'eval-ok': 'Good amount',
        'eval-high': 'Too much sleep',
        'label-date': 'Sleep date',
        'label-start': '🌙 Bedtime',
        'label-end': '☀️ Wake-up time',
        'err-time-order': 'Wake-up time must be after bedtime',
        'err-save': 'Failed to save, please try again',
        'label-quality': 'Sleep quality (auto-assessed)',
        'quality-bad': 'Poor',
        'quality-mid': 'Fair',
        'quality-good': 'Good',
        'save-btn': 'Save sleep record',
        'save-btn-success': 'Saved ✓',
        'history-title': 'Recent sleep history',
        'history-subtitle': 'Last 7 days',
        'history-empty': 'No sleep records yet — start logging tonight',
        'toast-saved': 'Sleep record saved'
    }
};

function getLang() {
    try { return localStorage.getItem('lang') || 'th'; } catch (e) { return 'th'; }
}

function t(key) {
    const dict = SLEEP_I18N[getLang()] || SLEEP_I18N.th;
    return dict[key] !== undefined ? dict[key] : key;
}

function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (SLEEP_I18N.th[key] === undefined) return;
        // ไม่ทับข้อความที่ JS คำนวณ/เซ็ตสถานะไว้อยู่แล้ว (badge/ปุ่ม/error ระหว่างสถานะพิเศษ)
        if (el.dataset.i18nLock === '1') return;
        el.textContent = t(key);
    });
}

/* ==============================================================================
   2. ค่าคงที่ & Helper คำนวณการนอน (ใช้พรีวิวฝั่ง client เท่านั้น — ตรงกับ logic ฝั่ง server)
   ============================================================================== */
const SLEEP_THRESHOLDS = { low: 6, high: 9 }; // < 6 ชม. = น้อยไป, > 9 ชม. = มากไป
const EVAL_KEY_BY_RESULT = { 1: 'low', 2: 'ok', 3: 'high' };

function toLocalInputValue(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTH(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short', year: getLang() === 'en' ? 'numeric' : '2-digit' });
}

function formatTime(dt) {
    const pad = n => String(n).padStart(2, '0');
    return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/**
 * รวม "วันที่บันทึก" (= วันที่ตื่น) กับเวลาที่เริ่มนอน/ตื่นนอน (input type="time") เป็น Date จริง
 * ถ้าเวลาเริ่มนอน > เวลาตื่นนอน ถือว่าเริ่มนอนคืนก่อนหน้าวันที่บันทึกโดยอัตโนมัติ (ตรงกับตัวอย่างใน API_SPEC.md §9)
 */
function buildSleepDates(dateStr, startTimeStr, endTimeStr) {
    if (!dateStr || !startTimeStr || !endTimeStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const end = new Date(y, m - 1, d, eh, em, 0, 0);
    const start = new Date(y, m - 1, d, sh, sm, 0, 0);
    if (start > end) start.setDate(start.getDate() - 1);
    return { start, end };
}

/** คืนค่า { hours, evalKey } จากช่วงเวลาเริ่มนอน-ตื่นนอน (พรีวิวฝั่ง client ก่อนกด save) */
function computeSleepStats(startVal, endVal) {
    if (!startVal || !endVal) return null;
    const start = new Date(startVal);
    const end = new Date(endVal);
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs <= 0) return { invalid: true };

    const hours = diffMs / 3600000;
    let evalKey = 'ok';
    if (hours < SLEEP_THRESHOLDS.low) evalKey = 'low';
    else if (hours > SLEEP_THRESHOLDS.high) evalKey = 'high';

    return { hours, evalKey, invalid: false };
}

/** แปลง record จาก API (dslp_*) ให้เป็นรูปแบบที่ใช้ใน UI */
function normalizeRecord(raw) {
    return {
        id: raw.dslp_id,
        date: raw.dslp_date ? String(raw.dslp_date).slice(0, 10) : '',
        start: new Date(raw.dslp_start_time),
        end: new Date(raw.dslp_end_time),
        hours: raw.dslp_total_hours,
        evalResult: raw.dslp_eval_result,
        qualityScore: raw.dslp_quality_score
    };
}

/* ==============================================================================
   3. State
   ============================================================================== */
let sleepHistory = [];
let editingRecordId = null;   // dslp_id ที่กำลังแก้ไข — null = กำลังจะสร้างรายการใหม่
let editingRecordDate = null; // วันที่ของ record ที่กำลังแก้ไข (เทียบกับ #sleepDate เพื่อรู้ว่าออกจากโหมดแก้ไขหรือยัง)

/* ==============================================================================
   4. Quality pill — เป็น read-only indicator (dslp_quality_score คำนวณฝั่ง server เท่านั้น)
   ============================================================================== */
function setQualityIndicator(score) {
    document.querySelectorAll('.quality-pill').forEach(p => {
        const match = Number(p.dataset.quality) === score;
        p.classList.toggle('active', match);
        p.setAttribute('aria-checked', match ? 'true' : 'false');
    });
}

/* ==============================================================================
   5. Render ประวัติการนอน (7 วันล่าสุด)
   ============================================================================== */
function renderHistory() {
    const list = document.getElementById('sleepHistoryList');
    const empty = document.getElementById('sleepHistoryEmpty');
    if (!list) return;

    list.innerHTML = '';

    if (sleepHistory.length === 0) {
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    const tagClassByEval = { low: 'tag-low', ok: 'tag-ok', high: 'tag-high' };

    sleepHistory.forEach(item => {
        const evalKey = EVAL_KEY_BY_RESULT[item.evalResult] || 'ok';
        const el = document.createElement('div');
        el.className = 'history-item';
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.innerHTML = `
            <div class="history-item-icon" aria-hidden="true">💤</div>
            <div class="history-item-body">
                <div class="history-item-date">${formatDateTH(item.date)}</div>
                <div class="history-item-time">${formatTime(item.start)} – ${formatTime(item.end)}</div>
            </div>
            <div class="history-item-meta">
                <div class="history-item-hours numeric">${item.hours.toFixed(1)} ${getLang() === 'en' ? 'hrs' : 'ชม.'}</div>
                <span class="history-item-tag ${tagClassByEval[evalKey]}">${t('eval-' + evalKey)}</span>
            </div>
        `;
        // แตะรายการเก่าเพื่อโหลดเข้าฟอร์มแล้วแก้ไข (PUT) แทนการสร้างใหม่
        el.addEventListener('click', () => loadRecordIntoForm(item));
        list.appendChild(el);
    });
}

function loadRecordIntoForm(item) {
    document.getElementById('sleepDate').value = item.date;
    document.getElementById('sleepStart').value = formatTime(item.start);
    document.getElementById('sleepEnd').value = formatTime(item.end);
    editingRecordId = item.id;
    editingRecordDate = item.date;
    document.getElementById('sleepTimeError').hidden = true;
    applyRecordToUI(item);
}

/* ==============================================================================
   6. อัปเดต Hero card แบบสด ตามค่าที่กรอกในฟอร์ม (พรีวิวฝั่ง client)
   ============================================================================== */
function updateHero() {
    const dateInput = document.getElementById('sleepDate');
    const startInput = document.getElementById('sleepStart');
    const endInput = document.getElementById('sleepEnd');
    const valueEl = document.getElementById('sleepDurationValue');
    const badge = document.getElementById('sleepEvalBadge');
    const badgeText = document.getElementById('sleepEvalText');
    const errorEl = document.getElementById('sleepTimeError');

    const range = buildSleepDates(dateInput.value, startInput.value, endInput.value);
    const stats = range ? computeSleepStats(range.start, range.end) : null;

    if (!stats) {
        valueEl.innerHTML = `–.– <small>${getLang() === 'en' ? 'hrs' : 'ชม.'}</small>`;
        badge.dataset.eval = '';
        badgeText.textContent = t('eval-pending');
        errorEl.hidden = true;
        return;
    }

    if (stats.invalid) {
        valueEl.innerHTML = `–.– <small>${getLang() === 'en' ? 'hrs' : 'ชม.'}</small>`;
        badge.dataset.eval = '';
        badgeText.textContent = t('eval-pending');
        errorEl.hidden = false;
        return;
    }

    errorEl.hidden = true;
    valueEl.innerHTML = `${stats.hours.toFixed(1)} <small>${getLang() === 'en' ? 'hrs' : 'ชม.'}</small>`;
    badge.dataset.eval = stats.evalKey;
    badgeText.textContent = t('eval-' + stats.evalKey);
}

/** อัปเดต hero + quality pill ด้วยค่าจริงจาก server (หลัง save สำเร็จ หรือโหลด record ที่มีอยู่แล้ว) */
function applyRecordToUI(record) {
    if (!record) {
        setQualityIndicator(null);
        return;
    }
    const valueEl = document.getElementById('sleepDurationValue');
    const badge = document.getElementById('sleepEvalBadge');
    const badgeText = document.getElementById('sleepEvalText');
    const unit = getLang() === 'en' ? 'hrs' : 'ชม.';

    valueEl.innerHTML = `${Number(record.hours).toFixed(1)} <small>${unit}</small>`;
    const evalKey = EVAL_KEY_BY_RESULT[record.evalResult] || '';
    badge.dataset.eval = evalKey;
    badgeText.textContent = evalKey ? t('eval-' + evalKey) : t('eval-pending');
    setQualityIndicator(record.qualityScore);
}

/* ==============================================================================
   7. เชื่อม API จริง
   ============================================================================== */
function todayDateStr() {
    return toLocalInputValue(new Date()).slice(0, 10);
}

function dateStrOffset(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    return toLocalInputValue(d).slice(0, 10);
}

/** โหลด record ของวันนี้ (ถ้ามี) มา prefill ฟอร์ม + hero การ์ด */
async function loadTodayRecord(mbId) {
    try {
        const records = await SoyDeeAPI.request(`/members/${mbId}/sleep-records`, { query: { date: todayDateStr() } });
        if (Array.isArray(records) && records.length > 0) {
            const record = normalizeRecord(records[0]);
            document.getElementById('sleepStart').value = formatTime(record.start);
            document.getElementById('sleepEnd').value = formatTime(record.end);
            editingRecordId = record.id;
            editingRecordDate = record.date;
            applyRecordToUI(record);
        }
    } catch (err) {
        console.error('loadTodayRecord failed', err);
    }
}

/** ไม่มี endpoint list ช่วงวันที่สำหรับ sleep-records (มีแค่ ?date= รายวัน ตาม API_SPEC.md §9)
 *  เลยยิง GET แยกทีละวันย้อนหลัง 7 วันแบบขนาน แล้วรวมผลลัพธ์เอา */
async function loadHistory(mbId) {
    const dates = Array.from({ length: 7 }, (_, i) => dateStrOffset(i));
    const results = await Promise.all(dates.map(d =>
        SoyDeeAPI.request(`/members/${mbId}/sleep-records`, { query: { date: d } }).catch(() => [])
    ));
    sleepHistory = results
        .filter(r => Array.isArray(r))
        .flat()
        .map(normalizeRecord)
        .sort((a, b) => b.start - a.start);
    renderHistory();
}

async function handleSave() {
    const dateInput = document.getElementById('sleepDate');
    const startInput = document.getElementById('sleepStart');
    const endInput = document.getElementById('sleepEnd');
    const errorEl = document.getElementById('sleepTimeError');
    const saveBtn = document.getElementById('saveSleepBtn');

    const range = buildSleepDates(dateInput.value, startInput.value, endInput.value);
    const stats = range ? computeSleepStats(range.start, range.end) : null;
    if (!stats || stats.invalid) {
        delete errorEl.dataset.i18nLock;
        errorEl.textContent = t('err-time-order');
        errorEl.hidden = false;
        return;
    }
    errorEl.hidden = true;

    const mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;

    const payload = {
        dslp_date: dateInput.value,
        dslp_start_time: range.start.toISOString(),
        dslp_end_time: range.end.toISOString()
    };

    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;

    try {
        const path = editingRecordId
            ? `/members/${mbId}/sleep-records/${editingRecordId}`
            : `/members/${mbId}/sleep-records`;
        const data = await SoyDeeAPI.request(path, { method: editingRecordId ? 'PUT' : 'POST', body: payload });

        // fallback ใส่ date/start/end ที่ส่งไปเอง เผื่อ response ไม่ส่งกลับมาครบ (ดูตัวอย่าง response ใน API_SPEC.md §9)
        const record = normalizeRecord(Object.assign({}, payload, data));
        editingRecordId = record.id;
        editingRecordDate = record.date;
        applyRecordToUI(record);

        saveBtn.dataset.i18nLock = '1';
        saveBtn.textContent = t('save-btn-success');
        setTimeout(() => {
            saveBtn.textContent = originalText;
            delete saveBtn.dataset.i18nLock;
            saveBtn.disabled = false;
        }, 1500);

        await loadHistory(mbId);
        showToast(t('toast-saved'), 'success');
    } catch (err) {
        errorEl.dataset.i18nLock = '1';
        errorEl.textContent = (err && err.message) || t('err-save');
        errorEl.hidden = false;
        saveBtn.disabled = false;
        showToast(errorEl.textContent, 'error');
    }
}

/* ==============================================================================
   8. Init เมื่อโหลดหน้า
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    applyI18n();

    const dateInput = document.getElementById('sleepDate');
    const startInput = document.getElementById('sleepStart');
    const endInput = document.getElementById('sleepEnd');

    dateInput.value = todayDateStr();
    dateInput.max = todayDateStr(); // ห้ามบันทึกล่วงหน้า เลือกได้ไม่เกินวันนี้
    startInput.value = '23:00';
    endInput.value = '07:00';

    // pill คุณภาพการนอนไม่ให้กดเลือกเองแล้ว (server คำนวณ dslp_quality_score จากชั่วโมงนอนเท่านั้น)
    const qualityPillGroup = document.querySelector('.quality-pill-group');
    if (qualityPillGroup) qualityPillGroup.setAttribute('aria-disabled', 'true');
    document.querySelectorAll('.quality-pill').forEach(p => {
        p.disabled = true;
        p.setAttribute('aria-disabled', 'true');
    });
    setQualityIndicator(null);

    updateHero();

    function onDateChanged() {
        if (dateInput.value !== editingRecordDate) {
            editingRecordId = null;
            editingRecordDate = null;
            setQualityIndicator(null);
        }
        updateHero();
    }
    dateInput.addEventListener('change', onDateChanged);
    dateInput.addEventListener('input', onDateChanged);
    [startInput, endInput].forEach(input => {
        input.addEventListener('change', updateHero);
        input.addEventListener('input', updateHero);
    });

    document.getElementById('saveSleepBtn').addEventListener('click', handleSave);

    const mbId = SoyDeeAPI.session.getUserId();
    if (mbId) {
        await loadTodayRecord(mbId);
        await loadHistory(mbId);
    }
});
