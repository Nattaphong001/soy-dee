/**
 * sleep-record.js — หน้าบันทึกการนอนหลับ
 * - dslp_total_hours / dslp_eval_result คำนวณฝั่ง server ทั้งหมด (ดู API_SPEC.md §9)
 * - dslp_quality_score ผู้ใช้เลือกเอง (แย่/ปานกลาง/ดี) — ส่งไปพร้อม payload ทุกครั้ง (§2.6)
 * - 1 วัน = 1 บันทึก (UNIQUE mb_id+dslp_date): วันที่มีแล้วปุ่มในการ์ดสรุปจะเปิดฟอร์มแก้ไข (PUT) ไม่ใช่สร้างซ้ำ
 * - ฟอร์มคำนวณค่าพรีวิวฝั่ง client แสดงสดระหว่างกรอก แต่ค่าจริงมาจาก response เท่านั้น
 *
 * โครงหน้าเดียวกับ food-record.js / activity-record.js: การ์ดสรุป (ปุ่มบันทึก/แก้ไขอยู่ในการ์ด) → ภาพรวม → ประวัติเต็ม (กดดูรายละเอียด) → bottom sheet
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
        'insight-empty-today': 'ยังไม่ได้บันทึกการนอนของวันนี้',
        'insight-empty-late': 'ยังไม่ถึงเวลาตื่น เมื่อตื่นแล้วค่อยกลับมาบันทึกการนอนของคืนนี้',
        'insight-empty-evening': 'ยังไม่ได้บันทึกการนอนของวันนี้ ถ้าคืนนี้ได้นอน ตื่นแล้วกลับมาบันทึกได้เลย',
        'insight-empty-date': 'ยังไม่มีบันทึกการนอนของวันที่เลือก',
        'insight-low': 'นอนน้อยกว่าที่แนะนำ {diff} ชม. ผู้ใหญ่ควรนอน 7–9 ชม. ต่อคืน',
        'insight-ok': 'อยู่ในช่วงที่แนะนำ 7–9 ชม. ต่อคืน ทำได้ดีมาก',
        'insight-high': 'นอนมากกว่าที่แนะนำ {diff} ชม. ผู้ใหญ่ควรนอน 7–9 ชม. ต่อคืน',
        'week-title': 'ภาพรวม 7 วัน',
        'week-total-template': 'บันทึก {n}/7 คืน',
        'week-avg-prefix': 'เฉลี่ย',
        'week-avg-tag': 'เฉลี่ย',
        'week-band-note': 'แถบเขียวจาง = ช่วงแนะนำ 7–9 ชม.',
        'week-in-range-template': 'พอดี {n}/{m} คืน',
        'week-avg-start': 'เข้านอนเฉลี่ย',
        'week-avg-end': 'ตื่นเฉลี่ย',
        'regular-title': 'ความสม่ำเสมอของการนอน',
        'regular-sub-template': 'เวลาใกล้ค่าเฉลี่ย {n} จาก {m} คืน',
        'regular-need-more': 'บันทึกอย่างน้อย 3 คืนเพื่อดูความสม่ำเสมอ',
        'regular-level-template': 'สม่ำเสมอ: {l}',
        'legend-near': 'ใกล้ค่าเฉลี่ย (±1 ชม.)',
        'legend-far': 'ห่างจากค่าเฉลี่ย',
        'legend-none': 'ไม่ได้บันทึก',
        'row-bed': 'เข้านอน',
        'row-wake': 'ตื่นนอน',
        'history-title': 'ประวัติการนอน',
        'history-more': 'ดูย้อนหลังเพิ่ม 7 วัน',
        'history-loading': 'กำลังโหลด…',
        'history-back': 'กลับ',
        'history-open-label': 'ดูประวัติการนอนทั้งหมด',
        'regular-good': 'ดี',
        'regular-fair': 'พอใช้',
        'regular-low': 'ต่ำ',
        'week-spread-template': 'เวลาเข้านอนต่างกันสูงสุด {span} ใน 7 วันนี้ (ยิ่งเวลาใกล้เคียงกันยิ่งดี)',
        'week-spread-same': 'เข้านอนเวลาใกล้เคียงกันทุกคืน ทำได้ดีมาก',
        'span-h-template': '{h} ชม.',
        'span-m-template': '{m} นาที',
        'span-hm-template': '{h} ชม. {m} นาที',
        'week-chart-label': 'ชั่วโมงการนอนรายวัน',
        'empty-night-title': 'ยังไม่ได้บันทึก',
        'empty-night-add': '+ เพิ่ม',
        'open-add-label': 'เพิ่มบันทึกการนอนวันที่ {date}',
        'quality-label-template': 'คุณภาพ: {q}',
        'preview-prev-night': 'เริ่มนอนคืนวันที่ {date}',
        'cta-add': 'บันทึกการนอน',
        'cta-edit': 'แก้ไขบันทึก',
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
        'err-future-end': 'เวลาตื่นนอนยังมาไม่ถึง บันทึกได้หลังตื่นนอนแล้ว',
        'warn-long-sleep': 'นอนนานกว่า 16 ชม. ตรวจสอบเวลาอีกครั้ง',
        'err-save': 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',
        'delete-title': 'ลบบันทึกการนอน',
        'delete-message-template': 'ต้องการลบบันทึกการนอนวันที่ {date} ออกจากประวัติใช่หรือไม่?',
        'delete-confirm': 'ลบรายการ',
        'toast-added': 'บันทึกการนอนหลับแล้ว',
        'toast-updated': 'แก้ไขการนอนหลับแล้ว',
        'toast-deleted': 'ลบบันทึกการนอนแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่',
        'toast-load-failed': 'โหลดบันทึกการนอนไม่สำเร็จ กรุณาลองใหม่',
        'open-summary-label': 'ดูรายละเอียดการนอนของวันที่เลือก'
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
        'insight-empty-today': 'No sleep logged today yet',
        'insight-empty-late': "It's not wake-up time yet — come back after you wake to log tonight's sleep",
        'insight-empty-evening': "No sleep logged today yet. If you sleep tonight, log it after you wake up",
        'insight-empty-date': 'No sleep record for the selected day',
        'insight-low': '{diff} hrs below the recommended amount. Adults need 7–9 hrs a night',
        'insight-ok': 'Within the recommended 7–9 hrs a night — well done',
        'insight-high': '{diff} hrs above the recommended amount. Adults need 7–9 hrs a night',
        'week-title': '7-day overview',
        'week-total-template': '{n}/7 nights logged',
        'week-avg-prefix': 'Avg',
        'week-avg-tag': 'Avg',
        'week-band-note': 'Light green band = recommended 7–9 hrs',
        'week-in-range-template': '{n}/{m} in range',
        'week-avg-start': 'Avg bedtime',
        'week-avg-end': 'Avg wake-up',
        'regular-title': 'Sleep consistency',
        'regular-sub-template': '{n} of {m} nights near your average',
        'regular-need-more': 'Log at least 3 nights to see consistency',
        'regular-level-template': 'Consistency: {l}',
        'legend-near': 'Near average (±1 hr)',
        'legend-far': 'Off average',
        'legend-none': 'Not logged',
        'row-bed': 'Bedtime',
        'row-wake': 'Wake-up',
        'history-title': 'Sleep history',
        'history-more': 'Show 7 more days',
        'history-loading': 'Loading…',
        'history-back': 'Back',
        'history-open-label': 'View full sleep history',
        'regular-good': 'Good',
        'regular-fair': 'Fair',
        'regular-low': 'Low',
        'week-spread-template': 'Bedtimes varied by up to {span} over these 7 days (closer is better)',
        'week-spread-same': 'Same bedtime every night — well done',
        'span-h-template': '{h} hr',
        'span-m-template': '{m} min',
        'span-hm-template': '{h} hr {m} min',
        'week-chart-label': 'Sleep hours per day',
        'empty-night-title': 'Not logged',
        'empty-night-add': '+ Add',
        'open-add-label': 'Add sleep record for {date}',
        'quality-label-template': 'Quality: {q}',
        'preview-prev-night': 'Bedtime on the night of {date}',
        'cta-add': 'Log sleep',
        'cta-edit': 'Edit record',
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
        'err-future-end': "Wake-up time hasn't happened yet — log it after you wake up",
        'warn-long-sleep': 'Over 16 hrs of sleep — double-check the times',
        'err-save': 'Failed to save, please try again',
        'delete-title': 'Delete sleep record',
        'delete-message-template': 'Delete the sleep record for {date} from your history?',
        'delete-confirm': 'Delete',
        'toast-added': 'Sleep record saved',
        'toast-updated': 'Sleep record updated',
        'toast-deleted': 'Sleep record deleted',
        'toast-delete-failed': 'Failed to delete — please try again',
        'toast-load-failed': 'Failed to load sleep records — please try again',
        'open-summary-label': 'View details for the selected day'
    }
};

/* ==============================================================================
   1. ค่าคงที่ & State
   ============================================================================== */
