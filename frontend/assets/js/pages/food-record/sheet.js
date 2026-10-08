import { loadAndRender } from './data.js';
import { categoryById, guessCurrentMeal, nowTimeHHMM } from './helpers.js';
import { FOOD_I18N } from './i18n.js';
import { escapeHtml } from './render.js';
import { LIGHT_DOT_CLASS, state } from './state.js';

/* ==============================================================================
   Modal: เพิ่ม / แก้ไขรายการอาหาร
   ============================================================================== */
// แยกเป็นกลุ่มตามสีสถานะ (เขียว → เหลือง → แดง) กลุ่มละบรรทัด มีหัวกลุ่มบอกความหมาย — สีไม่ปนกัน
export function renderCategoryChips() {
    const wrap = document.getElementById('categoryChipGroup');
    wrap.innerHTML = [1, 2, 3].map(light => {
        const items = state.categories.filter(c => c.fd_traffic_light === light);
        if (!items.length) return '';
        return `
            <div class="category-group">
                <div class="category-group-head"><span class="badge-dot ${LIGHT_DOT_CLASS[light]}"></span>${I18N.t(FOOD_I18N, ['', 'group-green', 'group-yellow', 'group-red'][light])}</div>
                <div class="category-group-chips">
                    ${items.map(cat => `<button type="button" class="category-chip light-${light}" data-category-id="${cat.fd_id}">${escapeHtml(cat.fd_name)}</button>`).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/** ยุบ/ขยายรายการประเภทอาหาร — ยุบไว้เป็นค่าเริ่มต้น เหลือแถวเดียวโชว์ค่าที่เลือก */
export function setCategoryOpen(open) {
    document.getElementById('categoryChipGroup').hidden = !open;
    const trigger = document.getElementById('categoryTrigger');
    trigger.setAttribute('aria-expanded', String(open));
    trigger.classList.toggle('is-open', open);
}

export function openModal(prefillMealId, existingRecord) {
    state.editingId = existingRecord ? existingRecord.dfd_id : null;
    state.selectedMeal = existingRecord ? existingRecord.dfd_meal_type : (prefillMealId || guessCurrentMeal());
    state.selectedCategoryId = existingRecord ? existingRecord.fd_id : null;
    setCategoryOpen(false);
    clearPendingImage();
    state.existingImagePath = existingRecord ? existingRecord.dfd_image : null;

    document.getElementById('foodModalTitle').textContent = existingRecord
        ? I18N.t(FOOD_I18N, 'modal-title-edit')
        : I18N.t(FOOD_I18N, 'modal-title-add');
    document.getElementById('foodNameInput').value = existingRecord ? existingRecord.dfd_food_name : '';
    document.getElementById('foodAmountInput').value = existingRecord ? (existingRecord.dfd_amount || '') : '';
    document.getElementById('foodTimeInput').value = existingRecord ? existingRecord.dfd_time.slice(0, 5) : nowTimeHHMM();
    document.getElementById('foodFormError').hidden = true;

    updateMealPillUI();
    updateCategoryChipUI();
    updatePhotoPreview();

    const overlay = document.getElementById('foodModalOverlay');
    overlay.classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('foodNameInput').focus());
}

export function closeModal() {
    document.getElementById('foodModalOverlay').classList.remove('is-open');
}

export function updateMealPillUI() {
    document.querySelectorAll('.meal-pill').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.meal) === state.selectedMeal);
    });
}

export function updateCategoryChipUI() {
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', Number(chip.dataset.categoryId) === state.selectedCategoryId);
    });
    // แถวที่ยุบอยู่: แสดงประเภทที่เลือก (จุดสี + ชื่อ) หรือข้อความชวนเลือก
    const cat = categoryById(state.selectedCategoryId);
    const value = document.getElementById('categoryTriggerValue');
    value.classList.toggle('has-value', !!cat);
    value.innerHTML = cat
        ? `<span class="badge-dot ${LIGHT_DOT_CLASS[cat.fd_traffic_light] || 'dot-gray'}"></span>${escapeHtml(cat.fd_name)}`
        : I18N.t(FOOD_I18N, 'category-placeholder');
}

export function clearPendingImage() {
    if (state.uploadedImage) URL.revokeObjectURL(state.uploadedImage);
    state.uploadedImage = null;
    state.pendingImageBlob = null;
}

export function updatePhotoPreview() {
    const preview = document.getElementById('foodPhotoPreview');
    const removeBtn = document.getElementById('foodPhotoRemoveBtn');
    const src = state.uploadedImage || (state.existingImagePath ? SoyDeeAPI.assetUrl(state.existingImagePath) : null);
    preview.innerHTML = `<span class="food-photo-hint"><i data-icon="camera"></i><span>${I18N.t(FOOD_I18N, 'photo-add-hint')}</span></span>`
        + (src ? `<img src="${escapeHtml(src)}" alt="${I18N.t(FOOD_I18N, 'food-photo-alt')}">` : '');
    preview.classList.toggle('has-image', !!src);
    removeBtn.hidden = !src;
}

/** ย่อรูปจากกล้องมือถือ (หลาย MB) ให้ไม่เกิน 1280px เป็น JPEG ก่อนอัปโหลด — ผ่านเพดาน 5MB ของ backend เสมอ */
export function compressImage(file, maxSide = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
        img.src = url;
    });
}

async function uploadFoodImage(blob) {
    const form = new FormData();
    form.append('image', blob, 'food.jpg');
    const res = await SoyDeeAPI.request(`/members/${state.mbId}/food-images`, { method: 'POST', isForm: true, body: form });
    return res.dfd_image;
}

export async function handleSave() {
    const nameInput = document.getElementById('foodNameInput');
    const amountInput = document.getElementById('foodAmountInput');
    const timeInput = document.getElementById('foodTimeInput');
    const errorBox = document.getElementById('foodFormError');
    const name = nameInput.value.trim();
    const amount = amountInput.value.trim();
    const time = timeInput.value || nowTimeHHMM();

    if (!state.selectedMeal) {
        errorBox.textContent = I18N.t(FOOD_I18N, 'err-select-meal');
        errorBox.hidden = false;
        return;
    }
    if (!name) {
        errorBox.textContent = I18N.t(FOOD_I18N, 'err-enter-name');
        errorBox.hidden = false;
        nameInput.focus();
        return;
    }
    if (!state.selectedCategoryId) {
        errorBox.textContent = I18N.t(FOOD_I18N, 'err-select-category');
        errorBox.hidden = false;
        setCategoryOpen(true);
        return;
    }
    errorBox.hidden = true;

    const saveBtn = document.getElementById('foodSaveBtn');
    saveBtn.disabled = true;
    try {
        // รูปใหม่ → อัปโหลดก่อนได้ path มาใส่ dfd_image; ไม่เปลี่ยน → ใช้ path เดิม; ลบแล้ว → null
        let imagePath = state.existingImagePath;
        if (state.pendingImageBlob) {
            try {
                imagePath = await uploadFoodImage(state.pendingImageBlob);
            } catch (uploadErr) {
                errorBox.textContent = uploadErr.message || I18N.t(FOOD_I18N, 'err-photo-upload');
                errorBox.hidden = false;
                return;
            }
        }

        const body = {
            dfd_date: state.currentDate,
            dfd_time: time + ':00',
            dfd_meal_type: state.selectedMeal,
            dfd_food_name: name,
            dfd_amount: amount || null,
            dfd_image: imagePath || null,
            fd_id: state.selectedCategoryId
        };

        const wasEditing = !!state.editingId;
        if (state.editingId) {
            await SoyDeeAPI.request(`/members/${state.mbId}/food-records/${state.editingId}`, { method: 'PUT', body });
        } else {
            await SoyDeeAPI.request(`/members/${state.mbId}/food-records`, { method: 'POST', body });
        }
        closeModal();
        await loadAndRender();
        showToast(I18N.t(FOOD_I18N, wasEditing ? 'toast-updated' : 'toast-added'), 'success');
    } catch (err) {
        errorBox.textContent = err.message || I18N.t(FOOD_I18N, 'err-enter-name');
        errorBox.hidden = false;
    } finally {
        saveBtn.disabled = false;
    }
}

export function handleDelete(id) {
    const rec = state.records.find(r => r.dfd_id === id);
    if (!rec) return;
    showConfirm({
        title: I18N.t(FOOD_I18N, 'delete-title'),
        message: I18N.t(FOOD_I18N, 'delete-message-template').replace('{name}', rec.dfd_food_name),
        confirmText: I18N.t(FOOD_I18N, 'delete-confirm'),
        cancelText: I18N.t(FOOD_I18N, 'btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${state.mbId}/food-records/${id}`, { method: 'DELETE' });
                await loadAndRender();
                showToast(I18N.t(FOOD_I18N, 'toast-deleted'), 'success');
            } catch (err) {
                console.error('delete food record failed', err);
                showToast(I18N.t(FOOD_I18N, 'toast-delete-failed'), 'error');
            }
        }
    });
}
