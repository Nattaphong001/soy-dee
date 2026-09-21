/**
 * sleep-record.js — หน้าบันทึกการนอนหลับ
 * - dslp_total_hours / dslp_eval_result คำนวณฝั่ง server ทั้งหมด (ดู API_SPEC.md §9)
 * - dslp_quality_score ผู้ใช้เลือกเอง (แย่/ปานกลาง/ดี) — ส่งไปพร้อม payload ทุกครั้ง (§2.6)
 * - 1 วัน = 1 บันทึก (UNIQUE mb_id+dslp_date): วันที่มีแล้วปุ่ม + จะเปิดฟอร์มแก้ไข (PUT) ไม่ใช่สร้างซ้ำ
 * - ฟอร์มคำนวณค่าพรีวิวฝั่ง client แสดงสดระหว่างกรอก แต่ค่าจริงมาจาก response เท่านั้น
 *
 * โครงหน้าเดียวกับ food-record.js / activity-record.js: การ์ดสรุป → รายการ (กดดูรายละเอียด) → FAB เปิด bottom sheet
 * หมายเหตุ: showConfirm()/showToast() มาจาก assets/js/shared/app.js
 *           ระบบภาษา (i18n) ใช้ window.I18N จาก assets/js/shared/i18n.js
 */

/* ==============================================================================
   0. ระบบภาษา (i18n) — คำแปลของหน้านี้
   ============================================================================== */