const SLEEP_THRESHOLDS = { low: 7, high: 9 };   // < 7 ชม. = น้อยไป, > 9 ชม. = มากไป (§2.6)
const METER_MAX_HOURS = 12;                      // สเกลของแถบสรุป (ตรงกับตำแหน่ง 7/9 ใน CSS)
const HISTORY_DAYS = 7;
const HISTORY_STEP = 7;                          // หน้าประวัติเต็มโหลดทีละ 7 วัน
const HISTORY_MAX_DAYS = 56;
const NEAR_AVG_MIN = 60;                         // เวลานอน/ตื่นต่างจากค่าเฉลี่ยไม่เกินนี้ = "ใกล้ค่าเฉลี่ย"
const LONG_SLEEP_HOURS = 16;                     // นานกว่านี้เตือนให้ตรวจเวลา (ไม่บล็อก)
const FUTURE_TOLERANCE_MS = 60000;               // เผื่อเวลาเครื่องเหลื่อม — เวลาตื่นเกินนี้ถือว่ายังมาไม่ถึง
const LAST_TIMES_KEY = 'sleepLastTimes';         // เวลานอน/ตื่นล่าสุดที่บันทึก ใช้เป็นค่าเริ่มต้นของฟอร์ม
const TIME_RE = /^\d{2}:\d{2}$/;
const REGULAR_EVAL = { good: 'ok', fair: 'high', low: 'low' };   // ระดับสม่ำเสมอ → สี .eval-*
const EVAL_KEY_BY_RESULT = { 1: 'low', 2: 'ok', 3: 'high' };
const QUALITY_KEY_BY_SCORE = { 1: 'quality-bad', 2: 'quality-mid', 3: 'quality-good' };
const QUALITY_ICON_BY_SCORE = { 1: 'smile-sad', 2: 'smile-meh', 3: 'smile' };
const WEEKDAYS = {
    th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
    en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
};

