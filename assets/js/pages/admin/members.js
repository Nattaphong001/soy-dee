/* ==============================================================================
   ADMIN / MEMBERS — ข้อมูลสมาชิก (อ่านอย่างเดียว)
     GET /admin/members?search&gender&bmi_category&from&to&page&limit   (แบ่งหน้าฝั่ง server)
     GET /admin/members/:id                                             (รายละเอียด + ประวัติ)
   ============================================================================== */
(function () {
    'use strict';

    var PAGE_SIZE = 20;
    var BMI_COLOR = { 1: '--bmi-thin', 2: '--bmi-normal', 3: '--bmi-over', 4: '--bmi-obese' };
    var st = { items: [], total: 0, page: 1, status: 'idle', seq: 0 };

    var el = {
        search: Adm.$('memberSearch'), gender: Adm.$('memberGender'), bmi: Adm.$('memberBmi'),
        from: Adm.$('memberFrom'), to: Adm.$('memberTo'), reset: Adm.$('memberReset'),
        table: Adm.$('memberTable'), body: Adm.$('memberBody'), empty: Adm.$('memberEmpty'), pager: Adm.$('memberPager')
    };

    function fillSelects() {
        var g = el.gender.value, b = el.bmi.value;
        el.gender.innerHTML = '<option value="">' + Adm.esc(Adm.t('filter-gender-all')) + '</option>' +
            [1, 2].map(function (c) { return '<option value="' + c + '">' + Adm.esc(Adm.t('gender-' + c)) + '</option>'; }).join('');
        el.bmi.innerHTML = '<option value="">' + Adm.esc(Adm.t('filter-bmi-all')) + '</option>' +
            [1, 2, 3, 4].map(function (c) { return '<option value="' + c + '">' + Adm.esc(Adm.t('bmi-' + c)) + '</option>'; }).join('');
        el.gender.value = g; el.bmi.value = b;
    }

    function bmiBadge(code) {
        if (!BMI_COLOR[code]) return '';
        return '<span class="badge" style="--bc:var(' + BMI_COLOR[code] + ')"><i></i>' + Adm.esc(Adm.t('bmi-' + code)) + '</span>';
    }

    function load() {
        if (el.from.value && el.to.value && el.from.value > el.to.value) {
            Adm.alert(Adm.t('err-date-range'));
            return;
        }
        Adm.clearAlert();
        var seq = ++st.seq;
        st.status = 'loading';
        render();
        SoyDeeAPI.request('/admin/members', {
            query: {
                search: el.search.value.trim(), gender: el.gender.value, bmi_category: el.bmi.value,
                from: el.from.value, to: el.to.value, page: st.page, limit: PAGE_SIZE
            }
        }).then(function (data) {
            if (seq !== st.seq) return;
            st.items = (data && data.items) || [];
            st.total = (data && data.total) || 0;
            st.status = 'ready';
        }).catch(function (err) {
            if (seq !== st.seq) return;
            st.items = []; st.total = 0; st.status = 'error';
            Adm.alert(Adm.errText(err, 'err-load'));
        }).then(function () { if (seq === st.seq) render(); });
    }

    function render() {
        var has = st.items.length > 0;
        el.table.hidden = !has;
        el.empty.hidden = has;

        el.body.innerHTML = st.items.map(function (m) {
            var body = (m.mbs_weight === null || m.mbs_weight === undefined) ? '—'
                : Adm.fmtNum(m.mbs_weight) + ' kg / ' + Adm.fmtNum(m.mbs_height, 0) + ' cm';
            var bmi = (m.latest_bmi === null || m.latest_bmi === undefined) ? '<span class="muted">—</span>'
                : '<span class="num">' + Adm.fmtNum(m.latest_bmi) + '</span> ' + bmiBadge(m.mbh_eval_result);
            return '<tr data-id="' + m.mb_id + '" tabindex="0">' +
                '<td class="c-name"><strong>' + Adm.esc(m.mb_full_name || '—') + '</strong><small>@' + Adm.esc(m.mb_user_name || '') + '</small></td>' +
                '<td class="c-gender" data-label="' + Adm.esc(Adm.t('col-gender')) + '">' + Adm.esc(Adm.code('gender', m.mb_gender)) + '</td>' +
                '<td class="c-age num" data-label="' + Adm.esc(Adm.t('unit-age')) + '">' + (m.age === null || m.age === undefined ? '—' : m.age) + '</td>' +
                '<td class="c-body num" data-label="' + Adm.esc(Adm.t('col-body')) + '">' + Adm.esc(body) + '</td>' +
                '<td class="c-bmi" data-label="' + Adm.esc(Adm.t('col-bmi')) + '">' + bmi + '</td>' +
                '<td class="c-target" data-label="' + Adm.esc(Adm.t('col-target')) + '">' + Adm.esc(Adm.code('target', m.mbs_target)) + '</td>' +
                '<td class="c-date" data-label="' + Adm.esc(Adm.t('col-joined')) + '">' + Adm.fmtDate(m.mb_created_at) + '</td>' +
                '</tr>';
        }).join('');

        if (!has) {
            if (st.status === 'loading' || st.status === 'idle') Adm.emptyState(el.empty, { icon: 'users', title: Adm.t('loading') });
            else if (st.status === 'error') Adm.emptyState(el.empty, { icon: 'alert', title: Adm.t('err-load'), actionLabel: Adm.t('btn-retry'), onAction: load });
            else Adm.emptyState(el.empty, { icon: 'users', title: Adm.t('empty-members-title'), desc: Adm.t('empty-members-desc') });
        }

        Adm.pager(el.pager, { page: st.page, size: PAGE_SIZE, total: st.total, onPage: function (n) { st.page = n; load(); } });
    }

    /* ---------- ตัวกรอง ---------- */
    var reload = function () { st.page = 1; load(); };
    [el.gender, el.bmi, el.from, el.to].forEach(function (c) { c.addEventListener('change', reload); });
    el.search.addEventListener('input', Adm.debounce(reload, 300));
    el.reset.addEventListener('click', function () {
        el.search.value = ''; el.gender.value = ''; el.bmi.value = ''; el.from.value = ''; el.to.value = '';
        reload();
    });

    /* ---------- รายละเอียดสมาชิก ---------- */
    var overlay = Adm.$('memberOverlay');
    Adm.$('memberCloseBtn').addEventListener('click', function () { Adm.closeDialog(overlay); });
    Adm.dismissOnBackdrop(overlay);

    function miniList(rows, mapper) {
        return rows.length
            ? rows.map(function (r) { var c = mapper(r); return '<div class="mini-row"><span>' + c[0] + '</span><span>' + c[1] + '</span></div>'; }).join('')
            : '<div class="mini-empty">' + Adm.esc(Adm.t('detail-no-data')) + '</div>';
    }

    function openDetail(id) {
        SoyDeeAPI.request('/admin/members/' + id).then(function (d) {
            var p = (d && d.profile) || {};
            Adm.$('memberName').textContent = p.mb_full_name || '—';

            var chips = [
                '@' + Adm.esc(p.mb_user_name || ''),
                Adm.esc(Adm.code('gender', p.mb_gender)),
                p.age === null || p.age === undefined ? '' : Adm.esc(Adm.t('age-years', p.age)),
                Adm.esc(Adm.t('joined-on', Adm.fmtDate(p.mb_created_at))),
                Adm.esc(Adm.code('target', p.mbs_target))
            ].filter(function (c) { return c && c !== '—'; });
            var bmi = (p.latest_bmi === null || p.latest_bmi === undefined) ? '' :
                '<span class="member-bmi"><span class="num">BMI ' + Adm.fmtNum(p.latest_bmi) + '</span> ' + bmiBadge(p.mbh_eval_result) + '</span>';
            Adm.$('memberMeta').innerHTML = chips.map(function (c) { return '<span>' + c + '</span>'; }).join('') + bmi;

            Adm.$('memberBodyStats').innerHTML = miniList(d.body_stats || [], function (b) {
                return [Adm.fmtDate(b.mbs_recorded_date), '<span class="num">' + Adm.fmtNum(b.mbs_weight) + ' kg / ' + Adm.fmtNum(b.mbs_height, 0) + ' cm</span>'];
            });
            Adm.$('memberBmrList').innerHTML = miniList(d.bmr_history || [], function (b) {
                return [Adm.fmtDate(b.mbh_record_date), '<span class="num">' + Adm.fmtNum(b.mbh_bmi) + '</span> ' + bmiBadge(b.mbh_eval_result)];
            });
            Adm.openDialog(overlay);
        }).catch(function (err) { Adm.alert(Adm.errText(err, 'err-load')); });
    }

    el.body.addEventListener('click', function (e) {
        var row = e.target.closest('tr[data-id]');
        if (row) openDetail(Number(row.dataset.id));
    });
    el.body.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var row = e.target.closest('tr[data-id]');
        if (row) openDetail(Number(row.dataset.id));
    });

    Adm.tabs.register('members', { show: function () { fillSelects(); load(); } });
    Adm.onLang(function () { fillSelects(); render(); });
})();