const SLEEP_I18N = {
    th: {
        'page-title': 'บันทึกการนอนหลับ',
        'page-subtitle': 'จดเวลานอน แล้วดูว่าพอดีกับที่ร่างกายต้องการไหม',
        'today-btn': 'วันนี้',
        'summary-title-today': 'สรุปการนอนวันนี้',
        'summary-title-date-template': 'สรุปการนอนวันที่ {date}',
        'summary-meter-label': 'ชั่วโมงการนอนเทียบกับช่วงแนะนำ',
        'stat-label-start': 'เริ่มนอน',
        'stat-label-end': 'ตื่นนอน',
        'stat-label-quality': 'คุณภาพ',
        'unit-hour': 'ชม.',
        'unit-night': 'คืน',
        'insight-empty-today': 'ยังไม่ได้บันทึกการนอนของวันนี้ แตะปุ่ม + เพื่อเพิ่ม',
        'insight-empty-date': 'วันนี้ไม่มีบันทึกการนอน แตะปุ่ม + เพื่อเพิ่ม',
        'insight-low': 'นอนน้อยกว่าที่แนะนำ {diff} ชม. ผู้ใหญ่ควรนอน 7–9 ชม. ต่อคืน',
        'insight-ok': 'อยู่ในช่วงที่แนะนำ 7–9 ชม. ต่อคืน ทำได้ดีมาก',
        'insight-high': 'นอนมากกว่าที่แนะนำ {diff} ชม. ผู้ใหญ่ควรนอน 7–9 ชม. ต่อคืน',
        'section-heading-history': 'ประวัติการนอน 7 วัน',
        'empty-state-title': 'ยังไม่มีประวัติการนอนหลับ',
        'empty-state-desc': 'แตะปุ่ม + เพื่อบันทึกการนอนคืนแรก',
        'open-item-label': 'ดูรายละเอียดการนอนวันที่ {date}',
        'eval-pending': 'กรอกเวลาเพื่อประเมิน',
        'eval-low': 'นอนน้อยไป',
        'eval-ok': 'นอนพอดี',
        'eval-high': 'นอนมากไป',
        'quality-bad': 'แย่',
        'quality-mid': 'ปานกลาง',
        'quality-good': 'ดี',
        'modal-title-add': 'บันทึกการนอน',
        'modal-title-edit': 'แก้ไขการนอน',
        'label-start': 'เวลาที่เริ่มนอน',
        'label-end': 'เวลาที่ตื่นนอน',
        'label-quality': 'คุณภาพการนอน (ประเมินด้วยตัวเอง)',
        'btn-cancel': 'ยกเลิก',
        'save-btn': 'บันทึกการนอนหลับ',
        'detail-duration': 'ระยะเวลารวม',
        'detail-quality': 'คุณภาพ (ประเมินเอง)',
        'detail-edit': 'แก้ไขรายการ',
        'detail-delete': 'ลบ',
        'err-time-order': 'เวลาตื่นนอนต้องอยู่หลังเวลาที่เริ่มนอน',
        'err-save': 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
        'delete-title': 'ลบบันทึกการนอน',
        'delete-message-template': 'ต้องการลบบันทึกการนอนวันที่ {date} ออกจากประวัติใช่หรือไม่?',
        'delete-confirm': 'ลบรายการ',
        'toast-added': 'บันทึกการนอนหลับแล้ว',
        'toast-updated': 'แก้ไขการนอนหลับแล้ว',
        'toast-deleted': 'ลบบันทึกการนอนแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่',
        'toast-load-failed': 'โหลดบันทึกการนอนไม่สำเร็จ กรุณาลองใหม่'
    },
    en: {
        'page-title': 'Sleep Record',
        'page-subtitle': 'Log your sleep and see if it matches what your body needs',
        'today-btn': 'Today',
        'summary-title-today': "Today's sleep summary",
        'summary-title-date-template': 'Sleep summary for {date}',
        'summary-meter-label': 'Sleep hours against the recommended range',
        'stat-label-start': 'Bedtime',
        'stat-label-end': 'Wake-up',
        'stat-label-quality': 'Quality',
        'unit-hour': 'hrs',
        'unit-night': 'nights',
        'insight-empty-today': 'No sleep logged today yet — tap + to add',
        'insight-empty-date': 'No sleep record for this day — tap + to add',
        'insight-low': '{diff} hrs below the recommended amount. Adults need 7–9 hrs a night',
        'insight-ok': 'Within the recommended 7–9 hrs a night — well done',
        'insight-high': '{diff} hrs above the recommended amount. Adults need 7–9 hrs a night',
        'section-heading-history': 'Sleep history (7 days)',
        'empty-state-title': 'No sleep records yet',
        'empty-state-desc': 'Tap + to log your first night',
        'open-item-label': 'View sleep details for {date}',
        'eval-pending': 'Fill in the times to see your result',
        'eval-low': 'Too little sleep',
        'eval-ok': 'Good amount',
        'eval-high': 'Too much sleep',
        'quality-bad': 'Poor',
        'quality-mid': 'Fair',
        'quality-good': 'Good',
        'modal-title-add': 'Log sleep',
        'modal-title-edit': 'Edit sleep',
        'label-start': 'Bedtime',
        'label-end': 'Wake-up time',
        'label-quality': 'Sleep quality (self-assessed)',
        'btn-cancel': 'Cancel',
        'save-btn': 'Save sleep record',
        'detail-duration': 'Total duration',
        'detail-quality': 'Quality (self-assessed)',
        'detail-edit': 'Edit entry',
        'detail-delete': 'Delete',
        'err-time-order': 'Wake-up time must be after bedtime',
        'err-save': 'Failed to save, please try again',
        'delete-title': 'Delete sleep record',
        'delete-message-template': 'Delete the sleep record for {date} from your history?',
        'delete-confirm': 'Delete',
        'toast-added': 'Sleep record saved',
        'toast-updated': 'Sleep record updated',
        'toast-deleted': 'Sleep record deleted',
        'toast-delete-failed': 'Failed to delete — please try again',
        'toast-load-failed': 'Failed to load sleep records — please try again'
    }
};

/* ==============================================================================
   1. ค่าคงที่ & State
   ============================================================================== */
const SLEEP_THRESHOLDS = { low: 7, high: 9 };   // < 7 ชม. = น้อยไป, > 9 ชม. = มากไป (§2.6)
const METER_MAX_HOURS = 12;                      // สเกลของแถบสรุป (ตรงกับตำแหน่ง 7/9 ใน CSS)
const HISTORY_DAYS = 7;
const EVAL_KEY_BY_RESULT = { 1: 'low', 2: 'ok', 3: 'high' };
const QUALITY_KEY_BY_SCORE = { 1: 'quality-bad', 2: 'quality-mid', 3: 'quality-good' };

