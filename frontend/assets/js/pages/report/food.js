import { card, donut, emptyBlock, hbarList, legend } from './charts.js';
import { $, fmtNum, pct, t, tipAttr } from './helpers.js';
import { LIGHT_KEY, LIGHT_VAR } from './i18n.js';
import { state } from './state.js';

/* ==============================================================================
   5. แท็บ: อาหาร
   ============================================================================== */
export function renderFood() {
    const f = state.report.food;
    const el = $('panel-food');
    if (f.meal_count === 0) {
        el.innerHTML = emptyBlock(t('empty-title'), t('empty-desc'), 'food-record.html', t('cta-food'));
        return;
    }
    const tl = f.by_traffic_light;
    const judged = tl.green + tl.yellow + tl.red;

    let html = '';

    // สัดส่วนสี
    const lightRows = [1, 2, 3].map(n => ({ n, value: tl[LIGHT_KEY[n]] }));
    const segs = lightRows.map(r => ({
        value: r.value, color: LIGHT_VAR[r.n],
        tip: tipAttr(t('light-' + r.n), [`${r.value} ${t('unit-meals')} (${pct(r.value, judged)}%)`])
    }));
    html += card(t('food-share'), '', `
        <div class="donut-wrap">
            ${donut(segs, judged, t('food-share-center'), t('food-share'))}
            ${legend(lightRows.map(r => ({ color: LIGHT_VAR[r.n], label: t('light-' + r.n), value: r.value, pct: pct(r.value, judged) })))}
        </div>`);

    // ประเภทที่กินบ่อย
    if (f.top_categories.length) {
        html += card(t('food-top'), '', hbarList(f.top_categories.map(c => ({
            label: c.name, dot: c.traffic_light ? LIGHT_VAR[c.traffic_light] : null,
            value: c.count, valueText: fmtNum(c.count), sub: t('unit-times')
        }))));
    }

    el.innerHTML = html;
}
