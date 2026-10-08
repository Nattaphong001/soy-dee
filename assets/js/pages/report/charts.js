import { escapeHtml, fmtDateShort, fmtNum, parseYmd } from './helpers.js';

/* ==============================================================================
   2. โครงกราฟ (CSS/SVG)
   ============================================================================== */
function axisLabels(buckets) {
    const n = buckets.length;
    if (n === 0) return '';
    const pick = n === 1 ? [0] : n === 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
    return pick.map(i => `<span>${fmtDateShort(buckets[i].from)}</span>`).join('');
}

/** แท่งกราฟทั่วไป: cols = html ของ .bar-col; maxLabel = ป้ายสเกลบนสุด; band = {from,to} เป็น % ของความสูง */
export function barShell(cols, buckets, maxLabel, band, label) {
    return `
        <div class="bar-chart" role="img" aria-label="${escapeHtml(label)}">
            <div class="bar-plot">
                <span class="grid-tag numeric">${escapeHtml(maxLabel)}</span>
                <span class="grid-line" style="top:0"></span>
                <span class="grid-line" style="top:50%"></span>
                ${band ? `<span class="bar-band" style="bottom:${band.from}%;height:${band.to - band.from}%"></span>` : ''}
                ${cols}
            </div>
            <div class="bar-axis numeric">${axisLabels(buckets)}</div>
        </div>`;
}

