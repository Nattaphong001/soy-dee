/**
 * sleep-record.js — หน้าบันทึกการนอนหลับ
 * - dslp_total_hours / dslp_eval_result คำนวณฝั่ง server ทั้งหมด (ดู API_SPEC.md §9)
 * - dslp_quality_score ผู้ใช้เลือกเอง (pill แย่/ปานกลาง/ดี) — ส่งไปพร้อม payload ทุกครั้ง (§2.6)
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
        'today-btn': 'วันนี้',
        'label-start': 'เวลาที่เริ่มนอน',
        'label-end': 'เวลาที่ตื่นนอน',
        'err-time-order': 'เวลาตื่นนอนต้องอยู่หลังเวลาที่เริ่มนอน',
        'err-save': 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
        'label-quality': 'คุณภาพการนอน (เลือกเอง)',
        'quality-bad': 'แย่',
        'quality-mid': 'ปานกลาง',
        'quality-good': 'ดี',
        'save-btn': 'บันทึกการนอนหลับ',
        'save-btn-success': 'บันทึกแล้ว ✓',
        'history-title': 'ประวัติการนอนล่าสุด',
        'history-subtitle': '7 วันล่าสุด',
        'history-empty': 'ยังไม่มีประวัติการนอนหลับ เริ่มบันทึกคืนนี้ได้เลย',
        'toast-saved': 'บันทึกการนอนหลับแล้ว',
        'delete-title': 'ลบบันทึกการนอน',
        'delete-message': 'ต้องการลบบันทึกการนอนนี้ออกจากประวัติใช่หรือไม่?',
        'delete-confirm': 'ลบรายการ',
        'btn-cancel': 'ยกเลิก',
        'toast-deleted': 'ลบบันทึกการนอนแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่',
        'btn-edit-record': 'แก้ไขข้อมูล',
        'cancel-edit-btn': 'ยกเลิกการแก้ไข'
    },
    en: {
        'page-title': 'Sleep Record',
        'hero-label': 'Total sleep duration',
        'eval-pending': 'Fill in the times to see your result',
        'eval-low': 'Too little sleep',
        'eval-ok': 'Good amount',
        'eval-high': 'Too much sleep',
        'today-btn': 'Today',
        'label-start': 'Bedtime',
        'label-end': 'Wake-up time',
        'err-time-order': 'Wake-up time must be after bedtime',
        'err-save': 'Failed to save, please try again',
        'label-quality': 'Sleep quality (self-assessed)',
        'quality-bad': 'Poor',
        'quality-mid': 'Fair',
        'quality-good': 'Good',
        'save-btn': 'Save sleep record',
        'save-btn-success': 'Saved ✓',
        'history-title': 'Recent sleep history',
        'history-subtitle': 'Last 7 days',
        'history-empty': 'No sleep records yet — start logging tonight',
        'toast-saved': 'Sleep record saved',
        'delete-title': 'Delete sleep record',
        'delete-message': 'Delete this sleep record from your history?',
        'delete-confirm': 'Delete',
        'btn-cancel': 'Cancel',
        'toast-deleted': 'Sleep record deleted',
        'toast-delete-failed': 'Failed to delete — please try again',
        'btn-edit-record': 'Edit record',
        'cancel-edit-btn': 'Cancel edit'
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
const SLEEP_THRESHOLDS = { low: 7, high: 9 }; // < 7 ชม. = น้อยไป, > 9 ชม. = มากไป (§2.6)
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

function dateKey(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
let selectedDate = new Date(); // วันที่กำลังดู/บันทึกอยู่ — ควบคุมด้วยปฏิทิน dropdown (datePickerPill)
let sleepHistory = [];
let editingRecordId = null;   // dslp_id ของ record ที่มีอยู่แล้วในวันที่เลือก — null = ยังไม่มี ต้องสร้างใหม่
let selectedQuality = 3;      // dslp_quality_score ที่ผู้ใช้เลือกเอง (1=แย่ 2=ปานกลาง 3=ดี) — ห้ามคำนวณจากชั่วโมง (§2.6)
let sleepDatePicker = null;
let sleepMode = 'add';        // 'add' (ยังไม่มี record ของวันนี้) | 'view' (มีแล้ว ดูรายละเอียด) | 'edit' (กำลังแก้ไข record ที่มีอยู่)
const QUALITY_KEY_BY_SCORE = { 1: 'quality-bad', 2: 'quality-mid', 3: 'quality-good' };

/** สลับมุมมอง view (การ์ดอ่านอย่างเดียว) / add-edit (ฟอร์มกรอก) ตาม sleepMode */
function renderSleepMode() {
    const viewCard = document.getElementById('sleepViewCard');
    const editSection = document.getElementById('sleepEditSection');
    const cancelBtn = document.getElementById('sleepCancelEditBtn');
    if (!viewCard || !editSection) return;

    viewCard.hidden = sleepMode !== 'view';
    editSection.hidden = sleepMode === 'view';
    if (cancelBtn) cancelBtn.hidden = sleepMode !== 'edit';
}

