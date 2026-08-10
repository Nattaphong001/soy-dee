/* ==============================================================================
   FOOD RECORD PAGE — บันทึกการบริโภคอาหารประจำวัน (กระบวนการที่ 5)
   ------------------------------------------------------------------------------
   เชื่อมต่อ backend Go จริงผ่าน assets/js/shared/api.js:
     GET/POST/PUT/DELETE /members/{id}/food-records  (ดู API_SPEC.md §7)
     GET /food-categories -> map fd_id -> {fd_name, fd_traffic_light} ใช้ทั้ง
     เรนเดอร์ traffic-light ในรายการ และ chip เลือกประเภทในฟอร์ม
   ============================================================================== */

/* ==============================================================================
   ระบบภาษา (i18n) — ใช้ window.I18N กลาง (assets/js/shared/i18n.js)
   pattern เดียวกับ profile.js / sleep-record.js
   ============================================================================== */
const FOOD_I18N = {
    th: {
        'page-title': 'บันทึกอาหาร',
        'today-btn': 'วันนี้',
        'summary-title-today': 'สรุปโภชนาการวันนี้',
        'summary-title-date-template': 'สรุปโภชนาการวันที่ {date}',
        'light-green': 'ควรกิน',
        'light-yellow': 'พอดี',
        'light-red': 'ควรลด',
        'modal-title-add': 'เพิ่มรายการอาหาร',
        'modal-title-edit': 'แก้ไขรายการอาหาร',
        'label-meal': 'มื้ออาหาร',
        'meal-pill-1': '🌅 เช้า',
        'meal-pill-2': '☀️ กลางวัน',
        'meal-pill-3': '🌙 เย็น',
        'meal-pill-4': '🍪 ว่าง',
        'btn-add-photo': 'เพิ่มรูปภาพ',
        'btn-remove-photo': 'ลบรูป',
        'label-food-name': 'ชื่ออาหาร',
        'placeholder-food-name': 'เช่น ข้าวผัดกะเพราไก่ไข่ดาว',
        'label-category': 'ประเภทอาหาร',
        'label-time': 'เวลาที่กิน',
        'save-btn': 'บันทึกรายการ',
        'btn-cancel': 'ยกเลิก',
        'meal-1': 'มื้อเช้า',
        'meal-2': 'มื้อกลางวัน',
        'meal-3': 'มื้อเย็น',
        'meal-4': 'มื้อว่าง',
        'cat-none': 'ไม่ระบุประเภท',
        'btn-add-short': '＋ เพิ่ม',
        'meal-empty-template': 'ยังไม่มีรายการใน{meal} แตะ "เพิ่ม" เพื่อบันทึก',
        'summary-total-template': 'ทั้งหมด {count} รายการ',
        'food-photo-alt': 'รูปอาหาร',
        'err-select-meal': 'กรุณาเลือกมื้ออาหาร',
        'err-enter-name': 'กรุณากรอกชื่ออาหาร',
        'err-select-category': 'กรุณาเลือกประเภทอาหาร',
        'delete-title': 'ลบรายการอาหาร',
        'delete-message-template': 'ต้องการลบ "{name}" ออกจากบันทึกใช่หรือไม่?',
        'delete-confirm': 'ลบรายการ',
        'toast-added': 'เพิ่มรายการอาหารแล้ว',
        'toast-updated': 'แก้ไขรายการอาหารแล้ว',
        'toast-deleted': 'ลบรายการอาหารแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่'
    },
    en: {
        'page-title': 'Food Record',
        'today-btn': 'Today',
        'summary-title-today': "Today's Nutrition Summary",
        'summary-title-date-template': 'Nutrition Summary for {date}',
        'light-green': 'Good',
        'light-yellow': 'Moderate',
        'light-red': 'Reduce',
        'modal-title-add': 'Add food item',
        'modal-title-edit': 'Edit food item',
        'label-meal': 'Meal',
        'meal-pill-1': '🌅 Morning',
        'meal-pill-2': '☀️ Afternoon',
        'meal-pill-3': '🌙 Evening',
        'meal-pill-4': '🍪 Snack',
        'btn-add-photo': 'Add photo',
        'btn-remove-photo': 'Remove photo',
        'label-food-name': 'Food name',
        'placeholder-food-name': 'e.g. Fried rice with basil and egg',
        'label-category': 'Food category',
        'label-time': 'Time eaten',
        'save-btn': 'Save item',
        'btn-cancel': 'Cancel',
        'meal-1': 'Breakfast',
        'meal-2': 'Lunch',
        'meal-3': 'Dinner',
        'meal-4': 'Snack',
        'cat-none': 'Uncategorized',
        'btn-add-short': '＋ Add',
        'meal-empty-template': 'No items in {meal} yet — tap "Add" to log one',
        'summary-total-template': 'Total {count} items',
        'food-photo-alt': 'Food photo',
        'err-select-meal': 'Please select a meal',
        'err-enter-name': 'Please enter a food name',
        'err-select-category': 'Please select a food category',
        'delete-title': 'Delete food item',
        'delete-message-template': 'Delete "{name}" from your record?',
        'delete-confirm': 'Delete',
        'toast-added': 'Food item added',
        'toast-updated': 'Food item updated',
        'toast-deleted': 'Food item deleted',
        'toast-delete-failed': 'Failed to delete — please try again'
    }
};

