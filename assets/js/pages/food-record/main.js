import { fetchCategories, loadAndRender } from './data.js';
import { closeDetail, openDetail } from './detail.js';
import { todayISO } from './helpers.js';
import { FOOD_I18N } from './i18n.js';
import { clearPendingImage, closeModal, compressImage, handleDelete, handleSave, openModal, renderCategoryChips, setCategoryOpen, updateCategoryChipUI, updateMealPillUI, updatePhotoPreview } from './sheet.js';
import { state } from './state.js';

/* ==============================================================================
   Bind events
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(FOOD_I18N);
    state.mbId = SoyDeeAPI.session.getUserId();
    if (!state.mbId) return;

    await fetchCategories();
    renderCategoryChips();
    await loadAndRender();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back ของเบราว์เซอร์) — DOMContentLoaded ไม่ยิงซ้ำ
    // บันทึกที่เพิ่ง/แก้ไว้เลยค้างจนกว่าจะกด refresh เอง แก้โดยโหลดรายการใหม่ทุกครั้งที่ restore
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) loadAndRender();
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
    const detailOverlay = document.getElementById('foodDetailOverlay');
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDetail(); });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
        const rec = state.records.find(r => r.dfd_id === state.detailId);
        closeDetail();
        if (rec) openModal(null, rec);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        const id = state.detailId;
        closeDetail();
        if (id !== null) handleDelete(id);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (detailOverlay.classList.contains('is-open')) closeDetail();
        else if (document.getElementById('foodModalOverlay').classList.contains('is-open')) closeModal();
    });

    // รูปที่โหลดไม่ได้ (ไฟล์หาย/เน็ตหลุด) → เอา <img> ทิ้ง ให้ไอคอนที่อยู่ข้างหลังโผล่แทน
    document.addEventListener('error', (e) => {
        const t = e.target;
        if (t && t.tagName === 'IMG' && t.closest('.log-thumb, .detail-photo-media, .food-photo-preview')) t.remove();
    }, true);

    // ปุ่มลอย (FAB) — เพิ่มรายการโดยเดามื้อจากเวลาปัจจุบัน
    document.getElementById('fabAddBtn').addEventListener('click', () => openModal(null, null));

    // เลือกมื้ออาหารในฟอร์ม
    document.getElementById('mealPillGroup').addEventListener('click', (e) => {
        const btn = e.target.closest('.meal-pill');
        if (!btn) return;
        state.selectedMeal = Number(btn.dataset.meal);
        updateMealPillUI();
    });

    // เลือกประเภทอาหารในฟอร์ม
    document.getElementById('categoryTrigger').addEventListener('click', () => {
        setCategoryOpen(document.getElementById('categoryChipGroup').hidden);
    });
    document.getElementById('categoryChipGroup').addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;
        state.selectedCategoryId = Number(chip.dataset.categoryId);
        updateCategoryChipUI();
        setCategoryOpen(false);   // เลือกแล้วพับเก็บทันที
    });

    // เลือกรูปอาหาร — บีบอัดฝั่ง client แล้ว preview ทันที (อัปโหลดจริงตอนกดบันทึก)
    const photoInput = document.getElementById('foodPhotoInput');
    document.getElementById('foodPhotoBtn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', async () => {
        const file = photoInput.files && photoInput.files[0];
        photoInput.value = '';
        if (!file) return;
        const errorBox = document.getElementById('foodFormError');
        try {
            const blob = await compressImage(file);
            clearPendingImage();
            state.pendingImageBlob = blob;
            state.uploadedImage = URL.createObjectURL(blob);
            errorBox.hidden = true;
            updatePhotoPreview();
        } catch (err) {
            errorBox.textContent = I18N.t(FOOD_I18N, 'err-photo-read');
            errorBox.hidden = false;
        }
    });
    document.getElementById('foodPhotoRemoveBtn').addEventListener('click', () => {
        clearPendingImage();
        state.existingImagePath = null;
        updatePhotoPreview();
    });

    // บันทึก / ยกเลิก
    document.getElementById('foodSaveBtn').addEventListener('click', handleSave);
    document.getElementById('foodCancelBtn').addEventListener('click', closeModal);
    document.getElementById('foodModalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js)
    SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => new Date(state.currentDate + 'T00:00:00'),
        onSelect: async (date) => {
            state.currentDate = todayISO(date);
            await loadAndRender();
        }
    });
});
