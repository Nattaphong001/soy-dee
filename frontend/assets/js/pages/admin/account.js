/* ==============================================================================
   ADMIN / ACCOUNT — บัญชีของฉัน (แอดมิน)
     GET/PUT /admin/profile · POST /admin/avatar · PUT /admin/password
   ไม่มี {id} ใน URL — ฝั่ง Go อ่าน sys_id จาก JWT claims เอง
   ============================================================================== */
(function () {
    'use strict';

    var AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    var AVATAR_MAX_BYTES = 5 * 1024 * 1024;

    var loaded = false;
    var state = { sys_full_name: '', sys_username: '', sys_avatar_pic: null };

    var el = {
        name: Adm.$('adminDisplayName'), username: Adm.$('adminUsername'),
        err: Adm.$('adminAccountError'), saveBtn: Adm.$('adminSaveProfileBtn'),
        avatarBox: Adm.$('adminAvatarBox'), avatarBtn: Adm.$('adminAvatarEditBtn'), avatarInput: Adm.$('adminAvatarFileInput')
    };

    function renderAvatar(path) {
        el.avatarBox.innerHTML = path
            ? '<img src="' + Adm.esc(SoyDeeAPI.assetUrl(path)) + '" alt="">'
            : Adm.icon('user');
    }

    function fieldError(msg) {
        el.err.textContent = msg || '';
        el.err.hidden = !msg;
    }

    function load() {
        if (loaded) return;
        loaded = true;
        SoyDeeAPI.request('/admin/profile').then(function (admin) {
            state = { sys_full_name: admin.sys_full_name || '', sys_username: admin.sys_username || '', sys_avatar_pic: admin.sys_avatar_pic || null };
            el.name.value = state.sys_full_name;
            el.username.value = state.sys_username;
            renderAvatar(state.sys_avatar_pic);
            Adm.$('whoami').textContent = state.sys_full_name || state.sys_username;
        }).catch(function (err) {
            loaded = false;
            Adm.alert(Adm.errText(err, 'err-load'));
        });
    }

    el.saveBtn.addEventListener('click', function () {
        fieldError('');
        var name = el.name.value.trim(), username = el.username.value.trim();
        if (!name) { fieldError(Adm.t('err-name-required')); return; }
        if (username.length < 4) { fieldError(Adm.t('err-username-short')); return; }

        Adm.busy(el.saveBtn, true);
        SoyDeeAPI.request('/admin/profile', { method: 'PUT', body: { sys_full_name: name, sys_username: username } }).then(function () {
            state.sys_full_name = name; state.sys_username = username;
            SoyDeeAPI.session.updateStoredUser({ full_name: name, username: username });
            Adm.$('whoami').textContent = name || username;
            Adm.toast(Adm.t('toast-profile-saved'), 'success');
        }).catch(function (err) {
            var msg = err && err.code === 'DUPLICATE_USERNAME' ? Adm.t('err-duplicate-username') : Adm.errText(err, 'err-save');
            fieldError(msg);
            Adm.toast(msg, 'error');
        }).then(function () { Adm.busy(el.saveBtn, false); });
    });

    el.avatarBtn.addEventListener('click', function () { el.avatarInput.click(); });
    el.avatarInput.addEventListener('change', function () {
        var file = el.avatarInput.files && el.avatarInput.files[0];
        el.avatarInput.value = '';
        if (!file) return;
        fieldError('');
        if (AVATAR_TYPES.indexOf(file.type) === -1) { fieldError(Adm.t('err-image-type')); return; }
        if (file.size > AVATAR_MAX_BYTES) { fieldError(Adm.t('err-image-size')); return; }

        var fd = new FormData();
        fd.append('avatar', file);
        SoyDeeAPI.request('/admin/avatar', { method: 'POST', isForm: true, body: fd }).then(function (result) {
            renderAvatar(result.sys_avatar_pic);
            state.sys_avatar_pic = result.sys_avatar_pic;
            SoyDeeAPI.session.updateStoredUser({ profile_pic: result.sys_avatar_pic });
            if (typeof broadcastSync === 'function') broadcastSync('avatar-updated', { url: result.sys_avatar_pic });
            Adm.toast(Adm.t('toast-avatar-updated'), 'success');
        }).catch(function (err) {
            var msg = Adm.errText(err, 'err-upload');
            fieldError(msg);
            Adm.toast(msg, 'error');
        });
    });

    /* ---------- ธีม / ภาษา ---------- */
    var themeSwitch = Adm.$('adminThemeSwitch');
    function syncTheme() { themeSwitch.setAttribute('aria-checked', String(document.documentElement.classList.contains('dark-theme'))); }
    syncTheme();
    themeSwitch.addEventListener('click', function () { toggleTheme(); syncTheme(); });

    var langBtn = Adm.$('adminLangToggle');
    function syncLang() { langBtn.textContent = Adm.lang() === 'en' ? 'EN' : 'TH'; }
    syncLang();
    langBtn.addEventListener('click', function () {
        I18N.setLang(Adm.lang() === 'en' ? 'th' : 'en');
        Adm.relang();
        syncLang();
        if (typeof broadcastSync === 'function') broadcastSync('lang-updated', { lang: Adm.lang() });
    });

    /* ---------- เปลี่ยนรหัสผ่าน ---------- */
    var pwdOverlay = Adm.$('adminPasswordModalOverlay');
    var pwdForm = Adm.$('pwdForm');
    var pwdErr = Adm.$('adminPwdError');
    var pwdCurrent = Adm.$('adminPwdCurrent'), pwdNew = Adm.$('adminPwdNew'), pwdConfirm = Adm.$('adminPwdConfirmNew');
    var pwdSaveBtn = Adm.$('adminPwdSaveBtn');

    function openPwd() {
        [pwdCurrent, pwdNew, pwdConfirm].forEach(function (i) { i.value = ''; });
        pwdErr.hidden = true;
        Adm.openDialog(pwdOverlay, pwdCurrent);
    }
    function closePwd() { Adm.closeDialog(pwdOverlay); }

    Adm.$('adminChangePasswordBtn').addEventListener('click', openPwd);
    Adm.$('adminPwdCancelBtn').addEventListener('click', closePwd);
    Adm.$('adminPwdCloseBtn').addEventListener('click', closePwd);
    Adm.dismissOnBackdrop(pwdOverlay);

    pwdForm.addEventListener('submit', function (e) {
        e.preventDefault();
        pwdErr.hidden = true;
        if (pwdNew.value.length < 8 || !/[A-Za-z]/.test(pwdNew.value) || !/[0-9]/.test(pwdNew.value)) {
            pwdErr.textContent = Adm.t('err-password-weak'); pwdErr.hidden = false; return;
        }
        if (pwdNew.value !== pwdConfirm.value) {
            pwdErr.textContent = Adm.t('err-password-mismatch'); pwdErr.hidden = false; return;
        }
        Adm.busy(pwdSaveBtn, true);
        SoyDeeAPI.request('/admin/password', {
            method: 'PUT',
            body: { current_password: pwdCurrent.value, new_password: pwdNew.value, confirm_password: pwdConfirm.value }
        }).then(function () {
            closePwd();
            Adm.toast(Adm.t('toast-password-changed'), 'success');
        }).catch(function (err) {
            pwdErr.textContent = err && err.code === 'INVALID_CREDENTIALS' ? Adm.t('err-password-current') : Adm.errText(err, 'err-save');
            pwdErr.hidden = false;
        }).then(function () { Adm.busy(pwdSaveBtn, false); });
    });

    /* ---------- sync ข้ามแท็บ ---------- */
    if (typeof onSync === 'function') {
        onSync(function (msg) {
            if (msg.type === 'avatar-updated' && msg.payload.url) { renderAvatar(msg.payload.url); state.sys_avatar_pic = msg.payload.url; }
            if (msg.type === 'theme-updated') syncTheme();
            if (msg.type === 'lang-updated') { I18N.setLang(msg.payload.lang); Adm.relang(); syncLang(); }
        });
    }

    Adm.tabs.register('account', { show: load });
})();