/* ---------- ข้อมูลอ้างอิง: มื้ออาหาร (ตรงกับคอลัมน์ dfd_meal_type ใน DB, ค่าคงที่ ไม่ผูก backend) ---------- */
const MEAL_TYPES = [
    { id: 1, label: 'มื้อเช้า',   icon: '🌅' },
    { id: 2, label: 'มื้อกลางวัน', icon: '☀️' },
    { id: 3, label: 'มื้อเย็น',   icon: '🌙' },
    { id: 4, label: 'มื้อว่าง',   icon: '🍪' }
];

const LIGHT_DOT_CLASS = { 1: 'dot-green', 2: 'dot-yellow', 3: 'dot-red' };
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/* ---------- State ---------- */
let mbId = null;
let currentDate = todayISO();   // วันที่กำลังดูอยู่ (YYYY-MM-DD)
let records = [];               // รายการอาหารของ currentDate (ดึงจาก GET /members/{id}/food-records?date=)
let categories = [];            // ประเภทอาหารทั้งหมด จาก GET /food-categories
let categoryMap = {};           // fd_id -> category, ใช้ lookup ตอนเรนเดอร์
let editingId = null;           // dfd_id ของรายการที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
let selectedMeal = null;
let selectedCategoryId = null;  // fd_id ที่เลือกในฟอร์ม
let uploadedImage = null;       // dataURL รูปที่เพิ่งเลือก — preview ฝั่ง client เท่านั้น ไม่มี endpoint อัปโหลดจริง จึงไม่ถูกส่งไป server
let existingImagePath = null;   // dfd_image เดิมจาก server (ถ้ามี) ใช้แสดงผลอย่างเดียว

/* ==============================================================================
   Helpers
   ============================================================================== */
