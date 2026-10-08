import { todayISO } from './helpers.js';

/* ---------- ข้อมูลอ้างอิง: มื้ออาหาร (ตรงกับคอลัมน์ dfd_meal_type ใน DB, ค่าคงที่ ไม่ผูก backend) ---------- */
export const MEAL_TYPES = [
    { id: 1, label: 'มื้อเช้า',   icon: 'sunrise' },
    { id: 2, label: 'มื้อกลางวัน', icon: 'sun' },
    { id: 3, label: 'มื้อเย็น',   icon: 'moon' },
    { id: 4, label: 'มื้อว่าง',   icon: 'snack' }
];

export const LIGHT_DOT_CLASS = { 1: 'dot-green', 2: 'dot-yellow', 3: 'dot-red' };
export const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* ---------- State ---------- */

// Mutable page state: ES module bindings are read-only across modules, so shared
// variables live on this object (state.x = ... from any module).
export const state = {
    mbId: null,
    currentDate: todayISO(), // วันที่กำลังดูอยู่ (YYYY-MM-DD)
    records: [], // รายการอาหารของ currentDate (ดึงจาก GET /members/{id}/food-records?date=)
    categories: [], // ประเภทอาหารทั้งหมด จาก GET /food-categories
    categoryMap: {}, // fd_id -> category, ใช้ lookup ตอนเรนเดอร์
    editingId: null, // dfd_id ของรายการที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
    selectedMeal: null,
    selectedCategoryId: null, // fd_id ที่เลือกในฟอร์ม
    uploadedImage: null, // blob URL preview ของรูปที่เพิ่งเลือก (ยังไม่ได้อัปโหลด)
    pendingImageBlob: null, // รูปที่บีบอัดแล้ว รออัปโหลดตอนกดบันทึก (POST /members/{id}/food-images)
    existingImagePath: null, // dfd_image เดิมจาก server (path เช่น /uploads/food-images/xx.jpg) — null = ไม่มี/ลบแล้ว
    detailId: null, // dfd_id ที่เปิดดูรายละเอียดอยู่
    detailOpener: null, // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด
};
