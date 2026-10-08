/* ==============================================================================
   ADMIN / OVERVIEW — ภาพรวมระบบ: GET /admin/stats
   การ์ดตัวเลข 4 ใบ + กราฟแท่งจำนวนบันทึกของสมาชิก 7 วันล่าสุด (อาหาร/กิจกรรม/การนอน)
   กราฟเป็น HTML/CSS ล้วน (ไม่ใช้ SVG scale) ตัวหนังสือจึงขนาดคงที่ทุกความกว้างจอ
   ============================================================================== */
(function () {
    'use strict';

    var SERIES = [
        { key: 'food', label: 'legend-food', color: 'var(--color-green)' },
        { key: 'activity', label: 'legend-activity', color: 'var(--accent-1)' },
        { key: 'sleep', label: 'legend-sleep', color: 'var(--color-yellow)' }
    ];
    var data = null, status = 'idle';

    function niceMax(v) { return v <= 4 ? 4 : Math.ceil(v / 4) * 4; }

    function shortDate(iso) {
        var m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso || '');
        return m ? m[2] + '/' + m[1] : '';
    }

    function render() {
        var kpiEl = Adm.$('overviewKpis');
        if (status === 'loading' && !data) { kpiEl.innerHTML = ''; Adm.$('overviewChart').innerHTML = '<p class="adm-loading">' + Adm.esc(Adm.t('loading')) + '</p>'; return; }
        var d = data || {};

        kpiEl.innerHTML = [
            ['kpi-total-members', d.total_members, 'users'],
            ['kpi-new-members', d.new_members_this_month, 'plus'],
            ['kpi-food-categories', d.food_category_count, 'food'],
            ['kpi-activity-types', d.activity_count, 'activity']
        ].map(function (k) {
            return '<div class="kpi"><span class="kpi-icon">' + Adm.icon(k[2]) + '</span><div><span class="kpi-label">' +
                Adm.esc(Adm.t(k[0])) + '</span><strong class="kpi-value num">' + Adm.fmtInt(k[1]) + '</strong></div></div>';
        }).join('');

        var days = d.daily_records || [];
        var totals = {};
        SERIES.forEach(function (s) { totals[s.key] = days.reduce(function (a, x) { return a + (x[s.key] || 0); }, 0); });

        Adm.$('overviewLegend').innerHTML = SERIES.map(function (s) {
            return '<span class="legend-item"><i style="background:' + s.color + '"></i>' + Adm.esc(Adm.t(s.label)) +
                ' <b class="num">' + Adm.fmtInt(totals[s.key]) + '</b></span>';
        }).join('');

        var max = niceMax(Math.max.apply(null, [0].concat(days.map(function (x) {
            return Math.max(x.food || 0, x.activity || 0, x.sleep || 0);
        }))));
        var ticks = [4, 3, 2, 1, 0].map(function (i) { return Math.round(max * i / 4); });

        var cols = days.map(function (x) {
            var bars = SERIES.map(function (s) {
                var v = x[s.key] || 0;
                var title = Adm.t(s.label) + ': ' + v;
                return '<div class="cc-bar" style="height:' + (v * 100 / max) + '%;background:' + s.color + '" title="' + Adm.esc(title) + '">' +
                    (v > 0 ? '<span class="num">' + v + '</span>' : '') + '</div>';
            }).join('');
            return '<div class="cc-day"><div class="cc-bars">' + bars + '</div><div class="cc-x num">' + shortDate(x.date) + '</div></div>';
        }).join('');

        Adm.$('overviewChart').innerHTML =
            '<div class="cc-y">' + ticks.map(function (t) { return '<span class="num">' + t + '</span>'; }).join('') + '</div>' +
            '<div class="cc-plot"><div class="cc-grid">' + ticks.map(function () { return '<i></i>'; }).join('') + '</div><div class="cc-cols">' + cols + '</div></div>';
    }

    function load() {
        status = 'loading';
        render();
        SoyDeeAPI.request('/admin/stats').then(function (d) {
            data = d || {};
            status = 'ready';
        }).catch(function (err) {
            status = 'error';
            Adm.alert(Adm.errText(err, 'err-load'));
        }).then(render);
    }

    Adm.tabs.register('overview', { show: load });
    Adm.onLang(render);
})();