let selectedDate = startOfDay(new Date());       // วันที่กำลังดู/บันทึก (dslp_date = วันที่ตื่น)
let mbId = null;
let sleepRecords = [];                           // บันทึก HISTORY_DAYS วันที่จบที่ selectedDate (ใหม่ → เก่า)
let editingId = null;                            // dslp_id ที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
let sheetDate = '';                              // dslp_date ของฟอร์มที่เปิดอยู่ (YYYY-MM-DD)
let selectedQuality = 3;                         // dslp_quality_score ที่ผู้ใช้เลือกเอง — ห้ามคำนวณจากชั่วโมง (§2.6)
let detailId = null;                             // dslp_id ที่เปิดดูรายละเอียดอยู่
let detailOpener = null;                         // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด
let sleepDatePicker = null;
let loadSeq = 0;                                 // กันผลโหลดเก่าทับผลใหม่เมื่อกดเลื่อนวันรัวๆ
let historyDays = HISTORY_STEP;                  // จำนวนวันที่หน้าประวัติเต็มแสดงอยู่ (จบที่ selectedDate)
let historyOpener = null;
const dayCache = new Map();                      // YYYY-MM-DD → บันทึกของวันนั้น (null = ไม่มี) ทุกวันที่เคยโหลด

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

function formatShortDate(d) {
    return `${d.getDate()} ${(I18N.getLang() === 'en' ? ENGLISH_MONTHS_SHORT : THAI_MONTHS_SHORT)[d.getMonth()]}`;
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

/** เวลาตื่นยังมาไม่ถึง = บันทึกล่วงหน้า (ไม่อนุญาต) */
function isFutureEnd(end) {
    return end.getTime() > Date.now() + FUTURE_TOLERANCE_MS;
}

/** นาทีนับจากเที่ยงวัน (0–1439): เวลาเข้านอนข้ามเที่ยงคืนเรียงต่อกัน (23:30 มาก่อน 00:30) เฉลี่ยได้ถูก */
function minutesFromNoon(dt) {
    return (dt.getHours() * 60 + dt.getMinutes() - 720 + 1440) % 1440;
}

function clockFromNoon(m) {
    const x = (m + 720) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}

/** เวลาเข้านอน/ตื่นเฉลี่ย + ระดับความสม่ำเสมอของเวลาเข้านอน (ต่างกัน ≤1 ชม. ดี, ≤2 ชม. พอใช้, เกินนั้นต่ำ; ต้องมี ≥3 คืน) */
function computeConsistency(records) {
    const bed = records.map(r => minutesFromNoon(r.start));
    const wake = records.map(r => minutesFromNoon(r.end));
    const avg = a => Math.round(a.reduce((sum, v) => sum + v, 0) / a.length);
    const span = Math.max(...bed) - Math.min(...bed);
    let level = null;
    if (records.length >= 3) level = span <= 60 ? 'good' : span <= 120 ? 'fair' : 'low';
    return { bed: avg(bed), wake: avg(wake), span, level };
}

function formatSpan(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (!h) return tpl('span-m-template', { m });
    return tpl(m ? 'span-hm-template' : 'span-h-template', { h, m });
}

/** เวลานอน/ตื่นเริ่มต้นของฟอร์ม: ค่าที่บันทึกล่าสุด → บันทึกล่าสุดในรายการ → 23:00/07:00 */
function defaultTimes() {
    try {
        const saved = JSON.parse(localStorage.getItem(LAST_TIMES_KEY));
        if (saved && TIME_RE.test(saved.start) && TIME_RE.test(saved.end)) return saved;
    } catch (e) { /* localStorage ใช้ไม่ได้ ข้าม */ }
    const last = sleepRecords[0];
    return last ? { start: formatTime(last.start), end: formatTime(last.end) } : { start: '23:00', end: '07:00' };
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

/** หาบันทึกจาก id ในทุกวันที่โหลดไว้ (รวมประวัติที่เก่ากว่า 7 วัน) */
function findRecord(id) {
    for (const r of dayCache.values()) if (r && r.id === id) return r;
    return null;
}

/** n วันที่จบที่ selectedDate เรียงใหม่ → เก่า (คีย์ YYYY-MM-DD) */
function windowDates(n = HISTORY_DAYS) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - i);
        return dateKey(d);
    });
}