let selectedDate = startOfDay(new Date());       // วันที่กำลังดู/บันทึก (dslp_date = วันที่ตื่น)
let mbId = null;
let sleepRecords = [];                           // บันทึก HISTORY_DAYS วันที่จบที่ selectedDate (ใหม่ → เก่า)
let editingId = null;                            // dslp_id ที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
let sheetDate = '';                              // dslp_date ของฟอร์มที่เปิดอยู่ (YYYY-MM-DD)
let selectedQuality = 3;                         // dslp_quality_score ที่ผู้ใช้เลือกเอง — ห้ามคำนวณจากชั่วโมง (§2.6)
let detailId = null;                             // dslp_id ที่เปิดดูรายละเอียดอยู่
let detailOpener = null;                         // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด
let sleepDatePicker = null;

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ==============================================================================
   2. Helpers
   ============================================================================== */
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseDateKey(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function isToday(d) {
    return dateKey(d) === dateKey(new Date());
}

function formatThaiDate(d) {
    if (I18N.getLang() === 'en') {
        return `${d.getDate()} ${ENGLISH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatTime(dt) {
    if (!(dt instanceof Date) || isNaN(dt.getTime())) return '–';
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function formatHours(h) {
    return Number(h).toFixed(1);
}

function t(key) {
    return I18N.t(SLEEP_I18N, key);
}

function tpl(key, vars) {
    return Object.keys(vars || {}).reduce((s, k) => s.replace(`{${k}}`, vars[k]), t(key));
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML.replace(/"/g, '&quot;');
}

/** ผลประเมินจาก server (1/2/3) → 'low' | 'ok' | 'high' */
function evalKeyOf(record) {
    return record ? (EVAL_KEY_BY_RESULT[record.evalResult] || 'ok') : '';
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
function computeSleepStats(start, end) {
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
        hours: Number(raw.dslp_total_hours),
        evalResult: raw.dslp_eval_result,
        qualityScore: raw.dslp_quality_score
    };
}

function currentRecord() {
    return sleepRecords.find(r => r.date === dateKey(selectedDate)) || null;
}

/* ==============================================================================
   3. Data
   ============================================================================== */
/** ไม่มี endpoint list ช่วงวันที่สำหรับ sleep-records (มีแค่ ?date= รายวัน ตาม API_SPEC.md §9)
 *  เลยยิง GET แยกทีละวัน HISTORY_DAYS วันที่จบที่ selectedDate แบบขนาน แล้วรวมผลลัพธ์ */
async function loadData() {
    const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - i);
        return dateKey(d);
    });
    let failed = 0;
    const results = await Promise.all(dates.map(d =>
        SoyDeeAPI.request(`/members/${mbId}/sleep-records`, { query: { date: d } }).catch(() => { failed++; return []; })
    ));
    if (failed === dates.length) showToast(t('toast-load-failed'), 'error');
    sleepRecords = results
        .filter(r => Array.isArray(r))
        .flat()
        .map(normalizeRecord)
        .sort((a, b) => b.date.localeCompare(a.date));
    renderSummary();
    renderLogList();
}

async function changeDate(newDate) {
    selectedDate = startOfDay(newDate);
    renderDate();
    await loadData();
}

/* ==============================================================================
   4. Render: วันที่ + การ์ดสรุป
   ============================================================================== */
function renderDate() {
    document.getElementById('dateText').textContent = formatThaiDate(selectedDate);
    // ปุ่ม "วันนี้" แสดงเฉพาะตอนดูวันย้อนหลัง — วันนี้อยู่แล้วไม่ต้องมีปุ่มกลับ
    document.getElementById('todayBtn').hidden = isToday(selectedDate);
    if (sleepDatePicker) sleepDatePicker.refreshTodayBtn();
}

function setEvalClass(el, evalKey) {
    el.classList.remove('eval-low', 'eval-ok', 'eval-high');
    if (evalKey) el.classList.add(`eval-${evalKey}`);
}

function renderSummary() {
    const rec = currentRecord();
    const evalKey = evalKeyOf(rec);
    const card = document.getElementById('sleepSummary');
    setEvalClass(card, evalKey);

    document.getElementById('summaryTitleText').textContent = isToday(selectedDate)
        ? t('summary-title-today')
        : tpl('summary-title-date-template', { date: formatThaiDate(selectedDate) });

    document.getElementById('summaryHours').textContent = rec ? formatHours(rec.hours) : '–';
    document.getElementById('summaryHoursUnit').textContent = t('unit-hour');
    document.getElementById('summaryStart').textContent = rec ? formatTime(rec.start) : '–';
    document.getElementById('summaryEnd').textContent = rec ? formatTime(rec.end) : '–';
    document.getElementById('summaryQuality').textContent = rec ? t(QUALITY_KEY_BY_SCORE[rec.qualityScore] || 'quality-good') : '–';

    const evalPill = document.getElementById('summaryEval');
    evalPill.hidden = !rec;
    if (rec) document.getElementById('summaryEvalText').textContent = t(`eval-${evalKey}`);

    const meter = document.getElementById('sleepMeter');
    meter.setAttribute('aria-label', t('summary-meter-label'));
    document.getElementById('sleepMeterFill').style.width =
        rec ? `${Math.min(rec.hours / METER_MAX_HOURS, 1) * 100}%` : '0';

    const insight = document.getElementById('summaryInsight');
    if (!rec) {
        insight.textContent = t(isToday(selectedDate) ? 'insight-empty-today' : 'insight-empty-date');
    } else if (evalKey === 'low') {
        insight.textContent = tpl('insight-low', { diff: formatHours(SLEEP_THRESHOLDS.low - rec.hours) });
    } else if (evalKey === 'high') {
        insight.textContent = tpl('insight-high', { diff: formatHours(rec.hours - SLEEP_THRESHOLDS.high) });
    } else {
        insight.textContent = t('insight-ok');
    }
}

/* ==============================================================================
   5. Render: รายการประวัติ
   ============================================================================== */
function renderLogItemHtml(rec) {
    const evalKey = evalKeyOf(rec);
    const label = tpl('open-item-label', { date: formatThaiDate(parseDateKey(rec.date)) });
    const current = rec.date === dateKey(selectedDate) ? ' is-current' : '';
    return `
        <div class="log-item eval-${evalKey}${current}" data-open-id="${rec.id}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
            <span class="log-thumb"><i data-icon="sleep"></i></span>
            <div class="log-item-info">
                <span class="log-item-name">${formatThaiDate(parseDateKey(rec.date))}</span>
                <span class="log-item-meta"><span class="numeric">${formatTime(rec.start)} – ${formatTime(rec.end)}</span></span>
                <span class="cat-pill"><span class="badge-dot" style="background:var(--lc)"></span>${t(`eval-${evalKey}`)}</span>
            </div>
            <span class="log-item-hours numeric">${formatHours(rec.hours)}<small>${t('unit-hour')}</small></span>
            <span class="log-item-chevron" aria-hidden="true"></span>
        </div>
    `;
}

function renderLogList() {
    const list = document.getElementById('logList');
    document.getElementById('logCountBadge').textContent = `${sleepRecords.length} ${t('unit-night')}`;

    if (sleepRecords.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon"><i data-icon="sleep"></i></span>
                <div class="empty-state-title">${t('empty-state-title')}</div>
                <div class="empty-state-desc">${t('empty-state-desc')}</div>
            </div>
        `;
        return;
    }
    list.innerHTML = sleepRecords.map(renderLogItemHtml).join('');
}

/* ==============================================================================
   6. Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
function openDetail(id, opener) {
    const rec = sleepRecords.find(r => r.id === id);
    if (!rec) return;
    detailId = id;
    detailOpener = opener || null;

    const evalKey = evalKeyOf(rec);
    setEvalClass(document.getElementById('sleepDetailCard'), evalKey);
    document.getElementById('detailName').textContent = formatThaiDate(parseDateKey(rec.date));
    document.getElementById('detailEvalText').textContent = t(`eval-${evalKey}`);
    document.getElementById('detailDuration').textContent = `${formatHours(rec.hours)} ${t('unit-hour')}`;
    document.getElementById('detailQuality').textContent = t(QUALITY_KEY_BY_SCORE[rec.qualityScore] || 'quality-good');
    document.getElementById('detailStart').textContent = formatTime(rec.start);
    document.getElementById('detailEnd').textContent = formatTime(rec.end);

    document.getElementById('sleepDetailOverlay').classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('detailEditBtn').focus());
}

function closeDetail() {
    document.getElementById('sleepDetailOverlay').classList.remove('is-open');
    if (detailOpener && document.contains(detailOpener)) detailOpener.focus();
    detailId = null;
    detailOpener = null;
}

/* ==============================================================================
   7. Modal: บันทึก / แก้ไขการนอน (bottom sheet)
   ============================================================================== */
function setQuality(score) {
    selectedQuality = score;
    document.querySelectorAll('.quality-pill').forEach(p => {
        const match = Number(p.dataset.quality) === score;
        p.classList.toggle('active', match);
        p.setAttribute('aria-checked', match ? 'true' : 'false');
    });
}

/** พรีวิวชั่วโมง + ผลประเมินสดในฟอร์ม (ฝั่ง client เท่านั้น) */
function updatePreview() {
    const range = buildSleepDates(sheetDate, document.getElementById('sleepStart').value, document.getElementById('sleepEnd').value);
    const stats = range ? computeSleepStats(range.start, range.end) : null;
    const box = document.getElementById('sleepPreview');
    const valueEl = document.getElementById('sleepPreviewValue');
    const textEl = document.getElementById('sleepPreviewText');

    if (!stats || stats.invalid) {
        box.dataset.eval = '';
        valueEl.textContent = '–';
        textEl.textContent = t('eval-pending');
        return;
    }
    box.dataset.eval = stats.evalKey;
    valueEl.textContent = `${formatHours(stats.hours)} ${t('unit-hour')}`;
    textEl.textContent = t(`eval-${stats.evalKey}`);
}

function showFormError(msg) {
    const box = document.getElementById('sleepFormError');
    box.textContent = msg;
    box.hidden = false;
}

function openSheet(rec) {
    editingId = rec ? rec.id : null;
    sheetDate = rec ? rec.date : dateKey(selectedDate);

    document.getElementById('sleepSheetTitle').textContent = t(rec ? 'modal-title-edit' : 'modal-title-add');
    document.getElementById('sleepSheetDate').textContent = formatThaiDate(parseDateKey(sheetDate));
    // ไม่มีบันทึกเดิม -> เวลาแนะนำเริ่มต้น (ไม่ใช่ค่าจริง แค่ช่วยกรอก)
    document.getElementById('sleepStart').value = rec ? formatTime(rec.start) : '23:00';
    document.getElementById('sleepEnd').value = rec ? formatTime(rec.end) : '07:00';
    setQuality(rec ? (rec.qualityScore || 3) : 3);
    document.getElementById('sleepFormError').hidden = true;
    updatePreview();

    document.getElementById('sleepSheetOverlay').classList.add('is-open');
}

function closeSheet() {
    document.getElementById('sleepSheetOverlay').classList.remove('is-open');
}

async function handleSave() {
    const startVal = document.getElementById('sleepStart').value;
    const endVal = document.getElementById('sleepEnd').value;
    const range = buildSleepDates(sheetDate, startVal, endVal);
    const stats = range ? computeSleepStats(range.start, range.end) : null;
    if (!stats || stats.invalid) { showFormError(t('err-time-order')); return; }
    document.getElementById('sleepFormError').hidden = true;

    const payload = {
        dslp_date: sheetDate,
        dslp_start_time: range.start.toISOString(),
        dslp_end_time: range.end.toISOString(),
        dslp_quality_score: selectedQuality
    };

    const saveBtn = document.getElementById('saveSleepBtn');
    saveBtn.disabled = true;

    try {
        const wasEditing = !!editingId;
        const path = wasEditing
            ? `/members/${mbId}/sleep-records/${editingId}`
            : `/members/${mbId}/sleep-records`;
        await SoyDeeAPI.request(path, { method: wasEditing ? 'PUT' : 'POST', body: payload });
        closeSheet();
        await loadData();
        showToast(t(wasEditing ? 'toast-updated' : 'toast-added'), 'success');
    } catch (err) {
        showFormError((err && err.message) || t('err-save'));
    } finally {
        saveBtn.disabled = false;
    }
}

function handleDelete(id) {
    const rec = sleepRecords.find(r => r.id === id);
    if (!rec) return;

    showConfirm({
        title: t('delete-title'),
        message: tpl('delete-message-template', { date: formatThaiDate(parseDateKey(rec.date)) }),
        confirmText: t('delete-confirm'),
        cancelText: t('btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${mbId}/sleep-records/${id}`, { method: 'DELETE' });
                await loadData();
                showToast(t('toast-deleted'), 'success');
            } catch (err) {
                console.error('delete sleep record failed', err);
                showToast(t('toast-delete-failed'), 'error');
            }
        }
    });
}

