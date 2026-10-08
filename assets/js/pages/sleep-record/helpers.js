import { SLEEP_I18N } from './i18n.js';
import { ENGLISH_MONTHS_SHORT, EVAL_KEY_BY_RESULT, FUTURE_TOLERANCE_MS, HISTORY_DAYS, LAST_TIMES_KEY, QUALITY_KEY_BY_SCORE, SLEEP_THRESHOLDS, THAI_MONTHS_SHORT, TIME_RE, dayCache, state } from './state.js';

/* ==============================================================================
   2. Helpers
   ============================================================================== */
export function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function parseDateKey(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function isToday(d) {
    return dateKey(d) === dateKey(new Date());
}

export function formatThaiDate(d) {
    if (I18N.getLang() === 'en') {
        return `${d.getDate()} ${ENGLISH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatShortDate(d) {
    return `${d.getDate()} ${(I18N.getLang() === 'en' ? ENGLISH_MONTHS_SHORT : THAI_MONTHS_SHORT)[d.getMonth()]}`;
}

export function formatTime(dt) {
    if (!(dt instanceof Date) || isNaN(dt.getTime())) return '–';
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export function formatHours(h) {
    return Number(h).toFixed(1);
}

export function t(key) {
    return I18N.t(SLEEP_I18N, key);
}

export function tpl(key, vars) {
    return Object.keys(vars || {}).reduce((s, k) => s.replace(`{${k}}`, vars[k]), t(key));
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML.replace(/"/g, '&quot;');
}

/** เวลาตื่นยังมาไม่ถึง = บันทึกล่วงหน้า (ไม่อนุญาต) */
export function isFutureEnd(end) {
    return end.getTime() > Date.now() + FUTURE_TOLERANCE_MS;
}

/** นาทีนับจากเที่ยงวัน (0–1439): เวลาเข้านอนข้ามเที่ยงคืนเรียงต่อกัน (23:30 มาก่อน 00:30) เฉลี่ยได้ถูก */
export function minutesFromNoon(dt) {
    return (dt.getHours() * 60 + dt.getMinutes() - 720 + 1440) % 1440;
}

export function clockFromNoon(m) {
    const x = (m + 720) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}

/** เวลาเข้านอน/ตื่นเฉลี่ย + ระดับความสม่ำเสมอของเวลาเข้านอน (ต่างกัน ≤1 ชม. ดี, ≤2 ชม. พอใช้, เกินนั้นต่ำ; ต้องมี ≥3 คืน) */
export function computeConsistency(records) {
    const bed = records.map(r => minutesFromNoon(r.start));
    const wake = records.map(r => minutesFromNoon(r.end));
    const avg = a => Math.round(a.reduce((sum, v) => sum + v, 0) / a.length);
    const span = Math.max(...bed) - Math.min(...bed);
    let level = null;
    if (records.length >= 3) level = span <= 60 ? 'good' : span <= 120 ? 'fair' : 'low';
    return { bed: avg(bed), wake: avg(wake), span, level };
}

export function formatSpan(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (!h) return tpl('span-m-template', { m });
    return tpl(m ? 'span-hm-template' : 'span-h-template', { h, m });
}

/** เวลานอน/ตื่นเริ่มต้นของฟอร์ม: ค่าที่บันทึกล่าสุด → บันทึกล่าสุดในรายการ → 23:00/07:00 */
export function defaultTimes() {
    try {
        const saved = JSON.parse(localStorage.getItem(LAST_TIMES_KEY));
        if (saved && TIME_RE.test(saved.start) && TIME_RE.test(saved.end)) return saved;
    } catch (e) { /* localStorage ใช้ไม่ได้ ข้าม */ }
    const last = state.sleepRecords[0];
    return last ? { start: formatTime(last.start), end: formatTime(last.end) } : { start: '23:00', end: '07:00' };
}

/** ผลประเมินจาก server (1/2/3) → 'low' | 'ok' | 'high' */
export function evalKeyOf(record) {
    return record ? (EVAL_KEY_BY_RESULT[record.evalResult] || 'ok') : '';
}

/**
 * รวม "วันที่บันทึก" (= วันที่ตื่น) กับเวลาที่เริ่มนอน/ตื่นนอน (input type="time") เป็น Date จริง
 * ถ้าเวลาเริ่มนอน > เวลาตื่นนอน ถือว่าเริ่มนอนคืนก่อนหน้าวันที่บันทึกโดยอัตโนมัติ (ตรงกับตัวอย่างใน API_SPEC.md §9)
 */
export function buildSleepDates(dateStr, startTimeStr, endTimeStr) {
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
export function computeSleepStats(start, end) {
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs <= 0) return { invalid: true };
    const hours = diffMs / 3600000;
    let evalKey = 'ok';
    if (hours < SLEEP_THRESHOLDS.low) evalKey = 'low';
    else if (hours > SLEEP_THRESHOLDS.high) evalKey = 'high';
    return { hours, evalKey, invalid: false };
}

/** แปลง record จาก API (dslp_*) ให้เป็นรูปแบบที่ใช้ใน UI */
export function normalizeRecord(raw) {
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

export function currentRecord() {
    return state.sleepRecords.find(r => r.date === dateKey(state.selectedDate)) || null;
}

/** หาบันทึกจาก id ในทุกวันที่โหลดไว้ (รวมประวัติที่เก่ากว่า 7 วัน) */
export function findRecord(id) {
    for (const r of dayCache.values()) if (r && r.id === id) return r;
    return null;
}

/** n วันที่จบที่ selectedDate เรียงใหม่ → เก่า (คีย์ YYYY-MM-DD) */
export function windowDates(n = HISTORY_DAYS) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(state.selectedDate);
        d.setDate(d.getDate() - i);
        return dateKey(d);
    });
}

export function qualityKey(rec) {
    return QUALITY_KEY_BY_SCORE[rec.qualityScore] || 'quality-good';
}
