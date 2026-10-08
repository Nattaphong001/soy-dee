import { pill, segBar } from './charts.js';
import { $, fmtDateShort, fmtDuration, fmtNum, t, tipAttr } from './helpers.js';
import { BMI_CLASS, LIGHT_VAR, SLEEP_EVAL_CLASS } from './i18n.js';
import { state } from './state.js';

/* ==============================================================================
   3. ภาพรวม (KPI)
   ============================================================================== */
export function renderOverview() {
    const o = state.report.overview;
    const rangeDays = o.range_days;
    $('rangeLabel').textContent = `${fmtDateShort(state.report.range.from)} – ${fmtDateShort(state.report.range.to)} · ${t('days-count', { n: rangeDays })}`;

    const latest = state.report.body.latest;
    const bmiPill = o.bmi_eval ? pill(BMI_CLASS[o.bmi_eval], t('bmi-' + o.bmi_eval)) : '';
    const f = o.by_traffic_light;

    const sleepEval = o.sleep_avg_hours == null ? null : (o.sleep_avg_hours < 7 ? 1 : o.sleep_avg_hours <= 9 ? 2 : 3);

    const kpis = [
        `<div class="kpi">
            <span class="kpi-label">${t('kpi-bmi')}</span>
            <span class="kpi-value numeric">${o.bmi != null ? fmtNum(o.bmi, 1) : '–'}</span>
            ${bmiPill}
            ${latest && latest.weight != null ? `<span class="kpi-sub">${t('kpi-bmi-sub', { w: fmtNum(latest.weight, 1) })}</span>` : ''}
        </div>`,
        `<div class="kpi">
            <span class="kpi-label">${t('kpi-food')}</span>
            <span class="kpi-value numeric">${fmtNum(o.meal_count)}<span class="kpi-unit">${t('kpi-food-unit')}</span></span>
            ${o.meal_count > 0 ? segBar([
                { value: f.green, color: LIGHT_VAR[1], tip: tipAttr(t('light-1'), [String(f.green)]) },
                { value: f.yellow, color: LIGHT_VAR[2], tip: tipAttr(t('light-2'), [String(f.yellow)]) },
                { value: f.red, color: LIGHT_VAR[3], tip: tipAttr(t('light-3'), [String(f.red)]) }
            ], `${t('light-1')} ${f.green}, ${t('light-2')} ${f.yellow}, ${t('light-3')} ${f.red}`) : ''}
            <span class="kpi-sub">${o.meal_count > 0 ? `${t('light-1')} ${f.green} · ${t('light-2')} ${f.yellow} · ${t('light-3')} ${f.red}` : ''}</span>
        </div>`,
        `<div class="kpi">
            <span class="kpi-label">${t('kpi-activity')}</span>
            <span class="kpi-value numeric">${fmtDuration(o.activity_total_min)}</span>
            <span class="kpi-sub">${t('kpi-activity-sub', { c: state.report.activity.count, d: state.report.activity.days_active })}</span>
        </div>`,
        `<div class="kpi">
            <span class="kpi-label">${t('kpi-sleep')}</span>
            <span class="kpi-value numeric">${o.sleep_avg_hours != null ? fmtNum(o.sleep_avg_hours, 1) : '–'}<span class="kpi-unit">${t('kpi-sleep-unit')}</span></span>
            ${sleepEval ? pill(SLEEP_EVAL_CLASS[sleepEval], t('eval-' + sleepEval)) : ''}
            <span class="kpi-sub">${t('kpi-sleep-sub', { n: state.report.sleep.nights })}</span>
        </div>`
    ];
    $('kpiGrid').innerHTML = kpis.join('');
}
