/* ==============================================================================
   FOOD RECORD PAGE — บันทึกการบริโภคอาหารประจำวัน (กระบวนการที่ 5)
   ------------------------------------------------------------------------------
   เชื่อมต่อ backend Go จริงผ่าน assets/js/shared/api.js:
     GET/POST/PUT/DELETE /members/{id}/food-records  (ดู API_SPEC.md §7)
     GET /food-categories -> map fd_id -> {fd_name, fd_traffic_light} ใช้ทั้ง
     เรนเดอร์สีสถานะในรายการ และ chip เลือกประเภทในฟอร์ม
   ============================================================================== */

/* ==============================================================================
   ระบบภาษา (i18n) — ใช้ window.I18N กลาง (assets/js/shared/i18n.js)
   pattern เดียวกับ profile.js / sleep-record.js
   ============================================================================== */
const FOOD_I18N = {
    th: {
        'page-title': 'บันทึกอาหาร',
        'page-subtitle': 'จดสิ่งที่กิน แล้วดูสมดุลของวันจากสีสถานะ',
        'today-btn': 'วันนี้',
        'summary-title-today': 'สรุปโภชนาการวันนี้',
        'summary-title-date-template': 'สรุปโภชนาการวันที่ {date}',
        'light-green': 'ดีต่อสุขภาพ',
        'light-yellow': 'ทานพอดี',
        'light-red': 'ควรระวัง',
        'group-green': 'กลุ่มสารอาหารสูง',
        'group-yellow': 'กลุ่มทางเลือกกลาง',
        'group-red': 'กลุ่มสารอาหารน้อย / แคลอรีสูง',
        'modal-title-add': 'เพิ่มรายการอาหาร',
        'modal-title-edit': 'แก้ไขรายการอาหาร',
        'label-meal': 'มื้ออาหาร',
        'meal-pill-1': 'เช้า',
        'meal-pill-2': 'กลางวัน',
        'meal-pill-3': 'เย็น',
        'meal-pill-4': 'ว่าง',
        'photo-add-hint': 'เพิ่มรูป',
        'label-food-name': 'ชื่ออาหาร',
        'placeholder-food-name': 'เช่น ข้าวผัดกะเพรา',
        'label-category': 'ประเภทอาหาร',
        'category-placeholder': 'เลือกประเภทอาหาร',
        'label-amount': 'ปริมาณ',
        'placeholder-amount': 'เช่น 1 จาน, 200 กรัม',
        'label-time': 'เวลาที่กิน',
        'save-btn': 'บันทึกรายการ',
        'btn-cancel': 'ยกเลิก',
        'meal-1': 'มื้อเช้า',
        'meal-2': 'มื้อกลางวัน',
        'meal-3': 'มื้อเย็น',
        'meal-4': 'มื้อว่าง',
        'cat-none': 'ไม่ระบุประเภท',
        'summary-total-template': 'ทั้งหมด {count} รายการ',
        'section-heading-today-log': 'บันทึกของวันนี้',
        'items-suffix': 'รายการ',
        'empty-state-title': 'ยังไม่มีรายการอาหารในวันนี้',
        'empty-state-desc': 'บันทึกสิ่งที่กิน แล้วดูสัดส่วนสถานะอาหารของวัน',
        'insight-no-red': 'ไม่มีรายการที่ควรระวัง ทำได้ดีมาก',
        'insight-more-red': 'รายการที่ควรระวังมากกว่าที่ดีต่อสุขภาพ ลองเพิ่มผักหรือผลไม้',
        'insight-balanced': 'สมดุลดี รายการที่ดีต่อสุขภาพมีมากกว่าหรือเท่ากับที่ควรระวัง',
        'summary-bar-label': 'ดีต่อสุขภาพ {g} ทานพอดี {y} ควรระวัง {r}',
        'open-item-label': 'ดูรายละเอียด {name}',
        'detail-meal': 'มื้ออาหาร',
        'detail-time': 'เวลาที่กิน',
        'detail-amount': 'ปริมาณ',
        'detail-light': 'สถานะ',
        'detail-edit': 'แก้ไขรายการ',
        'detail-delete': 'ลบ',
        'detail-no-amount': 'ไม่ระบุ',
        'time-suffix': ' น.',
        'food-photo-alt': 'รูปอาหาร',
        'err-photo-read': 'อ่านรูปนี้ไม่ได้ ลองเลือกรูปอื่น',
        'err-photo-upload': 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่',
        'err-select-meal': 'กรุณาเลือกมื้ออาหาร',
        'err-enter-name': 'กรุณากรอกชื่ออาหาร',
        'err-select-category': 'กรุณาเลือกประเภทอาหาร',
        'delete-title': 'ลบรายการอาหาร',
        'delete-message-template': 'ต้องการลบ "{name}" ออกจากบันทึกใช่หรือไม่?',
        'delete-confirm': 'ลบรายการ',
        'toast-added': 'เพิ่มรายการอาหารแล้ว',
        'toast-updated': 'แก้ไขรายการอาหารแล้ว',
        'toast-deleted': 'ลบรายการอาหารแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่',
        'toast-load-failed': 'โหลดรายการอาหารไม่สำเร็จ กรุณาลองใหม่'
    },
    en: {
        'page-title': 'Food Record',
        'page-subtitle': "Log what you eat and see the day's balance by status color",
        'today-btn': 'Today',
        'summary-title-today': "Today's Nutrition Summary",
        'summary-title-date-template': 'Nutrition Summary for {date}',
        'light-green': 'Healthy',
        'light-yellow': 'In moderation',
        'light-red': 'Watch out',
        'group-green': 'Nutrient-rich',
        'group-yellow': 'Middle-ground options',
        'group-red': 'Low nutrients / high calories',
        'modal-title-add': 'Add food item',
        'modal-title-edit': 'Edit food item',
        'label-meal': 'Meal',
        'meal-pill-1': 'Morning',
        'meal-pill-2': 'Afternoon',
        'meal-pill-3': 'Evening',
        'meal-pill-4': 'Snack',
        'photo-add-hint': 'Add photo',
        'label-food-name': 'Food name',
        'placeholder-food-name': 'e.g. Basil fried rice',
        'label-category': 'Food category',
        'category-placeholder': 'Choose a category',
        'label-amount': 'Amount',
        'placeholder-amount': 'e.g. 1 plate, 200 g',
        'label-time': 'Time eaten',
        'save-btn': 'Save item',
        'btn-cancel': 'Cancel',
        'meal-1': 'Breakfast',
        'meal-2': 'Lunch',
        'meal-3': 'Dinner',
        'meal-4': 'Snack',
        'cat-none': 'Uncategorized',
        'summary-total-template': 'Total {count} items',
        'section-heading-today-log': "Today's log",
        'items-suffix': 'items',
        'empty-state-title': 'No food logged today',
        'empty-state-desc': "Log what you eat and see how your day splits by status",
        'insight-no-red': 'Nothing to watch out for — well done',
        'insight-more-red': 'More items to watch out for than healthy ones — try adding vegetables or fruit',
        'insight-balanced': 'Well balanced — healthy items match or outnumber those to watch out for',
        'summary-bar-label': 'Healthy {g}, in moderation {y}, watch out {r}',
        'open-item-label': 'View details of {name}',
        'detail-meal': 'Meal',
        'detail-time': 'Time eaten',
        'detail-amount': 'Amount',
        'detail-light': 'Status',
        'detail-edit': 'Edit item',
        'detail-delete': 'Delete',
        'detail-no-amount': 'Not specified',
        'time-suffix': '',
        'food-photo-alt': 'Food photo',
        'err-photo-read': "Couldn't read this photo — try another one",
        'err-photo-upload': 'Photo upload failed — please try again',
        'err-select-meal': 'Please select a meal',
        'err-enter-name': 'Please enter a food name',
        'err-select-category': 'Please select a food category',
        'delete-title': 'Delete food item',
        'delete-message-template': 'Delete "{name}" from your record?',
        'delete-confirm': 'Delete',
        'toast-added': 'Food item added',
        'toast-updated': 'Food item updated',
        'toast-deleted': 'Food item deleted',
        'toast-delete-failed': 'Failed to delete — please try again',
        'toast-load-failed': 'Failed to load food records — please try again'
    }
};