function qualityKey(rec) {
    return QUALITY_KEY_BY_SCORE[rec.qualityScore] || 'quality-good';
}

/* ==============================================================================
   3. Data
   ============================================================================== */
/** ไม่มี endpoint list ช่วงวันที่สำหรับ sleep-records (มีแค่ ?date= รายวัน ตาม API_SPEC.md §9)
 *  เลยยิง GET แยกทีละวันแบบขนาน เก็บผลลง dayCache — คืนจำนวนวันที่โหลดไม่สำเร็จ */
async function fetchDays(keys) {
    let failed = 0;
    const results = await Promise.all(keys.map(k =>
        SoyDeeAPI.request(`/members/${mbId}/sleep-records`, { query: { date: k } })
            .then(r => (Array.isArray(r) && r.length ? normalizeRecord(r[0]) : null))
            .catch(() => { failed++; return undefined; })
    ));
    keys.forEach((k, i) => { if (results[i] !== undefined) dayCache.set(k, results[i]); });
    return failed;
}

async function loadData() {
    const seq = ++loadSeq;
    const dates = windowDates();
    const failed = await fetchDays(dates);
    if (seq !== loadSeq) return;   // มีการเลื่อนวันใหม่ระหว่างรอ — ทิ้งผลนี้
    if (failed === dates.length) showToast(t('toast-load-failed'), 'error');
    sleepRecords = dates.map(k => dayCache.get(k)).filter(Boolean);   // ใหม่ → เก่า
    renderSummary();
    renderWeek();
    renderRegular();
    if (isHistoryOpen()) {
        await fetchMissingHistory();
        renderHistory();
    }
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
    document.getElementById('summaryQuality').textContent = rec ? t(qualityKey(rec)) : '–';

    // มีบันทึกแล้ว: กดการ์ดเพื่อดูรายละเอียด (แก้ไข/ลบ)
    card.classList.toggle('is-link', !!rec);
    document.getElementById('summaryChevron').hidden = !rec;
    if (rec) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', t('open-summary-label'));
    } else {
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-label');
    }

    const evalPill = document.getElementById('summaryEval');
    evalPill.hidden = !rec;
    if (rec) document.getElementById('summaryEvalText').textContent = t(`eval-${evalKey}`);

    const meter = document.getElementById('sleepMeter');
    meter.setAttribute('aria-label', t('summary-meter-label'));
    document.getElementById('sleepMeterFill').style.width =
        rec ? `${Math.min(rec.hours / METER_MAX_HOURS, 1) * 100}%` : '0';

    const insight = document.getElementById('summaryInsight');
    if (!rec) {
        insight.textContent = t(emptyInsightKey());
    } else if (evalKey === 'low') {
        insight.textContent = tpl('insight-low', { diff: formatHours(SLEEP_THRESHOLDS.low - rec.hours) });
    } else if (evalKey === 'high') {
        insight.textContent = tpl('insight-high', { diff: formatHours(rec.hours - SLEEP_THRESHOLDS.high) });
    } else {
        insight.textContent = t('insight-ok');
    }

    const action = document.getElementById('summaryActionBtn');
    action.textContent = t(rec ? 'cta-edit' : 'cta-add');
    action.classList.toggle('is-secondary', !!rec);
}

