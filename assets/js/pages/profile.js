/**
 * profile.js — หน้าโปรไฟล์: สลับแท็บ, สวิตช์ธีม, สลับภาษา (i18n จริง),
 * เลือกเพศ/เป้าหมาย, คำนวณอายุจากวันเกิด, เปลี่ยนรหัสผ่าน, ออกจากระบบ
 *
 * หมายเหตุ: toggleTheme() และ showConfirm() มาจาก assets/js/app.js
 * (โหลดคู่กันเสมอในหน้านี้ ก่อน profile.js)
 */

/* ==============================================================================
   1. ระบบภาษา (i18n) — ขอบเขตตอนนี้: หน้าโปรไฟล์เท่านั้น
   ------------------------------------------------------------------------------
   โครงสร้างนี้ทำเป็น pattern กลางไว้แล้ว (data-i18n / data-i18n-placeholder)
   ถ้าจะขยายไปหน้า Home ทีหลัง แค่เพิ่ม key ในดิกชันนารีของหน้านั้น แล้วใส่
   data-i18n="key" ลงใน element ก็พอ ไม่ต้องเปลี่ยนวิธีคิดใหม่
   ============================================================================== */
const PROFILE_I18N = {
    th: {
        'page-title': 'โปรไฟล์',
        'tab-account': 'บัญชี',
        'tab-body': 'ข้อมูลร่างกาย',
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
        'btn-logout': 'ออกจากระบบ',
        'label-gender': 'เพศ',
        'gender-male': 'ชาย',
        'gender-female': 'หญิง',
        'label-birthdate': 'วันเกิด',
        'label-height': 'ส่วนสูง (ซม.)',
        'label-weight': 'น้ำหนัก (กก.)',
        'label-activity': 'ระดับกิจกรรม',
        'activity-low': 'น้อย (นั่งทำงาน แทบไม่ออกกำลังกาย)',
        'activity-mid': 'ปานกลาง (ออกกำลังกาย 3–4 วัน/สัปดาห์)',
        'activity-high': 'มาก (ออกกำลังกายหนักเกือบทุกวัน)',
        'label-goal': 'เป้าหมาย',
        'goal-lose': '🔻 ลดน้ำหนัก',
        'goal-gain': '💪 เพิ่มกล้ามเนื้อ',
        'goal-maintain': '⚖️ รักษาน้ำหนัก',
        'save-btn': 'บันทึกการเปลี่ยนแปลง',
        'save-btn-success': 'บันทึกแล้ว ✓',
        'pwd-title': 'เปลี่ยนรหัสผ่าน',
        'pwd-current': 'รหัสผ่านปัจจุบัน',
        'pwd-new': 'รหัสผ่านใหม่',
        'pwd-confirm': 'ยืนยันรหัสผ่านใหม่',
        'pwd-save': 'บันทึกรหัสผ่านใหม่',
        'pwd-cancel': 'ยกเลิก',
        'pwd-err-mismatch': 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน',
        'pwd-err-length': 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร',
        'pwd-err-required': 'กรุณากรอกข้อมูลให้ครบทุกช่อง',
        'pwd-success': 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
        'confirm-logout-title': 'ออกจากระบบ',
        'confirm-logout-message': 'คุณต้องการออกจากระบบใช่หรือไม่?',
        'confirm-logout-confirm': 'ออกจากระบบ',
        'confirm-logout-cancel': 'ยกเลิก',
        'age-hint': (age) => `อายุ ${age} ปี`,
        'age-hint-empty': 'ยังไม่ระบุวันเกิด กรุณากรอกข้อมูล'
    },
    en: {
        'page-title': 'Profile',
        'tab-account': 'Account',
        'tab-body': 'Body Info',
        'avatar-edit-btn': 'Change Photo',
        'label-display-name': 'Display Name',
        'placeholder-display-name': 'Your name',
        'label-username': 'Username',
        'placeholder-username': 'username',
        'link-change-password': 'Change Password',
        'settings-dark-title': 'Dark Mode',
        'settings-dark-desc': 'Easier on the eyes at night',
        'settings-lang-title': 'Language',
        'settings-lang-desc': 'Choose your app language',
        'btn-logout': 'Log Out',
        'label-gender': 'Gender',
        'gender-male': 'Male',
        'gender-female': 'Female',
        'label-birthdate': 'Date of Birth',
        'label-height': 'Height (cm)',
        'label-weight': 'Weight (kg)',
        'label-activity': 'Activity Level',
        'activity-low': 'Low (mostly sedentary)',
        'activity-mid': 'Moderate (exercise 3–4 days/week)',
        'activity-high': 'High (intense exercise almost daily)',
        'label-goal': 'Goal',
        'goal-lose': '🔻 Lose Weight',
        'goal-gain': '💪 Build Muscle',
        'goal-maintain': '⚖️ Maintain Weight',
        'save-btn': 'Save Changes',
        'save-btn-success': 'Saved ✓',
        'pwd-title': 'Change Password',
        'pwd-current': 'Current Password',
        'pwd-new': 'New Password',
        'pwd-confirm': 'Confirm New Password',
        'pwd-save': 'Save New Password',
        'pwd-cancel': 'Cancel',
        'pwd-err-mismatch': 'New passwords do not match',
        'pwd-err-length': 'New password must be at least 8 characters',
        'pwd-err-required': 'Please fill in all fields',
        'pwd-success': 'Password changed successfully',
        'confirm-logout-title': 'Log Out',
        'confirm-logout-message': 'Are you sure you want to log out?',
        'confirm-logout-confirm': 'Log Out',
        'confirm-logout-cancel': 'Cancel',
        'age-hint': (age) => `${age} years old`,
        'age-hint-empty': 'Birthdate not set yet — please fill it in'
    }
};

