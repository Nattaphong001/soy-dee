/* ==============================================================================
   ADMIN / I18N — พจนานุกรมข้อความหน้าแอดมิน (ไทย/อังกฤษ) ให้ window.I18N (assets/js/shared/i18n.js) ใช้
   ต้องโหลดก่อน core.js (core.js อ่าน window.ADMIN_I18N ผ่าน Adm.t/I18N.apply)
   ============================================================================== */
window.ADMIN_I18N = {
    th: {
        'role-badge': 'ผู้ดูแลระบบ',
        'btn-logout': 'ออกจากระบบ',

        /* ---- เมนูหลัก ---- */
        'nav-overview': 'ภาพรวม', 'nav-food': 'ประเภทอาหาร', 'nav-activity': 'ประเภทกิจกรรม',
        'nav-members': 'สมาชิก', 'nav-reports': 'รายงาน', 'nav-account': 'บัญชีของฉัน',

        /* ---- หัวข้อ/คำอธิบายต่อแท็บ ---- */
        'title-overview': 'ภาพรวมระบบ', 'sub-overview': 'สรุปข้อมูลทั้งระบบแบบเรียลไทม์',
        'title-food': 'จัดการประเภทอาหาร', 'sub-food': 'เพิ่ม แก้ไข หรือลบประเภทอาหารและเกณฑ์สีโภชนาการ',
        'title-activity': 'จัดการประเภทกิจกรรม', 'sub-activity': 'เพิ่ม แก้ไข หรือลบประเภทกิจกรรมและระดับการใช้แรง',
        'title-members': 'ข้อมูลสมาชิก', 'sub-members': 'ดูข้อมูลสมาชิกทั้งหมด (อ่านอย่างเดียว)',
        'title-reports': 'รายงาน', 'sub-reports': 'สรุปและส่งออกรายงานตามเงื่อนไข',
        'title-account': 'บัญชีของฉัน', 'sub-account': 'จัดการข้อมูลส่วนตัวและการตั้งค่า',

        'loading': 'กำลังโหลด...',
        'btn-retry': 'ลองใหม่', 'btn-cancel': 'ยกเลิก', 'btn-save': 'บันทึก', 'btn-delete': 'ลบรายการ', 'btn-reset': 'ล้างตัวกรอง',
        'btn-csv': 'ส่งออก CSV', 'btn-pdf': 'ส่งออก PDF',

        /* ---- error กลาง ---- */
        'err-load': 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        'err-save': 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        'err-delete': 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        'err-in-use': 'ลบไม่ได้ — ยังมีข้อมูลอ้างอิงอยู่',
        'err-network': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่า API เปิดอยู่หรือไม่',
        'err-not-found': 'ไม่พบข้อมูลนี้แล้ว (อาจถูกลบไปก่อนหน้า)',
        'err-generic': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        'err-date-range': '"ตั้งแต่" ต้องมาก่อน "ถึง"',

        /* ---- ประเภทอาหาร/กิจกรรม ---- */
        'placeholder-search': 'ค้นหาชื่อ...',
        'btn-add-food': 'เพิ่มประเภทอาหาร', 'btn-add-activity': 'เพิ่มประเภทกิจกรรม',
        'col-name': 'ชื่อ', 'col-traffic': 'เกณฑ์สี', 'col-category': 'ประเภท', 'col-intensity': 'ระดับการใช้แรง',
        'col-distance': 'ระยะทาง', 'col-usage': 'จำนวนที่ถูกใช้', 'col-usage-short': 'ถูกใช้', 'col-actions': 'จัดการ',
        'filter-traffic-all': 'เกณฑ์สีทั้งหมด', 'filter-category-all': 'ประเภททั้งหมด',
        'traffic-green': 'เขียว', 'traffic-yellow': 'เหลือง', 'traffic-red': 'แดง',
        'traffic-hint': 'เขียว = กินได้บ่อย · เหลือง = กินได้แต่พอดี · แดง = ควรจำกัด',
        'badge-distance': 'บันทึกระยะทางได้',
        'aria-edit': 'แก้ไข', 'aria-delete': 'ลบ',
        'empty-food-title': 'ยังไม่มีประเภทอาหารในระบบ', 'empty-food-desc': 'กดปุ่ม "เพิ่มประเภทอาหาร" ด้านบนเพื่อเริ่มต้น',
        'empty-activity-title': 'ยังไม่มีประเภทกิจกรรมในระบบ', 'empty-activity-desc': 'กดปุ่ม "เพิ่มประเภทกิจกรรม" ด้านบนเพื่อเริ่มต้น',
        'empty-search-title': 'ไม่พบรายการที่ค้นหา', 'empty-search-desc': 'ลองค้นหาด้วยคำอื่น หรือเลือกตัวกรองอื่น',
        'warn-blocked': function (n) { return 'ลบไม่ได้ — มีบันทึกของสมาชิกอ้างอิงอยู่ ' + n + ' รายการ'; },
        'confirm-delete-title': function (name) { return 'ลบ "' + name + '" ?'; },
        'confirm-delete-message': 'การลบไม่สามารถย้อนกลับได้',
        'toast-created': 'เพิ่มรายการแล้ว', 'toast-updated': 'บันทึกการแก้ไขแล้ว', 'toast-deleted': 'ลบรายการแล้ว',

        /* ---- Dialog เพิ่ม/แก้ไข ---- */
        'dialog-add-food': 'เพิ่มประเภทอาหาร', 'dialog-edit-food': 'แก้ไขประเภทอาหาร',
        'dialog-add-activity': 'เพิ่มประเภทกิจกรรม', 'dialog-edit-activity': 'แก้ไขประเภทกิจกรรม',
        'label-name-food': 'ชื่อประเภทอาหาร', 'label-name-activity': 'ชื่อกิจกรรม',
        'placeholder-name-food': 'เช่น ผัก / สลัด', 'placeholder-name-activity': 'เช่น วิ่ง / จ็อกกิ้ง',
        'label-traffic': 'เกณฑ์สีโภชนาการ', 'label-category': 'ประเภทกิจกรรม', 'label-intensity': 'ระดับการใช้แรง',
        'label-has-distance': 'บันทึกระยะทางได้ (กม.)',
        'btn-select-image': 'เลือกรูปภาพ', 'btn-remove-image': 'ลบรูปภาพ', 'hint-image': 'ไม่บังคับ · jpg, png หรือ webp ไม่เกิน 5MB',
        'err-name-required-food': 'กรุณากรอกชื่อประเภทอาหาร', 'err-name-required-activity': 'กรุณากรอกชื่อกิจกรรม',
        'err-traffic-required': 'กรุณาเลือกเกณฑ์สีโภชนาการ', 'err-duplicate-name': 'มีชื่อนี้อยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น',
        'err-image-type': 'กรุณาเลือกไฟล์รูปภาพ (jpg, png, webp) เท่านั้น', 'err-image-size': 'ขนาดไฟล์ต้องไม่เกิน 5MB',

        /* ---- ตัวแบ่งหน้า ---- */
        'pager-prev': 'ก่อนหน้า', 'pager-next': 'ถัดไป',
        'pager-range': function (from, to, total) { return 'แสดง ' + from + '–' + to + ' จาก ' + total + ' รายการ'; },

        /* ---- สมาชิก ---- */
        'placeholder-search-member': 'ค้นหาชื่อ / username...',
        'col-gender': 'เพศ', 'col-age': 'อายุ', 'col-body': 'น้ำหนัก / ส่วนสูง', 'col-bmi': 'BMI', 'col-target': 'เป้าหมาย', 'col-joined': 'วันที่สมัคร',
        'filter-gender-all': 'เพศทั้งหมด', 'filter-bmi-all': 'BMI ทั้งหมด',
        'filter-joined-from': 'สมัครตั้งแต่', 'filter-to': 'ถึง', 'filter-from': 'ตั้งแต่',
        'gender-1': 'ชาย', 'gender-2': 'หญิง',
        'bmi-1': 'ผอม', 'bmi-2': 'ปกติ', 'bmi-3': 'ท้วม', 'bmi-4': 'อ้วน',
        'target-1': 'ลดน้ำหนัก', 'target-2': 'เพิ่มน้ำหนัก', 'target-3': 'รักษาน้ำหนัก',
        'unit-age': 'อายุ (ปี)', 'age-years': function (n) { return 'อายุ ' + n + ' ปี'; },
        'joined-on': function (d) { return 'สมัครเมื่อ ' + d; },
        'empty-members-title': 'ไม่พบข้อมูลสมาชิกที่ตรงกับตัวกรอง', 'empty-members-desc': 'ลองปรับตัวกรองหรือคำค้นหาใหม่',
        'detail-bodystats': 'ประวัติสัดส่วนร่างกาย', 'detail-bmi': 'ประวัติ BMI', 'detail-no-data': 'ยังไม่มีข้อมูล',

        /* ---- ภาพรวม ---- */
        'kpi-total-members': 'สมาชิกทั้งหมด', 'kpi-new-members': 'สมาชิกใหม่เดือนนี้',
        'kpi-food-categories': 'ประเภทอาหาร', 'kpi-activity-types': 'ประเภทกิจกรรม',
        'overview-chart-title': 'บันทึกของสมาชิก 7 วันล่าสุด',
        'legend-food': 'บันทึกอาหาร', 'legend-activity': 'บันทึกกิจกรรม', 'legend-sleep': 'บันทึกการนอน',

        /* ---- รายงาน ---- */
        'report-nutrition': 'ดัชนีมวลกาย (BMI)', 'report-food': 'พฤติกรรมการบริโภค', 'report-activity': 'กิจกรรม', 'report-sleep': 'การนอน',
        'report-empty': 'ไม่มีข้อมูลในช่วงที่เลือก',
        'filter-activity-all': 'กิจกรรมทั้งหมด', 'filter-meal-all': 'มื้อทั้งหมด', 'filter-sleep-eval-all': 'ผลประเมินทั้งหมด',
        'filter-date-range': 'ช่วงวันที่',
        'meal-1': 'เช้า', 'meal-2': 'กลางวัน', 'meal-3': 'เย็น', 'meal-4': 'ของว่าง', 'col-meal': 'มื้ออาหาร',
        'sleep-eval-1': 'น้อยเกินไป', 'sleep-eval-2': 'พอดี', 'sleep-eval-3': 'มากเกินไป',
        'sleep-quality-1': 'แย่', 'sleep-quality-2': 'ปานกลาง', 'sleep-quality-3': 'ดี',
        'stat-total-members': 'จำนวนสมาชิกทั้งหมด', 'stat-total-food-logs': 'จำนวนบันทึกทั้งหมด', 'stat-uncategorized': 'ไม่ระบุประเภท',
        'stat-total-minutes': 'นาทีรวม', 'stat-times-logged': 'จำนวนครั้งที่บันทึก', 'stat-avg-sleep-hours': 'ชั่วโมงนอนเฉลี่ย',
        'top-food-title': 'ท็อป 5 ประเภทอาหารที่บันทึกบ่อยที่สุด',
        'col-count': 'จำนวน', 'col-percent': '%', 'col-food-category': 'ประเภทอาหาร', 'col-times-logged': 'จำนวนครั้งที่บันทึก',
        'col-activity': 'กิจกรรม', 'col-sleep-quality': 'คุณภาพการนอน',
        'rp-generated': 'สร้างรายงานเมื่อ', 'rp-footer': 'สร้างโดยระบบผู้ดูแล soy dee',

        /* ---- บัญชี ---- */
        'btn-change-photo': 'เปลี่ยนรูปโปรไฟล์', 'hint-photo': 'jpg, png หรือ webp ไม่เกิน 5MB',
        'label-display-name': 'ชื่อที่แสดง', 'placeholder-display-name': 'ชื่อของคุณ',
        'label-username': 'ชื่อผู้ใช้ (Username)',
        'btn-save-changes': 'บันทึกการเปลี่ยนแปลง', 'btn-change-password': 'เปลี่ยนรหัสผ่าน',
        'err-name-required': 'กรุณากรอกชื่อที่แสดง', 'err-username-short': 'ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร',
        'err-duplicate-username': 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น', 'err-upload': 'อัปโหลดรูปไม่สำเร็จ',
        'toast-profile-saved': 'บันทึกการเปลี่ยนแปลงแล้ว', 'toast-avatar-updated': 'เปลี่ยนรูปโปรไฟล์แล้ว', 'toast-password-changed': 'เปลี่ยนรหัสผ่านสำเร็จ',
        'settings-title': 'การแสดงผล',
        'settings-dark-title': 'โหมดมืด', 'settings-dark-desc': 'ปรับหน้าจอให้สบายตาในที่มืด',
        'settings-lang-title': 'ภาษา', 'settings-lang-desc': 'เลือกภาษาที่ใช้ในหน้าผู้ดูแล',
        'pwd-title': 'เปลี่ยนรหัสผ่าน', 'pwd-current': 'รหัสผ่านปัจจุบัน', 'pwd-new': 'รหัสผ่านใหม่', 'pwd-confirm': 'ยืนยันรหัสผ่านใหม่', 'pwd-save': 'บันทึกรหัสผ่านใหม่',
        'err-password-weak': 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร มีทั้งตัวอักษรและตัวเลข',
        'err-password-mismatch': 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'err-password-current': 'รหัสผ่านปัจจุบันไม่ถูกต้อง',

        'confirm-logout-title': 'ออกจากระบบ', 'confirm-logout-message': 'คุณต้องการออกจากระบบผู้ดูแลระบบใช่หรือไม่?', 'confirm-logout-confirm': 'ออกจากระบบ'
    },
    en: {
        'role-badge': 'Administrator',
        'btn-logout': 'Log out',

        'nav-overview': 'Overview', 'nav-food': 'Food types', 'nav-activity': 'Activity types',
        'nav-members': 'Members', 'nav-reports': 'Reports', 'nav-account': 'My account',

        'title-overview': 'System overview', 'sub-overview': 'Real-time summary across the whole system',
        'title-food': 'Manage food types', 'sub-food': 'Add, edit or remove food types and their nutrition traffic light',
        'title-activity': 'Manage activity types', 'sub-activity': 'Add, edit or remove activity types and intensity levels',
        'title-members': 'Members', 'sub-members': 'View all members (read-only)',
        'title-reports': 'Reports', 'sub-reports': 'Summarize and export reports by filter',
        'title-account': 'My account', 'sub-account': 'Manage your profile and preferences',

        'loading': 'Loading...',
        'btn-retry': 'Retry', 'btn-cancel': 'Cancel', 'btn-save': 'Save', 'btn-delete': 'Delete item', 'btn-reset': 'Reset filters',
        'btn-csv': 'Export CSV', 'btn-pdf': 'Export PDF',

        'err-load': 'Failed to load. Please try again.',
        'err-save': 'Failed to save. Please try again.',
        'err-delete': 'Failed to delete. Please try again.',
        'err-in-use': "Can't delete — still referenced by other data.",
        'err-network': "Can't reach the server. Check that the API is running.",
        'err-not-found': 'Not found (it may have already been removed).',
        'err-generic': 'Something went wrong. Please try again.',
        'err-date-range': '"From" must be before "to".',

        'placeholder-search': 'Search by name...',
        'btn-add-food': 'Add food type', 'btn-add-activity': 'Add activity type',
        'col-name': 'Name', 'col-traffic': 'Traffic light', 'col-category': 'Category', 'col-intensity': 'Intensity',
        'col-distance': 'Distance', 'col-usage': 'Times used', 'col-usage-short': 'Used', 'col-actions': 'Actions',
        'filter-traffic-all': 'All traffic lights', 'filter-category-all': 'All categories',
        'traffic-green': 'Green', 'traffic-yellow': 'Yellow', 'traffic-red': 'Red',
        'traffic-hint': 'Green = eat often · Yellow = eat in moderation · Red = limit intake',
        'badge-distance': 'Tracks distance',
        'aria-edit': 'Edit', 'aria-delete': 'Delete',
        'empty-food-title': 'No food types yet', 'empty-food-desc': 'Tap "Add food type" above to get started',
        'empty-activity-title': 'No activity types yet', 'empty-activity-desc': 'Tap "Add activity type" above to get started',
        'empty-search-title': 'No matching items', 'empty-search-desc': 'Try another search term or filter',
        'warn-blocked': function (n) { return "Can't delete — referenced by " + n + ' member record(s)'; },
        'confirm-delete-title': function (name) { return 'Delete "' + name + '"?'; },
        'confirm-delete-message': 'This cannot be undone.',
        'toast-created': 'Item added', 'toast-updated': 'Changes saved', 'toast-deleted': 'Item deleted',

        'dialog-add-food': 'Add food type', 'dialog-edit-food': 'Edit food type',
        'dialog-add-activity': 'Add activity type', 'dialog-edit-activity': 'Edit activity type',
        'label-name-food': 'Food type name', 'label-name-activity': 'Activity name',
        'placeholder-name-food': 'e.g. Vegetables / Salad', 'placeholder-name-activity': 'e.g. Running / Jogging',
        'label-traffic': 'Nutrition traffic light', 'label-category': 'Activity category', 'label-intensity': 'Intensity',
        'label-has-distance': 'Can record distance (km)',
        'btn-select-image': 'Select image', 'btn-remove-image': 'Remove image', 'hint-image': 'Optional · jpg, png or webp, up to 5MB',
        'err-name-required-food': 'Please enter a food type name', 'err-name-required-activity': 'Please enter an activity name',
        'err-traffic-required': 'Please choose a nutrition traffic light', 'err-duplicate-name': 'This name already exists — please use another',
        'err-image-type': 'Please choose a jpg, png or webp image only', 'err-image-size': 'File must be 5MB or smaller',

        'pager-prev': 'Previous', 'pager-next': 'Next',
        'pager-range': function (from, to, total) { return 'Showing ' + from + '–' + to + ' of ' + total; },

        'placeholder-search-member': 'Search by name / username...',
        'col-gender': 'Gender', 'col-age': 'Age', 'col-body': 'Weight / Height', 'col-bmi': 'BMI', 'col-target': 'Target', 'col-joined': 'Joined',
        'filter-gender-all': 'All genders', 'filter-bmi-all': 'All BMI categories',
        'filter-joined-from': 'Joined from', 'filter-to': 'To', 'filter-from': 'From',
        'gender-1': 'Male', 'gender-2': 'Female',
        'bmi-1': 'Underweight', 'bmi-2': 'Normal', 'bmi-3': 'Overweight', 'bmi-4': 'Obese',
        'target-1': 'Lose weight', 'target-2': 'Gain weight', 'target-3': 'Maintain weight',
        'unit-age': 'Age', 'age-years': function (n) { return n + ' years old'; },
        'joined-on': function (d) { return 'Joined ' + d; },
        'empty-members-title': 'No members match this filter', 'empty-members-desc': 'Try adjusting the filters or search term',
        'detail-bodystats': 'Body stats history', 'detail-bmi': 'BMI history', 'detail-no-data': 'No data yet',

        'kpi-total-members': 'Total members', 'kpi-new-members': 'New members this month',
        'kpi-food-categories': 'Food categories', 'kpi-activity-types': 'Activity types',
        'overview-chart-title': "Members' logs over the last 7 days",
        'legend-food': 'Food logs', 'legend-activity': 'Activity logs', 'legend-sleep': 'Sleep logs',

        'report-nutrition': 'Nutrition status (BMI)', 'report-food': 'Consumption behavior', 'report-activity': 'Activity', 'report-sleep': 'Sleep',
        'report-empty': 'No data for this range',
        'filter-activity-all': 'All activities', 'filter-meal-all': 'All meals', 'filter-sleep-eval-all': 'All results',
        'filter-date-range': 'Date range',
        'meal-1': 'Breakfast', 'meal-2': 'Lunch', 'meal-3': 'Dinner', 'meal-4': 'Snack', 'col-meal': 'Meal',
        'sleep-eval-1': 'Too little', 'sleep-eval-2': 'Adequate', 'sleep-eval-3': 'Too much',
        'sleep-quality-1': 'Poor', 'sleep-quality-2': 'Fair', 'sleep-quality-3': 'Good',
        'stat-total-members': 'Total members', 'stat-total-food-logs': 'Total logs', 'stat-uncategorized': 'Uncategorized',
        'stat-total-minutes': 'Total minutes', 'stat-times-logged': 'Times logged', 'stat-avg-sleep-hours': 'Avg. sleep hours',
        'top-food-title': 'Top 5 most-logged food categories',
        'col-count': 'Count', 'col-percent': '%', 'col-food-category': 'Food category', 'col-times-logged': 'Times logged',
        'col-activity': 'Activity', 'col-sleep-quality': 'Sleep quality',
        'rp-generated': 'Generated on', 'rp-footer': 'Generated by the soy dee admin system',

        'btn-change-photo': 'Change photo', 'hint-photo': 'jpg, png or webp, up to 5MB',
        'label-display-name': 'Display name', 'placeholder-display-name': 'Your name',
        'label-username': 'Username',
        'btn-save-changes': 'Save changes', 'btn-change-password': 'Change password',
        'err-name-required': 'Please enter a display name', 'err-username-short': 'Username must be at least 4 characters',
        'err-duplicate-username': 'This username is already taken', 'err-upload': 'Failed to upload the image',
        'toast-profile-saved': 'Changes saved', 'toast-avatar-updated': 'Profile photo updated', 'toast-password-changed': 'Password changed',
        'settings-title': 'Display',
        'settings-dark-title': 'Dark mode', 'settings-dark-desc': 'Easier on the eyes in low light',
        'settings-lang-title': 'Language', 'settings-lang-desc': 'Choose the admin panel language',
        'pwd-title': 'Change password', 'pwd-current': 'Current password', 'pwd-new': 'New password', 'pwd-confirm': 'Confirm new password', 'pwd-save': 'Save new password',
        'err-password-weak': 'New password must be at least 8 characters with a letter and a digit',
        'err-password-mismatch': 'New password and confirmation do not match', 'err-password-current': 'Current password is incorrect',

        'confirm-logout-title': 'Log out', 'confirm-logout-message': 'Are you sure you want to log out of the admin panel?', 'confirm-logout-confirm': 'Log out'
    }
};