/** วันนี้ที่ยังไม่มีบันทึก: ข้อความตามช่วงเวลา (หลังเที่ยงคืน = ยังไม่ตื่น, หลัง 20:00 = ใกล้เวลานอน) */
function emptyInsightKey() {
    if (!isToday(selectedDate)) return 'insight-empty-date';
    const h = new Date().getHours();
    if (h < 5) return 'insight-empty-late';
    return h >= 20 ? 'insight-empty-evening' : 'insight-empty-today';
}

/* ==============================================================================
   4b. Render: ภาพรวม 7 วัน (กราฟแท่ง เก่า → ใหม่ + เส้นค่าเฉลี่ย)
   ============================================================================== */
function renderWeek() {
    const card = document.getElementById('weekCard');
    card.hidden = sleepRecords.length === 0;
    card.setAttribute('aria-label', t('history-open-label'));
    if (sleepRecords.length === 0) return;

    const days = windowDates().reverse();
    const byDate = {};
    sleepRecords.forEach(r => { byDate[r.date] = r; });
    const wd = WEEKDAYS[I18N.getLang()] || WEEKDAYS.th;
    const selKey = dateKey(selectedDate);

    document.getElementById('weekBars').innerHTML = days.map((k, i) => {
        const rec = byDate[k];
        if (!rec) return '<div class="week-bar-wrap is-none"><span class="week-bar"></span></div>';
        const pct = Math.min(rec.hours / METER_MAX_HOURS, 1) * 100;
        const sel = k === selKey ? ' is-selected' : '';
        return `<div class="week-bar-wrap eval-${evalKeyOf(rec)}${sel}"><span class="week-bar" style="height:${pct}%;--i:${i}"></span></div>`;
    }).join('');

    document.getElementById('weekLabels').innerHTML = days.map(k => {
        const d = parseDateKey(k);
        return `<span class="week-label${k === selKey ? ' is-current' : ''}">${wd[d.getDay()]}<br>${d.getDate()}</span>`;
    }).join('');

    document.getElementById('weekChart').setAttribute('aria-label', t('week-chart-label'));
    document.getElementById('weekTotal').textContent = tpl('week-total-template', { n: sleepRecords.length });
    const avg = sleepRecords.reduce((sum, r) => sum + r.hours, 0) / sleepRecords.length;
    document.getElementById('weekAvg').textContent = formatSpan(Math.round(avg * 60));
    document.getElementById('weekAvgLine').style.bottom = `${Math.min(avg / METER_MAX_HOURS, 1) * 100}%`;
    document.getElementById('weekInRange').textContent = tpl('week-in-range-template', {
        n: sleepRecords.filter(r => evalKeyOf(r) === 'ok').length,
        m: sleepRecords.length
    });
}

/* ==============================================================================
   4c. Render: ความสม่ำเสมอ (จุดต่อคืน แถวเข้านอน/ตื่น เทียบค่าเฉลี่ย 7 วัน)
   ============================================================================== */