/* ==============================================================================
   1b. เชื่อมข้อมูลโปรไฟล์จริงกับ backend
   GET/PUT /members/{id}/profile, GET /members/{id}/body-stats/latest
   ============================================================================== */
// เก็บฟิลด์โปรไฟล์ล่าสุดที่รู้จาก server ไว้ — ตอน PUT /profile จากแท็บใดแท็บหนึ่ง
// ต้องแนบฟิลด์ของอีกแท็บไปด้วยเสมอ (validation บังคับ full_name/user_name เสมอ)
let profileState = { mb_full_name: '', mb_user_name: '', mb_gender: null, mb_birth_date: null, mb_profile_pic: null };

function mbId() { return SoyDeeAPI.session.getUserId(); }

function genderNumToKey(num) { return num === 2 ? 'female' : 'male'; }
function genderKeyToNum(key) { return key === 'female' ? 2 : 1; }

function setActiveGenderPill(key) {
    document.querySelectorAll('.gender-pill').forEach(p => p.classList.toggle('active', p.dataset.gender === key));
}
function setActiveGoalPill(goalValue) {
    document.querySelectorAll('.goal-pill').forEach(p => p.classList.toggle('active', p.dataset.goal === String(goalValue)));
}

function renderAvatar(picPath) {
    const box = document.querySelector('.profile-avatar-lg');
    if (!box || !picPath) return;
    box.innerHTML = `<img src="${SoyDeeAPI.assetUrl(picPath)}" alt="">`;
}

function applyProfileToForm(profile) {
    profileState = {
        mb_full_name: profile.mb_full_name || '',
        mb_user_name: profile.mb_user_name || '',
        mb_gender: profile.mb_gender != null ? profile.mb_gender : null,
        mb_birth_date: profile.mb_birth_date || null,
        mb_profile_pic: profile.mb_profile_pic || null
    };

    document.getElementById('displayName').value = profileState.mb_full_name;
    document.getElementById('username').value = profileState.mb_user_name;
    if (profileState.mb_gender != null) setActiveGenderPill(genderNumToKey(profileState.mb_gender));
    if (profileState.mb_birth_date) {
        document.getElementById('birthDateInput').value = String(profileState.mb_birth_date).slice(0, 10);
        updateAgeHint();
    }
    if (profileState.mb_profile_pic) renderAvatar(profileState.mb_profile_pic);
}