function todayISO(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDateThai(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    if (I18N.getLang() === 'en') {
        return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const buddhistYear = y + 543;
    return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${buddhistYear}`;
}

// "สรุปโภชนาการวันนี้" ถ้ากำลังดูวันนี้ ไม่งั้นสลับเป็นวันที่จริงที่เลือก
function summaryTitleText() {
    return currentDate === todayISO()
        ? I18N.t(FOOD_I18N, 'summary-title-today')
        : I18N.t(FOOD_I18N, 'summary-title-date-template').replace('{date}', formatDateThai(currentDate));
}

function categoryById(fdId) {
    return categoryMap[fdId] || null;
}

function mealById(id) {
    return MEAL_TYPES.find(m => m.id === id) || null;
}

/** เดามื้อที่น่าจะตรงกับตอนนี้ ใช้ตอนกดปุ่ม FAB (ไม่ได้เจาะจงมื้อจากการ์ด) */
function guessCurrentMeal() {
    const h = new Date().getHours();
    if (h >= 5 && h < 10) return 1;
    if (h >= 10 && h < 14) return 2;
    if (h >= 17 && h < 21) return 3;
    return 4;
}

/* ==============================================================================
   Data — โหลดจาก backend จริง
   ============================================================================== */
async function fetchCategories() {
    try {
        categories = (await SoyDeeAPI.request('/food-categories')) || [];
    } catch (e) {
        categories = [];
    }
    categoryMap = {};
    categories.forEach(c => { categoryMap[c.fd_id] = c; });
}

async function fetchRecords(date) {
    try {
        records = (await SoyDeeAPI.request(`/members/${mbId}/food-records`, { query: { date } })) || [];
    } catch (e) {
        records = [];
    }
}

async function loadAndRender() {
    document.getElementById('dateText').textContent = formatDateThai(currentDate);
    await fetchRecords(currentDate);
    renderSummary();
    renderMealSections();
}

/* ==============================================================================
   Rendering
   ============================================================================== */
function renderSummary() {
    document.getElementById('summaryTitleText').textContent = summaryTitleText();
    const counts = { 1: 0, 2: 0, 3: 0 };
    records.forEach(r => {
        const cat = categoryById(r.fd_id);
        if (cat) counts[cat.fd_traffic_light] += 1;
    });
    document.getElementById('countGreen').textContent = counts[1];
    document.getElementById('countYellow').textContent = counts[2];
    document.getElementById('countRed').textContent = counts[3];
    document.getElementById('summaryTotal').textContent = I18N.t(FOOD_I18N, 'summary-total-template').replace('{count}', records.length);
}

function renderMealSections() {
    const container = document.getElementById('mealSections');
    container.innerHTML = '';

    MEAL_TYPES.forEach(meal => {
        const items = records
            .filter(r => r.dfd_meal_type === meal.id)
            .sort((a, b) => a.dfd_time.localeCompare(b.dfd_time));

        const card = document.createElement('section');
        card.className = 'meal-card';

        const mealLabel = I18N.t(FOOD_I18N, 'meal-' + meal.id);

        const listHtml = items.length
            ? `<div class="food-item-list">${items.map(renderFoodItemHtml).join('')}</div>`
            : `<div class="meal-empty">
                   <div class="meal-empty-icon">${meal.icon}</div>
                   <div class="meal-empty-text">${I18N.t(FOOD_I18N, 'meal-empty-template').replace('{meal}', mealLabel)}</div>
               </div>`;

        card.innerHTML = `
            <div class="meal-card-header">
                <div class="meal-card-title">
                    <span class="meal-icon-box">${meal.icon}</span>
                    ${mealLabel}
                </div>
                <button type="button" class="meal-add-btn" data-add-meal="${meal.id}">${I18N.t(FOOD_I18N, 'btn-add-short')}</button>
            </div>
            ${listHtml}
        `;
        container.appendChild(card);
    });
}

function renderFoodItemHtml(record) {
    const cat = categoryById(record.fd_id);
    const dotClass = cat ? LIGHT_DOT_CLASS[cat.fd_traffic_light] : 'dot-yellow';
    const thumbInner = record.dfd_image
        ? `<img src="${SoyDeeAPI.assetUrl(record.dfd_image)}" alt="">`
        : `<span class="icon-emoji">🍽️</span>`;

    return `
        <div class="food-item" data-id="${record.dfd_id}">
            <div class="food-thumb">${thumbInner}</div>
            <div class="food-info">
                <div class="food-name">${escapeHtml(record.dfd_food_name)}</div>
                <div class="food-meta">
                    <span class="food-time numeric">${record.dfd_time.slice(0, 5)}</span>
                    <span class="food-category-badge">
                        <span class="badge-dot ${dotClass}"></span>
                        ${cat ? escapeHtml(cat.fd_name) : I18N.t(FOOD_I18N, 'cat-none')}
                    </span>
                </div>
            </div>
            <div class="food-item-actions">
                <button type="button" class="icon-action-btn" data-edit-id="${record.dfd_id}" aria-label="แก้ไขรายการ">✏️</button>
                <button type="button" class="icon-action-btn danger" data-delete-id="${record.dfd_id}" aria-label="ลบรายการ">🗑️</button>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ==============================================================================
   Modal: เพิ่ม / แก้ไขรายการอาหาร
   ============================================================================== */
function renderCategoryChips() {
    const wrap = document.getElementById('categoryChipGroup');
    wrap.innerHTML = categories.map(cat => `
        <button type="button" class="category-chip" data-category-id="${cat.fd_id}">
            ${escapeHtml(cat.fd_name)}
        </button>
    `).join('');
}

function openModal(prefillMealId, existingRecord) {
    editingId = existingRecord ? existingRecord.dfd_id : null;
    selectedMeal = existingRecord ? existingRecord.dfd_meal_type : (prefillMealId || guessCurrentMeal());
    selectedCategoryId = existingRecord ? existingRecord.fd_id : null;
    uploadedImage = null;
    existingImagePath = existingRecord ? existingRecord.dfd_image : null;

    document.getElementById('foodModalTitle').textContent = existingRecord
        ? I18N.t(FOOD_I18N, 'modal-title-edit')
        : I18N.t(FOOD_I18N, 'modal-title-add');
    document.getElementById('foodNameInput').value = existingRecord ? existingRecord.dfd_food_name : '';
    document.getElementById('foodTimeInput').value = existingRecord ? existingRecord.dfd_time.slice(0, 5) : nowTimeHHMM();
    document.getElementById('foodFormError').hidden = true;

    updateMealPillUI();
    updateCategoryChipUI();
    updatePhotoPreview();

    const overlay = document.getElementById('foodModalOverlay');
    overlay.classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('foodNameInput').focus());
}

function closeModal() {
    document.getElementById('foodModalOverlay').classList.remove('is-open');
}

function updateMealPillUI() {
    document.querySelectorAll('.meal-pill').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.meal) === selectedMeal);
    });
}

