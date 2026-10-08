import { ENGLISH_MONTHS_SHORT, REPORT_I18N, THAI_MONTHS_SHORT, WEEKLY_BUCKET_ABOVE_DAYS } from './i18n.js';

export function t(key, vars) {
    let s = I18N.t(REPORT_I18N, key);
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
}

export function $(id) { return document.getElementById(id); }

export function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseYmd(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function months() { return I18N.getLang() === 'en' ? ENGLISH_MONTHS_SHORT : THAI_MONTHS_SHORT; }

export function fmtDateShort(s) {
    const d = parseYmd(s);
    return `${d.getDate()} ${months()[d.getMonth()]}`;
}

export function fmtNum(v, digits) {
    if (v == null || Number.isNaN(Number(v))) return '–';
    const n = Number(v);
    const r = digits == null ? Math.round(n) : Number(n.toFixed(digits));
    return r.toLocaleString('en-US');
}

export function fmtDuration(min) {
    const m = Math.round(min || 0);
    if (m < 60) return `${m}<span class="kpi-unit">${t('unit-minutes')}</span>`;
    const h = Math.floor(m / 60), r = m % 60;
    return `${h}<span class="kpi-unit">${t('unit-hr')}</span>${r ? ` ${r}<span class="kpi-unit">${t('unit-min')}</span>` : ''}`;
}

export function niceCeil(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
}

export function pct(part, total) { return total > 0 ? Math.round(part * 100 / total) : 0; }

export function dayCount(from, to) { return Math.round((parseYmd(to) - parseYmd(from)) / 86400000) + 1; }

/** รวม daily[] เป็นถัง: ช่วงสั้น = 1 วัน/ถัง, ช่วงยาว = 7 วัน/ถัง */
export function bucketize(daily) {
    const size = daily.length > WEEKLY_BUCKET_ABOVE_DAYS ? 7 : 1;
    const buckets = [];
    for (let i = 0; i < daily.length; i += size) {
        const rows = daily.slice(i, i + size);
        buckets.push({ from: rows[0].date, to: rows[rows.length - 1].date, rows, weekly: size > 1 });
    }
    return buckets;
}

export function bucketTitle(b) {
    return b.from === b.to ? fmtDateShort(b.from) : t('week-range', { a: fmtDateShort(b.from), b: fmtDateShort(b.to) });
}

export function tipAttr(title, lines) {
    return escapeHtml([title].concat(lines || []).join('\n'));
}