function applyBodyStatsToForm(bodyStats) {
    if (!bodyStats) return;
    if (bodyStats.mbs_height != null) document.getElementById('heightInput').value = bodyStats.mbs_height;
    if (bodyStats.mbs_weight != null) document.getElementById('weightInput').value = bodyStats.mbs_weight;
    if (bodyStats.mbs_activity_level != null) document.getElementById('activitySelect').value = SoyDeeAPI.activityLevelToOption(bodyStats.mbs_activity_level);
    if (bodyStats.mbs_target != null) setActiveGoalPill(bodyStats.mbs_target);
}

async function loadProfileAndBodyStats() {
    const id = mbId();
    if (!id) return;

    try {
        applyProfileToForm(await SoyDeeAPI.request(`/members/${id}/profile`));
    } catch (e) {
        console.error('load profile failed', e);
        showToast(getLang() === 'en' ? 'Failed to load your profile' : 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ');
    }

    try {
        applyBodyStatsToForm(await SoyDeeAPI.request(`/members/${id}/body-stats/latest`));
    } catch (e) { /* 404 = ยังไม่เคยบันทึกข้อมูลร่างกาย — ใช้ค่าเริ่มต้นใน HTML ต่อไป */ }
}

/** แท็บบัญชี: อัปเดตชื่อ/username แต่แนบเพศ+วันเกิดเดิมไปด้วย (validation บังคับส่งครบ) */
async function saveAccountTab() {
    const id = mbId();
    const body = {
        mb_full_name: document.getElementById('displayName').value.trim(),
        mb_user_name: document.getElementById('username').value.trim(),
        mb_gender: profileState.mb_gender,
        mb_birth_date: profileState.mb_birth_date ? String(profileState.mb_birth_date).slice(0, 10) : null,
        mb_profile_pic: profileState.mb_profile_pic
    };
    const updated = await SoyDeeAPI.request(`/members/${id}/profile`, { method: 'PUT', body });
    profileState.mb_full_name = body.mb_full_name;
    profileState.mb_user_name = body.mb_user_name;
    SoyDeeAPI.session.updateStoredUser({ full_name: updated.mb_full_name, username: updated.mb_user_name });
}

/** แท็บข้อมูลร่างกาย: อัปเดตเพศ+วันเกิดผ่าน /profile, เพิ่ม snapshot ใหม่ผ่าน /body-stats
 *  (ไม่มี PUT แก้ไข body-stats — ทุกครั้งที่บันทึกคือแถวประวัติใหม่เสมอ ตามตั้งใจ)
 *  แล้วสั่งคำนวณ BMI/BMR/TDEE ใหม่ทันที เพื่อให้ dashboard เห็นค่าล่าสุดโดยไม่ต้องรอ */
async function saveBodyTab() {
    const id = mbId();
    const activeGender = document.querySelector('.gender-pill.active');
    const activeGoal = document.querySelector('.goal-pill.active');
    const birthDate = document.getElementById('birthDateInput').value || null;
    const genderNum = activeGender ? genderKeyToNum(activeGender.dataset.gender) : profileState.mb_gender;

    const profileBody = {
        mb_full_name: profileState.mb_full_name,
        mb_user_name: profileState.mb_user_name,
        mb_gender: genderNum,
        mb_birth_date: birthDate,
        mb_profile_pic: profileState.mb_profile_pic
    };
    await SoyDeeAPI.request(`/members/${id}/profile`, { method: 'PUT', body: profileBody });
    profileState.mb_gender = genderNum;
    profileState.mb_birth_date = birthDate;

    const bodyStatsBody = {
        mbs_weight: Number(document.getElementById('weightInput').value),
        mbs_height: Number(document.getElementById('heightInput').value),
        mbs_activity_level: SoyDeeAPI.ACTIVITY_LEVEL_MAP[document.getElementById('activitySelect').value],
        mbs_target: activeGoal ? Number(activeGoal.dataset.goal) : 3
    };
    await SoyDeeAPI.request(`/members/${id}/body-stats`, { method: 'POST', body: bodyStatsBody });

    const today = new Date().toISOString().slice(0, 10);
    try {
        await SoyDeeAPI.request(`/members/${id}/bmr/calculate`, { method: 'POST', body: { mbh_record_date: today } });
    } catch (e) { /* ไม่ critical ต่อการบันทึกฝั่งนี้ — dashboard จะคำนวณใหม่รอบถัดไปได้ */ }
}

function getLang() {
    try { return localStorage.getItem('lang') || 'th'; } catch (e) { return 'th'; }
}

function setLang(lang) {
    try { localStorage.setItem('lang', lang); } catch (e) { /* localStorage ใช้ไม่ได้ — ข้ามไป */ }
}

function t(key) {
    const dict = PROFILE_I18N[getLang()] || PROFILE_I18N.th;
    return dict[key] !== undefined ? dict[key] : (PROFILE_I18N.th[key] || key);
}

function applyLanguage(lang) {
    const dict = PROFILE_I18N[lang] || PROFILE_I18N.th;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (typeof dict[key] === 'string') el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (typeof dict[key] === 'string') el.placeholder = dict[key];
    });

    document.documentElement.lang = lang === 'en' ? 'en' : 'th';

    // อายุที่คำนวณไว้ ต้อง re-render ด้วย เพราะมีข้อความ "อายุ __ ปี" ที่ไม่ได้มาจาก data-i18n ตรงๆ
    updateAgeHint();
}

