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
        'empty-activity-desc': 'ยังไม่มีประเภทกิจกรรมที่ตั้งค่าไว้ในระบบ',
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
        'warn-cascade-activity': 'ไม่มีบันทึกกิจกรรมของผู้ใช้อ้างอิงรายการนี้ ลบได้ปลอดภัย',
        'warn-blocked-activity': (n) => `ลบไม่ได้ — มีบันทึกกิจกรรมของผู้ใช้อ้างอิงอยู่ ${n} รายการ`,
        'warn-cascade-food': 'บันทึกอาหารของผู้ใช้ที่อ้างอิงรายการนี้จะยังอยู่ แต่จะไม่มีประเภทอาหารกำกับอีกต่อไป',
        'warn-cascade-food-count': (n) => `มีบันทึกอาหารของผู้ใช้อ้างอิงอยู่ ${n} รายการ — บันทึกเหล่านั้นจะยังอยู่ แต่จะไม่มีประเภทอาหารกำกับอีกต่อไป`,

        'confirm-logout-title': 'ออกจากระบบ',
        'confirm-logout-message': 'คุณต้องการออกจากระบบผู้ดูแลระบบใช่หรือไม่?',
        'confirm-logout-confirm': 'ออกจากระบบ',

        'sidebar-overview': 'ภาพรวมระบบ',
        'sidebar-food': 'ประเภทอาหาร',
        'sidebar-activity': 'ประเภทกิจกรรม',
        'sidebar-members': 'ข้อมูลสมาชิก',
        'sidebar-reports': 'รายงาน',
        'sidebar-logout': 'ออกจากระบบ',

        'table-col-name': 'ชื่อ',
        'table-col-traffic': 'เกณฑ์สี',
        'table-col-usage': 'จำนวนที่ถูกใช้',
        'table-col-actions': 'จัดการ',

        'toast-coming-soon': 'เมนูนี้กำลังพัฒนา เร็วๆ นี้',

        'filter-gender-all': 'เพศทั้งหมด',
        'filter-gender-male': 'ชาย',
        'filter-gender-female': 'หญิง',
        'filter-bmi-all': 'BMI ทั้งหมด',

        'gender-1': 'ชาย',
        'gender-2': 'หญิง',
        'bmi-eval-1': 'ผอม',
        'bmi-eval-2': 'ปกติ',
        'bmi-eval-3': 'ท้วม',
        'bmi-eval-4': 'อ้วน',
        'target-1': 'ลดน้ำหนัก',
        'target-2': 'เพิ่มน้ำหนัก',
        'target-3': 'รักษาน้ำหนัก',

        'member-col-name': 'ชื่อ',
        'member-col-username': 'Username',
        'member-col-gender': 'เพศ',
        'member-col-age': 'อายุ',
        'member-col-weight-height': 'น้ำหนัก/ส่วนสูง',
        'member-col-bmi': 'BMI',
        'member-col-target': 'เป้าหมาย',
        'member-col-created': 'วันสมัคร',

        'member-detail-bodystats': 'ประวัติสัดส่วนร่างกาย',
        'member-detail-bmr': 'ประวัติ BMI',
        'member-detail-no-history': 'ยังไม่มีข้อมูล',

        'summary-total-members': (n) => `ทั้งหมด ${n} คน`,
        'empty-members-title': 'ไม่พบข้อมูลสมาชิกที่ตรงกับตัวกรอง',
        'error-load-members': 'โหลดข้อมูลสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

        'report-type-nutrition': 'ภาวะโภชนาการ (BMI)',
        'report-type-food': 'พฤติกรรมการบริโภค',
        'report-type-activity': 'กิจกรรม',
        'report-type-sleep': 'การนอน',
        'report-coming-soon': 'รายงานนี้กำลังพัฒนา เร็วๆ นี้',
        'report-col-category': 'เกณฑ์ BMI',
        'report-col-count': 'จำนวน',
        'report-col-percent': '%',
        'report-empty-title': 'ไม่มีข้อมูลในช่วงที่เลือก',
        'report-stat-total': 'จำนวนสมาชิกทั้งหมด',
        'report-stat-total-minutes': 'นาทีรวม',
        'report-stat-avg-minutes': 'ค่าเฉลี่ยนาทีต่อคน',
        'report-stat-activity-count': 'จำนวนครั้งที่บันทึก',
        'report-stat-avg-sleep-hours': 'ชั่วโมงนอนเฉลี่ย',
        'btn-export-csv': 'ส่งออก CSV',
        'btn-print': 'พิมพ์',
        'error-load-report': 'โหลดรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

        'filter-meal-all': 'มื้อทั้งหมด',
        'filter-meal-breakfast': 'เช้า',
        'filter-meal-lunch': 'กลางวัน',
        'filter-meal-dinner': 'เย็น',
        'filter-meal-snack': 'ของว่าง',
        'filter-traffic-all': 'สีทั้งหมด',
        'filter-activity-all': 'กิจกรรมทั้งหมด',
        'filter-sleep-eval-all': 'ผลประเมินทั้งหมด',
        'filter-sleep-eval-low': 'น้อยเกินไป',
        'filter-sleep-eval-ok': 'พอดี',
        'filter-sleep-eval-high': 'มากเกินไป',

        'report-top-food-title': 'ท็อป 5 ประเภทอาหารที่บันทึกบ่อยที่สุด',
        'report-col-food-category': 'ประเภทอาหาร',
        'report-col-record-count': 'จำนวนครั้งที่บันทึก',
        'report-col-activity': 'กิจกรรม',
        'report-col-sleep-quality': 'คุณภาพการนอน',

        'sleep-quality-1': 'แย่',
        'sleep-quality-2': 'ปานกลาง',
        'sleep-quality-3': 'ดี',

        'overview-total-members': 'สมาชิกทั้งหมด',
        'overview-new-members': 'สมาชิกใหม่เดือนนี้',
        'overview-food-categories': 'ประเภทอาหาร',
        'overview-activity-count': 'ประเภทกิจกรรม',
        'overview-legend-food': 'บันทึกอาหาร',
        'overview-legend-activity': 'บันทึกกิจกรรม',
        'overview-legend-sleep': 'บันทึกการนอน',

        'sidebar-account': 'บัญชีของฉัน',
        'tab-account': '👤 บัญชี',
        'avatar-edit-btn': 'เปลี่ยนรูปโปรไฟล์',
        'label-display-name': 'ชื่อที่แสดง',
        'placeholder-display-name': 'ชื่อของคุณ',
        'label-username': 'ชื่อผู้ใช้ (Username)',
        'placeholder-username': 'username',
        'link-change-password': 'เปลี่ยนรหัสผ่าน',
        'settings-dark-title': 'โหมดมืด',
        'settings-dark-desc': 'ปรับหน้าจอให้สบายตาในที่มืด',
        'settings-lang-title': 'ภาษา',
        'settings-lang-desc': 'เลือกภาษาที่ใช้ในแอป',
        'save-btn': 'บันทึกการเปลี่ยนแปลง',
        'pwd-title': 'เปลี่ยนรหัสผ่าน',
        'pwd-current': 'รหัสผ่านปัจจุบัน',
        'pwd-new': 'รหัสผ่านใหม่',
        'pwd-confirm': 'ยืนยันรหัสผ่านใหม่',
        'pwd-save': 'บันทึกรหัสผ่านใหม่',
        'pwd-cancel': 'ยกเลิก',
        'toast-profile-saved': 'บันทึกการเปลี่ยนแปลงแล้ว',
        'toast-profile-save-failed': 'บันทึกไม่สำเร็จ กรุณาลองใหม่',
        'toast-avatar-updated': 'เปลี่ยนรูปโปรไฟล์แล้ว',
        'toast-password-changed': 'เปลี่ยนรหัสผ่านสำเร็จ',
        'err-duplicate-username': 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น'
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
        'empty-activity-desc': 'No activity types have been set up yet',
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
        'warn-cascade-activity': 'No user activity logs reference this item — safe to delete.',
        'warn-blocked-activity': (n) => `Can't delete — ${n} user activity log(s) still reference this item`,
        'warn-cascade-food': "Users' food logs referencing this item will remain, but will no longer have a food type assigned",
        'warn-cascade-food-count': (n) => `${n} user food log(s) reference this item — they'll remain, but will no longer have a food type assigned`,

        'confirm-logout-title': 'Log Out',
        'confirm-logout-message': 'Are you sure you want to log out of the admin panel?',
        'confirm-logout-confirm': 'Log Out',

        'sidebar-overview': 'Overview',
        'sidebar-food': 'Food Types',
        'sidebar-activity': 'Activity Types',
        'sidebar-members': 'Members',
        'sidebar-reports': 'Reports',
        'sidebar-logout': 'Log Out',

        'table-col-name': 'Name',
        'table-col-traffic': 'Traffic Light',
        'table-col-usage': 'Usage Count',
        'table-col-actions': 'Actions',

        'toast-coming-soon': 'This menu is coming soon',

        'filter-gender-all': 'All genders',
        'filter-gender-male': 'Male',
        'filter-gender-female': 'Female',
        'filter-bmi-all': 'All BMI categories',

        'gender-1': 'Male',
        'gender-2': 'Female',
        'bmi-eval-1': 'Underweight',
        'bmi-eval-2': 'Normal',
        'bmi-eval-3': 'Overweight',
        'bmi-eval-4': 'Obese',
        'target-1': 'Lose weight',
        'target-2': 'Gain weight',
        'target-3': 'Maintain weight',

        'member-col-name': 'Name',
        'member-col-username': 'Username',
        'member-col-gender': 'Gender',
        'member-col-age': 'Age',
        'member-col-weight-height': 'Weight/Height',
        'member-col-bmi': 'BMI',
        'member-col-target': 'Target',
        'member-col-created': 'Joined',

        'member-detail-bodystats': 'Body stats history',
        'member-detail-bmr': 'BMI history',
        'member-detail-no-history': 'No data yet',

        'summary-total-members': (n) => `Total ${n} members`,
        'empty-members-title': 'No members match this filter',
        'error-load-members': 'Failed to load members. Please try again',

        'report-type-nutrition': 'Nutrition status (BMI)',
        'report-type-food': 'Consumption behavior',
        'report-type-activity': 'Activity',
        'report-type-sleep': 'Sleep',
        'report-coming-soon': 'This report is coming soon',
        'report-col-category': 'BMI category',
        'report-col-count': 'Count',
        'report-col-percent': '%',
        'report-empty-title': 'No data for this range',
        'report-stat-total': 'Total members',
        'report-stat-total-minutes': 'Total minutes',
        'report-stat-avg-minutes': 'Avg. minutes per member',
        'report-stat-activity-count': 'Times logged',
        'report-stat-avg-sleep-hours': 'Avg. sleep hours',
        'btn-export-csv': 'Export CSV',
        'btn-print': 'Print',
        'error-load-report': 'Failed to load report. Please try again',

        'filter-meal-all': 'All meals',
        'filter-meal-breakfast': 'Breakfast',
        'filter-meal-lunch': 'Lunch',
        'filter-meal-dinner': 'Dinner',
        'filter-meal-snack': 'Snack',
        'filter-traffic-all': 'All colors',
        'filter-activity-all': 'All activities',
        'filter-sleep-eval-all': 'All results',
        'filter-sleep-eval-low': 'Too little',
        'filter-sleep-eval-ok': 'Adequate',
        'filter-sleep-eval-high': 'Too much',

        'report-top-food-title': 'Top 5 most-logged food categories',
        'report-col-food-category': 'Food category',
        'report-col-record-count': 'Times logged',
        'report-col-activity': 'Activity',
        'report-col-sleep-quality': 'Sleep quality',

        'sleep-quality-1': 'Poor',
        'sleep-quality-2': 'Fair',
        'sleep-quality-3': 'Good',

        'overview-total-members': 'Total members',
        'overview-new-members': 'New members this month',
        'overview-food-categories': 'Food categories',
        'overview-activity-count': 'Activity types',
        'overview-legend-food': 'Food logs',
        'overview-legend-activity': 'Activity logs',
        'overview-legend-sleep': 'Sleep logs',

        'sidebar-account': 'My Account',
        'tab-account': '👤 Account',
        'avatar-edit-btn': 'Change Photo',
        'label-display-name': 'Display Name',
        'placeholder-display-name': 'Your name',
        'label-username': 'Username',
        'placeholder-username': 'username',
        'link-change-password': 'Change Password',
        'settings-dark-title': 'Dark Mode',
        'settings-dark-desc': 'Easier on the eyes in low light',
        'settings-lang-title': 'Language',
        'settings-lang-desc': 'Choose the app language',
        'save-btn': 'Save Changes',
        'pwd-title': 'Change Password',
        'pwd-current': 'Current Password',
        'pwd-new': 'New Password',
        'pwd-confirm': 'Confirm New Password',
        'pwd-save': 'Save New Password',
        'pwd-cancel': 'Cancel',
        'toast-profile-saved': 'Changes saved',
        'toast-profile-save-failed': 'Failed to save — please try again',
        'toast-avatar-updated': 'Profile photo updated',
        'toast-password-changed': 'Password changed',
        'err-duplicate-username': 'This username is already taken'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    I18N.apply(ADMIN_I18N);

    /* ============================================
       0. ข้อมูลจริงจาก API — โหลดตอนเริ่มหน้า (ดูส่วนที่ 7 ท้ายไฟล์)
       ============================================ */
    let foodCategories = [];
    let activityMaster = [];

    const PAGE_SIZE = 10;
    let foodPage = 1;
    let activityPage = 1;

    const MEMBER_PAGE_SIZE = 20;
    let memberItems = [];
    let memberPage = 1;
    let memberTotal = 0;

    function mapFoodFromApi(o) {
        return { id: o.fd_id, name: o.fd_name, traffic: o.fd_traffic_light, image: o.fd_images || '', usage: o.usage_count || 0 };
    }
    function mapActivityFromApi(o) {
        return { id: o.act_id, name: o.act_name, image: o.act_images || '', usage: o.usage_count || 0 };
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
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item[data-sidebar-target]');
    let currentTab = 'food';

    const adminToolbarEl = document.getElementById('adminToolbar');

    function activateTab(name) {
        let matched = false;
        panels.forEach(panel => {
            const isActive = panel.dataset.tabPanel === name;
            panel.hidden = !isActive;
            if (isActive) matched = true;
        });
        if (!matched) return false;

        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === name;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });
        sidebarNavItems.forEach(btn => btn.classList.toggle('active', btn.dataset.sidebarTarget === name));
        // แท็บ "ประเภทกิจกรรม" ไม่ให้ค้นหา/เพิ่มจากหน้านี้อีกต่อไป (เหลือแค่แก้ไข/ลบรายการเดิม)
        if (adminToolbarEl) adminToolbarEl.hidden = (name === 'members' || name === 'reports' || name === 'overview' || name === 'activity');

        currentTab = name;
        if (searchInput) searchInput.value = '';
        foodPage = 1;
        activityPage = 1;
        hideListActionError();
        renderCurrentList();
        return true;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });

    /* Sidebar (จอ ≥768px): food/activity/members ผูกกับระบบแท็บเดิม, เมนูที่ยังไม่มีหน้าเนื้อหา
       (รายงาน/ภาพรวม) แจ้ง toast ไว้ก่อนจนกว่าจะสร้าง panel จริง */
    sidebarNavItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.sidebarTarget;
            if (activateTab(target)) return;
            showToast(I18N.t(ADMIN_I18N, 'toast-coming-soon'));
        });
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
    const foodPaginationEl = document.getElementById('foodPagination');
    const foodPageInfoEl = document.getElementById('foodPageInfo');
    const foodPrevBtn = document.getElementById('foodPrevBtn');
    const foodNextBtn = document.getElementById('foodNextBtn');
    const activityPaginationEl = document.getElementById('activityPagination');
    const activityPageInfoEl = document.getElementById('activityPageInfo');
    const activityPrevBtn = document.getElementById('activityPrevBtn');
    const activityNextBtn = document.getElementById('activityNextBtn');

    // fullTotalItems (ก่อนกรองด้วย query) กำหนดว่าจะซ่อนแถบ pagination หรือไม่ — ค้นหาแล้วไม่เจอ (0 ผลลัพธ์)
    // ไม่ควรทำให้แถบหายไปทั้งที่ข้อมูลจริงมีหลายหน้า ผู้ใช้จะเสียบริบทว่ามีข้อมูลอยู่/กลับไม่ถูก
    function renderPagination(paginationEl, infoEl, prevBtn, nextBtn, page, totalItems, fullTotalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        const fullTotalPages = Math.max(1, Math.ceil((fullTotalItems === undefined ? totalItems : fullTotalItems) / PAGE_SIZE));
        paginationEl.hidden = fullTotalPages <= 1;
        infoEl.textContent = `${page} / ${totalPages}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= totalPages;
        return totalPages;
    }

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

        foodPage = Math.min(foodPage, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
        renderPagination(foodPaginationEl, foodPageInfoEl, foodPrevBtn, foodNextBtn, foodPage, filtered.length, foodCategories.length);
        const pageItems = filtered.slice((foodPage - 1) * PAGE_SIZE, foodPage * PAGE_SIZE);

        const TRAFFIC_META = trafficMeta();
        const ariaEdit = I18N.t(ADMIN_I18N, 'aria-edit');
        const ariaDelete = I18N.t(ADMIN_I18N, 'aria-delete');

        foodListEl.innerHTML = pageItems.map(item => {
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
                    <span class="item-usage">${item.usage}</span>
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

        activityPage = Math.min(activityPage, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
        renderPagination(activityPaginationEl, activityPageInfoEl, activityPrevBtn, activityNextBtn, activityPage, filtered.length, activityMaster.length);
        const pageItems = filtered.slice((activityPage - 1) * PAGE_SIZE, activityPage * PAGE_SIZE);

        const ariaEdit = I18N.t(ADMIN_I18N, 'aria-edit');
        const ariaDelete = I18N.t(ADMIN_I18N, 'aria-delete');

        activityListEl.innerHTML = pageItems.map(item => {
            const thumb = item.image
                ? `<img src="${SoyDeeAPI.assetUrl(item.image)}" alt="">`
                : `⚡`;
            return `
                <div class="item-row" data-id="${item.id}">
                    <div class="item-thumb">${thumb}</div>
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        <span class="traffic-badge traffic-badge-empty" aria-hidden="true"></span>
                    </div>
                    <span class="item-usage">${item.usage}</span>
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
        if (currentTab === 'members') { loadMembers(); return; }
        if (currentTab === 'reports') { onReportsTabActivated(); return; }
        if (currentTab === 'overview') { loadOverviewStats(); return; }
        if (currentTab === 'account') { if (typeof loadAdminProfile === 'function') loadAdminProfile(); return; }
        const query = (searchInput.value || '').trim().toLowerCase();
        if (currentTab === 'food') renderFoodList(query);
        else renderActivityList(query);
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            foodPage = 1;
            activityPage = 1;
            renderCurrentList();
        });
    }

    foodPrevBtn.addEventListener('click', () => { foodPage--; renderCurrentList(); });
    foodNextBtn.addEventListener('click', () => { foodPage++; renderCurrentList(); });
    activityPrevBtn.addEventListener('click', () => { activityPage--; renderCurrentList(); });
    activityNextBtn.addEventListener('click', () => { activityPage++; renderCurrentList(); });

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
            hideListActionError();

            // activity_master.act_id เป็น ON DELETE RESTRICT (migration B6) —
            // ถ้ามีบันทึกอ้างอิงอยู่ ลบไม่ได้แน่นอน เตือนก่อนเปิด dialog เลย
            // ดีกว่าให้กดยืนยันแล้วไปเจอ 409 ทีหลัง
            if (kind === 'activity' && item.usage > 0) {
                showListActionError(I18N.t(ADMIN_I18N, 'warn-blocked-activity')(item.usage));
                return;
            }

            const warnCascade = kind === 'activity'
                ? I18N.t(ADMIN_I18N, 'warn-cascade-activity')
                : (item.usage > 0
                    ? I18N.t(ADMIN_I18N, 'warn-cascade-food-count')(item.usage)
                    : I18N.t(ADMIN_I18N, 'warn-cascade-food'));
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
    function confirmLogout() {
        showConfirm({
            title: I18N.t(ADMIN_I18N, 'confirm-logout-title'),
            message: I18N.t(ADMIN_I18N, 'confirm-logout-message'),
            confirmText: I18N.t(ADMIN_I18N, 'confirm-logout-confirm'),
            cancelText: I18N.t(ADMIN_I18N, 'btn-cancel'),
            onConfirm: () => { SoyDeeAPI.logout(); }
        });
    }
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', confirmLogout);
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', confirmLogout);

    /* ============================================
       7. ข้อมูลสมาชิก (อ่านอย่างเดียว) — โหลดจาก /admin/members ทีละหน้า (server-side pagination)
       ============================================ */
    const memberSearchInput = document.getElementById('memberSearchInput');
    const memberFilterGender = document.getElementById('memberFilterGender');
    const memberFilterBmi = document.getElementById('memberFilterBmi');
    const memberFilterDateFrom = document.getElementById('memberFilterDateFrom');
    const memberFilterDateTo = document.getElementById('memberFilterDateTo');
    const memberSummaryEl = document.getElementById('memberSummary');
    const memberTableWrapEl = document.getElementById('memberTableWrap');
    const memberTableBodyEl = document.getElementById('memberTableBody');
    const memberPaginationEl = document.getElementById('memberPagination');
    const memberPageInfoEl = document.getElementById('memberPageInfo');
    const memberPrevBtn = document.getElementById('memberPrevBtn');
    const memberNextBtn = document.getElementById('memberNextBtn');
    const memberEmptyEl = document.getElementById('memberEmpty');

    const memberDetailOverlay = document.getElementById('memberDetailOverlay');
    const memberDetailName = document.getElementById('memberDetailName');
    const memberDetailMeta = document.getElementById('memberDetailMeta');
    const memberDetailBodyStats = document.getElementById('memberDetailBodyStats');
    const memberDetailBmr = document.getElementById('memberDetailBmr');
    const memberDetailCloseBtn = document.getElementById('memberDetailCloseBtn');

    function fmtDate(value) {
        if (!value) return '—';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(I18N.getLang() === 'en' ? 'en-GB' : 'th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    function fmtNum(value, digits) {
        return (value === null || value === undefined) ? '—' : Number(value).toFixed(digits === undefined ? 1 : digits);
    }
    /* รหัสตัวเลขจาก DB (mb_gender, mbh_eval_result, mbs_target ฯลฯ ล้วนเป็น tinyint ไม่ใช่ข้อความ)
       แปลงเป็นข้อความแสดงผลผ่าน i18n key รูปแบบ "<prefix>-<code>" — โค้ดที่ไม่รู้จักคืน "—" */
    function codeLabel(code, i18nPrefix) {
        if (code === null || code === undefined || code === '') return '—';
        const key = `${i18nPrefix}-${code}`;
        const label = I18N.t(ADMIN_I18N, key);
        return label === key ? '—' : label;
    }
    function genderLabel(g) { return codeLabel(g, 'gender'); }
    function bmiEvalLabel(code) { return codeLabel(code, 'bmi-eval'); }
    function targetLabel(code) { return codeLabel(code, 'target'); }

    async function loadMembers() {
        try {
            hideListActionError();
            const data = await SoyDeeAPI.request('/admin/members', {
                query: {
                    search: memberSearchInput.value.trim(),
                    gender: memberFilterGender.value,
                    bmi_category: memberFilterBmi.value,
                    from: memberFilterDateFrom.value,
                    to: memberFilterDateTo.value,
                    page: memberPage,
                    limit: MEMBER_PAGE_SIZE
                }
            });
            memberItems = (data && data.items) || [];
            memberTotal = (data && data.total) || 0;
            if (data && data.page) memberPage = data.page;
        } catch (err) {
            memberItems = [];
            memberTotal = 0;
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-members'));
        }
        renderMembersList();
    }

    function renderMembersList() {
        memberSummaryEl.textContent = I18N.t(ADMIN_I18N, 'summary-total-members')(memberTotal);

        memberTableBodyEl.innerHTML = memberItems.map(m => `
            <tr data-id="${m.mb_id}">
                <td>${escapeHtml(m.mb_full_name || '—')}</td>
                <td class="member-cell-muted">${escapeHtml(m.mb_user_name || '—')}</td>
                <td>${genderLabel(m.mb_gender)}</td>
                <td>${m.age === null || m.age === undefined ? '—' : m.age}</td>
                <td>${fmtNum(m.mbs_weight)} kg / ${fmtNum(m.mbs_height, 0)} cm</td>
                <td>${fmtNum(m.latest_bmi, 1)}${(m.mbh_eval_result !== null && m.mbh_eval_result !== undefined) ? ` (${bmiEvalLabel(m.mbh_eval_result)})` : ''}</td>
                <td class="member-cell-muted">${targetLabel(m.mbs_target)}</td>
                <td class="member-cell-muted">${fmtDate(m.mb_created_at)}</td>
            </tr>`).join('');

        const isEmpty = memberItems.length === 0;
        memberTableWrapEl.hidden = isEmpty;
        memberEmptyEl.hidden = !isEmpty;

        const totalPages = Math.max(1, Math.ceil(memberTotal / MEMBER_PAGE_SIZE));
        memberPaginationEl.hidden = totalPages <= 1;
        memberPageInfoEl.textContent = `${memberPage} / ${totalPages}`;
        memberPrevBtn.disabled = memberPage <= 1;
        memberNextBtn.disabled = memberPage >= totalPages;
    }

    [memberFilterGender, memberFilterBmi, memberFilterDateFrom, memberFilterDateTo].forEach(el => {
        el.addEventListener('change', () => { memberPage = 1; loadMembers(); });
    });
    let memberSearchDebounce = null;
    memberSearchInput.addEventListener('input', () => {
        clearTimeout(memberSearchDebounce);
        memberSearchDebounce = setTimeout(() => { memberPage = 1; loadMembers(); }, 300);
    });
    memberPrevBtn.addEventListener('click', () => { memberPage--; loadMembers(); });
    memberNextBtn.addEventListener('click', () => { memberPage++; loadMembers(); });

    async function openMemberDetail(id) {
        try {
            const data = await SoyDeeAPI.request(`/admin/members/${id}`);
            const profile = (data && data.profile) || {};
            const bodyStats = (data && data.body_stats) || [];
            const bmrHistory = (data && data.bmr_history) || [];

            memberDetailName.textContent = profile.mb_full_name || '—';
            memberDetailMeta.innerHTML = `
                <span>@${escapeHtml(profile.mb_user_name || '—')}</span>
                <span>${genderLabel(profile.mb_gender)}</span>
                <span>${fmtDate(profile.mb_created_at)}</span>`;

            const noHistory = I18N.t(ADMIN_I18N, 'member-detail-no-history');
            memberDetailBodyStats.innerHTML = bodyStats.length
                ? bodyStats.map(b => `
                    <div class="member-detail-list-row">
                        <span>${fmtDate(b.mbs_recorded_date)}</span>
                        <span>${fmtNum(b.mbs_weight)} kg / ${fmtNum(b.mbs_height, 0)} cm</span>
                    </div>`).join('')
                : `<div class="member-detail-empty">${noHistory}</div>`;

            memberDetailBmr.innerHTML = bmrHistory.length
                ? bmrHistory.map(b => `
                    <div class="member-detail-list-row">
                        <span>${fmtDate(b.mbh_record_date)}</span>
                        <span>BMI ${fmtNum(b.mbh_bmi, 1)}${(b.mbh_eval_result !== null && b.mbh_eval_result !== undefined) ? ` · ${bmiEvalLabel(b.mbh_eval_result)}` : ''}</span>
                    </div>`).join('')
                : `<div class="member-detail-empty">${noHistory}</div>`;

            memberDetailOverlay.classList.add('is-open');
        } catch (err) {
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-members'));
        }
    }

    function closeMemberDetail() { memberDetailOverlay.classList.remove('is-open'); }

    memberTableBodyEl.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (row) openMemberDetail(Number(row.dataset.id));
    });
    memberDetailCloseBtn.addEventListener('click', closeMemberDetail);
    memberDetailOverlay.addEventListener('click', (e) => { if (e.target === memberDetailOverlay) closeMemberDetail(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && memberDetailOverlay.classList.contains('is-open')) closeMemberDetail();
    });

    /* ============================================
       8. รายงาน — 4 แบบ (ภาวะโภชนาการ / พฤติกรรมการบริโภค / กิจกรรม / การนอน)
       ============================================ */
    // /admin/reports?type=bmi ส่ง summary เป็น { "<label ไทย>": count } มาให้แล้ว (backend
    // แปลรหัส mbh_eval_result → ป้ายให้ก่อนส่ง) — ใช้ label ไทยเป็น key สีตรงๆ
    // ใช้ตัวแปรสี BMI แยกจากสี traffic light อาหารโดยเจตนา — "ท้วม" เคยชน
    // สีเหลืองเดียวกับ "อาหารกินได้แต่ควบคุมปริมาณ" มาก่อน (ดู §2.4/§6)
    const NUTRITION_COLORS = {
        'ผอม': 'var(--bmi-thin, #3B82F6)',
        'ปกติ': 'var(--bmi-normal, #10B981)',
        'ท้วม': 'var(--bmi-over, #F97316)',
        'อ้วน': 'var(--bmi-obese, #EF4444)'
    };
    function nutritionColor(label) { return NUTRITION_COLORS[label] || 'var(--accent-1)'; }

    const TRAFFIC_LIGHT_COLORS = { 1: 'var(--food-green, #10B981)', 2: 'var(--food-yellow, #F59E0B)', 3: 'var(--food-red, #EF4444)' };
    function trafficLightLabel(n) { return (trafficMeta()[n] || {}).label || '—'; }

    // /admin/reports?type=sleep ส่ง quality_breakdown เป็น { "<label ไทย>": count } มาให้แล้ว
    // (backend แปลรหัส dslp_quality_score → ป้ายให้ก่อนส่ง) — ใช้ label ไทยเป็น key สีตรงๆ
    const SLEEP_QUALITY_COLORS = { 'แย่': 'var(--color-red, #EF4444)', 'ปานกลาง': 'var(--color-yellow, #F59E0B)', 'ดี': 'var(--color-green, #10B981)' };

    /* ---- helper ที่ใช้ร่วมกันทั้ง 4 รายงาน ---- */
    function renderSimpleBarChart(svgEl, items) {
        const rowH = 42;
        const chartW = 460;
        const barX = 110;
        const barMaxW = chartW - barX - 100;
        const maxCount = Math.max(1, ...items.map(it => it.count));
        const h = Math.max(60, items.length * rowH + 20);

        svgEl.setAttribute('viewBox', `0 0 ${chartW} ${h}`);
        svgEl.innerHTML = items.map((it, i) => {
            const y = i * rowH + 14;
            const barW = Math.max(2, (it.count / maxCount) * barMaxW);
            const pct = it.percent === undefined || it.percent === null ? '' : ` (${fmtNum(it.percent, 1)}%)`;
            return `
                <text x="0" y="${y + 14}" font-size="12" font-weight="600">${escapeHtml(it.label)}</text>
                <rect x="${barX}" y="${y}" width="${barW}" height="22" rx="6" fill="${it.color}"></rect>
                <text x="${barX + barW + 8}" y="${y + 15}" font-size="11" class="report-chart-axis-label">${it.count}${pct}</text>`;
        }).join('');
    }

    function setReportEmptyState(svgEl, tableWrapEl, emptyEl, isEmpty) {
        svgEl.closest('.report-chart-wrap').hidden = isEmpty;
        tableWrapEl.hidden = isEmpty;
        emptyEl.hidden = !isEmpty;
    }

    function downloadCsv(filename, rows) {
        const csv = '﻿' + rows.map(r => r.map(cell => String(cell)).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    /* ---- ตัวเลือกประเภทรายงาน ---- */
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    const REPORT_BODIES = {
        nutrition: document.getElementById('reportBodyNutrition'),
        food: document.getElementById('reportBodyFood'),
        activity: document.getElementById('reportBodyActivity'),
        sleep: document.getElementById('reportBodySleep')
    };
    const REPORT_LOADERS = {
        nutrition: () => loadNutritionReport(),
        food: () => loadFoodReport(),
        activity: () => loadActivityReport(),
        sleep: () => loadSleepReport()
    };

    function onReportsTabActivated() {
        const type = reportTypeSelect.value;
        Object.keys(REPORT_BODIES).forEach(key => { REPORT_BODIES[key].hidden = key !== type; });
        if (REPORT_LOADERS[type]) REPORT_LOADERS[type]();
    }
    reportTypeSelect.addEventListener('change', onReportsTabActivated);

    /* ---- รายงานภาวะโภชนาการ (BMI) ---- */
    const reportNutritionGender = document.getElementById('reportNutritionGender');
    const reportNutritionEval = document.getElementById('reportNutritionEval');
    const reportNutritionDateFrom = document.getElementById('reportNutritionDateFrom');
    const reportNutritionDateTo = document.getElementById('reportNutritionDateTo');
    const reportNutritionExportCsvBtn = document.getElementById('reportNutritionExportCsvBtn');
    const reportNutritionPrintBtn = document.getElementById('reportNutritionPrintBtn');
    const reportNutritionSummaryCardsEl = document.getElementById('reportNutritionSummaryCards');
    const reportNutritionChartSvg = document.getElementById('reportNutritionChartSvg');
    const reportNutritionTableWrapEl = document.getElementById('reportNutritionTableWrap');
    const reportNutritionTableBodyEl = document.getElementById('reportNutritionTableBody');
    const reportNutritionEmptyEl = document.getElementById('reportNutritionEmpty');
    let lastNutritionReport = null;

    [reportNutritionGender, reportNutritionEval, reportNutritionDateFrom, reportNutritionDateTo].forEach(el => {
        el.addEventListener('change', loadNutritionReport);
    });

    async function loadNutritionReport() {
        try {
            hideListActionError();
            const data = await SoyDeeAPI.request('/admin/reports', {
                query: {
                    type: 'bmi',
                    gender: reportNutritionGender.value,
                    eval: reportNutritionEval.value,
                    from: reportNutritionDateFrom.value,
                    to: reportNutritionDateTo.value
                }
            });
            lastNutritionReport = data || { total: 0, summary: {} };
        } catch (err) {
            lastNutritionReport = { total: 0, summary: {} };
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-report'));
        }
        renderNutritionReport();
    }

    // summary จาก /admin/reports?type=bmi เป็น { "<label ไทย>": count } ตรงๆ อยู่แล้ว
    // (backend group by mbh_eval_result แล้วแปลป้ายให้ก่อนส่งมา) แปลงเป็น array
    // {label, count, percent} ไว้ใช้ร่วมกับ renderSimpleBarChart/ตาราง/CSV
    function nutritionBreakdown() {
        const total = (lastNutritionReport && lastNutritionReport.total) || 0;
        const summary = (lastNutritionReport && lastNutritionReport.summary) || {};
        return Object.keys(summary).map(label => ({
            label, count: summary[label], percent: total > 0 ? (summary[label] * 100 / total) : 0
        }));
    }

    function renderNutritionReport() {
        const total = (lastNutritionReport && lastNutritionReport.total) || 0;
        const breakdown = nutritionBreakdown();

        reportNutritionSummaryCardsEl.innerHTML = `
            <div class="report-stat-card">
                <span class="report-stat-label">${I18N.t(ADMIN_I18N, 'report-stat-total')}</span>
                <span class="report-stat-value numeric">${total}</span>
            </div>` + breakdown.map(b => `
            <div class="report-stat-card">
                <span class="report-stat-label">${escapeHtml(b.label)}</span>
                <span class="report-stat-value numeric">${b.count} <small>(${fmtNum(b.percent, 1)}%)</small></span>
            </div>`).join('');

        setReportEmptyState(reportNutritionChartSvg, reportNutritionTableWrapEl, reportNutritionEmptyEl, breakdown.length === 0);

        reportNutritionTableBodyEl.innerHTML = breakdown.map(b => `
            <tr>
                <td>${escapeHtml(b.label)}</td>
                <td>${b.count}</td>
                <td>${fmtNum(b.percent, 1)}%</td>
            </tr>`).join('');

        renderSimpleBarChart(reportNutritionChartSvg, breakdown.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: nutritionColor(b.label) })));
    }

    reportNutritionExportCsvBtn.addEventListener('click', () => {
        const breakdown = nutritionBreakdown();
        const total = (lastNutritionReport && lastNutritionReport.total) || 0;
        downloadCsv(`nutrition-report-${new Date().toISOString().slice(0, 10)}.csv`, [
            ['เกณฑ์ BMI', 'จำนวน', 'เปอร์เซ็นต์'],
            ...breakdown.map(b => [b.label, b.count, fmtNum(b.percent, 1)]),
            ['รวม', total, '100']
        ]);
    });
    reportNutritionPrintBtn.addEventListener('click', () => window.print());

    /* ---- รายงานพฤติกรรมการบริโภค ---- */
    const reportFoodMealType = document.getElementById('reportFoodMealType');
    const reportFoodTrafficLight = document.getElementById('reportFoodTrafficLight');
    const reportFoodDateFrom = document.getElementById('reportFoodDateFrom');
    const reportFoodDateTo = document.getElementById('reportFoodDateTo');
    const reportFoodExportCsvBtn = document.getElementById('reportFoodExportCsvBtn');
    const reportFoodPrintBtn = document.getElementById('reportFoodPrintBtn');
    const reportFoodSummaryCardsEl = document.getElementById('reportFoodSummaryCards');
    const reportFoodChartSvg = document.getElementById('reportFoodChartSvg');
    const reportFoodTableWrapEl = document.getElementById('reportFoodTableWrap');
    const reportFoodTableBodyEl = document.getElementById('reportFoodTableBody');
    const reportFoodEmptyEl = document.getElementById('reportFoodEmpty');
    let lastFoodReport = null;

    [reportFoodMealType, reportFoodTrafficLight, reportFoodDateFrom, reportFoodDateTo].forEach(el => {
        el.addEventListener('change', loadFoodReport);
    });

    async function loadFoodReport() {
        try {
            hideListActionError();
            const data = await SoyDeeAPI.request('/admin/reports', {
                query: {
                    type: 'food',
                    meal_type: reportFoodMealType.value,
                    traffic_light: reportFoodTrafficLight.value,
                    from: reportFoodDateFrom.value,
                    to: reportFoodDateTo.value
                }
            });
            lastFoodReport = data || { total: 0, summary: { green: 0, yellow: 0, red: 0, top_categories: [] } };
        } catch (err) {
            lastFoodReport = { total: 0, summary: { green: 0, yellow: 0, red: 0, top_categories: [] } };
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-report'));
        }
        renderFoodReport();
    }

    // summary จาก /admin/reports?type=food คือ { green, yellow, red, top_categories:[{name,count}] }
    function foodTrafficBreakdown() {
        const total = (lastFoodReport && lastFoodReport.total) || 0;
        const s = (lastFoodReport && lastFoodReport.summary) || {};
        return [
            { key: 1, label: trafficLightLabel(1), count: s.green || 0 },
            { key: 2, label: trafficLightLabel(2), count: s.yellow || 0 },
            { key: 3, label: trafficLightLabel(3), count: s.red || 0 }
        ].map(b => ({ ...b, percent: total > 0 ? (b.count * 100 / total) : 0 }));
    }

    function renderFoodReport() {
        const total = (lastFoodReport && lastFoodReport.total) || 0;
        const breakdown = foodTrafficBreakdown();
        const topCategories = (lastFoodReport && lastFoodReport.summary && lastFoodReport.summary.top_categories) || [];

        reportFoodSummaryCardsEl.innerHTML = `
            <div class="report-stat-card">
                <span class="report-stat-label">${I18N.t(ADMIN_I18N, 'report-stat-total')}</span>
                <span class="report-stat-value numeric">${total}</span>
            </div>` + breakdown.map(b => `
            <div class="report-stat-card">
                <span class="report-stat-label">${b.label}</span>
                <span class="report-stat-value numeric">${b.count} <small>(${fmtNum(b.percent, 1)}%)</small></span>
            </div>`).join('');

        setReportEmptyState(reportFoodChartSvg, reportFoodTableWrapEl, reportFoodEmptyEl, total === 0);

        reportFoodTableBodyEl.innerHTML = topCategories.map(c => `
            <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${c.count}</td>
            </tr>`).join('');

        renderSimpleBarChart(reportFoodChartSvg, breakdown.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: TRAFFIC_LIGHT_COLORS[b.key] || 'var(--accent-1)' })));
    }

    reportFoodExportCsvBtn.addEventListener('click', () => {
        const breakdown = foodTrafficBreakdown();
        const topCategories = (lastFoodReport && lastFoodReport.summary && lastFoodReport.summary.top_categories) || [];
        downloadCsv(`food-report-${new Date().toISOString().slice(0, 10)}.csv`, [
            ['สีโภชนาการ', 'จำนวน', 'เปอร์เซ็นต์'],
            ...breakdown.map(b => [b.label, b.count, fmtNum(b.percent, 1)]),
            [],
            ['ท็อปประเภทอาหาร', 'จำนวนครั้งที่บันทึก'],
            ...topCategories.map(c => [c.name, c.count])
        ]);
    });
    reportFoodPrintBtn.addEventListener('click', () => window.print());

    /* ---- รายงานกิจกรรม/ออกกำลังกาย ---- */
    const reportActivityId = document.getElementById('reportActivityId');
    const reportActivityDateFrom = document.getElementById('reportActivityDateFrom');
    const reportActivityDateTo = document.getElementById('reportActivityDateTo');
    const reportActivityExportCsvBtn = document.getElementById('reportActivityExportCsvBtn');
    const reportActivityPrintBtn = document.getElementById('reportActivityPrintBtn');
    const reportActivitySummaryCardsEl = document.getElementById('reportActivitySummaryCards');
    const reportActivityChartSvg = document.getElementById('reportActivityChartSvg');
    const reportActivityTableWrapEl = document.getElementById('reportActivityTableWrap');
    const reportActivityTableBodyEl = document.getElementById('reportActivityTableBody');
    const reportActivityEmptyEl = document.getElementById('reportActivityEmpty');
    let lastActivityReport = null;

    [reportActivityId, reportActivityDateFrom, reportActivityDateTo].forEach(el => {
        el.addEventListener('change', loadActivityReport);
    });

    function populateActivityFilterOptions() {
        const optionsHtml = activityMaster.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
        reportActivityId.innerHTML = `<option value="" data-i18n="filter-activity-all">${I18N.t(ADMIN_I18N, 'filter-activity-all')}</option>` + optionsHtml;
    }

    async function loadActivityReport() {
        try {
            hideListActionError();
            const data = await SoyDeeAPI.request('/admin/reports', {
                query: { type: 'activity', act_id: reportActivityId.value, from: reportActivityDateFrom.value, to: reportActivityDateTo.value }
            });
            lastActivityReport = data || { total: 0, summary: { activity_count: 0, total_duration_min: 0, top_activities: [] } };
        } catch (err) {
            lastActivityReport = { total: 0, summary: { activity_count: 0, total_duration_min: 0, top_activities: [] } };
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-report'));
        }
        renderActivityReport();
    }

    function renderActivityReport() {
        const s = (lastActivityReport && lastActivityReport.summary) || {};
        const top = s.top_activities || [];

        reportActivitySummaryCardsEl.innerHTML = `
            <div class="report-stat-card">
                <span class="report-stat-label">${I18N.t(ADMIN_I18N, 'report-stat-total-minutes')}</span>
                <span class="report-stat-value numeric">${s.total_duration_min || 0}</span>
            </div>
            <div class="report-stat-card">
                <span class="report-stat-label">${I18N.t(ADMIN_I18N, 'report-stat-activity-count')}</span>
                <span class="report-stat-value numeric">${s.activity_count || 0}</span>
            </div>`;

        setReportEmptyState(reportActivityChartSvg, reportActivityTableWrapEl, reportActivityEmptyEl, top.length === 0);

        reportActivityTableBodyEl.innerHTML = top.map(a => `
            <tr>
                <td>${escapeHtml(a.name)}</td>
                <td>${a.count}</td>
            </tr>`).join('');

        renderSimpleBarChart(reportActivityChartSvg, top.map(a => ({ label: a.name, count: a.count, color: 'var(--accent-1)' })));
    }

    reportActivityExportCsvBtn.addEventListener('click', () => {
        const s = (lastActivityReport && lastActivityReport.summary) || {};
        const top = s.top_activities || [];
        downloadCsv(`activity-report-${new Date().toISOString().slice(0, 10)}.csv`, [
            ['นาทีรวม', 'จำนวนครั้งที่บันทึก'],
            [s.total_duration_min || 0, s.activity_count || 0],
            [],
            ['กิจกรรม', 'จำนวนครั้งที่บันทึก'],
            ...top.map(a => [a.name, a.count])
        ]);
    });
    reportActivityPrintBtn.addEventListener('click', () => window.print());

    /* ---- รายงานพฤติกรรมการนอน ---- */
    const reportSleepEval = document.getElementById('reportSleepEval');
    const reportSleepDateFrom = document.getElementById('reportSleepDateFrom');
    const reportSleepDateTo = document.getElementById('reportSleepDateTo');
    const reportSleepExportCsvBtn = document.getElementById('reportSleepExportCsvBtn');
    const reportSleepPrintBtn = document.getElementById('reportSleepPrintBtn');
    const reportSleepSummaryCardsEl = document.getElementById('reportSleepSummaryCards');
    const reportSleepChartSvg = document.getElementById('reportSleepChartSvg');
    const reportSleepTableWrapEl = document.getElementById('reportSleepTableWrap');
    const reportSleepTableBodyEl = document.getElementById('reportSleepTableBody');
    const reportSleepEmptyEl = document.getElementById('reportSleepEmpty');
    let lastSleepReport = null;

    [reportSleepEval, reportSleepDateFrom, reportSleepDateTo].forEach(el => {
        el.addEventListener('change', loadSleepReport);
    });

    async function loadSleepReport() {
        try {
            hideListActionError();
            const data = await SoyDeeAPI.request('/admin/reports', {
                query: { type: 'sleep', eval: reportSleepEval.value, from: reportSleepDateFrom.value, to: reportSleepDateTo.value }
            });
            lastSleepReport = data || { total: 0, summary: { avg_sleep_hours: 0, quality_breakdown: {} } };
        } catch (err) {
            lastSleepReport = { total: 0, summary: { avg_sleep_hours: 0, quality_breakdown: {} } };
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-report'));
        }
        renderSleepReport();
    }

    // quality_breakdown จาก /admin/reports?type=sleep คือ { "<label ไทย>": count } ตรงๆ
    function sleepQualityBreakdown() {
        const total = (lastSleepReport && lastSleepReport.total) || 0;
        const qb = (lastSleepReport && lastSleepReport.summary && lastSleepReport.summary.quality_breakdown) || {};
        return Object.keys(qb).map(label => ({
            label, count: qb[label], percent: total > 0 ? (qb[label] * 100 / total) : 0
        }));
    }

    function renderSleepReport() {
        const s = (lastSleepReport && lastSleepReport.summary) || {};
        const breakdown = sleepQualityBreakdown();

        reportSleepSummaryCardsEl.innerHTML = `
            <div class="report-stat-card">
                <span class="report-stat-label">${I18N.t(ADMIN_I18N, 'report-stat-avg-sleep-hours')}</span>
                <span class="report-stat-value numeric">${fmtNum(s.avg_sleep_hours, 1)}</span>
            </div>` + breakdown.map(b => `
            <div class="report-stat-card">
                <span class="report-stat-label">${escapeHtml(b.label)}</span>
                <span class="report-stat-value numeric">${b.count} <small>(${fmtNum(b.percent, 1)}%)</small></span>
            </div>`).join('');

        setReportEmptyState(reportSleepChartSvg, reportSleepTableWrapEl, reportSleepEmptyEl, breakdown.length === 0);

        reportSleepTableBodyEl.innerHTML = breakdown.map(b => `
            <tr>
                <td>${escapeHtml(b.label)}</td>
                <td>${b.count}</td>
                <td>${fmtNum(b.percent, 1)}%</td>
            </tr>`).join('');

        renderSimpleBarChart(reportSleepChartSvg, breakdown.map(b => ({ label: b.label, count: b.count, percent: b.percent, color: SLEEP_QUALITY_COLORS[b.label] || 'var(--accent-1)' })));
    }

    reportSleepExportCsvBtn.addEventListener('click', () => {
        const s = (lastSleepReport && lastSleepReport.summary) || {};
        const breakdown = sleepQualityBreakdown();
        downloadCsv(`sleep-report-${new Date().toISOString().slice(0, 10)}.csv`, [
            ['ชั่วโมงนอนเฉลี่ย', fmtNum(s.avg_sleep_hours, 1)],
            [],
            ['คุณภาพการนอน', 'จำนวน', 'เปอร์เซ็นต์'],
            ...breakdown.map(b => [b.label, b.count, fmtNum(b.percent, 1)])
        ]);
    });
    reportSleepPrintBtn.addEventListener('click', () => window.print());

    /* ============================================
       9. ภาพรวมระบบ — หน้าแรกที่แอดมินเห็นหลัง login (จอ ≥768px)
       ============================================ */
    const overviewStatCardsEl = document.getElementById('overviewStatCards');
    const overviewChartLegendEl = document.getElementById('overviewChartLegend');
    const overviewChartSvg = document.getElementById('overviewChartSvg');

    const OVERVIEW_SERIES = [
        { key: 'food', i18nLabel: 'overview-legend-food', color: 'var(--color-green, #10B981)' },
        { key: 'activity', i18nLabel: 'overview-legend-activity', color: 'var(--accent-1)' },
        { key: 'sleep', i18nLabel: 'overview-legend-sleep', color: 'var(--color-yellow, #F59E0B)' }
    ];

    async function loadOverviewStats() {
        try {
            hideListActionError();
            const data = await SoyDeeAPI.request('/admin/stats');
            renderOverviewStats(data || {});
        } catch (err) {
            renderOverviewStats({});
            showListActionError((err && err.message) || I18N.t(ADMIN_I18N, 'error-load-report'));
        }
    }

    function renderOverviewStats(data) {
        overviewStatCardsEl.innerHTML = [
            ['overview-total-members', data.total_members || 0],
            ['overview-new-members', data.new_members_this_month || 0],
            ['overview-food-categories', data.food_category_count || 0],
            ['overview-activity-count', data.activity_count || 0]
        ].map(([labelKey, value]) => `
            <div class="report-stat-card">
                <span class="report-stat-label">${I18N.t(ADMIN_I18N, labelKey)}</span>
                <span class="report-stat-value numeric">${value}</span>
            </div>`).join('');

        overviewChartLegendEl.innerHTML = OVERVIEW_SERIES.map(s => `
            <span class="report-chart-legend-item">
                <span class="report-chart-legend-dot" style="background:${s.color}"></span>
                ${I18N.t(ADMIN_I18N, s.i18nLabel)}
            </span>`).join('');

        renderGroupedBarChart(overviewChartSvg, data.daily_records || [], OVERVIEW_SERIES);
    }

    function renderGroupedBarChart(svgEl, days, seriesMeta) {
        const chartW = 460, chartH = 220;
        const padL = 28, padB = 26, padT = 10, padR = 10;
        const plotW = chartW - padL - padR;
        const plotH = chartH - padT - padB;
        const n = Math.max(1, days.length);
        const groupW = plotW / n;
        const barGap = 3;
        const barW = Math.max(2, (groupW - barGap * (seriesMeta.length + 1)) / seriesMeta.length);
        const maxVal = Math.max(1, ...days.flatMap(d => seriesMeta.map(s => d[s.key] || 0)));

        let content = '';
        days.forEach((d, di) => {
            const groupX = padL + di * groupW;
            seriesMeta.forEach((s, si) => {
                const val = d[s.key] || 0;
                const barH = (val / maxVal) * plotH;
                const x = groupX + barGap + si * (barW + barGap);
                const y = padT + plotH - barH;
                content += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="2" fill="${s.color}"></rect>`;
            });
            const label = (d.date || '').slice(5).replace('-', '/');
            content += `<text x="${groupX + groupW / 2}" y="${chartH - 8}" font-size="10" text-anchor="middle" class="report-chart-axis-label">${label}</text>`;
        });
        content += `<line x1="${padL}" y1="${padT + plotH}" x2="${chartW - padR}" y2="${padT + plotH}" stroke="var(--border-hairline)" stroke-width="1"></line>`;

        svgEl.setAttribute('viewBox', `0 0 ${chartW} ${chartH}`);
        svgEl.innerHTML = content;
    }

    /* ============================================
       11. บัญชีของฉัน (แอดมิน) — โครงเดียวกับ views/user/profile.js แต่ผูกกับ
       GET/PUT /admin/profile, POST /admin/avatar, PUT /admin/password
       (ไม่มี {id} ใน URL — ฝั่ง Go อ่าน sys_id จาก JWT claims เอง)
       ============================================ */
    let adminProfileLoaded = false;
    let adminProfileState = { sys_full_name: '', sys_username: '', sys_avatar_pic: null };

    function renderAdminAvatar(picPath) {
        const box = document.getElementById('adminAvatarBox');
        if (!box || !picPath) return;
        box.innerHTML = `<img src="${SoyDeeAPI.assetUrl(picPath)}" alt="">`;
    }

    async function loadAdminProfile() {
        if (adminProfileLoaded) return;
        adminProfileLoaded = true;
        try {
            const admin = await SoyDeeAPI.request('/admin/profile');
            adminProfileState = {
                sys_full_name: admin.sys_full_name || '',
                sys_username: admin.sys_username || '',
                sys_avatar_pic: admin.sys_avatar_pic || null
            };
            document.getElementById('adminDisplayName').value = adminProfileState.sys_full_name;
            document.getElementById('adminUsername').value = adminProfileState.sys_username;
            if (adminProfileState.sys_avatar_pic) renderAdminAvatar(adminProfileState.sys_avatar_pic);
        } catch (e) {
            adminProfileLoaded = false;
            console.error('load admin profile failed', e);
        }
    }

    const adminSaveProfileBtn = document.getElementById('adminSaveProfileBtn');
    if (adminSaveProfileBtn) {
        adminSaveProfileBtn.addEventListener('click', async () => {
            const errBox = document.getElementById('adminAccountError');
            if (errBox) errBox.hidden = true;

            const body = {
                sys_full_name: document.getElementById('adminDisplayName').value.trim(),
                sys_username: document.getElementById('adminUsername').value.trim()
            };

            const originalText = adminSaveProfileBtn.textContent;
            adminSaveProfileBtn.disabled = true;
            try {
                await SoyDeeAPI.request('/admin/profile', { method: 'PUT', body });
                adminProfileState.sys_full_name = body.sys_full_name;
                adminProfileState.sys_username = body.sys_username;
                SoyDeeAPI.session.updateStoredUser({ full_name: body.sys_full_name, username: body.sys_username });
                showToast(I18N.t(ADMIN_I18N, 'toast-profile-saved'), 'success');
            } catch (e) {
                const msg = (e && e.code === 'DUPLICATE_USERNAME')
                    ? I18N.t(ADMIN_I18N, 'err-duplicate-username')
                    : (e && e.message) || I18N.t(ADMIN_I18N, 'toast-profile-save-failed');
                if (errBox) { errBox.textContent = msg; errBox.hidden = false; }
                showToast(msg, 'error');
            } finally {
                adminSaveProfileBtn.disabled = false;
                adminSaveProfileBtn.textContent = originalText;
            }
        });
    }

    /* -- เปลี่ยนรูปโปรไฟล์ -- */
    const adminAvatarEditBtn = document.getElementById('adminAvatarEditBtn');
    const adminAvatarFileInput = document.getElementById('adminAvatarFileInput');
    const ADMIN_ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ADMIN_MAX_AVATAR_BYTES = 5 * 1024 * 1024;

    if (adminAvatarEditBtn && adminAvatarFileInput) {
        adminAvatarEditBtn.addEventListener('click', () => adminAvatarFileInput.click());

        adminAvatarFileInput.addEventListener('change', async () => {
            const file = adminAvatarFileInput.files && adminAvatarFileInput.files[0];
            adminAvatarFileInput.value = '';
            if (!file) return;

            const errBox = document.getElementById('adminAccountError');
            const showErr = (msg) => { if (errBox) { errBox.textContent = msg; errBox.hidden = false; } };
            if (errBox) errBox.hidden = true;

            if (!ADMIN_ALLOWED_AVATAR_TYPES.includes(file.type)) {
                showErr('รองรับเฉพาะไฟล์ jpg, png, webp เท่านั้น');
                return;
            }
            if (file.size > ADMIN_MAX_AVATAR_BYTES) {
                showErr('ขนาดไฟล์ต้องไม่เกิน 5MB');
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const result = await SoyDeeAPI.request('/admin/avatar', { method: 'POST', isForm: true, body: formData });
                renderAdminAvatar(result.sys_avatar_pic);
                adminProfileState.sys_avatar_pic = result.sys_avatar_pic;
                SoyDeeAPI.session.updateStoredUser({ profile_pic: result.sys_avatar_pic });
                if (typeof broadcastSync === 'function') broadcastSync('avatar-updated', { url: result.sys_avatar_pic });
                showToast(I18N.t(ADMIN_I18N, 'toast-avatar-updated'), 'success');
            } catch (e) {
                const msg = (e && e.message) || 'อัปโหลดรูปไม่สำเร็จ';
                showErr(msg);
                showToast(msg, 'error');
            }
        });
    }

    /* -- สวิตช์ธีม -- */
    const adminThemeSwitch = document.getElementById('adminThemeSwitch');
    if (adminThemeSwitch) {
        const syncAdminThemeSwitch = () => {
            adminThemeSwitch.setAttribute('aria-checked', String(document.documentElement.classList.contains('dark-theme')));
        };
        syncAdminThemeSwitch();
        adminThemeSwitch.addEventListener('click', () => {
            if (typeof toggleTheme === 'function') toggleTheme();
            syncAdminThemeSwitch();
        });
    }

    /* -- สลับภาษา -- */
    const adminLangToggle = document.getElementById('adminLangToggle');
    if (adminLangToggle) {
        const syncAdminLangToggle = () => { adminLangToggle.textContent = I18N.getLang() === 'en' ? 'EN' : 'TH'; };
        syncAdminLangToggle();
        adminLangToggle.addEventListener('click', () => {
            const nextLang = I18N.getLang() === 'en' ? 'th' : 'en';
            I18N.setLang(nextLang);
            I18N.apply(ADMIN_I18N);
            syncAdminLangToggle();
            if (typeof broadcastSync === 'function') broadcastSync('lang-updated', { lang: nextLang });
        });
    }

    /* -- Modal เปลี่ยนรหัสผ่าน -- */
    const adminPasswordOverlay = document.getElementById('adminPasswordModalOverlay');
    const adminChangePasswordBtn = document.getElementById('adminChangePasswordBtn');
    const adminPwdCancelBtn = document.getElementById('adminPwdCancelBtn');
    const adminPwdSaveBtn = document.getElementById('adminPwdSaveBtn');
    const adminPwdError = document.getElementById('adminPwdError');
    const adminPwdCurrent = document.getElementById('adminPwdCurrent');
    const adminPwdNew = document.getElementById('adminPwdNew');
    const adminPwdConfirmNew = document.getElementById('adminPwdConfirmNew');

    function openAdminPasswordModal() {
        if (!adminPasswordOverlay) return;
        [adminPwdCurrent, adminPwdNew, adminPwdConfirmNew].forEach(el => { if (el) el.value = ''; });
        if (adminPwdError) adminPwdError.hidden = true;
        adminPasswordOverlay.classList.add('is-open');
    }
    function closeAdminPasswordModal() {
        if (adminPasswordOverlay) adminPasswordOverlay.classList.remove('is-open');
    }
    function showAdminPwdError(message) {
        if (!adminPwdError) return;
        adminPwdError.textContent = message;
        adminPwdError.hidden = false;
    }

    if (adminChangePasswordBtn) adminChangePasswordBtn.addEventListener('click', openAdminPasswordModal);
    if (adminPwdCancelBtn) adminPwdCancelBtn.addEventListener('click', closeAdminPasswordModal);
    if (adminPasswordOverlay) {
        adminPasswordOverlay.addEventListener('click', (e) => { if (e.target === adminPasswordOverlay) closeAdminPasswordModal(); });
    }
    if (adminPwdSaveBtn) {
        adminPwdSaveBtn.addEventListener('click', async () => {
            if (adminPwdError) adminPwdError.hidden = true;

            const currentPassword = adminPwdCurrent.value;
            const newPassword = adminPwdNew.value;
            const confirmPassword = adminPwdConfirmNew.value;

            if (newPassword !== confirmPassword) {
                showAdminPwdError(I18N.getLang() === 'en' ? 'New password and confirmation do not match' : 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
                return;
            }

            adminPwdSaveBtn.disabled = true;
            try {
                await SoyDeeAPI.request('/admin/password', {
                    method: 'PUT',
                    body: { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }
                });
                closeAdminPasswordModal();
                showToast(I18N.t(ADMIN_I18N, 'toast-password-changed'), 'success');
            } catch (e) {
                showAdminPwdError((e && e.message) || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
            } finally {
                adminPwdSaveBtn.disabled = false;
            }
        });
    }

    /* -- Cross-tab sync (soydee_sync) — ดู assets/js/shared/app.js -- */
    if (typeof onSync === 'function') {
        onSync((msg) => {
            if (msg.type === 'avatar-updated' && msg.payload.url) {
                renderAdminAvatar(msg.payload.url);
                adminProfileState.sys_avatar_pic = msg.payload.url;
            }
            if (msg.type === 'theme-updated' && adminThemeSwitch) {
                adminThemeSwitch.setAttribute('aria-checked', String(msg.payload.theme === 'dark'));
            }
            if (msg.type === 'lang-updated') {
                I18N.setLang(msg.payload.lang);
                I18N.apply(ADMIN_I18N);
                if (adminLangToggle) adminLangToggle.textContent = msg.payload.lang === 'en' ? 'EN' : 'TH';
            }
        });
    }

    /* ============================================
       10. เริ่มต้นแสดงผล — โหลดข้อมูลจริงจาก API ก่อน render
       ============================================ */
    (async function init() {
        try {
            await Promise.all([loadFoodCategories(), loadActivities()]);
        } catch (err) {
            showListActionError((err && err.message) || 'โหลดข้อมูลไม่สำเร็จ กรุณาลองรีเฟรชหน้าใหม่');
        }
        populateActivityFilterOptions();

        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        if (!isDesktop || !activateTab('overview')) {
            activateTab('food');
        }
    })();
});