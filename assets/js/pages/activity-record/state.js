import { startOfDay } from './helpers.js';

/* ==============================================================================
   1. State
   ============================================================================== */
export const DAILY_GOAL_MIN = 30; // เป้าหมายกิจกรรมต่อวัน (นาที) ตามคำแนะนำทั่วไป

// สีประจำกิจกรรมตามระดับการใช้แรง (activity_master.act_intensity): 1 เบา=เขียว 2 ปานกลาง=เหลือง 3 หนัก=ส้ม 4 หนักมาก=แดง
// class .ac-1 … .ac-4 ใน CSS ตั้ง --lc ตามระดับ; API รุ่นเก่าที่ไม่ส่งระดับ ตกไประดับ 2
export function levelOf(actId) {
    const act = state.ACTIVITIES_MAP[actId];
    return SoyDeeActivityIntensity.normalize(act && act.act_intensity);
}
export function levelVar(level) {
    return SoyDeeActivityIntensity.list.filter(l => l.id === level)[0].color;
}

export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Mutable page state: ES module bindings are read-only across modules, so shared
// variables live on this object (state.x = ... from any module).
export const state = {
    selectedDate: startOfDay(new Date()), // วันที่กำลังดู/บันทึก (dact_date)
    mbId: null,
    ACTIVITIES: [], // จาก GET /activities
    ACTIVITIES_MAP: {}, // act_id -> activity
    currentEntries: [], // จาก GET /members/{id}/activity-records?date=...
    editingId: null, // dact_id ที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
    selectedActivityId: null, // act_id ที่เลือกในฟอร์ม
    activityFilterCat: 'all', // ตัวกรองประเภทในฟอร์ม: 'all' หรือ id ประเภท (1-5)
    activityQuery: '', // คำค้นหาในฟอร์ม (พิมพ์เล็ก ตัดช่องว่างแล้ว)
    detailId: null, // dact_id ที่เปิดดูรายละเอียดอยู่
    detailOpener: null, // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด
    activityDatePicker: null,
};