/** เติมค่าลงการ์ดดูรายละเอียดจาก record ปัจจุบัน */
function renderSleepViewCard(record) {
    document.getElementById('sleepViewStart').textContent = formatTime(record.start);
    document.getElementById('sleepViewEnd').textContent = formatTime(record.end);
    const qKey = QUALITY_KEY_BY_SCORE[record.qualityScore] || 'quality-good';
    document.getElementById('sleepViewQuality').textContent = t(qKey);
}

/* ==============================================================================
   4. Quality pill — ผู้ใช้เลือกเอง (dslp_quality_score ไม่ใช่ค่าที่ server คำนวณ — §2.6)
   ============================================================================== */
function setQualityIndicator(score) {
    document.querySelectorAll('.quality-pill').forEach(p => {
        const match = Number(p.dataset.quality) === score;
        p.classList.toggle('active', match);
        p.setAttribute('aria-checked', match ? 'true' : 'false');
    });
}

function selectQuality(score) {
    selectedQuality = score;
    setQualityIndicator(score);
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
        el.innerHTML = `
            <div class="history-item-icon" aria-hidden="true"><i data-icon="sleep"></i></div>
            <div class="history-item-body" role="button" tabindex="0" aria-label="${formatDateTH(item.date)}">
                <div class="history-item-date">${formatDateTH(item.date)}</div>
                <div class="history-item-time">${formatTime(item.start)} – ${formatTime(item.end)}</div>
            </div>
            <div class="history-item-meta">
                <div class="history-item-hours numeric">${item.hours.toFixed(1)} ${getLang() === 'en' ? 'hrs' : 'ชม.'}</div>
                <span class="history-item-tag ${tagClassByEval[evalKey]}">${t('eval-' + evalKey)}</span>
            </div>
            <div class="history-item-actions">
                <button type="button" class="history-item-delete-btn" aria-label="${t('delete-title')}"><i data-icon="trash"></i></button>
            </div>
        `;
        // แตะที่แถวเพื่อกระโดดปฏิทินไปวันนั้น + โหลดค่าของวันนั้นเข้าฟอร์มให้แก้ไขได้ (ดู changeDate)
        const jumpToItemDate = () => changeDate(new Date(item.date + 'T00:00:00'));
        const body = el.querySelector('.history-item-body');
        body.addEventListener('click', jumpToItemDate);
        body.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToItemDate(); }
        });
        el.querySelector('.history-item-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteRecord(item);
        });
        list.appendChild(el);
    });
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
        selectQuality(3);
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
    selectQuality(record.qualityScore || 3);
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

/** โหลด record ของวันที่ที่เลือกอยู่ (ถ้ามี) มา prefill ฟอร์ม + hero การ์ด
 *  ไม่มี record ของวันนั้น -> เคลียร์ฟอร์มพร้อมเวลาแนะนำเริ่มต้น (ไม่ใช่ค่าจริง แค่ช่วยกรอก) */
async function loadRecordForDate(date) {
    const mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;

    try {
        const records = await SoyDeeAPI.request(`/members/${mbId}/sleep-records`, { query: { date: dateKey(date) } });
        if (Array.isArray(records) && records.length > 0) {
            const record = normalizeRecord(records[0]);
            document.getElementById('sleepStart').value = formatTime(record.start);
            document.getElementById('sleepEnd').value = formatTime(record.end);
            editingRecordId = record.id;
            applyRecordToUI(record);
            renderSleepViewCard(record);
            sleepMode = 'view';
        } else {
            editingRecordId = null;
            document.getElementById('sleepStart').value = '23:00';
            document.getElementById('sleepEnd').value = '07:00';
            selectQuality(3);
            sleepMode = 'add';
        }
    } catch (err) {
        console.error('loadRecordForDate failed', err);
        editingRecordId = null;
        sleepMode = 'add';
    }
    renderSleepMode();
    updateHero();
}

