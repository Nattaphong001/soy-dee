/**
 * report.js — หน้ารายงานของสมาชิก
 * ดึงข้อมูลชุดเดียวจาก GET /members/:id/report?from&to (Go เป็นผู้รวมสถิติทั้งหมด)
 * แล้ววาด: ภาพรวม 4 ตัวเลข + ข้อสังเกตสั้นๆ + แท็บแยกย่อย ร่างกาย/อาหาร/กิจกรรม/การนอน (แท็บละไม่กี่กราฟ)
 * กราฟเป็น CSS/SVG ล้วน (ไม่พึ่งไลบรารี) — ตัวเลขรหัส enum จาก API ถูกแปลเป็นข้อความที่นี่ (i18n)
 * ช่วงยาวเกิน 31 วัน กราฟรายวันจะถูกรวมเป็นรายสัปดาห์ (ทีละ 7 วัน) ให้แท่งไม่เล็กเกินอ่าน
 * หมายเหตุ: ระบบภาษาใช้ window.I18N จาก assets/js/shared/i18n.js
 */

/* ==============================================================================
   0. ระบบภาษา (i18n)
   ============================================================================== */
const REPORT_I18N = {
    th: {
        'page-title': 'รายงานของฉัน',
        'page-subtitle': 'สรุปอาหาร กิจกรรม การนอน และร่างกาย ตามช่วงเวลาที่เลือก',
        'range-7': '7 วัน', 'range-30': '30 วัน', 'range-90': '90 วัน', 'range-custom': 'กำหนดเอง',
        'range-from': 'จาก', 'range-to': 'ถึง', 'range-apply': 'ดูรายงาน', 'retry': 'ลองใหม่',
        'range-invalid': 'วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด',
        'range-too-long': 'เลือกช่วงได้ไม่เกิน 366 วัน',
        'range-missing': 'กรุณาเลือกวันที่ให้ครบ',
        'load-error': 'โหลดรายงานไม่สำเร็จ',
        'loading': 'กำลังโหลดรายงาน…',
        'overview-title': 'ภาพรวม',
        'tab-body': 'ร่างกาย', 'tab-food': 'อาหาร', 'tab-activity': 'กิจกรรม', 'tab-sleep': 'การนอน',
        'days-count': '{n} วัน',
        'kpi-bmi': 'BMI ล่าสุด', 'kpi-bmi-sub': 'น้ำหนัก {w} กก.',
        'kpi-food': 'อาหาร', 'kpi-food-unit': 'มื้อ',
        'kpi-activity': 'ออกกำลังกาย', 'kpi-activity-sub': '{c} ครั้ง · {d} วัน',
        'kpi-sleep': 'นอนเฉลี่ย', 'kpi-sleep-unit': 'ชม./คืน', 'kpi-sleep-sub': 'บันทึก {n} คืน',
        'unit-hr': 'ชม.', 'unit-min': 'น.', 'unit-minutes': 'นาที', 'unit-kg': 'กก.',
        'unit-times': 'ครั้ง', 'unit-meals': 'มื้อ', 'unit-nights': 'คืน',
        'light-1': 'ดีต่อสุขภาพ', 'light-2': 'ทานพอดี', 'light-3': 'ควรระวัง',
        'bmi-1': 'ผอม', 'bmi-2': 'ปกติ', 'bmi-3': 'ท้วม', 'bmi-4': 'อ้วน',
        'target-1': 'ลดน้ำหนัก', 'target-2': 'เพิ่มกล้ามเนื้อ', 'target-3': 'รักษาน้ำหนัก',
        'eval-1': 'นอนน้อยไป', 'eval-2': 'นอนพอดี', 'eval-3': 'นอนมากไป',
        'week-range': 'สัปดาห์ {a} – {b}',
        'empty-title': 'ยังไม่มีข้อมูลในช่วงนี้', 'empty-desc': 'ลองเลือกช่วงเวลาที่กว้างขึ้น หรือเริ่มบันทึกได้เลย',
        'empty-body-title': 'ยังไม่มีข้อมูลร่างกาย', 'empty-body-desc': 'กรอกน้ำหนักและส่วนสูงที่หน้าโปรไฟล์ เพื่อดู BMI และพลังงานที่ควรได้รับ',
        'cta-body': 'ไปกรอกข้อมูลร่างกาย', 'cta-food': 'ไปบันทึกอาหาร', 'cta-activity': 'ไปบันทึกกิจกรรม', 'cta-sleep': 'ไปบันทึกการนอน',
        /* ร่างกาย */
        'body-weight': 'น้ำหนักล่าสุด', 'body-target': 'เป้าหมาย', 'body-change': 'น้ำหนักเปลี่ยน',
        'body-weight-chart': 'น้ำหนักตามเวลา',
        'body-need-more': 'มีบันทึกร่างกายเพียง 1 ครั้งในช่วงนี้ ยังไม่เห็นแนวโน้ม',
        'body-tip-weight': 'น้ำหนัก {v} กก.',
        /* อาหาร */
        'food-share': 'สัดส่วนสีอาหาร', 'food-share-center': 'มื้อ',
        'food-top': 'ประเภทอาหารที่กินบ่อย',
        /* กิจกรรม */
        'act-goal': 'เฉลี่ยต่อสัปดาห์', 'act-goal-note': 'เกณฑ์แนะนำ 150 นาที/สัปดาห์ (ระดับปานกลาง)', 'act-goal-of': 'ของ 150 นาที',
        'act-chart': 'เวลาออกกำลังกาย', 'act-chart-week': 'เวลาออกกำลังกายรายสัปดาห์',
        'act-top': 'กิจกรรมที่ทำบ่อย',
        'act-tip-min': '{v} นาที', 'act-tip-km': '{v} กม.',
        /* การนอน */
        'sl-bed': 'เข้านอนเฉลี่ย', 'sl-wake': 'ตื่นเฉลี่ย',
        'sl-chart': 'ชั่วโมงการนอน', 'sl-chart-week': 'ชั่วโมงนอนเฉลี่ยรายสัปดาห์', 'sl-band-note': 'แถบเขียว = ช่วงแนะนำ 7–9 ชม.',
        'sl-eval': 'ผลประเมินการนอน',
        'sl-tip-hr': 'เฉลี่ย {v} ชม.', 'sl-tip-none': 'ไม่ได้บันทึก',
        /* ข้อสังเกต */
        'insight-title': 'ข้อสังเกตจากบันทึกของคุณ',
        'insight-note': 'สรุปจากบันทึกของคุณในช่วงที่เลือกเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์',
        'insight-none': 'ข้อมูลในช่วงนี้ยังไม่พอสำหรับข้อสังเกต ลองบันทึกต่อเนื่องอีกสักระยะ หรือเลือกช่วงเวลาที่กว้างขึ้น',
        'ins-sleep-low': 'นอนน้อยกว่า 7 ชม. {n} จาก {t} คืนที่บันทึก',
        'ins-sleep-ok': 'นอนอยู่ในช่วงแนะนำ 7–9 ชม. ทุกคืนที่บันทึก ({t} คืน)',
        'ins-food-red': 'อาหารสีแดง ({l}) คิดเป็น {p}% ของมื้อที่ประเมินสีได้',
        'ins-food-green': 'อาหารดีต่อสุขภาพคิดเป็น {p}% ของมื้อที่ประเมินสีได้',
        'ins-act-goal': 'ออกกำลังกายเฉลี่ย {m} นาที/สัปดาห์ ถึงเกณฑ์แนะนำ 150 นาที',
        'ins-act-under': 'ออกกำลังกายเฉลี่ย {m} นาที/สัปดาห์ ยังต่ำกว่าเกณฑ์แนะนำ 150 นาที',
        'ins-act-none': 'ไม่มีบันทึกการออกกำลังกายในช่วงนี้',
        'ins-consistency-low': 'บันทึกข้อมูลเพียง {l} จาก {r} วัน ยิ่งบันทึกครบ ภาพรวมยิ่งแม่นยำ',
        'ins-weight-ok': 'น้ำหนัก{d} {v} กก. สอดคล้องกับเป้าหมาย "{g}"',
        'ins-weight-off': 'น้ำหนัก{d} {v} กก. ต่างจากเป้าหมาย "{g}"',
        'ins-weight-steady': 'น้ำหนักคงที่ (เปลี่ยนไม่เกิน 1 กก.) สอดคล้องกับเป้าหมาย "{g}"',
        'dir-down': 'ลดลง', 'dir-up': 'เพิ่มขึ้น',
    },
    en: {
        'page-title': 'My Report',
        'page-subtitle': 'Food, activity, sleep and body summary for the period you choose',
        'range-7': '7 days', 'range-30': '30 days', 'range-90': '90 days', 'range-custom': 'Custom',
        'range-from': 'From', 'range-to': 'To', 'range-apply': 'View report', 'retry': 'Retry',
        'range-invalid': 'Start date must not be after the end date',
        'range-too-long': 'Pick a range of 366 days or less',
        'range-missing': 'Please pick both dates',
        'load-error': 'Could not load the report',
        'loading': 'Loading report…',
        'overview-title': 'Overview',
        'tab-body': 'Body', 'tab-food': 'Food', 'tab-activity': 'Activity', 'tab-sleep': 'Sleep',
        'days-count': '{n} days',
        'kpi-bmi': 'Latest BMI', 'kpi-bmi-sub': 'Weight {w} kg',
        'kpi-food': 'Food', 'kpi-food-unit': 'meals',
        'kpi-activity': 'Exercise', 'kpi-activity-sub': '{c} sessions · {d} days',
        'kpi-sleep': 'Avg sleep', 'kpi-sleep-unit': 'h/night', 'kpi-sleep-sub': '{n} nights logged',
        'unit-hr': 'h', 'unit-min': 'm', 'unit-minutes': 'min', 'unit-kg': 'kg',
        'unit-times': 'times', 'unit-meals': 'meals', 'unit-nights': 'nights',
        'light-1': 'Healthy', 'light-2': 'In moderation', 'light-3': 'Watch out',
        'bmi-1': 'Underweight', 'bmi-2': 'Normal', 'bmi-3': 'Overweight', 'bmi-4': 'Obese',
        'target-1': 'Lose weight', 'target-2': 'Build muscle', 'target-3': 'Maintain weight',
        'eval-1': 'Too little', 'eval-2': 'Just right', 'eval-3': 'Too much',
        'week-range': 'Week {a} – {b}',
        'empty-title': 'No data in this period', 'empty-desc': 'Try a longer period, or start logging now',
        'empty-body-title': 'No body data yet', 'empty-body-desc': 'Enter your weight and height on the profile page to see BMI and your energy needs',
        'cta-body': 'Enter body stats', 'cta-food': 'Log food', 'cta-activity': 'Log activity', 'cta-sleep': 'Log sleep',
        'body-weight': 'Latest weight', 'body-target': 'Goal', 'body-change': 'Weight change',
        'body-weight-chart': 'Weight over time',
        'body-need-more': 'Only one body record in this period, so no trend yet',
        'body-tip-weight': 'Weight {v} kg',
        'food-share': 'Food color share', 'food-share-center': 'meals',
        'food-top': 'Most eaten categories',
        'act-goal': 'Weekly average', 'act-goal-note': 'Recommended: 150 min/week (moderate intensity)', 'act-goal-of': 'of 150 min',
        'act-chart': 'Exercise time', 'act-chart-week': 'Weekly exercise time',
        'act-top': 'Most frequent activities',
        'act-tip-min': '{v} min', 'act-tip-km': '{v} km',
        'sl-bed': 'Avg bedtime', 'sl-wake': 'Avg wake-up',
        'sl-chart': 'Sleep hours', 'sl-chart-week': 'Weekly average sleep hours', 'sl-band-note': 'Green band = recommended 7–9 h',
        'sl-eval': 'Sleep evaluation',
        'sl-tip-hr': 'Avg {v} h', 'sl-tip-none': 'Not logged',
        'insight-title': 'Observations from your logs',
        'insight-note': 'Based only on your own logs in the selected period, not medical advice',
        'insight-none': 'Not enough data in this period for observations. Keep logging for a while, or pick a longer period',
        'ins-sleep-low': 'Slept under 7 h on {n} of {t} logged nights',
        'ins-sleep-ok': 'Slept within the recommended 7–9 h on every logged night ({t} nights)',
        'ins-food-red': 'Red foods ({l}) make up {p}% of meals that have a color',
        'ins-food-green': 'Healthy foods make up {p}% of meals that have a color',
        'ins-act-goal': 'Averaging {m} min/week of exercise, meeting the recommended 150 min',
        'ins-act-under': 'Averaging {m} min/week of exercise, below the recommended 150 min',
        'ins-act-none': 'No exercise logged in this period',
        'ins-consistency-low': 'Logged only {l} of {r} days. The more complete your logs, the more accurate the picture',
        'ins-weight-ok': 'Weight {d} {v} kg, in line with your goal "{g}"',
        'ins-weight-off': 'Weight {d} {v} kg, different from your goal "{g}"',
        'ins-weight-steady': 'Weight is steady (within 1 kg), in line with your goal "{g}"',
        'dir-down': 'down', 'dir-up': 'up',
    }
};

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKLY_BUCKET_ABOVE_DAYS = 31; // ช่วงยาวกว่านี้ กราฟรายวันรวมเป็นรายสัปดาห์
const WHO_WEEKLY_MIN = 150;
const LIGHT_KEY = { 1: 'green', 2: 'yellow', 3: 'red' };
const LIGHT_VAR = { 1: 'var(--color-green)', 2: 'var(--color-yellow)', 3: 'var(--color-red)' };
const BMI_CLASS = { 1: 'lc-blue', 2: 'lc-green', 3: 'lc-orange', 4: 'lc-red' };
const SLEEP_EVAL_CLASS = { 1: 'lc-red', 2: 'lc-green', 3: 'lc-yellow' };
const SLEEP_EVAL_VAR = { 1: 'var(--color-red)', 2: 'var(--color-green)', 3: 'var(--color-yellow)' };