/* ==============================================================================
   2. คำนวณอายุจากวันเกิด (แทนการเก็บ "อายุ" ตรงๆ ที่จะเพี้ยนทุกปี)
   ============================================================================== */
function calculateAge(birthDateStr) {
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const hasHadBirthdayThisYear =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
    if (!hasHadBirthdayThisYear) age -= 1;
    return age;
}

function updateAgeHint() {
    const input = document.getElementById('birthDateInput');
    const hint = document.getElementById('ageHint');
    if (!input || !hint) return;

    const age = calculateAge(input.value);
    const ageFn = t('age-hint'); // ฟังก์ชัน ไม่ใช่สตริง เพราะต้องแทรกตัวเลข
    hint.textContent = age !== null && typeof ageFn === 'function' ? ageFn(age) : t('age-hint-empty');
}

document.addEventListener('DOMContentLoaded', () => {

    loadProfileAndBodyStats();

    /* ============================================
       3. สลับแท็บ บัญชี / ข้อมูลร่างกาย
       รองรับเปิดตรงแท็บผ่าน query param เช่น profile.html?tab=body
       ============================================ */
    const tabs = document.querySelectorAll('.profile-tab');
    const panels = document.querySelectorAll('.tab-panel');

    function activateTab(name) {
        let matched = false;
        tabs.forEach(tab => {
            const isActive = tab.dataset.tab === name;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            if (isActive) matched = true;
        });
        panels.forEach(panel => { panel.hidden = panel.dataset.tabPanel !== name; });
        return matched;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activateTab(tab.dataset.tab);
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab.dataset.tab);
            history.replaceState({}, '', url);
        });
    });

    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (!requestedTab || !activateTab(requestedTab)) {
        activateTab('account');
    }

    /* ============================================
       3b. เปลี่ยนรูปโปรไฟล์ — เลือกไฟล์ผ่าน input ที่ซ่อนไว้ แล้วอัปโหลดทันที
       ============================================ */
    const avatarEditBtn = document.querySelector('.avatar-edit-btn');
    const avatarFileInput = document.getElementById('avatarFileInput');
    const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

    if (avatarEditBtn && avatarFileInput) {
        avatarEditBtn.addEventListener('click', () => avatarFileInput.click());

        avatarFileInput.addEventListener('change', async () => {
            const file = avatarFileInput.files && avatarFileInput.files[0];
            avatarFileInput.value = '';
            if (!file) return;

            const errBox = document.getElementById('accountError');
            const showErr = (msg) => { if (errBox) { errBox.textContent = msg; errBox.hidden = false; } };
            if (errBox) errBox.hidden = true;

            if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
                showErr('รองรับเฉพาะไฟล์ jpg, png, webp เท่านั้น');
                return;
            }
            if (file.size > MAX_AVATAR_BYTES) {
                showErr('ขนาดไฟล์ต้องไม่เกิน 5MB');
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const id = mbId();
                const result = await SoyDeeAPI.request(`/members/${id}/avatar`, { method: 'POST', isForm: true, body: formData });
                renderAvatar(result.mb_profile_pic);
                profileState.mb_profile_pic = result.mb_profile_pic;
                SoyDeeAPI.session.updateStoredUser({ profile_pic: result.mb_profile_pic });
                showToast(getLang() === 'en' ? 'Profile photo updated' : 'เปลี่ยนรูปโปรไฟล์แล้ว', 'success');
            } catch (e) {
                const msg = (e && e.message) || 'อัปโหลดรูปไม่สำเร็จ';
                showErr(msg);
                showToast(msg, 'error');
            }
        });
    }

    /* ============================================
       4. สวิตช์โหมดมืด — ผูกกับ toggleTheme() จริงใน app.js
       ============================================ */
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        const syncSwitch = () => {
            const isDark = document.documentElement.classList.contains('dark-theme');
            themeSwitch.setAttribute('aria-checked', String(isDark));
        };
        syncSwitch();
        themeSwitch.addEventListener('click', () => {
            if (typeof toggleTheme === 'function') {
                toggleTheme();
            } else {
                document.documentElement.classList.toggle('dark-theme');
                try {
                    const isDark = document.documentElement.classList.contains('dark-theme');
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch (e) { /* localStorage ใช้ไม่ได้ — ข้ามไป */ }
            }
            syncSwitch();
        });
    }

    /* ============================================
       5. เลือกภาษา — เปลี่ยนข้อความจริงทั้งหน้าทันที + จำค่าไว้
       ============================================ */
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
        const syncToggle = (lang) => { langToggle.textContent = lang === 'en' ? 'EN' : 'TH'; };
        const currentLang = getLang();
        syncToggle(currentLang);
        applyLanguage(currentLang);

        langToggle.addEventListener('click', () => {
            const nextLang = getLang() === 'en' ? 'th' : 'en';
            setLang(nextLang);
            syncToggle(nextLang);
            applyLanguage(nextLang);
        });
    }

    /* ============================================
       6. เลือกเพศ (แท็บข้อมูลร่างกาย) — แก้ไขได้เสมอ ไม่ล็อกเป็นค่าคงที่
       ============================================ */
    document.querySelectorAll('.gender-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.gender-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    /* ============================================
       7. เลือกเป้าหมาย (1=ลดน้ำหนัก, 2=เพิ่มกล้ามเนื้อ, 3=รักษาน้ำหนัก)
       ============================================ */
    document.querySelectorAll('.goal-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.goal-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    /* ============================================
       8. วันเกิด → คำนวณอายุแบบ real-time
       ============================================ */
    const birthDateInput = document.getElementById('birthDateInput');
    if (birthDateInput) {
        birthDateInput.max = new Date().toISOString().slice(0, 10);
        updateAgeHint();
        birthDateInput.addEventListener('input', updateAgeHint);
    }

    /* ============================================
       9. Modal เปลี่ยนรหัสผ่าน
       ============================================ */
    const passwordOverlay = document.getElementById('passwordModalOverlay');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const pwdCancelBtn = document.getElementById('pwdCancelBtn');
    const pwdSaveBtn = document.getElementById('pwdSaveBtn');
    const pwdError = document.getElementById('pwdError');
    const pwdCurrent = document.getElementById('pwdCurrent');
    const pwdNew = document.getElementById('pwdNew');
    const pwdConfirmNew = document.getElementById('pwdConfirmNew');

    function openPasswordModal() {
        if (!passwordOverlay) return;
        [pwdCurrent, pwdNew, pwdConfirmNew].forEach(el => { if (el) el.value = ''; });
        if (pwdError) pwdError.hidden = true;
        passwordOverlay.classList.add('is-open');
    }

    function closePasswordModal() {
        if (passwordOverlay) passwordOverlay.classList.remove('is-open');
    }

    function showPwdError(message) {
        if (!pwdError) return;
        pwdError.textContent = message;
        pwdError.hidden = false;
    }

    if (changePasswordBtn) changePasswordBtn.addEventListener('click', openPasswordModal);
    if (pwdCancelBtn) pwdCancelBtn.addEventListener('click', closePasswordModal);
    if (passwordOverlay) {
        passwordOverlay.addEventListener('click', (e) => {
            if (e.target === passwordOverlay) closePasswordModal();
        });
    }

    if (pwdSaveBtn) {
        pwdSaveBtn.addEventListener('click', async () => {
            const current = pwdCurrent ? pwdCurrent.value : '';
            const next = pwdNew ? pwdNew.value : '';
            const confirmNext = pwdConfirmNew ? pwdConfirmNew.value : '';

            if (!current || !next || !confirmNext) {
                showPwdError(t('pwd-err-required'));
                return;
            }
            if (next.length < 8) {
                showPwdError(t('pwd-err-length'));
                return;
            }
            if (next !== confirmNext) {
                showPwdError(t('pwd-err-mismatch'));
                return;
            }

            if (pwdError) pwdError.hidden = true;
            const originalText = pwdSaveBtn.textContent;
            pwdSaveBtn.disabled = true;

            try {
                await SoyDeeAPI.request(`/members/${mbId()}/password`, {
                    method: 'PATCH',
                    body: { current_password: current, new_password: next, confirm_password: confirmNext }
                });
                pwdSaveBtn.textContent = t('pwd-success');
                setTimeout(() => {
                    pwdSaveBtn.textContent = originalText;
                    pwdSaveBtn.disabled = false;
                    closePasswordModal();
                }, 1200);
            } catch (e) {
                pwdSaveBtn.disabled = false;
                if (e && e.code === 'INVALID_CREDENTIALS') {
                    showPwdError(t('pwd-current') + ' ไม่ถูกต้อง');
                } else {
                    showPwdError((e && e.message) || t('pwd-err-required'));
                }
            }
        });
    }

    /* ============================================
       10. ออกจากระบบ — ต้องยืนยันผ่าน confirm dialog กลางก่อนเสมอ
       ============================================ */
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            showConfirm({
                title: t('confirm-logout-title'),
                message: t('confirm-logout-message'),
                confirmText: t('confirm-logout-confirm'),
                cancelText: t('confirm-logout-cancel'),
                onConfirm: () => { SoyDeeAPI.logout(); }
            });
        });
    }

    /* ============================================
       11. ปุ่มบันทึก — ปุ่มเดียวแต่พฤติกรรมขึ้นกับแท็บที่ active อยู่ตอนกด
       ============================================ */
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const activeTab = document.querySelector('.profile-tab.active');
            const tabName = activeTab ? activeTab.dataset.tab : 'account';
            const errBox = document.getElementById(tabName === 'account' ? 'accountError' : 'bodyError');
            if (errBox) errBox.hidden = true;

            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;

            try {
                if (tabName === 'account') {
                    await saveAccountTab();
                } else {
                    await saveBodyTab();
                    await loadProfileAndBodyStats();
                }
                saveBtn.textContent = t('save-btn-success');
                showToast(getLang() === 'en' ? 'Changes saved' : 'บันทึกการเปลี่ยนแปลงแล้ว', 'success');
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                }, 1500);
            } catch (e) {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                const msg = (e && e.code === 'DUPLICATE_USERNAME')
                    ? 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น'
                    : (e && e.message) || 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
                if (errBox) {
                    errBox.textContent = msg;
                    errBox.hidden = false;
                }
                showToast(msg, 'error');
            }
        });
    }
});