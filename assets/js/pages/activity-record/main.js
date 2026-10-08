import { changeDate, loadEntries } from './data.js';
import { closeDetail, openDetail } from './detail.js';
import { ACTIVITY_I18N } from './i18n.js';
import { renderDate } from './render.js';
import { closeSheet, handleDelete, handleSave, openSheet, renderActivityGrid, renderIntensityLegend, updateActivityGridUI } from './sheet.js';
import { state } from './state.js';

/**
 * activity-record.js — หน้า Daily Activity Record (บันทึกกิจกรรม)
 * เชื่อม API จริง: GET /activities (ตัวเลือก), GET/POST/PUT/DELETE /members/{id}/activity-records
 *
 * โครงหน้าเดียวกับ food-record.js: การ์ดสรุป → รายการ (กดดูรายละเอียด) → FAB เปิด bottom sheet เพิ่ม/แก้ไข
 * หมายเหตุ: showConfirm()/showToast() มาจาก assets/js/shared/app.js
 *           ระบบภาษา (i18n) ใช้ window.I18N จาก assets/js/shared/i18n.js
 */

/* ==============================================================================
   8. Init + bind events
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(ACTIVITY_I18N);
    state.mbId = SoyDeeAPI.session.getUserId();
    if (!state.mbId) return;

    renderDate();

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js)
    state.activityDatePicker = SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => state.selectedDate,
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
    const detailOverlay = document.getElementById('activityDetailOverlay');
    const sheetOverlay = document.getElementById('activitySheetOverlay');
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDetail(); });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
        const entry = state.currentEntries.find(e => e.dact_id === state.detailId);
        closeDetail();
        if (entry) openSheet(entry);
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
    });

    // รูปกิจกรรมที่โหลดไม่ได้ (ไฟล์หาย/เน็ตหลุด) → เอา <img> ทิ้ง แล้วโชว์ไอคอนสำรองที่ซ่อนอยู่แทน
    document.addEventListener('error', (e) => {
        const t = e.target;
        if (!t || t.tagName !== 'IMG' || !t.classList.contains('icon-img')) return;
        const fallback = t.nextElementSibling;
        if (fallback && fallback.hasAttribute('data-icon')) fallback.style.display = '';
        t.remove();
    }, true);

    // ปุ่มลอย (FAB) — เพิ่มกิจกรรมใหม่
    document.getElementById('fabAddBtn').addEventListener('click', () => openSheet(null));

    // ค้นหากิจกรรม (พิมพ์แล้วกรองทันที) + กรองตามประเภท
    document.getElementById('activitySearchInput').addEventListener('input', (e) => {
        state.activityQuery = e.target.value.trim().toLowerCase();
        renderActivityGrid();
        document.getElementById('activityChipList').scrollTop = 0;
    });
    document.getElementById('activityFilterBar').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-chip');
        if (!btn) return;
        state.activityFilterCat = btn.dataset.cat === 'all' ? 'all' : Number(btn.dataset.cat);
        renderActivityGrid();
        document.getElementById('activityChipList').scrollTop = 0;
    });

    // เลือกกิจกรรมในฟอร์ม
    document.getElementById('activityChipList').addEventListener('click', (e) => {
        const chip = e.target.closest('.activity-chip');
        if (!chip) return;
        state.selectedActivityId = Number(chip.dataset.actId);
        updateActivityGridUI();
        document.getElementById('actFormError').hidden = true;
    });

    // บันทึก / ยกเลิก
    document.getElementById('actSaveBtn').addEventListener('click', handleSave);
    document.getElementById('actCancelBtn').addEventListener('click', closeSheet);
    sheetOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });

    try {
        state.ACTIVITIES = (await SoyDeeAPI.request('/activities')) || [];
    } catch (err) {
        state.ACTIVITIES = [];
        console.error('load activities failed', err);
    }
    state.ACTIVITIES_MAP = {};
    state.ACTIVITIES.forEach(a => { state.ACTIVITIES_MAP[a.act_id] = a; });

    renderIntensityLegend();
    renderActivityGrid();
    await loadEntries();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back ของเบราว์เซอร์) — DOMContentLoaded ไม่ยิงซ้ำ
    // บันทึกที่เพิ่ง/แก้ไว้เลยค้างจนกว่าจะกด refresh เอง แก้โดยโหลดรายการใหม่ทุกครั้งที่ restore
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) loadEntries();
    });
});