/* ==============================================================================
   1. ตัวช่วยทั่วไป
   ============================================================================== */
let mbId = null;
let report = null;
let rangeMode = '30';
let activeTab = 'body';
const TABS = ['body', 'food', 'activity', 'sleep'];
let loadSeq = 0;

function t(key, vars) {
    let s = I18N.t(REPORT_I18N, key);
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
}

function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function ymd(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseYmd(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function months() { return I18N.getLang() === 'en' ? ENGLISH_MONTHS_SHORT : THAI_MONTHS_SHORT; }

function fmtDateShort(s) {
    const d = parseYmd(s);
    return `${d.getDate()} ${months()[d.getMonth()]}`;
}

function fmtNum(v, digits) {
    if (v == null || Number.isNaN(Number(v))) return '–';
    const n = Number(v);
    const r = digits == null ? Math.round(n) : Number(n.toFixed(digits));
    return r.toLocaleString('en-US');
}

function fmtDuration(min) {
    const m = Math.round(min || 0);
    if (m < 60) return `${m}<span class="kpi-unit">${t('unit-minutes')}</span>`;
    const h = Math.floor(m / 60), r = m % 60;
    return `${h}<span class="kpi-unit">${t('unit-hr')}</span>${r ? ` ${r}<span class="kpi-unit">${t('unit-min')}</span>` : ''}`;
}

function niceCeil(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
}

function pct(part, total) { return total > 0 ? Math.round(part * 100 / total) : 0; }

function dayCount(from, to) { return Math.round((parseYmd(to) - parseYmd(from)) / 86400000) + 1; }

/** รวม daily[] เป็นถัง: ช่วงสั้น = 1 วัน/ถัง, ช่วงยาว = 7 วัน/ถัง */
function bucketize(daily) {
    const size = daily.length > WEEKLY_BUCKET_ABOVE_DAYS ? 7 : 1;
    const buckets = [];
    for (let i = 0; i < daily.length; i += size) {
        const rows = daily.slice(i, i + size);
        buckets.push({ from: rows[0].date, to: rows[rows.length - 1].date, rows, weekly: size > 1 });
    }
    return buckets;
}

function bucketTitle(b) {
    return b.from === b.to ? fmtDateShort(b.from) : t('week-range', { a: fmtDateShort(b.from), b: fmtDateShort(b.to) });
}

function tipAttr(title, lines) {
    return escapeHtml([title].concat(lines || []).join('\n'));
}

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
function barShell(cols, buckets, maxLabel, band, label) {
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

function lineChart(opts) {
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

function donut(segs, centerValue, centerLabel, label) {
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

function legend(rows) {
    return `<div class="legend">${rows.map(r => `
        <div class="legend-row">
            <span class="legend-dot" style="background:${r.color}"></span>
            <span class="legend-label">${escapeHtml(r.label)}</span>
            <span class="legend-val numeric">${fmtNum(r.value)}<small>${r.pct != null ? r.pct + '%' : ''}</small></span>
        </div>`).join('')}</div>`;
}

/** แถบสัดส่วนแบ่งส่วน (ใช้ .summary-bar จาก record-ui.css) */
function segBar(segs, label) {
    return `<div class="summary-bar" role="img" aria-label="${escapeHtml(label)}">${segs.map(s =>
        `<span class="bar-seg" style="flex:${s.value} 1 0;background:${s.color}" ${s.value ? '' : 'hidden'} data-tip="${s.tip}"></span>`).join('')}</div>`;
}

function hbarList(rows) {
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

function emptyBlock(title, desc, href, cta) {
    return `
        <section class="summary-card rp-empty">
            <span class="rp-empty-icon"><i data-icon="note"></i></span>
            <div class="rp-empty-title">${escapeHtml(title)}</div>
            <div class="rp-empty-desc">${escapeHtml(desc)}</div>
            <a class="range-apply" href="${href}">${escapeHtml(cta)}</a>
        </section>`;
}

function card(title, sub, body) {
    return `
        <section class="summary-card">
            <div class="chart-head"><div><div class="chart-title">${escapeHtml(title)}</div>${sub ? `<div class="chart-sub">${escapeHtml(sub)}</div>` : ''}</div></div>
            ${body}
        </section>`;
}

function chips(items) {
    // 3 ชิป = 3 คอลัมน์, อื่นๆ = 2 คอลัมน์ (ชิปสุดท้ายที่เหลือเดี่ยวกินเต็มแถว)
    return `<div class="rp-chips ${items.length === 3 ? 'is-3' : ''}">${items.map(i => `
        <div class="stat-chip">
            <span class="stat-chip-value numeric">${i.value}</span>
            <span class="stat-chip-label">${escapeHtml(i.label)}</span>
        </div>`).join('')}</div>`;
}

function pill(cls, text) {
    return `<span class="cat-pill ${cls}"><span class="badge-dot" style="background:var(--lc)"></span>${escapeHtml(text)}</span>`;
}

/* ==============================================================================
   3. ภาพรวม (KPI)
   ============================================================================== */
function renderOverview() {
    const o = report.overview;
    const rangeDays = o.range_days;
    $('rangeLabel').textContent = `${fmtDateShort(report.range.from)} – ${fmtDateShort(report.range.to)} · ${t('days-count', { n: rangeDays })}`;

    const latest = report.body.latest;
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
            <span class="kpi-sub">${t('kpi-activity-sub', { c: report.activity.count, d: report.activity.days_active })}</span>
        </div>`,
        `<div class="kpi">
            <span class="kpi-label">${t('kpi-sleep')}</span>
            <span class="kpi-value numeric">${o.sleep_avg_hours != null ? fmtNum(o.sleep_avg_hours, 1) : '–'}<span class="kpi-unit">${t('kpi-sleep-unit')}</span></span>
            ${sleepEval ? pill(SLEEP_EVAL_CLASS[sleepEval], t('eval-' + sleepEval)) : ''}
            <span class="kpi-sub">${t('kpi-sleep-sub', { n: report.sleep.nights })}</span>
        </div>`
    ];
    $('kpiGrid').innerHTML = kpis.join('');
}

/* ==============================================================================
   4. แท็บ: ร่างกาย
   ============================================================================== */
function renderBody() {
    const b = report.body;
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

/* ==============================================================================
   5. แท็บ: อาหาร
   ============================================================================== */
function renderFood() {
    const f = report.food;
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

/* ==============================================================================
   6. แท็บ: กิจกรรม
   ============================================================================== */
function renderActivity() {
    const a = report.activity;
    const el = $('panel-activity');
    if (a.count === 0) {
        el.innerHTML = emptyBlock(t('empty-title'), t('empty-desc'), 'activity-record.html', t('cta-activity'));
        return;
    }

    let html = '';

    // เฉลี่ยต่อสัปดาห์เทียบเกณฑ์แนะนำ
    const days = report.range.days;
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

/* ==============================================================================
   7. แท็บ: การนอน
   ============================================================================== */
function renderSleep() {
    const s = report.sleep;
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
    for (let d = parseYmd(report.range.from), end = parseYmd(report.range.to); d <= end; d.setDate(d.getDate() + 1)) {
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
    const o = report.overview, s = report.sleep, f = report.food, a = report.activity, b = report.body;
    const days = report.range.days;

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

function renderInsights() {
    const card = $('insightCard');
    // ยังไม่มีบันทึกเลยในช่วงนี้ — ไม่ต้องมีการ์ด (แต่ละแท็บมี empty state ของตัวเองอยู่แล้ว)
    if (report.overview.logged_days === 0) { card.hidden = true; return; }
    const list = buildInsights();
    card.hidden = false;
    $('insightList').innerHTML = list.length
        ? list.map(i => `<li class="insight is-${i.tone}"><span class="insight-icon"><i data-icon="${INSIGHT_ICON[i.tone]}"></i></span><span>${escapeHtml(i.text)}</span></li>`).join('')
        : `<li class="insight is-info"><span class="insight-icon"><i data-icon="info"></i></span><span>${escapeHtml(t('insight-none'))}</span></li>`;
}

/* ==============================================================================
   8. โหลดข้อมูล + ช่วงเวลา
   ============================================================================== */
function currentRange() {
    if (rangeMode === 'custom') {
        const from = $('rangeFrom').value, to = $('rangeTo').value;
        if (!from || !to) return { error: 'range-missing' };
        if (from > to) return { error: 'range-invalid' };
        if (dayCount(from, to) > 366) return { error: 'range-too-long' };
        return { from, to };
    }
    const n = Number(rangeMode);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1));
    return { from: ymd(start), to: ymd(today) };
}

function showError(msg, canRetry) {
    $('reportErrorText').textContent = msg;
    $('reportRetry').hidden = !canRetry; // ข้อผิดพลาดจากการกรอกช่วงวันที่ไม่ต้องมีปุ่มลองใหม่
    $('reportError').hidden = false;
}

function setLoading(on) {
    TABS.forEach(k => {
        if (on && !report) $('panel-' + k).innerHTML = `<div class="rp-loading">${t('loading')}</div>`;
    });
    $('reportContent').classList.toggle('is-loading', on);
    $('rangeApply').disabled = on;
}

async function loadReport() {
    const range = currentRange();
    $('reportError').hidden = true;
    if (range.error) { showError(t(range.error), false); return; }

    const seq = ++loadSeq;
    setLoading(true);
    try {
        const data = await SoyDeeAPI.request(`/members/${mbId}/report`, { query: { from: range.from, to: range.to } });
        if (seq !== loadSeq) return; // มีคำขอใหม่กว่าแล้ว — ทิ้งผลเก่า
        report = data;
        renderAll();
    } catch (err) {
        if (seq !== loadSeq) return;
        showError(`${t('load-error')}: ${err && err.message ? err.message : ''}`, true);
    } finally {
        if (seq === loadSeq) setLoading(false);
    }
}

function renderAll() {
    renderOverview();
    renderBody();
    renderFood();
    renderActivity();
    renderSleep();
    renderInsights();
}

/* ==============================================================================
   9. Tooltip กลาง (hover เมาส์ / แตะบนจอสัมผัส)
   ============================================================================== */
function initTooltip() {
    const tip = $('chartTip');
    let pinned = null;

    function show(el, x, y) {
        const lines = (el.getAttribute('data-tip') || '').split('\n');
        if (!lines[0]) return;
        tip.innerHTML = `<strong>${escapeHtml(lines[0])}</strong>${lines.slice(1).map(l => `<div>${escapeHtml(l)}</div>`).join('')}`;
        tip.hidden = false;
        const w = tip.offsetWidth, h = tip.offsetHeight;
        const left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
        const top = y - h - 14 < 8 ? y + 18 : y - h - 14;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }
    function hide() { tip.hidden = true; pinned = null; }

    document.addEventListener('pointerover', (e) => {
        if (e.pointerType === 'touch') return;
        const el = e.target.closest('[data-tip]');
        if (el) show(el, e.clientX, e.clientY);
    });
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' || tip.hidden) return;
        const el = e.target.closest('[data-tip]');
        if (el) show(el, e.clientX, e.clientY); else hide();
    });
    document.addEventListener('pointerout', (e) => {
        if (e.pointerType === 'touch') return;
        if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('[data-tip]')) hide();
    });
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-tip]');
        if (!el) { hide(); return; }
        if (pinned === el) { hide(); return; }
        pinned = el;
        show(el, e.clientX, e.clientY);
    });
    window.addEventListener('scroll', hide, { passive: true });
}

/* ==============================================================================
   10. เริ่มต้นหน้า
   ============================================================================== */
function setRangeMode(mode) {
    rangeMode = mode;
    document.querySelectorAll('.range-chip').forEach(c => c.setAttribute('aria-checked', String(c.dataset.range === mode)));
    $('rangeCustom').hidden = mode !== 'custom';
    if (mode !== 'custom') loadReport();
}

function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.report-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
    });
    TABS.forEach(k => { $('panel-' + k).hidden = k !== tab; });
}

document.addEventListener('DOMContentLoaded', () => {
    I18N.apply(REPORT_I18N);
    mbId = SoyDeeAPI.session.getUserId();

    const today = ymd(new Date());
    $('rangeTo').value = today;
    $('rangeTo').max = today;
    $('rangeFrom').max = today;
    const start = new Date(); start.setDate(start.getDate() - 29);
    $('rangeFrom').value = ymd(start);

    document.querySelectorAll('.range-chip').forEach(c => c.addEventListener('click', () => setRangeMode(c.dataset.range)));
    $('rangeApply').addEventListener('click', loadReport);
    $('reportRetry').addEventListener('click', loadReport);
    document.querySelectorAll('.report-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    initTooltip();
    // #food / #activity / #sleep / #body — เปิดแท็บตรงๆ ได้จากลิงก์
    const hashTab = location.hash.replace('#', '');
    if (TABS.includes(hashTab)) activeTab = hashTab;
    setTab(activeTab);
    loadReport();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back) — โหลดใหม่ให้ตรงกับบันทึกล่าสุด
    window.addEventListener('pageshow', (e) => { if (e.persisted) loadReport(); });
});