export function lineChart(opts) {
    // opts: points [{date, y, tip}], unit, refs [{y,label}], label
    const W = 320, H = 150, L = 34, R = 10, T = 12, B = 24;
    const pts = opts.points;
    const ys = pts.map(p => p.y);
    let lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (hi - lo < 0.5) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.18;
    lo -= pad; hi += pad;

    const times = pts.map(p => parseYmd(p.date).getTime());
    const t0 = Math.min.apply(null, times), t1 = Math.max.apply(null, times);
    const xOf = (i) => (t1 === t0 ? L + (W - L - R) / 2 : L + (times[i] - t0) / (t1 - t0) * (W - L - R));
    const yOf = (v) => T + (hi - v) / (hi - lo) * (H - T - B);

    const grid = [hi, (hi + lo) / 2, lo].map(v => `
        <line class="lc-grid" x1="${L}" x2="${W - R}" y1="${yOf(v).toFixed(1)}" y2="${yOf(v).toFixed(1)}"/>
        <text x="${L - 5}" y="${(yOf(v) + 3).toFixed(1)}" text-anchor="end" class="numeric">${fmtNum(v, 1)}</text>`).join('');
    const refs = (opts.refs || []).filter(r => r.y > lo && r.y < hi).map(r => `
        <line class="lc-ref" x1="${L}" x2="${W - R}" y1="${yOf(r.y).toFixed(1)}" y2="${yOf(r.y).toFixed(1)}"/>
        <text x="${W - R}" y="${(yOf(r.y) - 3).toFixed(1)}" text-anchor="end">${r.y}</text>`).join('');

    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(p.y).toFixed(1)}`).join(' ');
    const dots = pts.map((p, i) => `
        <circle class="lc-dot" cx="${xOf(i).toFixed(1)}" cy="${yOf(p.y).toFixed(1)}" r="4"/>
        <circle class="lc-hit" cx="${xOf(i).toFixed(1)}" cy="${yOf(p.y).toFixed(1)}" r="13" data-tip="${p.tip}"/>`).join('');

    const first = pts[0].date, last = pts[pts.length - 1].date;
    const xLabels = first === last
        ? `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" class="numeric">${fmtDateShort(first)}</text>`
        : `<text x="${L}" y="${H - 6}" text-anchor="start" class="numeric">${fmtDateShort(first)}</text>
           <text x="${W - R}" y="${H - 6}" text-anchor="end" class="numeric">${fmtDateShort(last)}</text>`;

    return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(opts.label)}">
        ${grid}${refs}
        ${pts.length > 1 ? `<path class="lc-line" d="${path}"/>` : ''}
        ${dots}${xLabels}
    </svg>`;
}

export function donut(segs, centerValue, centerLabel, label) {
    const total = segs.reduce((s, x) => s + x.value, 0);
    const R = 15.9155;
    let offset = 0;
    const gap = segs.filter(s => s.value > 0).length > 1 ? 1.2 : 0;
    const arcs = segs.filter(s => s.value > 0).map(s => {
        const len = s.value / total * 100;
        const dash = Math.max(len - gap, 0.4);
        const html = `<circle class="donut-seg" cx="21" cy="21" r="${R}" stroke="${s.color}" stroke-dasharray="${dash.toFixed(2)} ${(100 - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" data-tip="${s.tip}"/>`;
        offset += len;
        return html;
    }).join('');
    return `
        <div class="donut" role="img" aria-label="${escapeHtml(label)}">
            <svg viewBox="0 0 42 42"><circle class="donut-track" cx="21" cy="21" r="${R}"/>${arcs}</svg>
            <div class="donut-center"><strong class="numeric">${fmtNum(centerValue)}</strong><span>${escapeHtml(centerLabel)}</span></div>
        </div>`;
}

export function legend(rows) {
    return `<div class="legend">${rows.map(r => `
        <div class="legend-row">
            <span class="legend-dot" style="background:${r.color}"></span>
            <span class="legend-label">${escapeHtml(r.label)}</span>
            <span class="legend-val numeric">${fmtNum(r.value)}<small>${r.pct != null ? r.pct + '%' : ''}</small></span>
        </div>`).join('')}</div>`;
}

/** แถบสัดส่วนแบ่งส่วน (ใช้ .summary-bar จาก record-ui.css) */
export function segBar(segs, label) {
    return `<div class="summary-bar" role="img" aria-label="${escapeHtml(label)}">${segs.map(s =>
        `<span class="bar-seg" style="flex:${s.value} 1 0;background:${s.color}" ${s.value ? '' : 'hidden'} data-tip="${s.tip}"></span>`).join('')}</div>`;
}

export function hbarList(rows) {
    const max = Math.max.apply(null, rows.map(r => r.value).concat([1]));
    return `<div class="hbar-list">${rows.map(r => `
        <div class="hbar-row">
            <div class="hbar-head">
                <span class="hbar-name">${r.dot ? `<span class="badge-dot" style="background:${r.dot}"></span>` : ''}<span>${escapeHtml(r.label)}</span></span>
                <span class="hbar-val numeric">${r.valueText}${r.sub ? `<small>${escapeHtml(r.sub)}</small>` : ''}</span>
            </div>
            <div class="hbar-track"><div class="hbar-fill" style="width:${(r.value / max * 100).toFixed(1)}%;${r.color ? `background:${r.color}` : ''}"></div></div>
        </div>`).join('')}</div>`;
}

export function emptyBlock(title, desc, href, cta) {
    return `
        <section class="summary-card rp-empty">
            <span class="rp-empty-icon"><i data-icon="note"></i></span>
            <div class="rp-empty-title">${escapeHtml(title)}</div>
            <div class="rp-empty-desc">${escapeHtml(desc)}</div>
            <a class="range-apply" href="${href}">${escapeHtml(cta)}</a>
        </section>`;
}

export function card(title, sub, body) {
    return `
        <section class="summary-card">
            <div class="chart-head"><div><div class="chart-title">${escapeHtml(title)}</div>${sub ? `<div class="chart-sub">${escapeHtml(sub)}</div>` : ''}</div></div>
            ${body}
        </section>`;
}

export function chips(items) {
    // 3 ชิป = 3 คอลัมน์, อื่นๆ = 2 คอลัมน์ (ชิปสุดท้ายที่เหลือเดี่ยวกินเต็มแถว)
    return `<div class="rp-chips ${items.length === 3 ? 'is-3' : ''}">${items.map(i => `
        <div class="stat-chip">
            <span class="stat-chip-value numeric">${i.value}</span>
            <span class="stat-chip-label">${escapeHtml(i.label)}</span>
        </div>`).join('')}</div>`;
}

export function pill(cls, text) {
    return `<span class="cat-pill ${cls}"><span class="badge-dot" style="background:var(--lc)"></span>${escapeHtml(text)}</span>`;
}