function renderRegular() {
    const card = document.getElementById('regularCard');
    card.hidden = sleepRecords.length === 0;
    card.setAttribute('aria-label', t('history-open-label'));
    if (sleepRecords.length === 0) return;

    const c = computeConsistency(sleepRecords);
    card.classList.toggle('is-unrated', !c.level);   // ยังไม่ครบ 3 คืน: ซ่อนคำอธิบายสีใกล้/ห่าง
    const days = windowDates().reverse();
    const byDate = {};
    sleepRecords.forEach(r => { byDate[r.date] = r; });
    const wd = WEEKDAYS[I18N.getLang()] || WEEKDAYS.th;
    const selKey = dateKey(selectedDate);
    const near = (dt, avg) => Math.abs(minutesFromNoon(dt) - avg) <= NEAR_AVG_MIN;

    // ยังไม่ครบ 3 คืน = ไม่ประเมินใกล้/ห่าง แสดงจุดสีเดียวว่าบันทึกแล้ว
    const dot = (rec, field, avg, labelKey) => {
        if (!rec) return '<span class="regular-dot is-none"></span>';
        const cls = c.level ? (near(rec[field], avg) ? 'is-near' : 'is-far') : 'is-logged';
        return `<span class="regular-dot ${cls}" title="${escapeHtml(t(labelKey) + ' ' + formatTime(rec[field]))}"></span>`;
    };
    const row = (icon, field, avg, labelKey) =>
        `<div class="regular-row"><span class="regular-ico" title="${escapeHtml(t(labelKey))}"><i data-icon="${icon}"></i></span>${days.map(k => dot(byDate[k], field, avg, labelKey)).join('')}</div>`;
    const labels = days.map(k => `<span class="week-label${k === selKey ? ' is-current' : ''}">${wd[parseDateKey(k).getDay()]}<br>${parseDateKey(k).getDate()}</span>`).join('');
    document.getElementById('regularGrid').innerHTML =
        row('moon', 'start', c.bed, 'row-bed') + row('sun', 'end', c.wake, 'row-wake') +
        `<div class="regular-row is-days"><span></span>${labels}</div>`;

    const nearNights = sleepRecords.filter(r => near(r.start, c.bed) && near(r.end, c.wake)).length;
    document.getElementById('regularSub').textContent = c.level
        ? tpl('regular-sub-template', { n: nearNights, m: sleepRecords.length })
        : t('regular-need-more');
    const pill = document.getElementById('regularLevel');
    pill.hidden = !c.level;
    setEvalClass(pill, c.level ? REGULAR_EVAL[c.level] : '');
    if (c.level) document.getElementById('regularLevelText').textContent = tpl('regular-level-template', { l: t(`regular-${c.level}`) });

    document.getElementById('weekAvgStart').textContent = clockFromNoon(c.bed);
    document.getElementById('weekAvgEnd').textContent = clockFromNoon(c.wake);
    const note = document.getElementById('weekRegularNote');
    note.hidden = !c.level;
    if (c.level) note.textContent = c.span < 5 ? t('week-spread-same') : tpl('week-spread-template', { span: formatSpan(c.span) });
}

/* ==============================================================================
   5. Render: แถวรายวัน + หน้าประวัติเต็ม (เปิดจากการ์ดภาพรวม/ความสม่ำเสมอ)
   ============================================================================== */
function renderLogItemHtml(rec) {
    const evalKey = evalKeyOf(rec);
    const dateLabel = formatThaiDate(parseDateKey(rec.date));
    const label = tpl('open-item-label', { date: dateLabel });
    const current = rec.date === dateKey(selectedDate) ? ' is-current' : '';
    return `
        <div class="log-item eval-${evalKey}${current}" data-open-id="${rec.id}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
            <span class="log-thumb"><i data-icon="${QUALITY_ICON_BY_SCORE[rec.qualityScore] || 'smile'}"></i></span>
            <div class="log-item-info">
                <span class="log-item-name">${dateLabel}</span>
                <span class="log-item-meta"><span class="numeric">${formatTime(rec.start)} – ${formatTime(rec.end)}</span></span>
                <span class="cat-pill"><span class="badge-dot" style="background:var(--lc)"></span>${t('eval-' + evalKey)}</span>
            </div>
            <div class="log-item-side">
                <span class="log-item-hours numeric">${formatHours(rec.hours)}<small>${t('unit-hour')}</small></span>
                <span class="log-item-quality">${tpl('quality-label-template', { q: t(qualityKey(rec)) })}</span>
            </div>
            <span class="log-item-chevron" aria-hidden="true"></span>
        </div>
    `;
}

// คืนที่ยังไม่มีบันทึก: แถวเส้นประ กดเพื่อเพิ่มของวันนั้นได้ทันที (ไม่ต้องเปิดปฏิทิน)
function renderEmptyNightHtml(key) {
    const dateLabel = formatThaiDate(parseDateKey(key));
    const label = tpl('open-add-label', { date: dateLabel });
    const current = key === dateKey(selectedDate) ? ' is-current' : '';
    return `
        <div class="log-item is-empty${current}" data-add-date="${key}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
            <span class="log-thumb"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span>
            <div class="log-item-info">
                <span class="log-item-name">${dateLabel}</span>
                <span class="log-item-meta">${t('empty-night-title')}</span>
            </div>
            <span class="log-item-add">${t('empty-night-add')}</span>
        </div>
    `;
}

function isHistoryOpen() {
    return document.getElementById('historyOverlay').classList.contains('is-open');
}

/** โหลดวันในหน้าประวัติที่ยังไม่มีใน cache — คืน false ถ้าโหลดไม่สำเร็จ (ผู้เรียกถอยกลับ กันแสดงวันว่างผิดๆ) */
async function fetchMissingHistory() {
    const missing = windowDates(historyDays).filter(k => !dayCache.has(k));
    if (!missing.length) return true;
    const failed = await fetchDays(missing);
    if (failed) showToast(t('toast-load-failed'), 'error');
    return !failed;
}

