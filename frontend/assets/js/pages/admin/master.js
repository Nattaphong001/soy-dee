/* ==============================================================================
   ADMIN / MASTER — จัดการข้อมูลหลัก: ประเภทอาหาร (food_category) และประเภทกิจกรรม (activity_master)
   CRUD ครบ: ดู/ค้นหา/กรอง · เพิ่ม · แก้ไข · ลบ · อัปโหลดรูป
     GET    /admin/food-categories , /admin/activities           (มี usage_count = จำนวนบันทึกที่อ้างอิง)
     POST   /admin/<kind>            PUT /admin/<kind>/:id        DELETE /admin/<kind>/:id (409 ถ้ายังถูกใช้อยู่)
     POST   /admin/<kind>/image      อัปโหลดรูป -> { path } แล้วส่ง path นั้นไปกับ POST/PUT
   ============================================================================== */
(function () {
    'use strict';

    var PAGE_SIZE = 10;
    var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    var TRAFFIC = { 1: 'green', 2: 'yellow', 3: 'red' };

    /* ---------- ค่ากำหนดของแต่ละชนิด ---------- */
    var KINDS = {
        food: {
            api: '/admin/food-categories',
            icon: 'food',
            ids: { search: 'foodSearch', filter: 'foodFilter', add: 'foodAddBtn', body: 'foodBody', empty: 'foodEmpty', pager: 'foodPager', table: 'foodTable' },
            fromApi: function (o) {
                return { id: o.fd_id, name: o.fd_name, light: o.fd_traffic_light, image: o.fd_images || '', usage: o.usage_count || 0 };
            },
            toApi: function (v) { return { fd_name: v.name, fd_traffic_light: v.light, fd_images: v.image || null }; },
            match: function (item, f) { return !f || String(item.light) === f; },
            filterOptions: function () {
                return [['', Adm.t('filter-traffic-all')], ['1', Adm.t('traffic-green')], ['2', Adm.t('traffic-yellow')], ['3', Adm.t('traffic-red')]];
            },
            row: function (it) {
                return '<td class="c-name">' + Adm.esc(it.name) + '</td>' +
                    '<td class="c-tag" data-label="' + Adm.esc(Adm.t('col-traffic')) + '">' + lightBadge(it.light) + '</td>';
            }
        },
        activity: {
            api: '/admin/activities',
            icon: 'activity',
            ids: { search: 'activitySearch', filter: 'activityFilter', add: 'activityAddBtn', body: 'activityBody', empty: 'activityEmpty', pager: 'activityPager', table: 'activityTable' },
            fromApi: function (o) {
                return {
                    id: o.act_id, name: o.act_name, image: o.act_images || '', usage: o.usage_count || 0,
                    category: SoyDeeActivityCategories.normalize(o.act_category),
                    intensity: SoyDeeActivityIntensity.normalize(o.act_intensity),
                    hasDistance: !!o.act_has_distance
                };
            },
            toApi: function (v) {
                return { act_name: v.name, act_images: v.image || null, act_category: v.category, act_intensity: v.intensity, act_has_distance: v.hasDistance };
            },
            match: function (item, f) { return !f || String(item.category) === f; },
            filterOptions: function () {
                return [['', Adm.t('filter-category-all')]].concat(SoyDeeActivityCategories.list.map(function (c) {
                    return [String(c.id), SoyDeeActivityCategories.label(c.id)];
                }));
            },
            row: function (it) {
                var lvl = SoyDeeActivityIntensity.list.filter(function (l) { return l.id === it.intensity; })[0];
                return '<td class="c-name">' + Adm.esc(it.name) + '</td>' +
                    '<td class="c-cat" data-label="' + Adm.esc(Adm.t('col-category')) + '"><span class="badge badge-neutral">' + Adm.esc(SoyDeeActivityCategories.label(it.category)) + '</span></td>' +
                    '<td class="c-lvl" data-label="' + Adm.esc(Adm.t('col-intensity')) + '"><span class="badge" style="--bc:var(' + lvl.color + ')"><i></i>' + Adm.esc(SoyDeeActivityIntensity.label(it.intensity)) + '</span></td>' +
                    '<td class="c-dist' + (it.hasDistance ? '' : ' is-off') + '" data-label="' + Adm.esc(Adm.t('col-distance')) + '">' +
                    (it.hasDistance ? '<span class="badge badge-neutral">' + Adm.icon('check') + Adm.esc(Adm.t('badge-distance')) + '</span>' : '<span class="muted">—</span>') + '</td>';
            }
        }
    };

    function lightBadge(n) {
        var c = TRAFFIC[n];
        if (!c) return '<span class="muted">—</span>';
        return '<span class="badge badge-' + c + '"><i></i>' + Adm.esc(Adm.t('traffic-' + c)) + '</span>';
    }

    /* ---------- state ---------- */
    var state = {};
    Object.keys(KINDS).forEach(function (k) {
        state[k] = { items: [], page: 1, query: '', filter: '', status: 'idle' }; // idle | loading | ready | error
    });

    /* ---------- โหลดข้อมูล ---------- */
    function load(kind) {
        var st = state[kind];
        st.status = 'loading';
        render(kind);
        return SoyDeeAPI.request(KINDS[kind].api).then(function (data) {
            st.items = (data || []).map(KINDS[kind].fromApi);
            st.status = 'ready';
        }).catch(function (err) {
            st.status = 'error';
            Adm.alert(Adm.errText(err, 'err-load'));
        }).then(function () { render(kind); });
    }

    /* ---------- render ตาราง ---------- */
    function filtered(kind) {
        var st = state[kind], cfg = KINDS[kind], q = st.query.trim().toLowerCase();
        return st.items.filter(function (it) {
            return (!q || it.name.toLowerCase().indexOf(q) !== -1) && cfg.match(it, st.filter);
        });
    }

    function actionsCell(it) {
        var locked = it.usage > 0;
        return '<td class="c-act"><div class="adm-actions">' +
            '<button type="button" class="adm-icon-btn" data-action="edit" aria-label="' + Adm.esc(Adm.t('aria-edit')) + '" title="' + Adm.esc(Adm.t('aria-edit')) + '">' + Adm.icon('edit') + '</button>' +
            '<button type="button" class="adm-icon-btn adm-icon-danger' + (locked ? ' is-locked' : '') + '" data-action="delete" aria-label="' + Adm.esc(Adm.t('aria-delete')) + '" title="' +
            Adm.esc(locked ? Adm.t('warn-blocked', it.usage) : Adm.t('aria-delete')) + '">' + Adm.icon('trash') + '</button>' +
            '</div></td>';
    }

    function thumbCell(kind, it) {
        return '<td class="c-img"><div class="thumb">' +
            (it.image ? '<img src="' + Adm.esc(SoyDeeAPI.assetUrl(it.image)) + '" alt="" loading="lazy">' : Adm.icon(KINDS[kind].icon)) +
            '</div></td>';
    }

    function render(kind) {
        var st = state[kind], cfg = KINDS[kind], ids = cfg.ids;
        var body = Adm.$(ids.body), empty = Adm.$(ids.empty), table = Adm.$(ids.table);

        var list = filtered(kind);
        var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
        st.page = Math.min(Math.max(1, st.page), pages);
        var slice = list.slice((st.page - 1) * PAGE_SIZE, st.page * PAGE_SIZE);

        var hasRows = slice.length > 0;
        table.hidden = !hasRows;
        empty.hidden = hasRows;

        body.innerHTML = slice.map(function (it) {
            return '<tr data-id="' + it.id + '">' + thumbCell(kind, it) + cfg.row(it) +
                '<td class="c-use num" data-label="' + Adm.esc(Adm.t('col-usage-short')) + '">' + Adm.fmtInt(it.usage) + '</td>' +
                actionsCell(it) + '</tr>';
        }).join('');

        if (!hasRows) {
            if (st.status === 'loading' || st.status === 'idle') {
                Adm.emptyState(empty, { icon: cfg.icon, title: Adm.t('loading') });
            } else if (st.status === 'error') {
                Adm.emptyState(empty, { icon: 'alert', title: Adm.t('err-load'), actionLabel: Adm.t('btn-retry'), onAction: function () { load(kind); } });
            } else if (st.items.length === 0) {
                Adm.emptyState(empty, { icon: cfg.icon, title: Adm.t('empty-' + kind + '-title'), desc: Adm.t('empty-' + kind + '-desc') });
            } else {
                Adm.emptyState(empty, { icon: 'search', title: Adm.t('empty-search-title'), desc: Adm.t('empty-search-desc') });
            }
        }

        Adm.pager(Adm.$(ids.pager), {
            page: st.page, size: PAGE_SIZE, total: list.length,
            onPage: function (n) { st.page = n; render(kind); }
        });
    }

    function fillFilter(kind) {
        var sel = Adm.$(KINDS[kind].ids.filter);
        var keep = state[kind].filter;
        sel.innerHTML = KINDS[kind].filterOptions().map(function (o) {
            return '<option value="' + o[0] + '">' + Adm.esc(o[1]) + '</option>';
        }).join('');
        sel.value = keep;
    }

    /* ---------- Dialog เพิ่ม/แก้ไข ---------- */
    var overlay = Adm.$('itemModalOverlay');
    var form = Adm.$('itemForm');
    var nameInput = Adm.$('itemNameInput');
    var errBox = Adm.$('itemError');
    var saveBtn = Adm.$('itemSaveBtn');
    var pills = Array.prototype.slice.call(document.querySelectorAll('#trafficPills .pill'));
    var img = { original: '', file: null, preview: '', removed: false };
    var dlg = { kind: 'food', id: null, light: null };

    function setLight(v) {
        dlg.light = v;
        pills.forEach(function (p) {
            var on = Number(p.dataset.value) === v;
            p.classList.toggle('active', on);
            p.setAttribute('aria-checked', String(on));
        });
    }

    function showImage(url) {
        var el = Adm.$('itemImageImg');
        el.hidden = !url;
        if (url) el.src = url; else el.removeAttribute('src');
        Adm.$('itemImageBox').classList.toggle('has-img', !!url);
        Adm.$('itemImageRemoveBtn').hidden = !url;
    }

    function dialogError(msg) {
        errBox.textContent = msg || '';
        errBox.hidden = !msg;
    }

    function openDialog(kind, item) {
        dlg = { kind: kind, id: item ? item.id : null, light: null };
        var isFood = kind === 'food';
        dialogError('');
        nameInput.classList.remove('is-invalid');

        Adm.$('itemDialogTitle').textContent = Adm.t('dialog-' + (item ? 'edit' : 'add') + '-' + kind);
        Adm.$('itemNameLabel').textContent = Adm.t('label-name-' + kind);
        nameInput.placeholder = Adm.t('placeholder-name-' + kind);
        nameInput.value = item ? item.name : '';

        Adm.$('trafficField').hidden = !isFood;
        Adm.$('activityFields').hidden = isFood;
        if (isFood) {
            setLight(item ? item.light : null);
        } else {
            var cat = Adm.$('itemCategory'), lvl = Adm.$('itemIntensity');
            cat.innerHTML = SoyDeeActivityCategories.list.map(function (c) {
                return '<option value="' + c.id + '">' + Adm.esc(SoyDeeActivityCategories.label(c.id)) + '</option>';
            }).join('');
            lvl.innerHTML = SoyDeeActivityIntensity.list.map(function (l) {
                return '<option value="' + l.id + '">' + Adm.esc(SoyDeeActivityIntensity.label(l.id)) + '</option>';
            }).join('');
            cat.value = String(item ? item.category : SoyDeeActivityCategories.defaultId);
            lvl.value = String(item ? item.intensity : SoyDeeActivityIntensity.defaultId);
            Adm.$('itemHasDistance').checked = item ? item.hasDistance : false;
        }

        if (img.preview && img.file) URL.revokeObjectURL(img.preview);
        img = { original: item ? item.image : '', file: null, preview: '', removed: false };
        Adm.$('itemImageInput').value = '';
        showImage(item && item.image ? SoyDeeAPI.assetUrl(item.image) : '');

        Adm.openDialog(overlay, nameInput);
    }

    function closeDialog() { Adm.closeDialog(overlay); }

    pills.forEach(function (p) {
        p.addEventListener('click', function () { setLight(Number(p.dataset.value)); dialogError(''); });
    });

    Adm.$('itemImageBtn').addEventListener('click', function () { Adm.$('itemImageInput').click(); });
    Adm.$('itemImageInput').addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        if (IMAGE_TYPES.indexOf(file.type) === -1) { dialogError(Adm.t('err-image-type')); e.target.value = ''; return; }
        if (file.size > MAX_IMAGE_BYTES) { dialogError(Adm.t('err-image-size')); e.target.value = ''; return; }
        dialogError('');
        if (img.preview && img.file) URL.revokeObjectURL(img.preview);
        img.file = file;
        img.preview = URL.createObjectURL(file);
        img.removed = false;
        showImage(img.preview);
    });
    Adm.$('itemImageRemoveBtn').addEventListener('click', function () {
        if (img.preview && img.file) URL.revokeObjectURL(img.preview);
        img.file = null; img.preview = ''; img.removed = true;
        Adm.$('itemImageInput').value = '';
        showImage('');
    });

    Adm.$('itemCloseBtn').addEventListener('click', closeDialog);
    Adm.$('itemCancelBtn').addEventListener('click', closeDialog);
    Adm.dismissOnBackdrop(overlay);

    function validate() {
        var kind = dlg.kind;
        var name = nameInput.value.trim();
        if (!name) return Adm.t('err-name-required-' + kind);
        if (kind === 'food' && !dlg.light) return Adm.t('err-traffic-required');
        var dup = state[kind].items.some(function (it) {
            return it.id !== dlg.id && it.name.trim().toLowerCase() === name.toLowerCase();
        });
        return dup ? Adm.t('err-duplicate-name') : '';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var kind = dlg.kind, cfg = KINDS[kind];
        var problem = validate();
        nameInput.classList.toggle('is-invalid', !!problem && !nameInput.value.trim());
        if (problem) { dialogError(problem); return; }
        dialogError('');
        Adm.busy(saveBtn, true);

        var isEdit = dlg.id !== null;
        var uploaded = img.file
            ? (function () {
                var fd = new FormData();
                fd.append('image', img.file);
                return SoyDeeAPI.request(cfg.api + '/image', { method: 'POST', isForm: true, body: fd }).then(function (r) { return r.path; });
            })()
            : Promise.resolve(img.removed ? '' : img.original);

        uploaded.then(function (imagePath) {
            var v = { name: nameInput.value.trim(), image: imagePath };
            if (kind === 'food') {
                v.light = dlg.light;
            } else {
                v.category = Number(Adm.$('itemCategory').value);
                v.intensity = Number(Adm.$('itemIntensity').value);
                v.hasDistance = Adm.$('itemHasDistance').checked;
            }
            return SoyDeeAPI.request(isEdit ? cfg.api + '/' + dlg.id : cfg.api, { method: isEdit ? 'PUT' : 'POST', body: cfg.toApi(v) });
        }).then(function () {
            closeDialog();
            var st = state[kind];
            if (!isEdit) { st.query = ''; st.filter = ''; Adm.$(cfg.ids.search).value = ''; Adm.$(cfg.ids.filter).value = ''; }
            Adm.toast(Adm.t(isEdit ? 'toast-updated' : 'toast-created'), 'success');
            return load(kind).then(function () {
                if (!isEdit) { st.page = Math.ceil(st.items.length / PAGE_SIZE); render(kind); }
            });
        }).catch(function (err) {
            dialogError(Adm.errText(err, 'err-save'));
        }).then(function () { Adm.busy(saveBtn, false); });
    });

    /* ---------- ลบ ---------- */
    function askDelete(kind, item) {
        if (item.usage > 0) { Adm.alert(Adm.t('warn-blocked', item.usage)); return; }
        showConfirm({
            title: Adm.t('confirm-delete-title', item.name),
            message: Adm.t('confirm-delete-message'),
            confirmText: Adm.t('btn-delete'),
            cancelText: Adm.t('btn-cancel'),
            onConfirm: function () {
                SoyDeeAPI.request(KINDS[kind].api + '/' + item.id, { method: 'DELETE' }).then(function () {
                    Adm.toast(Adm.t('toast-deleted'), 'success');
                }).catch(function (err) {
                    Adm.alert(Adm.errText(err, 'err-delete'));
                }).then(function () { load(kind); });
            }
        });
    }

    /* ---------- ผูก event ต่อชนิด ---------- */
    Object.keys(KINDS).forEach(function (kind) {
        var ids = KINDS[kind].ids, st = state[kind];

        Adm.$(ids.search).addEventListener('input', function (e) { st.query = e.target.value; st.page = 1; render(kind); });
        Adm.$(ids.filter).addEventListener('change', function (e) { st.filter = e.target.value; st.page = 1; render(kind); });
        Adm.$(ids.add).addEventListener('click', function () { Adm.clearAlert(); openDialog(kind, null); });

        Adm.$(ids.body).addEventListener('click', function (e) {
            var btn = e.target.closest('[data-action]');
            var row = e.target.closest('tr[data-id]');
            if (!btn || !row) return;
            var item = st.items.filter(function (i) { return i.id === Number(row.dataset.id); })[0];
            if (!item) return;
            Adm.clearAlert();
            if (btn.dataset.action === 'edit') openDialog(kind, item);
            else askDelete(kind, item);
        });

        Adm.tabs.register(kind, {
            show: function () {
                fillFilter(kind);
                if (st.status !== 'loading') load(kind);
            }
        });
    });

    Adm.onLang(function () {
        Object.keys(KINDS).forEach(function (kind) { fillFilter(kind); render(kind); });
    });

    /** ให้โมดูลอื่น (รายงาน/สมาชิก) ขอรายการที่โหลดไว้แล้วไปใช้ */
    Adm.master = {
        items: function (kind) { return state[kind].items; },
        ensure: function (kind) {
            if (state[kind].status === 'ready') return Promise.resolve(state[kind].items);
            return load(kind).then(function () { return state[kind].items; });
        }
    };
})();