function updateCategoryChipUI() {
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', Number(chip.dataset.categoryId) === selectedCategoryId);
    });
}

function updatePhotoPreview() {
    const preview = document.getElementById('foodPhotoPreview');
    const removeBtn = document.getElementById('foodPhotoRemoveBtn');
    const src = uploadedImage || (existingImagePath ? SoyDeeAPI.assetUrl(existingImagePath) : null);
    if (src) {
        preview.innerHTML = `<img src="${src}" alt="${I18N.t(FOOD_I18N, 'food-photo-alt')}">`;
        removeBtn.hidden = false;
    } else {
        preview.innerHTML = '<span class="icon-emoji">📷</span>';
        removeBtn.hidden = true;
    }
}

async function handleSave() {
    const nameInput = document.getElementById('foodNameInput');
    const timeInput = document.getElementById('foodTimeInput');
    const errorBox = document.getElementById('foodFormError');
    const name = nameInput.value.trim();
    const time = timeInput.value || nowTimeHHMM();

    if (!selectedMeal) {
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
    if (!selectedCategoryId) {
        errorBox.textContent = I18N.t(FOOD_I18N, 'err-select-category');
        errorBox.hidden = false;
        return;
    }
    errorBox.hidden = true;

    // ไม่มี endpoint อัปโหลดรูปอาหาร (ต่างจาก avatar สมาชิก) — ส่ง dfd_image เป็น null เสมอ
    const body = {
        dfd_date: currentDate,
        dfd_time: time + ':00',
        dfd_meal_type: selectedMeal,
        dfd_food_name: name,
        dfd_image: null,
        fd_id: selectedCategoryId
    };

    const saveBtn = document.getElementById('foodSaveBtn');
    saveBtn.disabled = true;
    try {
        const wasEditing = !!editingId;
        if (editingId) {
            await SoyDeeAPI.request(`/members/${mbId}/food-records/${editingId}`, { method: 'PUT', body });
        } else {
            await SoyDeeAPI.request(`/members/${mbId}/food-records`, { method: 'POST', body });
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

function handleDelete(id) {
    const rec = records.find(r => r.dfd_id === id);
    if (!rec) return;
    showConfirm({
        title: I18N.t(FOOD_I18N, 'delete-title'),
        message: I18N.t(FOOD_I18N, 'delete-message-template').replace('{name}', rec.dfd_food_name),
        confirmText: I18N.t(FOOD_I18N, 'delete-confirm'),
        cancelText: I18N.t(FOOD_I18N, 'btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${mbId}/food-records/${id}`, { method: 'DELETE' });
                await loadAndRender();
                showToast(I18N.t(FOOD_I18N, 'toast-deleted'), 'success');
            } catch (err) {
                console.error('delete food record failed', err);
                showToast(I18N.t(FOOD_I18N, 'toast-delete-failed'), 'error');
            }
        }
    });
}

/* ==============================================================================
   Bind events
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(FOOD_I18N);
    mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;

    await fetchCategories();
    renderCategoryChips();
    await loadAndRender();

    // เปิดฟอร์มเพิ่มรายการจากปุ่ม "+ เพิ่ม" ในแต่ละมื้อ / แก้ไข / ลบ (event delegation)
    document.getElementById('mealSections').addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-add-meal]');
        if (addBtn) { openModal(Number(addBtn.dataset.addMeal), null); return; }

        const editBtn = e.target.closest('[data-edit-id]');
        if (editBtn) {
            const rec = records.find(r => r.dfd_id === Number(editBtn.dataset.editId));
            if (rec) openModal(null, rec);
            return;
        }

        const delBtn = e.target.closest('[data-delete-id]');
        if (delBtn) { handleDelete(Number(delBtn.dataset.deleteId)); }
    });

    // ปุ่มลอย (FAB) — เพิ่มรายการโดยเดามื้อจากเวลาปัจจุบัน
    document.getElementById('fabAddBtn').addEventListener('click', () => openModal(null, null));

    // เลือกมื้ออาหารในฟอร์ม
    document.getElementById('mealPillGroup').addEventListener('click', (e) => {
        const btn = e.target.closest('.meal-pill');
        if (!btn) return;
        selectedMeal = Number(btn.dataset.meal);
        updateMealPillUI();
    });

    // เลือกประเภทอาหารในฟอร์ม
    document.getElementById('categoryChipGroup').addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;
        selectedCategoryId = Number(chip.dataset.categoryId);
        updateCategoryChipUI();
    });

    // อัปโหลดรูปภาพ — preview ฝั่ง client เท่านั้น ไม่มี endpoint เก็บไฟล์จริง จึงไม่ถูกส่งไป server
    const photoInput = document.getElementById('foodPhotoInput');
    document.getElementById('foodPhotoBtn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            uploadedImage = reader.result;
            existingImagePath = null;
            updatePhotoPreview();
        };
        reader.readAsDataURL(file);
        photoInput.value = '';
    });
    document.getElementById('foodPhotoRemoveBtn').addEventListener('click', () => {
        uploadedImage = null;
        existingImagePath = null;
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
        getDate: () => new Date(currentDate + 'T00:00:00'),
        onSelect: async (date) => {
            currentDate = todayISO(date);
            await loadAndRender();
        }
    });
});