/* ---------- ข้อมูลอ้างอิง: มื้ออาหาร (ตรงกับคอลัมน์ dfd_meal_type ใน DB, ค่าคงที่ ไม่ผูก backend) ---------- */
const MEAL_TYPES = [
    { id: 1, label: 'มื้อเช้า',   icon: 'sunrise' },
    { id: 2, label: 'มื้อกลางวัน', icon: 'sun' },
    { id: 3, label: 'มื้อเย็น',   icon: 'moon' },
    { id: 4, label: 'มื้อว่าง',   icon: 'snack' }
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
let uploadedImage = null;       // blob URL preview ของรูปที่เพิ่งเลือก (ยังไม่ได้อัปโหลด)
let pendingImageBlob = null;    // รูปที่บีบอัดแล้ว รออัปโหลดตอนกดบันทึก (POST /members/{id}/food-images)
let existingImagePath = null;   // dfd_image เดิมจาก server (path เช่น /uploads/food-images/xx.jpg) — null = ไม่มี/ลบแล้ว
let detailId = null;            // dfd_id ที่เปิดดูรายละเอียดอยู่
let detailOpener = null;        // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด

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
        showToast(I18N.t(FOOD_I18N, 'toast-load-failed'), 'error');
    }
}

async function loadAndRender() {
    document.getElementById('dateText').textContent = formatDateThai(currentDate);
    // ปุ่ม "วันนี้" แสดงเฉพาะตอนดูวันย้อนหลัง — วันนี้อยู่แล้วไม่ต้องมีปุ่มกลับ
    document.getElementById('todayBtn').hidden = currentDate === todayISO();
    await fetchRecords(currentDate);
    renderSummary();
    renderLogList();
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

    // แถบสัดส่วนสถานะ — ความกว้างแต่ละช่วงตามจำนวนรายการ (นับเฉพาะรายการที่มีประเภท)
    const counted = counts[1] + counts[2] + counts[3];
    const bar = document.getElementById('summaryBar');
    bar.classList.toggle('is-empty', counted === 0);
    bar.setAttribute('aria-label', I18N.t(FOOD_I18N, 'summary-bar-label')
        .replace('{g}', counts[1]).replace('{y}', counts[2]).replace('{r}', counts[3]));
    [['barGreen', 1], ['barYellow', 2], ['barRed', 3]].forEach(([id, light]) => {
        const seg = document.getElementById(id);
        seg.style.flexGrow = counts[light];
        seg.hidden = counts[light] === 0;
    });

    const insight = document.getElementById('summaryInsight');
    insight.hidden = counted === 0;
    if (counted > 0) {
        const key = counts[3] === 0 ? 'insight-no-red' : counts[3] > counts[1] ? 'insight-more-red' : 'insight-balanced';
        insight.textContent = I18N.t(FOOD_I18N, key);
    }
}

