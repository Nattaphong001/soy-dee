/* ==============================================================================
   ADMIN / CORE — namespace `Adm` + ตัวช่วยกลางที่ทุกโมดูลของหน้าแอดมินใช้ร่วมกัน
   (แปลภาษา, escape, ไอคอน, จัดรูปแบบวันที่/ตัวเลข, แถบแจ้งเตือน, pagination, ระบบแท็บ)
   ต้องโหลดหลัง i18n.js และก่อน master/members/overview/reports/account/main
   ============================================================================== */
(function (global) {
    'use strict';

    var Adm = global.Adm = {};

    /* ---------- ภาษา ---------- */
    Adm.lang = function () { return global.I18N.getLang() === 'en' ? 'en' : 'th'; };

    /** แปลข้อความ: ค่าใน dict เป็นฟังก์ชันได้ (รับอาร์กิวเมนต์ต่อท้าย key) */
    Adm.t = function (key) {
        var v = global.I18N.t(global.ADMIN_I18N, key);
        return typeof v === 'function' ? v.apply(null, Array.prototype.slice.call(arguments, 1)) : v;
    };

    var langListeners = [];
    /** โมดูลลงทะเบียนฟังก์ชัน render ใหม่ เมื่อผู้ใช้สลับภาษา */
    Adm.onLang = function (fn) { langListeners.push(fn); };
    Adm.relang = function () {
        global.I18N.apply(global.ADMIN_I18N);
        langListeners.forEach(function (fn) { fn(); });
        Adm.tabs.refreshTitle();
    };

    /* ---------- helper ทั่วไป ---------- */
    var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    Adm.esc = function (s) {
        return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
    };

    Adm.icon = function (name, cls) {
        return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
    };

    Adm.$ = function (id) { return document.getElementById(id); };

    Adm.debounce = function (fn, ms) {
        var timer = null;
        return function () {
            var args = arguments, self = this;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(self, args); }, ms);
        };
    };

    /** วันที่ท้องถิ่นรูปแบบ YYYY-MM-DD (ไม่ผ่าน UTC เพื่อไม่ให้ขยับวัน) */
    Adm.isoDate = function (d) {
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + day;
    };
    Adm.today = function () { return Adm.isoDate(new Date()); };

    Adm.fmtDate = function (value) {
        if (!value) return '—';
        var d;
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
        d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString(Adm.lang() === 'en' ? 'en-GB' : 'th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    Adm.fmtDateTime = function (d) {
        return d.toLocaleString(Adm.lang() === 'en' ? 'en-GB' : 'th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };
    Adm.fmtNum = function (v, digits) {
        if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—';
        return Number(v).toFixed(digits === undefined ? 1 : digits);
    };
    Adm.fmtInt = function (v) {
        return Number(v || 0).toLocaleString(Adm.lang() === 'en' ? 'en-US' : 'th-TH');
    };
    Adm.pct = function (part, whole) { return whole > 0 ? part * 100 / whole : 0; };

    /** รหัสตัวเลขจาก DB -> ข้อความผ่าน key "<prefix>-<code>" (ไม่รู้จัก = "—") */
    Adm.code = function (prefix, code) {
        if (code === null || code === undefined || code === '') return '—';
        var key = prefix + '-' + code;
        var label = Adm.t(key);
        return label === key ? '—' : label;
    };

    /* ---------- ข้อความ error จาก API ---------- */
    Adm.errText = function (err, fallbackKey) {
        var code = err && err.code;
        if (code === 'DUPLICATE_NAME') return Adm.t('err-duplicate-name');
        if (code === 'CONFLICT') return Adm.t('err-in-use');
        if (code === 'NETWORK_ERROR') return Adm.t('err-network');
        if (code === 'NOT_FOUND') return Adm.t('err-not-found');
        return (err && err.message) || Adm.t(fallbackKey || 'err-generic');
    };

    /* ---------- แถบแจ้งเตือนบนหน้า ---------- */
    Adm.alert = function (message) {
        var box = Adm.$('admAlert');
        Adm.$('admAlertText').textContent = message;
        box.hidden = false;
        box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    Adm.clearAlert = function () { Adm.$('admAlert').hidden = true; };

    Adm.toast = function (message, type) {
        if (typeof global.showToast === 'function') global.showToast(Adm.esc(message), type);
    };

    /** ปิดปุ่มระหว่างรอ API (กันกดซ้ำ) */
    Adm.busy = function (btn, isBusy) {
        if (!btn) return;
        btn.disabled = !!isBusy;
        btn.classList.toggle('is-busy', !!isBusy);
    };

    /* ---------- Empty / error state ---------- */
    Adm.emptyState = function (el, opts) {
        el.innerHTML =
            '<div class="adm-empty-icon">' + Adm.icon(opts.icon || 'empty') + '</div>' +
            '<p class="adm-empty-title">' + Adm.esc(opts.title) + '</p>' +
            (opts.desc ? '<p class="adm-empty-desc">' + Adm.esc(opts.desc) + '</p>' : '') +
            (opts.actionLabel ? '<button type="button" class="adm-btn adm-btn-ghost adm-btn-sm" data-empty-action>' + Adm.esc(opts.actionLabel) + '</button>' : '');
        var btn = el.querySelector('[data-empty-action]');
        if (btn && opts.onAction) btn.addEventListener('click', opts.onAction);
    };

    /* ---------- Pagination ----------
       opts: { page, size, total, onPage(n) } — ซ่อนตัวเองถ้ามีหน้าเดียว */
    Adm.pager = function (el, opts) {
        var pages = Math.max(1, Math.ceil(opts.total / opts.size));
        if (opts.total <= opts.size) { el.innerHTML = ''; el.hidden = true; return; }
        el.hidden = false;
        var from = (opts.page - 1) * opts.size + 1;
        var to = Math.min(opts.total, opts.page * opts.size);
        el.innerHTML =
            '<span class="adm-pager-info">' + Adm.esc(Adm.t('pager-range', from, to, opts.total)) + '</span>' +
            '<div class="adm-pager-btns">' +
            '<button type="button" class="adm-icon-btn" data-page="' + (opts.page - 1) + '" aria-label="' + Adm.esc(Adm.t('pager-prev')) + '"' + (opts.page <= 1 ? ' disabled' : '') + '>' + Adm.icon('left') + '</button>' +
            '<span class="adm-pager-num">' + opts.page + ' / ' + pages + '</span>' +
            '<button type="button" class="adm-icon-btn" data-page="' + (opts.page + 1) + '" aria-label="' + Adm.esc(Adm.t('pager-next')) + '"' + (opts.page >= pages ? ' disabled' : '') + '>' + Adm.icon('right') + '</button>' +
            '</div>';
        el.onclick = function (e) {
            var b = e.target.closest('[data-page]');
            if (b && !b.disabled) opts.onPage(Number(b.dataset.page));
        };
    };

    /* ---------- Dialog (ใช้ .modal-overlay จาก style.css) ---------- */
    var openDialogs = [];
    Adm.openDialog = function (overlay, focusEl) {
        overlay.classList.add('is-open');
        if (openDialogs.indexOf(overlay) === -1) openDialogs.push(overlay);
        if (focusEl) setTimeout(function () { focusEl.focus(); }, 60);
    };
    Adm.closeDialog = function (overlay) {
        overlay.classList.remove('is-open');
        openDialogs = openDialogs.filter(function (o) { return o !== overlay; });
    };
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && openDialogs.length && !document.getElementById('globalConfirmOverlay')) {
            Adm.closeDialog(openDialogs[openDialogs.length - 1]);
        }
    });
    /** คลิกพื้นหลังมืดเพื่อปิด */
    Adm.dismissOnBackdrop = function (overlay) {
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) Adm.closeDialog(overlay); });
    };

    /* ---------- ระบบแท็บ ----------
       โมดูลลงทะเบียน: Adm.tabs.register('food', { show: fn }) — show() ถูกเรียกทุกครั้งที่สลับมาแท็บนั้น */
    var registry = {};
    Adm.tabs = {
        current: null,
        register: function (name, def) { registry[name] = def || {}; },
        has: function (name) { return !!registry[name]; },
        refreshTitle: function () {
            var name = Adm.tabs.current;
            if (!name) return;
            Adm.$('pageTitle').textContent = Adm.t('title-' + name);
            Adm.$('pageSubtitle').textContent = Adm.t('sub-' + name);
            document.title = Adm.t('title-' + name) + ' · soy dee';
        },
        show: function (name) {
            if (!registry[name]) return false;
            document.querySelectorAll('[data-tab-panel]').forEach(function (p) { p.hidden = p.dataset.tabPanel !== name; });
            document.querySelectorAll('.adm-nav-item').forEach(function (b) {
                var on = b.dataset.tab === name;
                b.classList.toggle('active', on);
                b.setAttribute('aria-selected', String(on));
                if (on) b.scrollIntoView({ block: 'nearest', inline: 'center' });
            });
            Adm.tabs.current = name;
            Adm.clearAlert();
            Adm.tabs.refreshTitle();
            if (registry[name].show) registry[name].show();
            return true;
        }
    };
})(window);
