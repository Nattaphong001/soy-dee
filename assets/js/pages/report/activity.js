import { barShell, card, emptyBlock, hbarList } from './charts.js';
import { $, bucketTitle, bucketize, fmtNum, niceCeil, t, tipAttr } from './helpers.js';
import { WHO_WEEKLY_MIN } from './i18n.js';
import { state } from './state.js';

/* ==============================================================================
   6. แท็บ: กิจกรรม
   ============================================================================== */
export function renderActivity() {
    const a = state.report.activity;
    const el = $('panel-activity');
    if (a.count === 0) {
        el.innerHTML = emptyBlock(t('empty-title'), t('empty-desc'), 'activity-record.html', t('cta-activity'));
        return;
    }

    let html = '';

    // เฉลี่ยต่อสัปดาห์เทียบเกณฑ์แนะนำ
    const days = state.report.range.days;
    const weeklyAvg = a.total_min / days * 7;
    const goalPct = Math.min(100, weeklyAvg / WHO_WEEKLY_MIN * 100);
    html += card(t('act-goal'), t('act-goal-note'), `
        <div class="hbar-head"><span class="hbar-name numeric">${fmtNum(weeklyAvg)} ${t('unit-minutes')}</span><span class="hbar-val numeric"><small>${t('act-goal-of')}</small></span></div>
        <div class="hbar-track goal-meter"><div class="hbar-fill ${weeklyAvg >= WHO_WEEKLY_MIN ? '' : 'is-under'}" style="width:${goalPct.toFixed(1)}%"></div></div>`);

    // แท่งเวลาออกกำลังกาย
    const buckets = bucketize(a.daily);
    const sums = buckets.map(b => ({
        min: b.rows.reduce((s, r) => s + r.minutes, 0),
        km: b.rows.reduce((s, r) => s + r.distance_km, 0)
    }));
    const scaleMax = niceCeil(Math.max.apply(null, sums.map(s => s.min).concat([1])));
    const cols = buckets.map((b, i) => {
        const lines = [t('act-tip-min', { v: fmtNum(sums[i].min) })];
        if (sums[i].km > 0) lines.push(t('act-tip-km', { v: fmtNum(sums[i].km, 1) }));
        return `<div class="bar-col" data-tip="${tipAttr(bucketTitle(buckets[i]), lines)}"><span class="bar" style="height:${(sums[i].min / scaleMax * 100).toFixed(2)}%"></span></div>`;
    }).join('');
    const weekly = buckets.length && buckets[0].weekly;
    html += card(weekly ? t('act-chart-week') : t('act-chart'), '', barShell(cols, buckets, `${scaleMax} ${t('unit-minutes')}`, null, t('act-chart')));

    // Top กิจกรรม
    html += card(t('act-top'), '', hbarList(a.top_activities.map(x => ({
        label: x.name, value: x.count, valueText: fmtNum(x.count), sub: `${t('unit-times')} · ${fmtNum(x.minutes)} ${t('unit-minutes')}`
    }))));

    el.innerHTML = html;
}