/** เปลี่ยนวันที่ที่กำลังดู/บันทึกอยู่ — เรียกจากปฏิทิน dropdown หรือแตะรายการในประวัติ */
async function changeDate(date) {
    selectedDate = new Date(date);
    document.getElementById('sleepDate').value = dateKey(selectedDate);
    document.getElementById('dateText').textContent = formatDateTH(dateKey(selectedDate));
    document.getElementById('sleepTimeError').hidden = true;
    if (sleepDatePicker) sleepDatePicker.refreshTodayBtn();
    await loadRecordForDate(selectedDate);
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

function handleDeleteRecord(item) {
    const mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;
    showConfirm({
        title: t('delete-title'),
        message: t('delete-message'),
        confirmText: t('delete-confirm'),
        cancelText: t('btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${mbId}/sleep-records/${item.id}`, { method: 'DELETE' });
                await loadHistory(mbId);
                if (dateKey(selectedDate) === item.date) await loadRecordForDate(selectedDate);
                showToast(t('toast-deleted'), 'success');
            } catch (err) {
                console.error('delete sleep record failed', err);
                showToast(t('toast-delete-failed'), 'error');
            }
        }
    });
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
        dslp_end_time: range.end.toISOString(),
        dslp_quality_score: selectedQuality
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
        // เก็บ id ไว้เผื่อกดบันทึกซ้ำในวันเดิม (จะเป็นการแก้ไข ไม่ใช่สร้างซ้ำ)
        editingRecordId = record.id;
        applyRecordToUI(record);
        renderSleepViewCard(record);
        sleepMode = 'view';
        renderSleepMode();

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

    const startInput = document.getElementById('sleepStart');
    const endInput = document.getElementById('sleepEnd');

    document.getElementById('sleepDate').value = dateKey(selectedDate);
    document.getElementById('dateText').textContent = formatDateTH(dateKey(selectedDate));

    // pill คุณภาพการนอน — ผู้ใช้เลือกเอง (§2.6), ค่าเริ่มต้น "ดี" ตามที่ตั้งไว้ใน markup
    document.querySelectorAll('.quality-pill').forEach(p => {
        p.addEventListener('click', () => selectQuality(Number(p.dataset.quality)));
    });
    selectQuality(3);

    [startInput, endInput].forEach(input => {
        input.addEventListener('change', updateHero);
        input.addEventListener('input', updateHero);
    });

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js) — เลือกวันย้อนหลังได้
    // (ห้ามอนาคต ด้วย disableFuture default ของ component) เพื่อดู/แก้ไขบันทึกของวันนั้น
    sleepDatePicker = SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => selectedDate,
        onSelect: (date) => changeDate(date)
    });

    document.getElementById('saveSleepBtn').addEventListener('click', handleSave);

    // การ์ดดูรายละเอียด -> กดแก้ไขเพื่อสลับไปฟอร์ม, กดยกเลิกเพื่อกลับไปดูค่าเดิม (ไม่บันทึกที่แก้ค้างไว้)
    document.getElementById('sleepEditBtn').addEventListener('click', () => {
        sleepMode = 'edit';
        renderSleepMode();
    });
    document.getElementById('sleepCancelEditBtn').addEventListener('click', () => {
        loadRecordForDate(selectedDate);
    });

    const mbId = SoyDeeAPI.session.getUserId();
    if (mbId) {
        await loadRecordForDate(selectedDate);
        await loadHistory(mbId);
    }

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back ของเบราว์เซอร์) — DOMContentLoaded ไม่ยิงซ้ำ
    // บันทึกที่เพิ่ง/แก้ไว้เลยค้างจนกว่าจะกด refresh เอง แก้โดยโหลดข้อมูลใหม่ทุกครั้งที่ restore
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        const uid = SoyDeeAPI.session.getUserId();
        if (!uid) return;
        loadRecordForDate(selectedDate);
        loadHistory(uid);
    });
});
