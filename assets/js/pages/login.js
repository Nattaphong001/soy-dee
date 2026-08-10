/* ==============================================================================
   UI - LOGIN / AUTH — สลับแท็บบทบาท, toggle รหัสผ่าน, validate ฝั่ง client
   ------------------------------------------------------------------------------
   หมายเหตุ: ยังไม่เชื่อมต่อ API จริง (รอ backend Go endpoint /api/auth/login)
   ตอนนี้ submit สำเร็จแล้วจำลองการเข้าสู่ระบบด้วยการ redirect ไปหน้าแรกของ
   แต่ละบทบาท เพื่อให้ทดสอบ user flow ได้ครบวงจร
   ============================================================================== */
(function () {
    'use strict';

    var LOGIN_I18N = {
        th: {
            'welcome-title': 'ยินดีต้อนรับกลับ',
            'welcome-sub': 'เข้าสู่ระบบเพื่อดูแลสุขภาพของคุณต่อ',
            'tab-member': 'ผู้ใช้งานทั่วไป',
            'tab-admin': 'ผู้ดูแลระบบ',
            'label-login-id': 'ชื่อผู้ใช้ หรือ อีเมล',
            'placeholder-login-id': 'กรอกชื่อผู้ใช้ของคุณ',
            'label-login-id-admin': 'ชื่อผู้ใช้ผู้ดูแลระบบ',
            'placeholder-login-id-admin': 'กรอกชื่อผู้ใช้ผู้ดูแลระบบ',
            'label-password': 'รหัสผ่าน',
            'placeholder-password': 'กรอกรหัสผ่านของคุณ',
            'remember-me': 'จดจำฉันไว้',
            'forgot-password': 'ลืมรหัสผ่าน?',
            'auth-error-default': 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ถูกต้อง',
            'error-invalid': 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน (อย่างน้อย 6 ตัวอักษร) ให้ถูกต้อง',
            'submit-label': 'เข้าสู่ระบบ',
            'submit-loading': 'กำลังเข้าสู่ระบบ…',
            'divider-or': 'หรือ',
            'footer-no-account': 'ยังไม่มีบัญชี?',
            'footer-register-link': 'ลงทะเบียนเลย',
            'aria-show-password': 'แสดงรหัสผ่าน',
            'aria-hide-password': 'ซ่อนรหัสผ่าน'
        },
        en: {
            'welcome-title': 'Welcome Back',
            'welcome-sub': 'Sign in to keep taking care of your health',
            'tab-member': 'Member',
            'tab-admin': 'Administrator',
            'label-login-id': 'Username or Email',
            'placeholder-login-id': 'Enter your username',
            'label-login-id-admin': 'Admin Username',
            'placeholder-login-id-admin': 'Enter your admin username',
            'label-password': 'Password',
            'placeholder-password': 'Enter your password',
            'remember-me': 'Remember me',
            'forgot-password': 'Forgot password?',
            'auth-error-default': 'Please enter a valid username and password',
            'error-invalid': 'Please enter a valid username and password (at least 6 characters)',
            'submit-label': 'Sign In',
            'submit-loading': 'Signing in…',
            'divider-or': 'or',
            'footer-no-account': "Don't have an account?",
            'footer-register-link': 'Sign up now',
            'aria-show-password': 'Show password',
            'aria-hide-password': 'Hide password'
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        I18N.apply(LOGIN_I18N);
        if (passwordToggleBtn) {
            var isPasswordHidden = passwordInput && passwordInput.getAttribute('type') === 'password';
            passwordToggleBtn.setAttribute('aria-label', isPasswordHidden ? I18N.t(LOGIN_I18N, 'aria-show-password') : I18N.t(LOGIN_I18N, 'aria-hide-password'));
        }
    });

    var roleTabs = Array.prototype.slice.call(document.querySelectorAll('.auth-role-tabs .profile-tab'));
    var loginIdLabel = document.getElementById('loginIdLabel');
    var loginIdInput = document.getElementById('loginId');
    var passwordInput = document.getElementById('loginPassword');
    var passwordToggleBtn = document.getElementById('passwordToggleBtn');
    var loginForm = document.getElementById('loginForm');
    var authError = document.getElementById('authError');
    var submitBtn = document.getElementById('loginSubmitBtn');
    var forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

    var ROLE_COPY = {
        member: {
            labelKey: 'label-login-id',
            placeholderKey: 'placeholder-login-id',
            redirect: '../user/index.html'
        },
        admin: {
            labelKey: 'label-login-id-admin',
            placeholderKey: 'placeholder-login-id-admin',
            redirect: '../admin/admin.html'
        }
    };

    var currentRole = 'member';

    /* ---------- สลับแท็บ: ผู้ใช้งานทั่วไป / ผู้ดูแลระบบ ---------- */
    function setRole(role) {
        currentRole = role;
        var copy = ROLE_COPY[role] || ROLE_COPY.member;

        roleTabs.forEach(function (tab) {
            var isActive = tab.getAttribute('data-role') === role;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        if (loginIdLabel) loginIdLabel.textContent = I18N.t(LOGIN_I18N, copy.labelKey);
        if (loginIdInput) loginIdInput.setAttribute('placeholder', I18N.t(LOGIN_I18N, copy.placeholderKey));
        hideError();
    }

    roleTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            setRole(tab.getAttribute('data-role'));
        });
    });

    /* ---------- แสดง/ซ่อนรหัสผ่าน ---------- */
    if (passwordToggleBtn && passwordInput) {
        passwordToggleBtn.addEventListener('click', function () {
            var isHidden = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isHidden ? 'text' : 'password');
            passwordToggleBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
            passwordToggleBtn.setAttribute('aria-label', isHidden ? I18N.t(LOGIN_I18N, 'aria-hide-password') : I18N.t(LOGIN_I18N, 'aria-show-password'));
            passwordToggleBtn.querySelector('.icon-emoji').textContent = isHidden ? '🙈' : '👁️';
        });
    }

    /* ---------- Validate + Submit (จำลอง ยังไม่เรียก API) ---------- */
    function showError(message) {
        if (!authError) return;
        authError.textContent = message;
        authError.hidden = false;
    }

    function hideError() {
        if (!authError) return;
        authError.hidden = true;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError();

            var idValue = (loginIdInput.value || '').trim();
            var passValue = passwordInput.value || '';

            if (!idValue || passValue.length < 6) {
                showError(I18N.t(LOGIN_I18N, 'error-invalid'));
                return;
            }

            submitBtn.classList.add('is-loading');
            submitBtn.disabled = true;
            submitBtn.querySelector('.auth-submit-label').textContent = I18N.t(LOGIN_I18N, 'submit-loading');

            var isAdminRole = currentRole === 'admin';
            var path = isAdminRole ? '/auth/login/admin' : '/auth/login/member';
            var body = isAdminRole
                ? { sys_username: idValue, sys_password: passValue }
                : { username: idValue, password: passValue };

            SoyDeeAPI.request(path, { method: 'POST', body: body, auth: false })
                .then(function (data) {
                    if (isAdminRole) {
                        SoyDeeAPI.session.setSession('admin', data, {
                            id: data.admin.sys_id,
                            username: data.admin.sys_username
                        });
                    } else {
                        SoyDeeAPI.session.setSession('member', data, {
                            id: data.member.mb_id,
                            username: data.member.mb_user_name,
                            full_name: data.member.mb_full_name,
                            gender: data.member.mb_gender,
                            profile_pic: data.member.mb_profile_pic
                        });
                    }
                    window.location.href = (ROLE_COPY[currentRole] || ROLE_COPY.member).redirect;
                })
                .catch(function (err) {
                    var message = (err && err.code === 'INVALID_CREDENTIALS')
                        ? I18N.t(LOGIN_I18N, 'error-invalid')
                        : (err && err.message) || I18N.t(LOGIN_I18N, 'auth-error-default');
                    showError(message);
                    submitBtn.classList.remove('is-loading');
                    submitBtn.disabled = false;
                    submitBtn.querySelector('.auth-submit-label').textContent = I18N.t(LOGIN_I18N, 'submit-label');
                });
        });
    }

    // ยังไม่มีหน้า/endpoint สำหรับ "ลืมรหัสผ่าน" (ไม่มีใน API_SPEC.md) — แจ้งผู้ใช้แทนการลิงก์ไปหน้าที่ไม่มีจริง
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', function () {
            showError('ฟีเจอร์ลืมรหัสผ่านยังไม่เปิดให้บริการ กรุณาติดต่อผู้ดูแลระบบ');
        });
    }

    setRole('member');
})();