function renderLogList() {
    const list = document.getElementById('logList');
    const badge = document.getElementById('logCountBadge');
    const items = [...records].sort((a, b) => a.dfd_time.localeCompare(b.dfd_time));

    badge.textContent = `${items.length} ${I18N.t(FOOD_I18N, 'items-suffix')}`;

    if (items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon"><i data-icon="note"></i></span>
                <div class="empty-state-title">${I18N.t(FOOD_I18N, 'empty-state-title')}</div>
                <div class="empty-state-desc">${I18N.t(FOOD_I18N, 'empty-state-desc')}</div>
            </div>
        `;
        return;
    }

    // จัดกลุ่มตามมื้อ (เฉพาะมื้อที่มีรายการ) เรียงกลุ่มตามเวลาแรกของมื้อ — items เรียงเวลาอยู่แล้ว
    const groups = MEAL_TYPES
        .map(meal => ({ meal, rows: items.filter(r => r.dfd_meal_type === meal.id) }))
        .filter(g => g.rows.length)
        .sort((a, b) => a.rows[0].dfd_time.localeCompare(b.rows[0].dfd_time));

    list.innerHTML = groups.map(({ meal, rows }) => `
        <div class="log-group">
            <div class="log-group-head">
                <i data-icon="${meal.icon}"></i>
                <span>${I18N.t(FOOD_I18N, 'meal-' + meal.id)}</span>
            </div>
            ${rows.map(renderLogItemHtml).join('')}
        </div>
    `).join('');
}

/** ไอคอนอาหารเป็นพื้นหลังเสมอ + <img> ทับ — รูปโหลดไม่ได้ก็ถูกลบทิ้ง เหลือไอคอนแทน (ดู listener 'error' ท้ายไฟล์) */
function foodPhotoHtml(record) {
    const src = record.dfd_image ? SoyDeeAPI.assetUrl(record.dfd_image) : '';
    return `<i data-icon="food"></i>${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async">` : ''}`;
}

function renderLogItemHtml(record) {
    const cat = categoryById(record.fd_id);
    const dotClass = cat ? LIGHT_DOT_CLASS[cat.fd_traffic_light] : 'dot-gray';
    const label = I18N.t(FOOD_I18N, 'open-item-label').replace('{name}', escapeHtml(record.dfd_food_name));

    return `
        <div class="log-item ${cat ? 'light-' + cat.fd_traffic_light : ''}" data-id="${record.dfd_id}" data-open-id="${record.dfd_id}" role="button" tabindex="0" aria-label="${label}">
            <span class="log-thumb">${foodPhotoHtml(record)}</span>
            <div class="log-item-info">
                <span class="log-item-name">${escapeHtml(record.dfd_food_name)}</span>
                <span class="log-item-meta"><span class="numeric">${record.dfd_time.slice(0, 5)}</span>${record.dfd_amount ? ` · ${escapeHtml(record.dfd_amount)}` : ''}</span>
                <span class="cat-pill"><span class="badge-dot ${dotClass}"></span>${cat ? escapeHtml(cat.fd_name) : I18N.t(FOOD_I18N, 'cat-none')}</span>
            </div>
            <span class="log-item-chevron" aria-hidden="true"></span>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;');
}

/* ==============================================================================
   Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
function openDetail(id, opener) {
    const rec = records.find(r => r.dfd_id === id);
    if (!rec) return;
    detailId = id;
    detailOpener = opener || null;

    const cat = categoryById(rec.fd_id);
    const meal = mealById(rec.dfd_meal_type);
    const light = cat ? cat.fd_traffic_light : 0;

    document.getElementById('foodDetailCard').className = 'detail-card' + (light ? ' light-' + light : '');
    document.getElementById('detailPhotoMedia').innerHTML = foodPhotoHtml(rec);
    document.getElementById('detailName').textContent = rec.dfd_food_name;
    document.getElementById('detailCat').innerHTML =
        `<span class="badge-dot ${light ? LIGHT_DOT_CLASS[light] : 'dot-gray'}"></span>${cat ? escapeHtml(cat.fd_name) : I18N.t(FOOD_I18N, 'cat-none')}`;
    document.getElementById('detailMeal').innerHTML = meal
        ? `<i data-icon="${meal.icon}"></i>${I18N.t(FOOD_I18N, 'meal-' + meal.id)}` : '—';
    document.getElementById('detailTime').textContent = rec.dfd_time.slice(0, 5) + I18N.t(FOOD_I18N, 'time-suffix');
    document.getElementById('detailAmount').textContent = rec.dfd_amount || I18N.t(FOOD_I18N, 'detail-no-amount');
    document.getElementById('detailLight').innerHTML = light
        ? `<span class="badge-dot ${LIGHT_DOT_CLASS[light]}"></span>${I18N.t(FOOD_I18N, ['', 'light-green', 'light-yellow', 'light-red'][light])}` : '—';

    document.getElementById('foodDetailOverlay').classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('detailEditBtn').focus());
}

function closeDetail() {
    document.getElementById('foodDetailOverlay').classList.remove('is-open');
    if (detailOpener && document.contains(detailOpener)) detailOpener.focus();
    detailId = null;
    detailOpener = null;
}

/* ==============================================================================
   Modal: เพิ่ม / แก้ไขรายการอาหาร
   ============================================================================== */
// แยกเป็นกลุ่มตามสีสถานะ (เขียว → เหลือง → แดง) กลุ่มละบรรทัด มีหัวกลุ่มบอกความหมาย — สีไม่ปนกัน
function renderCategoryChips() {
    const wrap = document.getElementById('categoryChipGroup');
    wrap.innerHTML = [1, 2, 3].map(light => {
        const items = categories.filter(c => c.fd_traffic_light === light);
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
function setCategoryOpen(open) {
    document.getElementById('categoryChipGroup').hidden = !open;
    const trigger = document.getElementById('categoryTrigger');
    trigger.setAttribute('aria-expanded', String(open));
    trigger.classList.toggle('is-open', open);
}

function openModal(prefillMealId, existingRecord) {
    editingId = existingRecord ? existingRecord.dfd_id : null;
    selectedMeal = existingRecord ? existingRecord.dfd_meal_type : (prefillMealId || guessCurrentMeal());
    selectedCategoryId = existingRecord ? existingRecord.fd_id : null;
    setCategoryOpen(false);
    clearPendingImage();
    existingImagePath = existingRecord ? existingRecord.dfd_image : null;

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
    // แถวที่ยุบอยู่: แสดงประเภทที่เลือก (จุดสี + ชื่อ) หรือข้อความชวนเลือก
    const cat = categoryById(selectedCategoryId);
    const value = document.getElementById('categoryTriggerValue');
    value.classList.toggle('has-value', !!cat);
    value.innerHTML = cat
        ? `<span class="badge-dot ${LIGHT_DOT_CLASS[cat.fd_traffic_light] || 'dot-gray'}"></span>${escapeHtml(cat.fd_name)}`
        : I18N.t(FOOD_I18N, 'category-placeholder');
}

function clearPendingImage() {
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    uploadedImage = null;
    pendingImageBlob = null;
}

function updatePhotoPreview() {
    const preview = document.getElementById('foodPhotoPreview');
    const removeBtn = document.getElementById('foodPhotoRemoveBtn');
    const src = uploadedImage || (existingImagePath ? SoyDeeAPI.assetUrl(existingImagePath) : null);
    preview.innerHTML = `<span class="food-photo-hint"><i data-icon="camera"></i><span>${I18N.t(FOOD_I18N, 'photo-add-hint')}</span></span>`
        + (src ? `<img src="${escapeHtml(src)}" alt="${I18N.t(FOOD_I18N, 'food-photo-alt')}">` : '');
    preview.classList.toggle('has-image', !!src);
    removeBtn.hidden = !src;
}

/** ย่อรูปจากกล้องมือถือ (หลาย MB) ให้ไม่เกิน 1280px เป็น JPEG ก่อนอัปโหลด — ผ่านเพดาน 5MB ของ backend เสมอ */
function compressImage(file, maxSide = 1280, quality = 0.82) {
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
    const res = await SoyDeeAPI.request(`/members/${mbId}/food-images`, { method: 'POST', isForm: true, body: form });
    return res.dfd_image;
}

async function handleSave() {
    const nameInput = document.getElementById('foodNameInput');
    const amountInput = document.getElementById('foodAmountInput');
    const timeInput = document.getElementById('foodTimeInput');
    const errorBox = document.getElementById('foodFormError');
    const name = nameInput.value.trim();
    const amount = amountInput.value.trim();
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
        setCategoryOpen(true);
        return;
    }
    errorBox.hidden = true;

    const saveBtn = document.getElementById('foodSaveBtn');
    saveBtn.disabled = true;
    try {
        // รูปใหม่ → อัปโหลดก่อนได้ path มาใส่ dfd_image; ไม่เปลี่ยน → ใช้ path เดิม; ลบแล้ว → null
        let imagePath = existingImagePath;
        if (pendingImageBlob) {
            try {
                imagePath = await uploadFoodImage(pendingImageBlob);
            } catch (uploadErr) {
                errorBox.textContent = uploadErr.message || I18N.t(FOOD_I18N, 'err-photo-upload');
                errorBox.hidden = false;
                return;
            }
        }

        const body = {
            dfd_date: currentDate,
            dfd_time: time + ':00',
            dfd_meal_type: selectedMeal,
            dfd_food_name: name,
            dfd_amount: amount || null,
            dfd_image: imagePath || null,
            fd_id: selectedCategoryId
        };

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
        const rec = records.find(r => r.dfd_id === detailId);
        closeDetail();
        if (rec) openModal(null, rec);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        const id = detailId;
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
        selectedMeal = Number(btn.dataset.meal);
        updateMealPillUI();
    });

    // เลือกประเภทอาหารในฟอร์ม
    document.getElementById('categoryTrigger').addEventListener('click', () => {
        setCategoryOpen(document.getElementById('categoryChipGroup').hidden);
    });
    document.getElementById('categoryChipGroup').addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;
        selectedCategoryId = Number(chip.dataset.categoryId);
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
            pendingImageBlob = blob;
            uploadedImage = URL.createObjectURL(blob);
            errorBox.hidden = true;
            updatePhotoPreview();
        } catch (err) {
            errorBox.textContent = I18N.t(FOOD_I18N, 'err-photo-read');
            errorBox.hidden = false;
        }
    });
    document.getElementById('foodPhotoRemoveBtn').addEventListener('click', () => {
        clearPendingImage();
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
