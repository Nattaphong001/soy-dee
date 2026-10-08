import { card, chips, emptyBlock, lineChart } from './charts.js';
import { $, escapeHtml, fmtDateShort, fmtNum, t, tipAttr } from './helpers.js';
import { state } from './state.js';

/* ==============================================================================
   4. แท็บ: ร่างกาย
   ============================================================================== */
export function renderBody() {
    const b = state.report.body;
    const el = $('panel-body');
    if (!b.latest && b.history.length === 0) {
        el.innerHTML = emptyBlock(t('empty-body-title'), t('empty-body-desc'), 'profile.html', t('cta-body'));
        return;
    }
    const l = b.latest || {};
    const change = b.weight_change;
    const changeText = change == null ? '–' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${fmtNum(Math.abs(change), 1)}`;

    let html = chips([
        { value: `${l.weight != null ? fmtNum(l.weight, 1) : '–'}<span class="kpi-unit"> ${t('unit-kg')}</span>`, label: t('body-weight') },
        { value: l.target ? escapeHtml(t('target-' + l.target)) : '–', label: t('body-target') },
        { value: `${changeText}<span class="kpi-unit"> ${change == null ? '' : t('unit-kg')}</span>`, label: t('body-change') }
    ]);

    const hist = b.history;
    const wPts = hist.filter(h => h.weight != null).map(h => ({
        date: h.date, y: h.weight, tip: tipAttr(fmtDateShort(h.date), [t('body-tip-weight', { v: fmtNum(h.weight, 1) })])
    }));
    if (wPts.length) {
        html += card(t('body-weight-chart'), wPts.length < 2 ? t('body-need-more') : '',
            lineChart({ points: wPts, label: t('body-weight-chart') }));
    }
    el.innerHTML = html;
}
