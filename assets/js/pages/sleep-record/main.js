import { changeDate, loadData } from './data.js';
import { closeDetail, openDetail } from './detail.js';
import { currentRecord, findRecord } from './helpers.js';
import { closeHistory, isHistoryOpen, loadMoreHistory, openHistory } from './history.js';
import { SLEEP_I18N } from './i18n.js';
import { renderDate } from './render.js';
import { closeSheet, handleDelete, handleSave, openSheet, setQuality, updatePreview } from './sheet.js';
import { dayCache, state } from './state.js';

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
   8. Init + bind events
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(SLEEP_I18N);
    state.mbId = SoyDeeAPI.session.getUserId();
    if (!state.mbId) return;

    renderDate();

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js)
    // ห้ามเลือกอนาคต (disableFuture default ของ component) — ดู/แก้บันทึกย้อนหลังได้
    state.sleepDatePicker = SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => state.selectedDate,
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
        const rec = findRecord(state.detailId);
        closeDetail();
        if (rec) openSheet(rec);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        const id = state.detailId;
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
