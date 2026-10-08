import { startOfDay } from './helpers.js';

/* ==============================================================================
   1. ค่าคงที่ & State
   ============================================================================== */
export const SLEEP_THRESHOLDS = { low: 7, high: 9 }; // < 7 ชม. = น้อยไป, > 9 ชม. = มากไป (§2.6)
export const METER_MAX_HOURS = 12; // สเกลของแถบสรุป (ตรงกับตำแหน่ง 7/9 ใน CSS)
export const HISTORY_DAYS = 7;
export const HISTORY_STEP = 7; // หน้าประวัติเต็มโหลดทีละ 7 วัน
export const HISTORY_MAX_DAYS = 56;
export const NEAR_AVG_MIN = 60; // เวลานอน/ตื่นต่างจากค่าเฉลี่ยไม่เกินนี้ = "ใกล้ค่าเฉลี่ย"
export const LONG_SLEEP_HOURS = 16; // นานกว่านี้เตือนให้ตรวจเวลา (ไม่บล็อก)
export const FUTURE_TOLERANCE_MS = 60000; // เผื่อเวลาเครื่องเหลื่อม — เวลาตื่นเกินนี้ถือว่ายังมาไม่ถึง
export const LAST_TIMES_KEY = 'sleepLastTimes'; // เวลานอน/ตื่นล่าสุดที่บันทึก ใช้เป็นค่าเริ่มต้นของฟอร์ม
export const TIME_RE = /^\d{2}:\d{2}$/;
export const REGULAR_EVAL = { good: 'ok', fair: 'high', low: 'low' }; // ระดับสม่ำเสมอ → สี .eval-*
export const EVAL_KEY_BY_RESULT = { 1: 'low', 2: 'ok', 3: 'high' };
export const QUALITY_KEY_BY_SCORE = { 1: 'quality-bad', 2: 'quality-mid', 3: 'quality-good' };
export const QUALITY_ICON_BY_SCORE = { 1: 'smile-sad', 2: 'smile-meh', 3: 'smile' };
export const WEEKDAYS = {
    th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
    en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
};
export const dayCache = new Map(); // YYYY-MM-DD → บันทึกของวันนั้น (null = ไม่มี) ทุกวันที่เคยโหลด

export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Mutable page state: ES module bindings are read-only across modules, so shared
// variables live on this object (state.x = ... from any module).
export const state = {
    selectedDate: startOfDay(new Date()), // วันที่กำลังดู/บันทึก (dslp_date = วันที่ตื่น)
    mbId: null,
    sleepRecords: [], // บันทึก HISTORY_DAYS วันที่จบที่ selectedDate (ใหม่ → เก่า)
    editingId: null, // dslp_id ที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
    sheetDate: '', // dslp_date ของฟอร์มที่เปิดอยู่ (YYYY-MM-DD)
    selectedQuality: 3, // dslp_quality_score ที่ผู้ใช้เลือกเอง — ห้ามคำนวณจากชั่วโมง (§2.6)
    detailId: null, // dslp_id ที่เปิดดูรายละเอียดอยู่
    detailOpener: null, // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด
    sleepDatePicker: null,
    loadSeq: 0, // กันผลโหลดเก่าทับผลใหม่เมื่อกดเลื่อนวันรัวๆ
    historyDays: HISTORY_STEP, // จำนวนวันที่หน้าประวัติเต็มแสดงอยู่ (จบที่ selectedDate)
    historyOpener: null,
};
