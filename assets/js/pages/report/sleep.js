import { barShell, card, chips, emptyBlock, segBar } from './charts.js';
import { $, bucketTitle, bucketize, escapeHtml, fmtNum, niceCeil, parseYmd, pct, t, tipAttr, ymd } from './helpers.js';
import { SLEEP_EVAL_VAR, WHO_WEEKLY_MIN } from './i18n.js';
import { state } from './state.js';

/* ==============================================================================
   7. แท็บ: การนอน
   ============================================================================== */
export function renderSleep() {
    const s = state.report.sleep;
    const el = $('panel-sleep');
    if (s.nights === 0) {
        el.innerHTML = emptyBlock(t('empty-title'), t('empty-desc'), 'sleep-record.html', t('cta-sleep'));
        return;
    }
    let html = chips([
        { value: s.avg_bedtime || '–', label: t('sl-bed') },
        { value: s.avg_wake_time || '–', label: t('sl-wake') }
    ]);

    // แท่งชั่วโมงนอน: เติมวันที่ไม่ได้บันทึกเป็นช่องว่าง, ช่วงยาว = ค่าเฉลี่ยรายสัปดาห์
    const byDate = {};
    s.items.forEach(i => { byDate[i.date] = i; });
    const daily = [];
    for (let d = parseYmd(state.report.range.from), end = parseYmd(state.report.range.to); d <= end; d.setDate(d.getDate() + 1)) {
        const k = ymd(d);
        daily.push({ date: k, hours: byDate[k] && byDate[k].total_hours != null ? byDate[k].total_hours : null });
    }
    const buckets = bucketize(daily);
    const avgs = buckets.map(b => {
        const hs = b.rows.filter(r => r.hours != null).map(r => r.hours);
        return hs.length ? hs.reduce((x, y) => x + y, 0) / hs.length : null;
    });
    const scaleMax = Math.max(12, niceCeil(Math.max.apply(null, avgs.filter(v => v != null).concat([1]))));
    const cols = buckets.map((b, i) => {
        const v = avgs[i];
        const tip = tipAttr(bucketTitle(b), [v == null ? t('sl-tip-none') : t('sl-tip-hr', { v: fmtNum(v, 1) })]);
        return `<div class="bar-col" data-tip="${tip}">${v == null ? '' : `<span class="bar" style="height:${(v / scaleMax * 100).toFixed(2)}%"></span>`}</div>`;
    }).join('');
    const weekly = buckets.length && buckets[0].weekly;
    html += card(weekly ? t('sl-chart-week') : t('sl-chart'), t('sl-band-note'),
        barShell(cols, buckets, `${scaleMax} ${t('unit-hr')}`, { from: 7 / scaleMax * 100, to: 9 / scaleMax * 100 }, t('sl-chart')));

    // ผลประเมิน + คุณภาพ (แถบสัดส่วน)
    const evalSegs = [1, 2, 3].map(n => ({
        n, value: s.by_eval[n - 1], color: SLEEP_EVAL_VAR[n],
        tip: tipAttr(t('eval-' + n), [`${s.by_eval[n - 1]} ${t('unit-nights')}`])
    }));
    html += card(t('sl-eval'), '', segBar(evalSegs, t('sl-eval')) + `<div class="seg-legend">${legendRows(evalSegs, 'eval-', s.nights)}</div>`);

    el.innerHTML = html;
}

function legendRows(segs, keyPrefix, total) {
    return segs.map(s => `
        <div class="legend-row">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span class="legend-label">${escapeHtml(t(keyPrefix + s.n))}</span>
            <span class="legend-val numeric">${fmtNum(s.value)} ${t('unit-nights')}<small>${pct(s.value, total)}%</small></span>
        </div>`).join('');
}

/* ==============================================================================
   7.1 ข้อสังเกตจากบันทึก — กฎง่ายๆ เชิงบรรยายจากข้อมูลช่วงที่เลือก (ไม่ใช่คำแนะนำทางการแพทย์)
   แต่ละกฎมีเกณฑ์ข้อมูลขั้นต่ำ เพื่อไม่สรุปจากข้อมูลน้อยเกินไป; tone: warn > good > info
   ============================================================================== */
