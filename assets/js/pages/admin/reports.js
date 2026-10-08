/* ==============================================================================
   ADMIN / REPORTS — GET /admin/reports?type=bmi|food|activity|sleep
   4 รายงาน แต่ละอันมี: แถบตัวกรองของตัวเอง, การ์ดสรุปตัวเลข, กราฟแท่งแนวนอน,
   ตารางรายละเอียด. ส่งออก CSV ตรงจากข้อมูลที่โหลดไว้แล้ว, ส่งออก PDF ผ่าน
   window.print() (@media print ใน admin.css ซ่อนทุกอย่างนอก .rp-doc)
   ============================================================================== */
(function () {
    'use strict';

    var TYPES = ['nutrition', 'food', 'activity', 'sleep'];
    var API_TYPE = { nutrition: 'bmi', food: 'food', activity: 'activity', sleep: 'sleep' };
    var current = 'nutrition';
    var lastData = {};      // type -> API response (or null on error/empty)
    var lastFilters = {};   // type -> {label, value} pairs actually applied, for the print header

    var BMI_COLOR = { 'ผอม': '--bmi-thin', 'ปกติ': '--bmi-normal', 'ท้วม': '--bmi-over', 'อ้วน': '--bmi-obese' };
    var SLEEP_COLOR = { 'แย่': '--color-red', 'ปานกลาง': '--color-yellow', 'ดี': '--color-green' };
    var TRAFFIC_COLOR = { 1: '--food-green', 2: '--food-yellow', 3: '--food-red' };

    /* ---------- แถบเลือกประเภทรายงาน ---------- */
    function renderSeg() {
        Adm.$('reportSeg').innerHTML = TYPES.map(function (t) {
            return '<button type="button" class="seg-btn' + (t === current ? ' active' : '') + '" role="tab" aria-selected="' +
                (t === current) + '" data-type="' + t + '">' + Adm.esc(Adm.t('report-' + t)) + '</button>';
        }).join('');
    }
    Adm.$('reportSeg').addEventListener('click', function (e) {
        var b = e.target.closest('[data-type]');
        if (!b || b.dataset.type === current) return;
        current = b.dataset.type;
        renderSeg();
        renderFilters();
        load();
    });

    /* ---------- แถบตัวกรอง (สร้างใหม่ทุกครั้งที่สลับประเภท/ภาษา) ---------- */
    function optionsHtml(pairs) {
        return pairs.map(function (p) { return '<option value="' + p[0] + '">' + Adm.esc(p[1]) + '</option>'; }).join('');
    }
    function dateFieldsHtml(prefix) {
        return '<label class="adm-field-inline"><span>' + Adm.esc(Adm.t('filter-from')) + '</span><input type="date" class="adm-input" id="' + prefix + 'From"></label>' +
            '<label class="adm-field-inline"><span>' + Adm.esc(Adm.t('filter-to')) + '</span><input type="date" class="adm-input" id="' + prefix + 'To"></label>';
    }

    function renderFilters() {
        var box = Adm.$('reportFilters'), html = '';
        if (current === 'nutrition') {
            html = '<select class="adm-select" id="rfGender">' + optionsHtml([['', Adm.t('filter-gender-all')], [1, Adm.t('gender-1')], [2, Adm.t('gender-2')]]) + '</select>' +
                '<select class="adm-select" id="rfEval">' + optionsHtml([['', Adm.t('filter-bmi-all')], [1, Adm.t('bmi-1')], [2, Adm.t('bmi-2')], [3, Adm.t('bmi-3')], [4, Adm.t('bmi-4')]]) + '</select>' +
                dateFieldsHtml('rf');
        } else if (current === 'food') {
            html = '<select class="adm-select" id="rfMeal">' + optionsHtml([['', Adm.t('filter-meal-all')], [1, Adm.t('meal-1')], [2, Adm.t('meal-2')], [3, Adm.t('meal-3')], [4, Adm.t('meal-4')]]) + '</select>' +
                '<select class="adm-select" id="rfTraffic">' + optionsHtml([['', Adm.t('filter-traffic-all')], [1, Adm.t('traffic-green')], [2, Adm.t('traffic-yellow')], [3, Adm.t('traffic-red')]]) + '</select>' +
                dateFieldsHtml('rf');
        } else if (current === 'activity') {
            var acts = Adm.master.items('activity');
            html = '<select class="adm-select" id="rfActivity">' + optionsHtml([['', Adm.t('filter-activity-all')]].concat(acts.map(function (a) { return [a.id, a.name]; }))) + '</select>' +
                dateFieldsHtml('rf');
            if (!acts.length) Adm.master.ensure('activity').then(renderFilters);
        } else {
            html = '<select class="adm-select" id="rfSleepEval">' + optionsHtml([['', Adm.t('filter-sleep-eval-all')], [1, Adm.t('sleep-eval-1')], [2, Adm.t('sleep-eval-2')], [3, Adm.t('sleep-eval-3')]]) + '</select>' +
                dateFieldsHtml('rf');
        }
        box.innerHTML = html;
        Array.prototype.forEach.call(box.querySelectorAll('select,input'), function (el) { el.addEventListener('change', load); });
    }

    function filterQuery() {
        var v = function (id) { var el = Adm.$(id); return el ? el.value : ''; };
        var from = v('rfFrom'), to = v('rfTo');
        var q = { type: API_TYPE[current], from: from, to: to, limit: 10 };
        var labels = [];
        if (from || to) labels.push([Adm.t('filter-date-range'), (from ? Adm.fmtDate(from) : '…') + ' – ' + (to ? Adm.fmtDate(to) : '…')]);
        if (current === 'nutrition') {
            q.gender = v('rfGender'); q.eval = v('rfEval');
            if (q.gender) labels.push([Adm.t('col-gender'), Adm.t('gender-' + q.gender)]);
            if (q.eval) labels.push([Adm.t('col-bmi'), Adm.t('bmi-' + q.eval)]);
        } else if (current === 'food') {
            q.meal_type = v('rfMeal'); q.traffic_light = v('rfTraffic');
            if (q.meal_type) labels.push([Adm.t('col-meal'), Adm.t('meal-' + q.meal_type)]);
            if (q.traffic_light) labels.push([Adm.t('col-traffic'), Adm.t('traffic-' + ({ 1: 'green', 2: 'yellow', 3: 'red' }[q.traffic_light]))]);
        } else if (current === 'activity') {
            q.act_id = v('rfActivity');
            if (q.act_id) {
                var a = Adm.master.items('activity').filter(function (x) { return String(x.id) === q.act_id; })[0];
                if (a) labels.push([Adm.t('report-activity'), a.name]);
            }
        } else {
            q.eval = v('rfSleepEval');
            if (q.eval) labels.push([Adm.t('report-sleep'), Adm.t('sleep-eval-' + q.eval)]);
        }
        lastFilters[current] = labels;
        return q;
    }

    /* ---------- กราฟแท่งแนวนอน (ใช้ร่วมทุกรายงาน) ---------- */
    function barList(items) {
        if (!items.length) return '';
        var max = Math.max(1, Math.max.apply(null, items.map(function (i) { return i.count; })));
        return '<div class="bar-list">' + items.map(function (i) {
            var w = Math.max(3, i.count * 100 / max);
            return '<div class="bar-row">' +
                '<span class="bar-label">' + Adm.esc(i.label) + '</span>' +
                '<span class="bar-track"><span class="bar-fill" style="width:' + w + '%;background:var(' + (i.color || '--accent-1') + ')"></span></span>' +
                '<span class="bar-value num">' + Adm.fmtInt(i.count) + (i.percent !== undefined ? ' <small>(' + Adm.fmtNum(i.percent, 1) + '%)</small>' : '') + '</span>' +
                '</div>';
        }).join('') + '</div>';
    }

    function statCards(cards) {
        return '<div class="report-cards">' + cards.map(function (c) {
            return '<div class="report-card"><span class="report-card-label">' + Adm.esc(c[0]) + '</span><strong class="report-card-value num">' + c[1] + '</strong></div>';
        }).join('') + '</div>';
    }

    function tableHtml(head, rows) {
        return '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
            head.map(function (h) { return '<th' + (h[1] ? ' class="num"' : '') + '>' + Adm.esc(h[0]) + '</th>'; }).join('') +
            '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (head[i] && head[i][1] ? ' class="num"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
            '</tbody></table></div>';
    }

    /* ---------- render ต่อประเภท ---------- */
    function renderNutrition(d) {
        var total = d.total || 0;
        var summary = d.summary || {};
        var order = ['ผอม', 'ปกติ', 'ท้วม', 'อ้วน'];
        var rows = order.filter(function (k) { return summary[k] !== undefined; }).map(function (k) {
            return { label: k, count: summary[k], percent: Adm.pct(summary[k], total), color: BMI_COLOR[k] };
        });
        Adm.$('rpTitle').textContent = Adm.t('report-nutrition');
        return statCards([[Adm.t('stat-total-members'), Adm.fmtInt(total)]].concat(rows.map(function (r) {
            return [r.label, Adm.fmtInt(r.count) + ' (' + Adm.fmtNum(r.percent, 1) + '%)'];
        }))) + barList(rows) + tableHtml([[Adm.t('col-bmi')], [Adm.t('col-count'), true], [Adm.t('col-percent'), true]],
            rows.map(function (r) { return [Adm.esc(r.label), Adm.fmtInt(r.count), Adm.fmtNum(r.percent, 1) + '%']; }));
    }

    function renderFood(d) {
        var total = d.total || 0;
        var s = d.summary || {};
        var rows = [
            { key: 1, label: Adm.t('traffic-green'), count: s.green || 0 },
            { key: 2, label: Adm.t('traffic-yellow'), count: s.yellow || 0 },
            { key: 3, label: Adm.t('traffic-red'), count: s.red || 0 }
        ].map(function (r) { return Object.assign(r, { percent: Adm.pct(r.count, total), color: TRAFFIC_COLOR[r.key] }); });
        var top = s.top_categories || [];
        Adm.$('rpTitle').textContent = Adm.t('report-food');
        var cards = [[Adm.t('stat-total-food-logs'), Adm.fmtInt(total)]].concat(rows.map(function (r) { return [r.label, Adm.fmtInt(r.count) + ' (' + Adm.fmtNum(r.percent, 1) + '%)']; }));
        if (s.uncategorized) cards.push([Adm.t('stat-uncategorized'), Adm.fmtInt(s.uncategorized)]);
        return statCards(cards) + barList(rows) +
            '<h3 class="rp-subhead">' + Adm.esc(Adm.t('top-food-title')) + '</h3>' +
            (top.length ? tableHtml([[Adm.t('col-food-category')], [Adm.t('col-times-logged'), true]], top.map(function (c) { return [Adm.esc(c.name), Adm.fmtInt(c.count)]; }))
                : '<p class="adm-hint">' + Adm.esc(Adm.t('report-empty')) + '</p>');
    }

    function renderActivity(d) {
        var s = d.summary || {};
        var top = s.top_activities || [];
        Adm.$('rpTitle').textContent = Adm.t('report-activity');
        return statCards([
            [Adm.t('stat-total-minutes'), Adm.fmtInt(s.total_duration_min)],
            [Adm.t('stat-times-logged'), Adm.fmtInt(s.activity_count)]
        ]) + barList(top.map(function (a) { return { label: a.name, count: a.count }; })) +
            (top.length ? tableHtml([[Adm.t('col-activity')], [Adm.t('col-times-logged'), true]], top.map(function (a) { return [Adm.esc(a.name), Adm.fmtInt(a.count)]; }))
                : '<p class="adm-hint">' + Adm.esc(Adm.t('report-empty')) + '</p>');
    }

    function renderSleep(d) {
        var total = d.total || 0;
        var s = d.summary || {};
        var order = ['แย่', 'ปานกลาง', 'ดี'];
        var qb = s.quality_breakdown || {};
        var rows = order.filter(function (k) { return qb[k] !== undefined; }).map(function (k) {
            return { label: Adm.t('sleep-quality-' + { 'แย่': 1, 'ปานกลาง': 2, 'ดี': 3 }[k]), count: qb[k], percent: Adm.pct(qb[k], total), color: SLEEP_COLOR[k] };
        });
        Adm.$('rpTitle').textContent = Adm.t('report-sleep');
        return statCards([[Adm.t('stat-avg-sleep-hours'), Adm.fmtNum(s.avg_sleep_hours, 1)]].concat(rows.map(function (r) {
            return [r.label, Adm.fmtInt(r.count) + ' (' + Adm.fmtNum(r.percent, 1) + '%)'];
        }))) + barList(rows) + tableHtml([[Adm.t('col-sleep-quality')], [Adm.t('col-count'), true], [Adm.t('col-percent'), true]],
            rows.map(function (r) { return [Adm.esc(r.label), Adm.fmtInt(r.count), Adm.fmtNum(r.percent, 1) + '%']; }));
    }

    var RENDERERS = { nutrition: renderNutrition, food: renderFood, activity: renderActivity, sleep: renderSleep };

    function renderPrintMeta() {
        var labels = lastFilters[current] || [];
        var parts = [['<dt>' + Adm.esc(Adm.t('rp-generated')) + '</dt><dd>' + Adm.esc(Adm.fmtDateTime(new Date())) + '</dd>']];
        labels.forEach(function (l) { if (l[0]) parts.push(['<dt>' + Adm.esc(l[0]) + '</dt><dd>' + Adm.esc(l[1]) + '</dd>']); });
        Adm.$('rpMeta').innerHTML = parts.map(function (p) { return p[0]; }).join('');
        Adm.$('rpFoot').textContent = Adm.t('rp-footer');
    }

    function render() {
        var d = lastData[current];
        if (d === undefined) { Adm.$('reportBody').innerHTML = '<p class="adm-loading">' + Adm.esc(Adm.t('loading')) + '</p>'; return; }
        if (d === null) {
            Adm.$('reportBody').innerHTML = '';
            Adm.emptyState(Adm.$('reportBody'), { icon: 'report', title: Adm.t('report-empty'), actionLabel: Adm.t('btn-retry'), onAction: load });
            return;
        }
        Adm.$('reportBody').innerHTML = RENDERERS[current](d);
        renderPrintMeta();
    }

    function load() {
        var q = filterQuery();
        lastData[current] = undefined;
        render();
        SoyDeeAPI.request('/admin/reports', { query: q }).then(function (d) {
            lastData[current] = d || null;
        }).catch(function (err) {
            lastData[current] = null;
            Adm.alert(Adm.errText(err, 'err-load'));
        }).then(render);
    }

    /* ---------- ส่งออก ---------- */
    Adm.$('reportPdfBtn').addEventListener('click', function () {
        if (!lastData[current]) { Adm.toast(Adm.t('report-empty'), 'error'); return; }
        var root = document.createElement('div');
        root.id = 'printRoot';
        root.appendChild(Adm.$('reportDoc').cloneNode(true));
        document.body.appendChild(root);
        var done = function () { root.remove(); window.removeEventListener('afterprint', done); };
        window.addEventListener('afterprint', done);
        window.print();
    });

    Adm.tabs.register('reports', {
        show: function () {
            renderSeg();
            renderFilters();
            load();
        }
    });
    Adm.onLang(function () { renderSeg(); renderFilters(); render(); });
})();