/** แบ่งทีละ 7 วัน: หัวช่วงวันที่ + ค่าเฉลี่ย แล้วตามด้วยแถวรายวัน (มี/ไม่มีบันทึก) */
function renderHistory() {
    const keys = windowDates(historyDays).filter(k => dayCache.has(k));
    let html = '';
    for (let i = 0; i < keys.length; i += HISTORY_STEP) {
        const chunk = keys.slice(i, i + HISTORY_STEP);
        const recs = chunk.map(k => dayCache.get(k)).filter(Boolean);
        const range = `${formatShortDate(parseDateKey(chunk[chunk.length - 1]))} – ${formatShortDate(parseDateKey(chunk[0]))}`;
        const avg = recs.length
            ? `${t('week-avg-prefix')} ${formatSpan(Math.round(recs.reduce((sum, r) => sum + r.hours, 0) / recs.length * 60))}`
            : '–';
        html += `<section class="history-week"><div class="history-week-head"><span class="history-week-range numeric">${range}</span><span class="history-week-avg">${avg}</span></div>` +
            `<div class="log-list">${chunk.map(k => { const r = dayCache.get(k); return r ? renderLogItemHtml(r) : renderEmptyNightHtml(k); }).join('')}</div></section>`;
    }
    document.getElementById('historyList').innerHTML = html;
    document.getElementById('historyCount').textContent =
        `${keys.filter(k => dayCache.get(k)).length}/${keys.length} ${t('unit-night')}`;

    const more = document.getElementById('historyMoreBtn');
    more.hidden = historyDays >= HISTORY_MAX_DAYS;
    more.disabled = false;
    more.textContent = t('history-more');
}

function openHistory(opener) {
    historyDays = HISTORY_STEP;
    historyOpener = opener || null;
    const overlay = document.getElementById('historyOverlay');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('history-open');
    document.getElementById('historyBackBtn').setAttribute('aria-label', t('history-back'));
    renderHistory();
    document.getElementById('historyBackBtn').focus();
}

function closeHistory() {
    const overlay = document.getElementById('historyOverlay');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('history-open');
    if (historyOpener && document.contains(historyOpener)) historyOpener.focus();
    historyOpener = null;
}

async function loadMoreHistory() {
    if (historyDays >= HISTORY_MAX_DAYS) return;
    const prev = historyDays;
    historyDays = Math.min(historyDays + HISTORY_STEP, HISTORY_MAX_DAYS);
    const more = document.getElementById('historyMoreBtn');
    more.disabled = true;
    more.textContent = t('history-loading');
    if (!(await fetchMissingHistory())) historyDays = prev;
    renderHistory();
}

/* ==============================================================================
   6. Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
function openDetail(id, opener) {
    const rec = findRecord(id);
    if (!rec) return;
    detailId = id;
    detailOpener = opener || null;

    const evalKey = evalKeyOf(rec);
    setEvalClass(document.getElementById('sleepDetailCard'), evalKey);
    document.getElementById('detailName').textContent = formatThaiDate(parseDateKey(rec.date));
    document.getElementById('detailEvalText').textContent = t(`eval-${evalKey}`);
    document.getElementById('detailDuration').textContent = `${formatHours(rec.hours)} ${t('unit-hour')}`;
    document.getElementById('detailQuality').textContent = t(qualityKey(rec));
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
    const noteEl = document.getElementById('sleepPreviewNote');
    const valueEl = document.getElementById('sleepPreviewValue');
    const textEl = document.getElementById('sleepPreviewText');
    const warnEl = document.getElementById('sleepPreviewWarn');

    if (!stats || stats.invalid) {
        box.dataset.eval = '';
        valueEl.textContent = '–';
        textEl.textContent = t('eval-pending');
        noteEl.hidden = true;
        warnEl.hidden = true;
        return;
    }
    // เตือนสด: ตื่นล่วงหน้า (บันทึกไม่ได้) / นอนนานผิดปกติ (บันทึกได้)
    const future = isFutureEnd(range.end);
    const warn = future ? t('err-future-end') : (stats.hours > LONG_SLEEP_HOURS ? t('warn-long-sleep') : '');
    warnEl.classList.toggle('is-caution', !future);   // ตื่นล่วงหน้า = แดง (บันทึกไม่ได้), นอนนาน = เหลือง (เตือนเฉยๆ)
    warnEl.hidden = !warn;
    warnEl.textContent = warn;
    // เริ่มนอนคนละวันกับวันที่ตื่น -> บอกวันที่ของคืนที่เริ่มนอน
    const crossed = dateKey(range.start) !== dateKey(range.end);
    noteEl.hidden = !crossed;
    if (crossed) noteEl.textContent = tpl('preview-prev-night', { date: formatThaiDate(range.start) });
    box.dataset.eval = stats.evalKey;
    valueEl.textContent = `${formatHours(stats.hours)} ${t('unit-hour')}`;
    textEl.textContent = t(`eval-${stats.evalKey}`);
}

function showFormError(msg) {
    const box = document.getElementById('sleepFormError');
    box.textContent = msg;
    box.hidden = false;
}

function openSheet(rec, dateStr) {
    editingId = rec ? rec.id : null;
    sheetDate = rec ? rec.date : (dateStr || dateKey(selectedDate));

    document.getElementById('sleepSheetTitle').textContent = t(rec ? 'modal-title-edit' : 'modal-title-add');
    document.getElementById('sleepSheetDate').textContent = formatThaiDate(parseDateKey(sheetDate));
    // ไม่มีบันทึกเดิม -> ใช้เวลาที่บันทึกล่าสุดเป็นค่าเริ่มต้น (ไม่ใช่ค่าจริง แค่ช่วยกรอก)
    const def = defaultTimes();
    document.getElementById('sleepStart').value = rec ? formatTime(rec.start) : def.start;
    document.getElementById('sleepEnd').value = rec ? formatTime(rec.end) : def.end;
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
    if (isFutureEnd(range.end)) { showFormError(t('err-future-end')); return; }
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
        try { localStorage.setItem(LAST_TIMES_KEY, JSON.stringify({ start: startVal, end: endVal })); } catch (e) { /* ข้าม */ }
        closeSheet();
        dayCache.delete(sheetDate);
        await loadData();
        showToast(t(wasEditing ? 'toast-updated' : 'toast-added'), 'success');
    } catch (err) {
        showFormError((err && err.message) || t('err-save'));
    } finally {
        saveBtn.disabled = false;
    }
}

