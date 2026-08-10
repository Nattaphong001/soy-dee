/* ==============================================================================
   ADMIN.JS — จัดการประเภทอาหาร (food_category) และประเภทกิจกรรม (activity_master)
   ------------------------------------------------------------------------------
   เชื่อม API จริงผ่าน SoyDeeAPI (assets/js/shared/api.js):
     โหลด  -> GET    /admin/food-categories , /admin/activities
     บันทึก -> POST/PUT /admin/food-categories[/:id] , /admin/activities[/:id]
     ลบ    -> DELETE .../:id (409 ถ้ายังมีข้อมูลอ้างอิงอยู่)
   ข้อมูล front-end ภายในไฟล์นี้ใช้ shape ย่อ { id, name, traffic, image }
   แปลงจาก/ไป field จริงของ API (fd_id/fd_name/... , act_id/act_name/...) ผ่าน mapFoodFromApi/mapActivityFromApi
   ============================================================================== */

/* ==============================================================================
   0. ระบบภาษา (i18n) — ใช้เอนจินกลางจาก assets/js/shared/i18n.js (window.I18N)
   ============================================================================== */
const ADMIN_I18N = {
    th: {
        'page-title': 'จัดการข้อมูลพื้นฐาน',
        'role-badge': 'ผู้ดูแลระบบ',
        'tab-food': '🍽️ ประเภทอาหาร',
        'tab-activity': '⚡ ประเภทกิจกรรม',
        'placeholder-search': 'ค้นหาชื่อ...',
        'btn-add': 'เพิ่ม',
        'btn-select-image': 'เลือกรูปภาพ',
        'btn-remove-image': 'ลบรูปภาพ',
        'label-traffic-light': 'เกณฑ์สีโภชนาการ',
        'traffic-green': '🟢 เขียว',
        'traffic-yellow': '🟡 เหลือง',
        'traffic-red': '🔴 แดง',
        'traffic-hint': 'เขียว = กินได้บ่อย · เหลือง = กินได้แต่พอดี · แดง = ควรจำกัด',
        'btn-save': 'บันทึก',
        'btn-cancel': 'ยกเลิก',

        'traffic-label-green': 'เขียว',
        'traffic-label-yellow': 'เหลือง',
        'traffic-label-red': 'แดง',

        'summary-total': (n) => `ทั้งหมด ${n} รายการ`,
        'summary-search-suffix': (n, q) => ` · พบ ${n} รายการที่ตรงกับ "${q}"`,

        'empty-food-title': 'ยังไม่มีประเภทอาหารในระบบ',
        'empty-food-desc': 'กดปุ่ม “+ เพิ่ม” ด้านบนเพื่อเริ่มเพิ่มประเภทอาหาร',
        'empty-activity-title': 'ยังไม่มีประเภทกิจกรรมในระบบ',
        'empty-activity-desc': 'กดปุ่ม “+ เพิ่ม” ด้านบนเพื่อเริ่มเพิ่มประเภทกิจกรรม',
        'empty-search-title': (q) => `ไม่พบ "${q}"`,
        'empty-search-desc': 'ลองค้นหาด้วยคำอื่น หรือกดปุ่ม “+ เพิ่ม” เพื่อสร้างรายการใหม่',

        'modal-title-add-food': 'เพิ่มประเภทอาหาร',
        'modal-title-edit-food': 'แก้ไขประเภทอาหาร',
        'modal-title-add-activity': 'เพิ่มประเภทกิจกรรม',
        'modal-title-edit-activity': 'แก้ไขประเภทกิจกรรม',
        'label-name-food': 'ชื่อประเภทอาหาร',
        'label-name-activity': 'ชื่อกิจกรรม',
        'placeholder-name-food': 'เช่น ผัก / สลัด',
        'placeholder-name-activity': 'เช่น วิ่ง / จ็อกกิ้ง',

        'err-image-type': 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        'err-name-required-food': 'กรุณากรอกชื่อประเภทอาหาร',
        'err-name-required-activity': 'กรุณากรอกชื่อกิจกรรม',
        'err-traffic-required': 'กรุณาเลือกเกณฑ์สีโภชนาการ',
        'err-duplicate-name': 'มีชื่อนี้อยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น',

        'aria-edit': 'แก้ไข',
        'aria-delete': 'ลบ',

        'confirm-delete-title': (name) => `ลบ "${name}" ?`,
        'confirm-delete-message': (warnCascade) => `การลบไม่สามารถย้อนกลับได้ · ${warnCascade}`,
        'confirm-delete-confirm': 'ลบรายการ',
        'warn-cascade-activity': 'บันทึกกิจกรรมประจำวันของผู้ใช้ที่อ้างอิงรายการนี้จะถูกลบไปด้วย',
        'warn-cascade-food': 'บันทึกอาหารของผู้ใช้ที่อ้างอิงรายการนี้จะยังอยู่ แต่จะไม่มีประเภทอาหารกำกับอีกต่อไป',

        'confirm-logout-title': 'ออกจากระบบ',
        'confirm-logout-message': 'คุณต้องการออกจากระบบผู้ดูแลระบบใช่หรือไม่?',
        'confirm-logout-confirm': 'ออกจากระบบ'
    },
    en: {
        'page-title': 'Manage Base Data',
        'role-badge': 'Administrator',
        'tab-food': '🍽️ Food Types',
        'tab-activity': '⚡ Activity Types',
        'placeholder-search': 'Search by name...',
        'btn-add': 'Add',
        'btn-select-image': 'Select Image',
        'btn-remove-image': 'Remove Image',
        'label-traffic-light': 'Nutrition Traffic Light',
        'traffic-green': '🟢 Green',
        'traffic-yellow': '🟡 Yellow',
        'traffic-red': '🔴 Red',
        'traffic-hint': 'Green = eat often · Yellow = eat in moderation · Red = limit intake',
        'btn-save': 'Save',
        'btn-cancel': 'Cancel',

        'traffic-label-green': 'Green',
        'traffic-label-yellow': 'Yellow',
        'traffic-label-red': 'Red',

        'summary-total': (n) => `Total ${n} items`,
        'summary-search-suffix': (n, q) => ` · Found ${n} matching "${q}"`,

        'empty-food-title': 'No food types yet',
        'empty-food-desc': 'Tap “+ Add” above to start adding a food type',
        'empty-activity-title': 'No activity types yet',
        'empty-activity-desc': 'Tap “+ Add” above to start adding an activity type',
        'empty-search-title': (q) => `No results for "${q}"`,
        'empty-search-desc': 'Try another search term, or tap “+ Add” to create a new item',

        'modal-title-add-food': 'Add Food Type',
        'modal-title-edit-food': 'Edit Food Type',
        'modal-title-add-activity': 'Add Activity Type',
        'modal-title-edit-activity': 'Edit Activity Type',
        'label-name-food': 'Food Type Name',
        'label-name-activity': 'Activity Name',
        'placeholder-name-food': 'e.g. Vegetables / Salad',
        'placeholder-name-activity': 'e.g. Running / Jogging',

        'err-image-type': 'Please select an image file only',
        'err-name-required-food': 'Please enter a food type name',
        'err-name-required-activity': 'Please enter an activity name',
        'err-traffic-required': 'Please select a nutrition traffic light',
        'err-duplicate-name': 'This name already exists. Please use another name',

        'aria-edit': 'Edit',
        'aria-delete': 'Delete',

        'confirm-delete-title': (name) => `Delete "${name}"?`,
        'confirm-delete-message': (warnCascade) => `This cannot be undone · ${warnCascade}`,
        'confirm-delete-confirm': 'Delete Item',
        'warn-cascade-activity': "Users' daily activity logs referencing this item will also be deleted",
        'warn-cascade-food': "Users' food logs referencing this item will remain, but will no longer have a food type assigned",

        'confirm-logout-title': 'Log Out',
        'confirm-logout-message': 'Are you sure you want to log out of the admin panel?',
        'confirm-logout-confirm': 'Log Out'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    I18N.apply(ADMIN_I18N);

    /* ============================================
       0. ข้อมูลจริงจาก API — โหลดตอนเริ่มหน้า (ดูส่วนที่ 7 ท้ายไฟล์)
       ============================================ */
    let foodCategories = [];
    let activityMaster = [];

    function mapFoodFromApi(o) {
        return { id: o.fd_id, name: o.fd_name, traffic: o.fd_traffic_light, image: o.fd_images || '' };
    }
    function mapActivityFromApi(o) {
        return { id: o.act_id, name: o.act_name, image: o.act_images || '' };
    }

    async function loadFoodCategories() {
        const data = await SoyDeeAPI.request('/admin/food-categories');
        foodCategories = (data || []).map(mapFoodFromApi);
    }
    async function loadActivities() {
        const data = await SoyDeeAPI.request('/admin/activities');
        activityMaster = (data || []).map(mapActivityFromApi);
    }

    function trafficMeta() {
        return {
            1: { label: I18N.t(ADMIN_I18N, 'traffic-label-green'),  cls: 'traffic-green',  emoji: '🟢' },
            2: { label: I18N.t(ADMIN_I18N, 'traffic-label-yellow'), cls: 'traffic-yellow', emoji: '🟡' },
            3: { label: I18N.t(ADMIN_I18N, 'traffic-label-red'),    cls: 'traffic-red',    emoji: '🔴' }
        };
    }

    /* ============================================
       1. สลับแท็บ ประเภทอาหาร / ประเภทกิจกรรม
       ============================================ */
    const tabs = document.querySelectorAll('.profile-tab');
    const panels = document.querySelectorAll('.tab-panel');
    let currentTab = 'food';

    function activateTab(name) {
        let matched = false;
        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === name;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            if (isActive) matched = true;
        });
        panels.forEach(panel => { panel.hidden = panel.dataset.tabPanel !== name; });
        if (matched) currentTab = name;
        if (searchInput) searchInput.value = '';
        hideListActionError();
        renderCurrentList();
        return matched;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });

    /* ============================================
       2. Render รายการ (list) ตามแท็บปัจจุบัน + คำค้นหา
       ============================================ */
    const foodListEl = document.getElementById('foodList');
    const activityListEl = document.getElementById('activityList');
    const foodEmptyEl = document.getElementById('foodEmpty');
    const activityEmptyEl = document.getElementById('activityEmpty');
    const foodSummaryEl = document.getElementById('foodSummary');
    const activitySummaryEl = document.getElementById('activitySummary');
    const searchInput = document.getElementById('searchInput');

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderFoodList(query) {
        const filtered = foodCategories.filter(item =>
            !query || item.name.toLowerCase().includes(query)
        );

        foodSummaryEl.textContent = I18N.t(ADMIN_I18N, 'summary-total')(foodCategories.length) +
            (query ? I18N.t(ADMIN_I18N, 'summary-search-suffix')(filtered.length, query) : '');

        const TRAFFIC_META = trafficMeta();
        const ariaEdit = I18N.t(ADMIN_I18N, 'aria-edit');
        const ariaDelete = I18N.t(ADMIN_I18N, 'aria-delete');

        foodListEl.innerHTML = filtered.map(item => {
            const meta = TRAFFIC_META[item.traffic] || TRAFFIC_META[1];
            const thumb = item.image
                ? `<img src="${SoyDeeAPI.assetUrl(item.image)}" alt="">`
                : `🍽️`;
            return `
                <div class="item-row" data-id="${item.id}">
                    <div class="item-thumb">${thumb}</div>
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        <span class="traffic-badge ${meta.cls}">${meta.emoji} ${meta.label}</span>
                    </div>
                    <div class="item-actions">
                        <button class="icon-btn" type="button" data-action="edit" aria-label="${ariaEdit}">✏️</button>
                        <button class="icon-btn icon-btn-danger" type="button" data-action="delete" aria-label="${ariaDelete}">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        foodListEl.hidden = filtered.length === 0;
        foodEmptyEl.hidden = filtered.length !== 0;
        if (filtered.length === 0 && query) {
            foodEmptyEl.querySelector('.empty-title').textContent = I18N.t(ADMIN_I18N, 'empty-search-title')(query);
            foodEmptyEl.querySelector('.empty-desc').textContent = I18N.t(ADMIN_I18N, 'empty-search-desc');
        } else {
            foodEmptyEl.querySelector('.empty-title').textContent = I18N.t(ADMIN_I18N, 'empty-food-title');
            foodEmptyEl.querySelector('.empty-desc').textContent = I18N.t(ADMIN_I18N, 'empty-food-desc');
        }
    }

    function renderActivityList(query) {
        const filtered = activityMaster.filter(item =>
            !query || item.name.toLowerCase().includes(query)
        );

        activitySummaryEl.textContent = I18N.t(ADMIN_I18N, 'summary-total')(activityMaster.length) +
            (query ? I18N.t(ADMIN_I18N, 'summary-search-suffix')(filtered.length, query) : '');

        const ariaEdit = I18N.t(ADMIN_I18N, 'aria-edit');
        const ariaDelete = I18N.t(ADMIN_I18N, 'aria-delete');

        activityListEl.innerHTML = filtered.map(item => {
            const thumb = item.image
                ? `<img src="${SoyDeeAPI.assetUrl(item.image)}" alt="">`
                : `⚡`;
            return `
                <div class="item-row" data-id="${item.id}">
                    <div class="item-thumb">${thumb}</div>
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                    </div>
                    <div class="item-actions">
                        <button class="icon-btn" type="button" data-action="edit" aria-label="${ariaEdit}">✏️</button>
                        <button class="icon-btn icon-btn-danger" type="button" data-action="delete" aria-label="${ariaDelete}">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        activityListEl.hidden = filtered.length === 0;
        activityEmptyEl.hidden = filtered.length !== 0;
        if (filtered.length === 0 && query) {
            activityEmptyEl.querySelector('.empty-title').textContent = I18N.t(ADMIN_I18N, 'empty-search-title')(query);
            activityEmptyEl.querySelector('.empty-desc').textContent = I18N.t(ADMIN_I18N, 'empty-search-desc');
        } else {
            activityEmptyEl.querySelector('.empty-title').textContent = I18N.t(ADMIN_I18N, 'empty-activity-title');
            activityEmptyEl.querySelector('.empty-desc').textContent = I18N.t(ADMIN_I18N, 'empty-activity-desc');
        }
    }

    function renderCurrentList() {
        const query = (searchInput.value || '').trim().toLowerCase();
        if (currentTab === 'food') renderFoodList(query);
        else renderActivityList(query);
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderCurrentList);
    }

    /* ============================================
       3. Modal เพิ่ม/แก้ไข (ใช้ร่วมกันทั้งสองแท็บ)
       ============================================ */
    const itemModalOverlay = document.getElementById('itemModalOverlay');
    const itemSheetTitle = document.getElementById('itemSheetTitle');
    const itemNameLabel = document.getElementById('itemNameLabel');
    const itemNameInput = document.getElementById('itemNameInput');
    const trafficLightField = document.getElementById('trafficLightField');
    const trafficPills = document.querySelectorAll('.traffic-pill');
    const itemSheetError = document.getElementById('itemSheetError');
    const itemSaveBtn = document.getElementById('itemSaveBtn');
    const itemCancelBtn = document.getElementById('itemCancelBtn');
    const addItemBtn = document.getElementById('addItemBtn');

    const itemImageInput = document.getElementById('itemImageInput');
    const itemImageBtn = document.getElementById('itemImageBtn');
    const itemImageRemoveBtn = document.getElementById('itemImageRemoveBtn');
    const itemImagePreviewImg = document.getElementById('itemImagePreviewImg');
    const itemImagePlaceholder = document.getElementById('itemImagePlaceholder');

    let editingId = null;      // null = โหมดเพิ่มใหม่, ไม่ null = โหมดแก้ไข
    let editingKind = 'food';  // 'food' | 'activity'
    let selectedTraffic = null;
    let selectedImageData = '';
    let originalImagePath = ''; // path เดิมจาก API (raw, ยังไม่ต่อ assetUrl) — ไว้ส่งกลับตอนแก้ไขถ้าไม่ได้เปลี่ยนรูป
    let imageChanged = false;   // ไม่มี endpoint อัปโหลดรูป food-category/activity — พรีวิวรูปใหม่เป็นแค่ cosmetic ฝั่ง client เท่านั้น

    function resetImagePreview() {
        selectedImageData = '';
        imageChanged = true;
        itemImagePreviewImg.src = '';
        itemImagePreviewImg.hidden = true;
        itemImagePlaceholder.hidden = false;
        itemImageRemoveBtn.hidden = true;
        itemImageInput.value = '';
    }

    function setImagePreview(dataUrl) {
        selectedImageData = dataUrl;
        itemImagePreviewImg.src = dataUrl;
        itemImagePreviewImg.hidden = false;
        itemImagePlaceholder.hidden = true;
        itemImageRemoveBtn.hidden = false;
    }

    function setTrafficSelection(value) {
        selectedTraffic = value;
        trafficPills.forEach(pill => {
            pill.classList.toggle('active', Number(pill.dataset.value) === value);
        });
    }

    function openModal(kind, item) {
        editingKind = kind;
        editingId = item ? item.id : null;
        itemSheetError.hidden = true;

        if (kind === 'food') {
            itemNameLabel.textContent = I18N.t(ADMIN_I18N, 'label-name-food');
            itemNameInput.placeholder = I18N.t(ADMIN_I18N, 'placeholder-name-food');
            trafficLightField.style.display = '';
            setTrafficSelection(item ? item.traffic : null);
            itemSheetTitle.textContent = item
                ? I18N.t(ADMIN_I18N, 'modal-title-edit-food')
                : I18N.t(ADMIN_I18N, 'modal-title-add-food');
        } else {
            itemNameLabel.textContent = I18N.t(ADMIN_I18N, 'label-name-activity');
            itemNameInput.placeholder = I18N.t(ADMIN_I18N, 'placeholder-name-activity');
            trafficLightField.style.display = 'none';
            setTrafficSelection(null);
            itemSheetTitle.textContent = item
                ? I18N.t(ADMIN_I18N, 'modal-title-edit-activity')
                : I18N.t(ADMIN_I18N, 'modal-title-add-activity');
        }

        itemNameInput.value = item ? item.name : '';
        originalImagePath = item ? (item.image || '') : '';
        imageChanged = false;
        if (item && item.image) setImagePreview(SoyDeeAPI.assetUrl(item.image));
        else resetImagePreview();
        imageChanged = false; // resetImagePreview() ข้างบน (กรณีไม่มีรูปเดิม) ไม่ถือเป็นการ "เปลี่ยนรูป" โดยผู้ใช้

        itemModalOverlay.classList.add('is-open');
        setTimeout(() => itemNameInput.focus(), 150);
    }

    function closeModal() {
        itemModalOverlay.classList.remove('is-open');
    }

    function showError(message) {
        itemSheetError.textContent = message;
        itemSheetError.hidden = false;
    }

    trafficPills.forEach(pill => {
        pill.addEventListener('click', () => setTrafficSelection(Number(pill.dataset.value)));
    });

    itemImageBtn.addEventListener('click', () => itemImageInput.click());
    itemImageRemoveBtn.addEventListener('click', resetImagePreview);
    itemImageInput.addEventListener('change', () => {
        const file = itemImageInput.files && itemImageInput.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showError(I18N.t(ADMIN_I18N, 'err-image-type'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => { imageChanged = true; setImagePreview(reader.result); };
        reader.readAsDataURL(file);
    });

    addItemBtn.addEventListener('click', () => { hideListActionError(); openModal(currentTab, null); });
    itemCancelBtn.addEventListener('click', closeModal);
    itemModalOverlay.addEventListener('click', (e) => {
        if (e.target === itemModalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && itemModalOverlay.classList.contains('is-open')) closeModal();
    });

    /* ============================================
       4. บันทึก (เพิ่ม/แก้ไข) พร้อม validation
       ============================================ */
    itemSaveBtn.addEventListener('click', async () => {
        const name = itemNameInput.value.trim();

        if (!name) {
            showError(editingKind === 'food'
                ? I18N.t(ADMIN_I18N, 'err-name-required-food')
                : I18N.t(ADMIN_I18N, 'err-name-required-activity'));
            return;
        }
        if (editingKind === 'food' && !selectedTraffic) {
            showError(I18N.t(ADMIN_I18N, 'err-traffic-required'));
            return;
        }

        const list = editingKind === 'food' ? foodCategories : activityMaster;
        const isDuplicate = list.some(item =>
            item.name.trim().toLowerCase() === name.toLowerCase() && item.id !== editingId
        );
        if (isDuplicate) {
            showError(I18N.t(ADMIN_I18N, 'err-duplicate-name'));
            return;
        }

        // ไม่มี endpoint อัปโหลดรูป food-category/activity: แก้ไขและไม่ได้เปลี่ยนรูป -> ส่ง path เดิมกลับไป, กรณีอื่น (เพิ่มใหม่/เปลี่ยนรูปพรีวิว) -> ส่ง null
        const imageToSend = (editingId && !imageChanged) ? (originalImagePath || null) : null;

        itemSaveBtn.disabled = true;
        try {
            if (editingId) {
                if (editingKind === 'food') {
                    const updated = await SoyDeeAPI.request(`/admin/food-categories/${editingId}`, {
                        method: 'PUT',
                        body: { fd_name: name, fd_traffic_light: selectedTraffic, fd_images: imageToSend }
                    });
                    const target = list.find(item => item.id === editingId);
                    Object.assign(target, mapFoodFromApi(updated));
                } else {
                    const updated = await SoyDeeAPI.request(`/admin/activities/${editingId}`, {
                        method: 'PUT',
                        body: { act_name: name, act_images: imageToSend }
                    });
                    const target = list.find(item => item.id === editingId);
                    Object.assign(target, mapActivityFromApi(updated));
                }
            } else {
                if (editingKind === 'food') {
                    const created = await SoyDeeAPI.request('/admin/food-categories', {
                        method: 'POST',
                        body: { fd_name: name, fd_traffic_light: selectedTraffic, fd_images: imageToSend }
                    });
                    foodCategories.push(mapFoodFromApi({ fd_id: created.fd_id, fd_name: name, fd_traffic_light: selectedTraffic, fd_images: imageToSend }));
                } else {
                    const created = await SoyDeeAPI.request('/admin/activities', {
                        method: 'POST',
                        body: { act_name: name, act_images: imageToSend }
                    });
                    activityMaster.push(mapActivityFromApi({ act_id: created.act_id, act_name: name, act_images: imageToSend }));
                }
            }

            closeModal();
            if (searchInput) searchInput.value = '';
            renderCurrentList();
        } catch (err) {
            showError((err && err.message) || I18N.t(ADMIN_I18N, 'err-duplicate-name'));
        } finally {
            itemSaveBtn.disabled = false;
        }
    });

    /* ============================================
       5. แก้ไข / ลบ รายการ (event delegation ที่ตัว list)
       ============================================ */
    const listActionError = document.getElementById('listActionError');
    function hideListActionError() {
        if (listActionError) listActionError.hidden = true;
    }
    function showListActionError(message) {
        if (!listActionError) return;
        listActionError.textContent = message;
        listActionError.hidden = false;
    }

    function handleListClick(kind, list, e) {
        const row = e.target.closest('.item-row');
        const btn = e.target.closest('.icon-btn');
        if (!row || !btn) return;
        const id = Number(row.dataset.id);
        const item = list.find(i => i.id === id);
        if (!item) return;

        if (btn.dataset.action === 'edit') {
            hideListActionError();
            openModal(kind, item);
        } else if (btn.dataset.action === 'delete') {
            const warnCascade = kind === 'activity'
                ? I18N.t(ADMIN_I18N, 'warn-cascade-activity')
                : I18N.t(ADMIN_I18N, 'warn-cascade-food');
            showConfirm({
                title: I18N.t(ADMIN_I18N, 'confirm-delete-title')(item.name),
                message: I18N.t(ADMIN_I18N, 'confirm-delete-message')(warnCascade),
                confirmText: I18N.t(ADMIN_I18N, 'confirm-delete-confirm'),
                cancelText: I18N.t(ADMIN_I18N, 'btn-cancel'),
                onConfirm: async () => {
                    hideListActionError();
                    try {
                        const path = kind === 'food' ? `/admin/food-categories/${id}` : `/admin/activities/${id}`;
                        await SoyDeeAPI.request(path, { method: 'DELETE' });
                        if (kind === 'food') {
                            foodCategories = foodCategories.filter(i => i.id !== id);
                        } else {
                            activityMaster = activityMaster.filter(i => i.id !== id);
                        }
                        renderCurrentList();
                    } catch (err) {
                        showListActionError((err && err.message) || 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                    }
                }
            });
        }
    }

    foodListEl.addEventListener('click', (e) => handleListClick('food', foodCategories, e));
    activityListEl.addEventListener('click', (e) => handleListClick('activity', activityMaster, e));

    /* ============================================
       6. ออกจากระบบ (Admin)
       ============================================ */
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            showConfirm({
                title: I18N.t(ADMIN_I18N, 'confirm-logout-title'),
                message: I18N.t(ADMIN_I18N, 'confirm-logout-message'),
                confirmText: I18N.t(ADMIN_I18N, 'confirm-logout-confirm'),
                cancelText: I18N.t(ADMIN_I18N, 'btn-cancel'),
                onConfirm: () => { SoyDeeAPI.logout(); }
            });
        });
    }

    /* ============================================
       7. เริ่มต้นแสดงผล — โหลดข้อมูลจริงจาก API ก่อน render
       ============================================ */
    (async function init() {
        try {
            await Promise.all([loadFoodCategories(), loadActivities()]);
        } catch (err) {
            showListActionError((err && err.message) || 'โหลดข้อมูลไม่สำเร็จ กรุณาลองรีเฟรชหน้าใหม่');
        }
        activateTab('food');
    })();
});