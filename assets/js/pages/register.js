/* ==============================================================================
   UI - Register — สมัครสมาชิกใหม่ (POST /auth/register)
   ============================================================================== */
(function () {
    'use strict';

    var form = document.getElementById('registerForm');
    var errorEl = document.getElementById('registerError');
    var submitBtn = document.getElementById('registerSubmitBtn');
    var passwordInput = document.getElementById('regPassword');
    var passwordToggleBtn = document.getElementById('regPasswordToggleBtn');

    if (passwordToggleBtn && passwordInput) {
        passwordToggleBtn.addEventListener('click', function () {
            var isHidden = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isHidden ? 'text' : 'password');
            passwordToggleBtn.querySelector('.icon-emoji').textContent = isHidden ? '🙈' : '👁️';
        });
    }

    document.querySelectorAll('.gender-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
            document.querySelectorAll('.gender-pill').forEach(function (p) { p.classList.remove('active'); });
            pill.classList.add('active');
        });
    });

    document.querySelectorAll('.goal-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
            document.querySelectorAll('.goal-pill').forEach(function (p) { p.classList.remove('active'); });
            pill.classList.add('active');
        });
    });

    function showError(message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
    }
    function hideError() {
        errorEl.hidden = true;
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.classList.toggle('is-loading', isLoading);
        submitBtn.querySelector('.auth-submit-label').textContent = isLoading ? 'กำลังลงทะเบียน…' : 'ลงทะเบียน';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();

        var fullName = document.getElementById('regFullName').value.trim();
        var username = document.getElementById('regUsername').value.trim();
        var password = passwordInput.value;
        var passwordConfirm = document.getElementById('regPasswordConfirm').value;
        var birthDate = document.getElementById('regBirthDate').value;
        var height = parseFloat(document.getElementById('regHeight').value);
        var weight = parseFloat(document.getElementById('regWeight').value);
        var activityOption = document.getElementById('regActivitySelect').value;
        var genderPill = document.querySelector('.gender-pill.active');
        var goalPill = document.querySelector('.goal-pill.active');

        if (!fullName || username.length < 4 || password.length < 8) {
            showError('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง (ชื่อผู้ใช้ ≥ 4 ตัว, รหัสผ่าน ≥ 8 ตัว)');
            return;
        }
        if (password !== passwordConfirm) {
            showError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }
        if (!birthDate || !height || !weight) {
            showError('กรุณากรอกวันเกิด ส่วนสูง และน้ำหนักให้ครบถ้วน');
            return;
        }

        setLoading(true);

        SoyDeeAPI.request('/auth/register', {
            method: 'POST',
            auth: false,
            body: {
                mb_user_name: username,
                mb_password: password,
                mb_full_name: fullName,
                mb_gender: genderPill ? parseInt(genderPill.dataset.gender, 10) : null,
                mb_birth_date: birthDate,
                body_stats: {
                    mbs_weight: weight,
                    mbs_height: height,
                    mbs_activity_level: SoyDeeAPI.ACTIVITY_LEVEL_MAP[activityOption] || 1.55,
                    mbs_target: goalPill ? parseInt(goalPill.dataset.goal, 10) : 1
                }
            }
        })
            .then(function () {
                return SoyDeeAPI.request('/auth/login/member', {
                    method: 'POST',
                    auth: false,
                    body: { username: username, password: password }
                });
            })
            .then(function (data) {
                SoyDeeAPI.session.setSession('member', data, {
                    id: data.member.mb_id,
                    username: data.member.mb_user_name,
                    full_name: data.member.mb_full_name,
                    gender: data.member.mb_gender,
                    profile_pic: data.member.mb_profile_pic
                });
                window.location.href = '../user/index.html';
            })
            .catch(function (err) {
                var message = (err && err.code === 'DUPLICATE_USERNAME')
                    ? 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น'
                    : (err && err.message) || 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
                showError(message);
                setLoading(false);
            });
    });
})();