const INSIGHT_MAX = 3;
const INSIGHT_ICON = { warn: 'warning', good: 'check', info: 'info' };
const INSIGHT_ORDER = { warn: 0, good: 1, info: 2 };

function buildInsights() {
    const out = [];
    const add = (tone, key, vars) => out.push({ tone, text: t(key, vars) });
    const o = state.report.overview, s = state.report.sleep, f = state.report.food, a = state.report.activity, b = state.report.body;
    const days = state.report.range.days;

    // การนอน
    if (s.nights >= 3) {
        const low = s.items.filter(i => i.eval === 1).length;
        if (low / s.nights >= 0.4) add('warn', 'ins-sleep-low', { n: low, t: s.nights });
        else if (s.by_eval[1] === s.nights) add('good', 'ins-sleep-ok', { t: s.nights });
    }

    // อาหาร (นับเฉพาะมื้อที่มีสี)
    const tl = f.by_traffic_light, judged = tl.green + tl.yellow + tl.red;
    if (judged >= 5) {
        const redPct = pct(tl.red, judged), greenPct = pct(tl.green, judged);
        if (redPct >= 40) add('warn', 'ins-food-red', { l: t('light-3'), p: redPct });
        else if (greenPct >= 50) add('good', 'ins-food-green', { p: greenPct });
    }

    // กิจกรรม
    if (days >= 7) {
        if (a.count === 0) add('info', 'ins-act-none');
        else {
            const weekly = Math.round(a.total_min / days * 7);
            add(weekly >= WHO_WEEKLY_MIN ? 'good' : 'info', weekly >= WHO_WEEKLY_MIN ? 'ins-act-goal' : 'ins-act-under', { m: fmtNum(weekly) });
        }
    }

    // ความสม่ำเสมอ (เตือนเฉพาะเมื่อบันทึกน้อยมาก)
    if (days >= 7 && o.logged_days > 0 && o.consistency_pct <= 30) add('info', 'ins-consistency-low', { l: o.logged_days, r: days });

    // น้ำหนักเทียบเป้าหมาย
    const target = b.latest && b.latest.target;
    const change = b.weight_change;
    if (target && change != null) {
        const goal = t('target-' + target);
        const dir = t(change < 0 ? 'dir-down' : 'dir-up');
        const v = fmtNum(Math.abs(change), 1);
        if (target === 3) {
            if (Math.abs(change) <= 1) add('good', 'ins-weight-steady', { g: goal });
            else add('info', 'ins-weight-off', { d: dir, v, g: goal });
        } else if (Math.abs(change) >= 0.5) {
            const onTrack = (target === 1 && change < 0) || (target === 2 && change > 0);
            add(onTrack ? 'good' : 'info', onTrack ? 'ins-weight-ok' : 'ins-weight-off', { d: dir, v, g: goal });
        }
    }

    return out.sort((x, y) => INSIGHT_ORDER[x.tone] - INSIGHT_ORDER[y.tone]).slice(0, INSIGHT_MAX);
}

export function renderInsights() {
    const card = $('insightCard');
    // ยังไม่มีบันทึกเลยในช่วงนี้ — ไม่ต้องมีการ์ด (แต่ละแท็บมี empty state ของตัวเองอยู่แล้ว)
    if (state.report.overview.logged_days === 0) { card.hidden = true; return; }
    const list = buildInsights();
    card.hidden = false;
    $('insightList').innerHTML = list.length
        ? list.map(i => `<li class="insight is-${i.tone}"><span class="insight-icon"><i data-icon="${INSIGHT_ICON[i.tone]}"></i></span><span>${escapeHtml(i.text)}</span></li>`).join('')
        : `<li class="insight is-info"><span class="insight-icon"><i data-icon="info"></i></span><span>${escapeHtml(t('insight-none'))}</span></li>`;
}