function handleDelete(id) {
    const rec = findRecord(id);
    if (!rec) return;

    showConfirm({
        title: t('delete-title'),
        message: tpl('delete-message-template', { date: formatThaiDate(parseDateKey(rec.date)) }),
        confirmText: t('delete-confirm'),
        cancelText: t('btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${mbId}/sleep-records/${id}`, { method: 'DELETE' });
                dayCache.delete(rec.date);
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


    // แถวรายวันในหน้าประวัติ: มีบันทึก → เปิดรายละเอียด, ไม่มี → เพิ่มของวันนั้น (event delegation; รองรับ Enter/Space)
    const historyList = document.getElementById('historyList');
    historyList.addEventListener('click', (e) => {
        const card = e.target.closest('[data-open-id]');
        if (card) { openDetail(Number(card.dataset.openId), card); return; }
        const empty = e.target.closest('[data-add-date]');
        if (empty) openSheet(null, empty.dataset.addDate);
    });
    historyList.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-open-id], [data-add-date]');
        if (!card) return;
        e.preventDefault();
        if (card.dataset.addDate) openSheet(null, card.dataset.addDate);
        else openDetail(Number(card.dataset.openId), card);
    });

    // การ์ดภาพรวม/ความสม่ำเสมอ → หน้าประวัติเต็ม, การ์ดสรุป (เมื่อมีบันทึก) → รายละเอียดของวันนั้น
    const onCard = (id, action) => {
        const el = document.getElementById(id);
        el.addEventListener('click', (e) => { if (!e.target.closest('button')) action(el); });
        el.addEventListener('keydown', (e) => {
            if (e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return;
            e.preventDefault();
            action(el);
        });
    };
    onCard('weekCard', openHistory);
    onCard('regularCard', openHistory);
    onCard('sleepSummary', (el) => { const rec = currentRecord(); if (rec) openDetail(rec.id, el); });
    document.getElementById('historyBackBtn').addEventListener('click', closeHistory);
    document.getElementById('historyMoreBtn').addEventListener('click', loadMoreHistory);

    // รายละเอียด: ปิด / แก้ไข / ลบ
    const detailOverlay = document.getElementById('sleepDetailOverlay');
    const sheetOverlay = document.getElementById('sleepSheetOverlay');
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDetail(); });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
        const rec = findRecord(detailId);
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
        else if (isHistoryOpen()) closeHistory();
    });

    // ปุ่มในการ์ดสรุป — วันที่เลือกมีบันทึกแล้วเปิดแก้ไข (1 วัน 1 รายการ) ไม่มีก็เพิ่มใหม่
    document.getElementById('summaryActionBtn').addEventListener('click', () => openSheet(currentRecord()));

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
        if (e.persisted) { dayCache.clear(); loadData(); }
    });
});