/* ==============================================================================
   8. Init + bind events
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(SLEEP_I18N);
    mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;

    renderDate();

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js)
    // ห้ามเลือกอนาคต (disableFuture default ของ component) — ดู/แก้บันทึกย้อนหลังได้
    sleepDatePicker = SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => selectedDate,
        onSelect: (date) => changeDate(date)
    });

    // กดการ์ดรายการ → เปิดรายละเอียด (event delegation; รองรับ Enter/Space สำหรับคีย์บอร์ด)
    const logList = document.getElementById('logList');
    logList.addEventListener('click', (e) => {
        const card = e.target.closest('[data-open-id]');
        if (card) openDetail(Number(card.dataset.openId), card);
    });
    logList.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-open-id]');
        if (!card) return;
        e.preventDefault();
        openDetail(Number(card.dataset.openId), card);
    });

    // รายละเอียด: ปิด / แก้ไข / ลบ
    const detailOverlay = document.getElementById('sleepDetailOverlay');
    const sheetOverlay = document.getElementById('sleepSheetOverlay');
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDetail(); });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
        const rec = sleepRecords.find(r => r.id === detailId);
        closeDetail();
        if (rec) openSheet(rec);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        const id = detailId;
        closeDetail();
        if (id !== null) handleDelete(id);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (detailOverlay.classList.contains('is-open')) closeDetail();
        else if (sheetOverlay.classList.contains('is-open')) closeSheet();
    });

    // ปุ่มลอย (FAB) — วันที่เลือกมีบันทึกแล้วเปิดแก้ไข (1 วัน 1 รายการ) ไม่มีก็เพิ่มใหม่
    document.getElementById('fabAddBtn').addEventListener('click', () => openSheet(currentRecord()));

    // ฟอร์ม: พรีวิวสด + คุณภาพ + บันทึก / ยกเลิก
    ['sleepStart', 'sleepEnd'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });
    document.querySelectorAll('.quality-pill').forEach(p => {
        p.addEventListener('click', () => setQuality(Number(p.dataset.quality)));
    });
    document.getElementById('saveSleepBtn').addEventListener('click', handleSave);
    document.getElementById('sleepCancelBtn').addEventListener('click', closeSheet);
    sheetOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });

    await loadData();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back ของเบราว์เซอร์) — DOMContentLoaded ไม่ยิงซ้ำ
    // บันทึกที่เพิ่ง/แก้ไว้เลยค้างจนกว่าจะกด refresh เอง แก้โดยโหลดข้อมูลใหม่ทุกครั้งที่ restore
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) loadData();
    });
});
