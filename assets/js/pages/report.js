/**
 * report.js — หน้ารายงานของสมาชิก
 * ดึงข้อมูลชุดเดียวจาก GET /members/:id/report?from&to (Go เป็นผู้รวมสถิติทั้งหมด)
 * แล้ววาด: ภาพรวม (KPI) + แท็บแยกย่อย ร่างกาย/อาหาร/กิจกรรม/การนอน
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
        'tab-body': 'ร่างกาย', 'tab-food': 'อาหาร', 'tab-activity': 'กิจกรรม', 'tab-sleep': 'การนอน', 'tab-daily': 'รายวัน',
        'day-unit': 'วัน', 'days-count': '{n} วัน',
        'kpi-bmi': 'BMI ล่าสุด', 'kpi-bmi-sub': 'น้ำหนัก {w} กก.',
        'kpi-tdee': 'พลังงานเป้าหมาย/วัน', 'kpi-tdee-sub': 'TDEE {t} kcal',
        'kpi-consistency': 'ความสม่ำเสมอ', 'kpi-consistency-sub': 'บันทึก {l}/{r} วัน · ต่อเนื่อง {s} วัน',
        'kpi-food': 'อาหาร', 'kpi-food-unit': 'มื้อ',
        'kpi-activity': 'ออกกำลังกาย', 'kpi-activity-sub': '{c} ครั้ง · {d} วัน',
        'kpi-sleep': 'นอนเฉลี่ย', 'kpi-sleep-unit': 'ชม./คืน', 'kpi-sleep-sub': 'บันทึก {n} คืน',
        'unit-hr': 'ชม.', 'unit-min': 'น.', 'unit-minutes': 'นาที', 'unit-kg': 'กก.', 'unit-cm': 'ซม.', 'unit-km': 'กม.',
        'unit-times': 'ครั้ง', 'unit-meals': 'มื้อ', 'unit-nights': 'คืน', 'unit-kcal': 'kcal',
        'light-1': 'ดีต่อสุขภาพ', 'light-2': 'ทานพอดี', 'light-3': 'ควรระวัง',
        'meal-1': 'มื้อเช้า', 'meal-2': 'มื้อกลางวัน', 'meal-3': 'มื้อเย็น', 'meal-4': 'มื้อว่าง',
        'bmi-1': 'ผอม', 'bmi-2': 'ปกติ', 'bmi-3': 'ท้วม', 'bmi-4': 'อ้วน',
        'target-1': 'ลดน้ำหนัก', 'target-2': 'เพิ่มกล้ามเนื้อ', 'target-3': 'รักษาน้ำหนัก',
        'eval-1': 'นอนน้อยไป', 'eval-2': 'นอนพอดี', 'eval-3': 'นอนมากไป',
        'quality-1': 'แย่', 'quality-2': 'ปานกลาง', 'quality-3': 'ดี',
        'week-range': 'สัปดาห์ {a} – {b}',
        'show-more': 'ดูเพิ่มอีก', 'items-cap': 'แสดง {n} รายการล่าสุดจากทั้งหมด {t} รายการ',
        'empty-title': 'ยังไม่มีข้อมูลในช่วงนี้', 'empty-desc': 'ลองเลือกช่วงเวลาที่กว้างขึ้น หรือเริ่มบันทึกได้เลย',
        'empty-body-title': 'ยังไม่มีข้อมูลร่างกาย', 'empty-body-desc': 'กรอกน้ำหนักและส่วนสูงที่หน้าโปรไฟล์ เพื่อดู BMI และพลังงานที่ควรได้รับ',
        'cta-body': 'ไปกรอกข้อมูลร่างกาย', 'cta-food': 'ไปบันทึกอาหาร', 'cta-activity': 'ไปบันทึกกิจกรรม', 'cta-sleep': 'ไปบันทึกการนอน',
        /* ร่างกาย */
        'body-weight': 'น้ำหนักล่าสุด', 'body-height': 'ส่วนสูง', 'body-target': 'เป้าหมาย', 'body-change': 'น้ำหนักเปลี่ยน',
        'body-weight-chart': 'น้ำหนักตามเวลา', 'body-bmi-chart': 'BMI ตามเวลา',
        'body-bmi-note': 'เส้นประ = เกณฑ์ BMI (18.5 / 23 / 25)',
        'body-need-more': 'มีบันทึกร่างกายเพียง 1 ครั้งในช่วงนี้ ยังไม่เห็นแนวโน้ม',
        'body-history': 'ประวัติร่างกาย', 'body-history-meta': 'BMR {bmr} · TDEE {tdee} · เป้าหมาย {tt} kcal',
        'body-tip-weight': 'น้ำหนัก {v} กก.', 'body-tip-bmi': 'BMI {v}',
        /* อาหาร */
        'food-meals': 'มื้อทั้งหมด', 'food-days': 'วันที่บันทึก', 'food-avg': 'เฉลี่ย/วัน (มื้อ)',
        'food-share': 'สัดส่วนสีอาหาร', 'food-share-center': 'มื้อ', 'food-trend': 'แนวโน้มสีอาหาร',
        'food-top': 'ประเภทอาหารที่กินบ่อย', 'food-by-meal': 'แยกตามมื้อ', 'food-list': 'รายการอาหาร',
        'food-tip-total': 'รวม {n} มื้อ',
        /* กิจกรรม */
        'act-count': 'จำนวนครั้ง', 'act-total': 'เวลารวม', 'act-days': 'วันที่ออกกำลังกาย', 'act-avg': 'เฉลี่ย/วันที่ทำ', 'act-distance': 'ระยะทางรวม',
        'act-goal': 'เฉลี่ยต่อสัปดาห์', 'act-goal-note': 'เกณฑ์แนะนำ 150 นาที/สัปดาห์ (ระดับปานกลาง)', 'act-goal-of': 'ของ 150 นาที',
        'act-chart': 'เวลาออกกำลังกาย', 'act-chart-week': 'เวลาออกกำลังกายรายสัปดาห์', 'act-category': 'สัดส่วนตามประเภท',
        'act-top': 'กิจกรรมที่ทำบ่อย', 'act-list': 'รายการกิจกรรม', 'act-center': 'ครั้ง',
        'act-tip-min': '{v} นาที', 'act-tip-km': '{v} กม.',
        /* การนอน */
        'sl-avg': 'นอนเฉลี่ย', 'sl-range': 'สั้นสุด – นานสุด', 'sl-nights': 'คืนที่บันทึก',
        'sl-bed': 'เข้านอนเฉลี่ย', 'sl-wake': 'ตื่นเฉลี่ย',
        'sl-chart': 'ชั่วโมงการนอน', 'sl-chart-week': 'ชั่วโมงนอนเฉลี่ยรายสัปดาห์', 'sl-band-note': 'แถบเขียว = ช่วงแนะนำ 7–9 ชม.',
        'sl-eval': 'ผลประเมินการนอน', 'sl-quality': 'คุณภาพการนอน (ประเมินเอง)', 'sl-list': 'รายการการนอน',
        'sl-tip-hr': 'เฉลี่ย {v} ชม.', 'sl-tip-none': 'ไม่ได้บันทึก',
        /* ข้อสังเกต */
        'insight-title': 'ข้อสังเกตจากบันทึกของคุณ',
        'insight-note': 'สรุปจากบันทึกของคุณในช่วงที่เลือกเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์',
        'insight-none': 'ข้อมูลในช่วงนี้ยังไม่พอสำหรับข้อสังเกต ลองบันทึกต่อเนื่องอีกสักระยะ หรือเลือกช่วงเวลาที่กว้างขึ้น',
        'ins-sleep-low': 'นอนน้อยกว่า 7 ชม. {n} จาก {t} คืนที่บันทึก',
        'ins-sleep-ok': 'นอนอยู่ในช่วงแนะนำ 7–9 ชม. ทุกคืนที่บันทึก ({t} คืน)',
        'ins-sleep-high': 'นอนเกิน 9 ชม. {n} จาก {t} คืนที่บันทึก',
        'ins-food-red': 'อาหารสีแดง ({l}) คิดเป็น {p}% ของมื้อที่ประเมินสีได้',
        'ins-food-green': 'อาหารดีต่อสุขภาพคิดเป็น {p}% ของมื้อที่ประเมินสีได้',
        'ins-act-goal': 'ออกกำลังกายเฉลี่ย {m} นาที/สัปดาห์ ถึงเกณฑ์แนะนำ 150 นาที',
        'ins-act-under': 'ออกกำลังกายเฉลี่ย {m} นาที/สัปดาห์ ยังต่ำกว่าเกณฑ์แนะนำ 150 นาที',
        'ins-act-none': 'ไม่มีบันทึกการออกกำลังกายในช่วงนี้',
        'ins-cross-good': 'วันที่ออกกำลังกาย มีอาหารสีแดง {a}% เทียบกับ {b}% ในวันที่ไม่ได้ออกกำลังกาย',
        'ins-cross-info': 'วันที่ออกกำลังกาย มีอาหารสีแดง {a}% สูงกว่า {b}% ในวันที่ไม่ได้ออกกำลังกาย',
        'ins-streak': 'บันทึกต่อเนื่องมาแล้ว {s} วัน',
        'ins-consistency-good': 'บันทึกข้อมูล {l} จาก {r} วัน ({p}%) สม่ำเสมอดี',
        'ins-consistency-low': 'บันทึกข้อมูลเพียง {l} จาก {r} วัน ยิ่งบันทึกครบ ภาพรวมยิ่งแม่นยำ',
        'ins-weight-ok': 'น้ำหนัก{d} {v} กก. สอดคล้องกับเป้าหมาย "{g}"',
        'ins-weight-off': 'น้ำหนัก{d} {v} กก. ต่างจากเป้าหมาย "{g}"',
        'ins-weight-steady': 'น้ำหนักคงที่ (เปลี่ยนไม่เกิน 1 กก.) สอดคล้องกับเป้าหมาย "{g}"',
        'dir-down': 'ลดลง', 'dir-up': 'เพิ่มขึ้น',
        /* รายวัน */
        'daily-title': 'สรุปรายวัน', 'daily-sub': 'ดูอาหาร กิจกรรม และการนอนของแต่ละวันในที่เดียว',
        'daily-col-date': 'วัน', 'daily-col-food': 'อาหาร', 'daily-col-act': 'ออกกำลังกาย', 'daily-col-sleep': 'นอน', 'daily-col-quality': 'คุณภาพนอน',
        'daily-legend': 'จุดสี = สีที่พบมากที่สุดของวัน (เท่ากันแสดงสีที่ควรระวังกว่า)',
        'daily-tip-food': 'อาหาร {n} มื้อ', 'daily-tip-none': 'ไม่มีบันทึก',
        'cta-start': 'เริ่มบันทึก'
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
        'tab-body': 'Body', 'tab-food': 'Food', 'tab-activity': 'Activity', 'tab-sleep': 'Sleep', 'tab-daily': 'Daily',
        'day-unit': 'days', 'days-count': '{n} days',
        'kpi-bmi': 'Latest BMI', 'kpi-bmi-sub': 'Weight {w} kg',
        'kpi-tdee': 'Daily energy target', 'kpi-tdee-sub': 'TDEE {t} kcal',
        'kpi-consistency': 'Consistency', 'kpi-consistency-sub': 'Logged {l}/{r} days · {s}-day streak',
        'kpi-food': 'Food', 'kpi-food-unit': 'meals',
        'kpi-activity': 'Exercise', 'kpi-activity-sub': '{c} sessions · {d} days',
        'kpi-sleep': 'Avg sleep', 'kpi-sleep-unit': 'h/night', 'kpi-sleep-sub': '{n} nights logged',
        'unit-hr': 'h', 'unit-min': 'm', 'unit-minutes': 'min', 'unit-kg': 'kg', 'unit-cm': 'cm', 'unit-km': 'km',
        'unit-times': 'times', 'unit-meals': 'meals', 'unit-nights': 'nights', 'unit-kcal': 'kcal',
        'light-1': 'Healthy', 'light-2': 'In moderation', 'light-3': 'Watch out',
        'meal-1': 'Breakfast', 'meal-2': 'Lunch', 'meal-3': 'Dinner', 'meal-4': 'Snack',
        'bmi-1': 'Underweight', 'bmi-2': 'Normal', 'bmi-3': 'Overweight', 'bmi-4': 'Obese',
        'target-1': 'Lose weight', 'target-2': 'Build muscle', 'target-3': 'Maintain weight',
        'eval-1': 'Too little', 'eval-2': 'Just right', 'eval-3': 'Too much',
        'quality-1': 'Poor', 'quality-2': 'Fair', 'quality-3': 'Good',
        'week-range': 'Week {a} – {b}',
        'show-more': 'Show more', 'items-cap': 'Showing the latest {n} of {t} entries',
        'empty-title': 'No data in this period', 'empty-desc': 'Try a longer period, or start logging now',
        'empty-body-title': 'No body data yet', 'empty-body-desc': 'Enter your weight and height on the profile page to see BMI and your energy needs',
        'cta-body': 'Enter body stats', 'cta-food': 'Log food', 'cta-activity': 'Log activity', 'cta-sleep': 'Log sleep',
        'body-weight': 'Latest weight', 'body-height': 'Height', 'body-target': 'Goal', 'body-change': 'Weight change',
        'body-weight-chart': 'Weight over time', 'body-bmi-chart': 'BMI over time',
        'body-bmi-note': 'Dashed lines = BMI cut-offs (18.5 / 23 / 25)',
        'body-need-more': 'Only one body record in this period, so no trend yet',
        'body-history': 'Body history', 'body-history-meta': 'BMR {bmr} · TDEE {tdee} · target {tt} kcal',
        'body-tip-weight': 'Weight {v} kg', 'body-tip-bmi': 'BMI {v}',
        'food-meals': 'Total meals', 'food-days': 'Days logged', 'food-avg': 'Avg/day (meals)',
        'food-share': 'Food color share', 'food-share-center': 'meals', 'food-trend': 'Food color trend',
        'food-top': 'Most eaten categories', 'food-by-meal': 'By meal', 'food-list': 'Food entries',
        'food-tip-total': '{n} meals in total',
        'act-count': 'Sessions', 'act-total': 'Total time', 'act-days': 'Active days', 'act-avg': 'Avg/active day', 'act-distance': 'Total distance',
        'act-goal': 'Weekly average', 'act-goal-note': 'Recommended: 150 min/week (moderate intensity)', 'act-goal-of': 'of 150 min',
        'act-chart': 'Exercise time', 'act-chart-week': 'Weekly exercise time', 'act-category': 'Share by type',
        'act-top': 'Most frequent activities', 'act-list': 'Activity entries', 'act-center': 'sessions',
        'act-tip-min': '{v} min', 'act-tip-km': '{v} km',
        'sl-avg': 'Avg sleep', 'sl-range': 'Shortest – longest', 'sl-nights': 'Nights logged',
        'sl-bed': 'Avg bedtime', 'sl-wake': 'Avg wake-up',
        'sl-chart': 'Sleep hours', 'sl-chart-week': 'Weekly average sleep hours', 'sl-band-note': 'Green band = recommended 7–9 h',
        'sl-eval': 'Sleep evaluation', 'sl-quality': 'Sleep quality (self-rated)', 'sl-list': 'Sleep entries',
        'sl-tip-hr': 'Avg {v} h', 'sl-tip-none': 'Not logged',
        'insight-title': 'Observations from your logs',
        'insight-note': 'Based only on your own logs in the selected period, not medical advice',
        'insight-none': 'Not enough data in this period for observations. Keep logging for a while, or pick a longer period',
        'ins-sleep-low': 'Slept under 7 h on {n} of {t} logged nights',
        'ins-sleep-ok': 'Slept within the recommended 7–9 h on every logged night ({t} nights)',
        'ins-sleep-high': 'Slept over 9 h on {n} of {t} logged nights',
        'ins-food-red': 'Red foods ({l}) make up {p}% of meals that have a color',
        'ins-food-green': 'Healthy foods make up {p}% of meals that have a color',
        'ins-act-goal': 'Averaging {m} min/week of exercise, meeting the recommended 150 min',
        'ins-act-under': 'Averaging {m} min/week of exercise, below the recommended 150 min',
        'ins-act-none': 'No exercise logged in this period',
        'ins-cross-good': 'On exercise days, red foods were {a}% vs {b}% on days without exercise',
        'ins-cross-info': 'On exercise days, red foods were {a}%, higher than {b}% on days without exercise',
        'ins-streak': 'Logging streak: {s} days in a row',
        'ins-consistency-good': 'Logged {l} of {r} days ({p}%), nicely consistent',
        'ins-consistency-low': 'Logged only {l} of {r} days. The more complete your logs, the more accurate the picture',
        'ins-weight-ok': 'Weight {d} {v} kg, in line with your goal "{g}"',
        'ins-weight-off': 'Weight {d} {v} kg, different from your goal "{g}"',
        'ins-weight-steady': 'Weight is steady (within 1 kg), in line with your goal "{g}"',
        'dir-down': 'down', 'dir-up': 'up',
        'daily-title': 'Daily summary', 'daily-sub': 'Food, activity and sleep for each day in one place',
        'daily-col-date': 'Day', 'daily-col-food': 'Food', 'daily-col-act': 'Exercise', 'daily-col-sleep': 'Sleep', 'daily-col-quality': 'Sleep quality',
        'daily-legend': 'Dot = most common color of the day (ties show the more cautionary color)',
        'daily-tip-food': '{n} meals', 'daily-tip-none': 'No entries',
        'cta-start': 'Start logging'
    }
};

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKLY_BUCKET_ABOVE_DAYS = 31; // ช่วงยาวกว่านี้ กราฟรายวันรวมเป็นรายสัปดาห์
const LIST_PAGE_SIZE = 10;
const WHO_WEEKLY_MIN = 150;
const CATEGORY_COLORS = { 1: 'var(--rp-s1)', 2: 'var(--rp-s2)', 3: 'var(--rp-s3)', 4: 'var(--rp-s4)', 5: 'var(--rp-s5)' };
const LIGHT_KEY = { 1: 'green', 2: 'yellow', 3: 'red' };
const LIGHT_VAR = { 1: 'var(--color-green)', 2: 'var(--color-yellow)', 3: 'var(--color-red)' };
const BMI_CLASS = { 1: 'lc-blue', 2: 'lc-green', 3: 'lc-orange', 4: 'lc-red' };
const SLEEP_EVAL_CLASS = { 1: 'lc-red', 2: 'lc-green', 3: 'lc-yellow' };
const SLEEP_EVAL_VAR = { 1: 'var(--color-red)', 2: 'var(--color-green)', 3: 'var(--color-yellow)' };
const QUALITY_VAR = { 1: '#86b6ef', 2: '#3987e5', 3: '#1c5cab' }; // ordinal: ยิ่งดียิ่งเข้ม

/* ==============================================================================
   1. ตัวช่วยทั่วไป
   ============================================================================== */
let mbId = null;
let report = null;
let rangeMode = '30';
let activeTab = 'body';
const TABS = ['body', 'food', 'activity', 'sleep', 'daily'];
const DAILY_PAGE_SIZE = 14;
const listShown = { body: LIST_PAGE_SIZE, food: LIST_PAGE_SIZE, activity: LIST_PAGE_SIZE, sleep: LIST_PAGE_SIZE, daily: DAILY_PAGE_SIZE };
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

function dateBlock(dateStr) {
    const d = parseYmd(dateStr);
    return `<div class="rp-date"><strong class="numeric">${d.getDate()}</strong><span>${months()[d.getMonth()]}</span></div>`;
}

/** ลิสต์รายการ + ปุ่มดูเพิ่ม (client-side) — rows = html ของ .rp-row ทั้งหมด */
function listCard(tabKey, title, rows, total) {
    const shown = Math.min(listShown[tabKey], rows.length);
    const more = rows.length - shown;
    const cap = total > rows.length ? `<div class="rp-cap-note">${t('items-cap', { n: rows.length, t: total })}</div>` : '';
    return `
        <section class="summary-card">
            <div class="chart-head"><div class="chart-title">${escapeHtml(title)}</div><span class="count-badge numeric">${fmtNum(total)}</span></div>
            <div class="rp-list">${rows.slice(0, shown).join('')}</div>
            <button type="button" class="rp-more" data-more="${tabKey}" ${more > 0 ? '' : 'hidden'} style="width:100%">${t('show-more')} (${Math.min(LIST_PAGE_SIZE, more)})</button>
            ${cap}
        </section>`;
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
            <span class="kpi-label">${t('kpi-tdee')}</span>
            <span class="kpi-value numeric">${o.tdee_target != null ? fmtNum(o.tdee_target) : '–'}<span class="kpi-unit">${t('unit-kcal')}</span></span>
            ${o.tdee != null ? `<span class="kpi-sub">${t('kpi-tdee-sub', { t: fmtNum(o.tdee) })}</span>` : ''}
        </div>`,
        `<div class="kpi">
            <span class="kpi-label">${t('kpi-consistency')}</span>
            <span class="kpi-value numeric">${o.consistency_pct}<span class="kpi-unit">%</span></span>
            <span class="kpi-sub">${t('kpi-consistency-sub', { l: o.logged_days, r: rangeDays, s: o.streak_days })}</span>
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
        { value: `${l.height != null ? fmtNum(l.height, 1) : '–'}<span class="kpi-unit"> ${t('unit-cm')}</span>`, label: t('body-height') },
        { value: l.target ? escapeHtml(t('target-' + l.target)) : '–', label: t('body-target') },
        { value: `${changeText}<span class="kpi-unit"> ${change == null ? '' : t('unit-kg')}</span>`, label: t('body-change') }
    ]);

    const hist = b.history;
    const wPts = hist.filter(h => h.weight != null).map(h => ({
        date: h.date, y: h.weight, tip: tipAttr(fmtDateShort(h.date), [t('body-tip-weight', { v: fmtNum(h.weight, 1) })])
    }));
    const bPts = hist.filter(h => h.bmi != null).map(h => ({
        date: h.date, y: h.bmi,
        tip: tipAttr(fmtDateShort(h.date), [t('body-tip-bmi', { v: fmtNum(h.bmi, 1) }) + (h.bmi_eval ? ` · ${t('bmi-' + h.bmi_eval)}` : '')])
    }));

    if (wPts.length) {
        html += card(t('body-weight-chart'), wPts.length < 2 ? t('body-need-more') : '',
            lineChart({ points: wPts, label: t('body-weight-chart') }));
    }
    if (bPts.length) {
        html += card(t('body-bmi-chart'), t('body-bmi-note'),
            lineChart({ points: bPts, refs: [{ y: 18.5 }, { y: 23 }, { y: 25 }], label: t('body-bmi-chart') }));
    }

    const rows = hist.slice().reverse().map(h => `
        <div class="rp-row ${h.bmi_eval ? BMI_CLASS[h.bmi_eval] : ''}">
            ${dateBlock(h.date)}
            <div class="rp-main">
                <div class="rp-name numeric">${h.weight != null ? fmtNum(h.weight, 1) + ' ' + t('unit-kg') : '–'} · BMI ${h.bmi != null ? fmtNum(h.bmi, 1) : '–'}</div>
                <div class="rp-meta numeric">${t('body-history-meta', { bmr: fmtNum(h.bmr), tdee: fmtNum(h.tdee), tt: fmtNum(h.tdee_target) })}</div>
            </div>
            <div class="rp-side">${h.bmi_eval ? pill(BMI_CLASS[h.bmi_eval], t('bmi-' + h.bmi_eval)) : ''}</div>
        </div>`);
    if (rows.length) html += listCard('body', t('body-history'), rows, rows.length);

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

    let html = chips([
        { value: fmtNum(f.meal_count), label: t('food-meals') },
        { value: fmtNum(f.days_logged), label: t('food-days') },
        { value: fmtNum(f.avg_per_day, 1), label: t('food-avg') }
    ]);

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

    // แนวโน้มรายวัน/สัปดาห์ (แท่งซ้อน เขียว/เหลือง/แดง)
    const buckets = bucketize(f.daily);
    const sums = buckets.map(b => b.rows.reduce((a, r) => ({ g: a.g + r.green, y: a.y + r.yellow, r: a.r + r.red }), { g: 0, y: 0, r: 0 }));
    const maxTotal = Math.max.apply(null, sums.map(s => s.g + s.y + s.r).concat([1]));
    const scaleMax = niceCeil(maxTotal);
    const cols = buckets.map((b, i) => {
        const s = sums[i], total = s.g + s.y + s.r;
        const seg = (n, cls) => n > 0 ? `<span class="bar seg-${cls}" style="height:${(n / scaleMax * 100).toFixed(2)}%"></span>` : '';
        const tip = tipAttr(bucketTitle(b), [
            t('food-tip-total', { n: total }),
            `${t('light-1')} ${s.g} · ${t('light-2')} ${s.y} · ${t('light-3')} ${s.r}`
        ]);
        return `<div class="bar-col is-stack" data-tip="${tip}">${seg(s.r, 'red')}${seg(s.y, 'yellow')}${seg(s.g, 'green')}</div>`;
    }).join('');
    html += card(t('food-trend'), '', barShell(cols, buckets, `${scaleMax} ${t('unit-meals')}`, null, t('food-trend')) + `
        <div class="seg-legend" style="flex-direction:row;flex-wrap:wrap;gap:12px;margin-top:12px">
            ${[1, 2, 3].map(n => `<span class="legend-row" style="grid-template-columns:10px auto"><span class="legend-dot" style="background:${LIGHT_VAR[n]}"></span><span>${t('light-' + n)}</span></span>`).join('')}
        </div>`);

    // ประเภทที่กินบ่อย
    if (f.top_categories.length) {
        html += card(t('food-top'), '', hbarList(f.top_categories.map(c => ({
            label: c.name, dot: c.traffic_light ? LIGHT_VAR[c.traffic_light] : null,
            value: c.count, valueText: fmtNum(c.count), sub: t('unit-times')
        }))));
    }

    // แยกตามมื้อ
    html += card(t('food-by-meal'), '', hbarList(f.by_meal.map(m => ({
        label: t('meal-' + m.meal_type), value: m.count, valueText: fmtNum(m.count), sub: t('unit-times')
    }))));

    // รายการ
    const rows = f.items.map(i => `
        <div class="rp-row ${i.traffic_light ? 'lc-' + LIGHT_KEY[i.traffic_light] : ''}">
            ${dateBlock(i.date)}
            <div class="rp-main">
                <div class="rp-name">${escapeHtml(i.food_name || i.category_name || '–')}</div>
                <div class="rp-meta"><span class="numeric">${escapeHtml(i.time)}</span>${i.meal_type ? ' · ' + escapeHtml(t('meal-' + i.meal_type)) : ''}${i.amount ? ' · ' + escapeHtml(i.amount) : ''}</div>
            </div>
            <div class="rp-side">${i.traffic_light ? pill('lc-' + LIGHT_KEY[i.traffic_light], t('light-' + i.traffic_light)) : ''}${i.category_name && i.food_name ? `<span class="rp-meta">${escapeHtml(i.category_name)}</span>` : ''}</div>
        </div>`);
    html += listCard('food', t('food-list'), rows, f.items_total);

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

    const items = [
        { value: fmtNum(a.count), label: t('act-count') },
        { value: fmtDuration(a.total_min), label: t('act-total') },
        { value: fmtNum(a.days_active), label: t('act-days') },
        { value: `${fmtNum(a.avg_min_per_day, 1)}<span class="kpi-unit"> ${t('unit-minutes')}</span>`, label: t('act-avg') }
    ];
    if (a.distance_count > 0) items.push({ value: `${fmtNum(a.total_distance_km, 1)}<span class="kpi-unit"> ${t('unit-km')}</span>`, label: t('act-distance') });
    let html = chips(items);

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

    // สัดส่วนตามประเภท (สีผูกกับประเภท ไม่ผูกกับอันดับ)
    const catSegs = a.by_category.map(c => {
        const cat = SoyDeeActivityCategories.normalize(c.category);
        return {
            value: c.count, color: CATEGORY_COLORS[cat], label: SoyDeeActivityCategories.label(cat), pct: pct(c.count, a.count),
            tip: tipAttr(SoyDeeActivityCategories.label(cat), [`${c.count} ${t('unit-times')}`, t('act-tip-min', { v: fmtNum(c.minutes) })])
        };
    });
    html += card(t('act-category'), '', `
        <div class="donut-wrap">
            ${donut(catSegs, a.count, t('act-center'), t('act-category'))}
            ${legend(catSegs)}
        </div>`);

    // Top กิจกรรม
    html += card(t('act-top'), '', hbarList(a.top_activities.map(x => ({
        label: x.name, value: x.count, valueText: fmtNum(x.count), sub: `${t('unit-times')} · ${fmtNum(x.minutes)} ${t('unit-minutes')}`
    }))));

    // รายการ
    const rows = a.items.map(i => {
        const cat = SoyDeeActivityCategories.normalize(i.category);
        return `
        <div class="rp-row">
            ${dateBlock(i.date)}
            <div class="rp-main">
                <div class="rp-name">${escapeHtml(i.name)}</div>
                <div class="rp-meta">${escapeHtml(SoyDeeActivityCategories.label(cat))}${i.detail ? ' · ' + escapeHtml(i.detail) : ''}${i.distance_km != null ? ` · <span class="numeric">${fmtNum(i.distance_km, 1)} ${t('unit-km')}</span>` : ''}</div>
            </div>
            <div class="rp-side"><span class="rp-value numeric">${i.duration_min != null ? fmtNum(i.duration_min) : '–'} <small>${t('unit-minutes')}</small></span></div>
        </div>`;
    });
    html += listCard('activity', t('act-list'), rows, a.items_total);

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
    const hrUnit = `<span class="kpi-unit"> ${t('unit-hr')}</span>`;
    let html = chips([
        { value: `${fmtNum(s.avg_hours, 1)}${hrUnit}`, label: t('sl-avg') },
        { value: `${fmtNum(s.min_hours, 1)} – ${fmtNum(s.max_hours, 1)}${hrUnit}`, label: t('sl-range') },
        { value: fmtNum(s.nights), label: t('sl-nights') },
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

    const qSegs = [1, 2, 3].map(n => ({
        n, value: s.by_quality[n - 1], color: QUALITY_VAR[n],
        tip: tipAttr(t('quality-' + n), [`${s.by_quality[n - 1]} ${t('unit-nights')}`])
    }));
    html += card(t('sl-quality'), '', segBar(qSegs, t('sl-quality')) + `<div class="seg-legend">${legendRows(qSegs, 'quality-', s.nights)}</div>`);

    // รายการ (ใหม่ → เก่า)
    const rows = s.items.slice().reverse().map(i => `
        <div class="rp-row ${i.eval ? SLEEP_EVAL_CLASS[i.eval] : ''}">
            ${dateBlock(i.date)}
            <div class="rp-main">
                <div class="rp-name numeric">${escapeHtml(i.start.slice(11))} → ${escapeHtml(i.end.slice(11))}</div>
                <div class="rp-meta">${i.quality ? escapeHtml(t('sl-quality').split(' (')[0]) + ': ' + escapeHtml(t('quality-' + i.quality)) : ''}</div>
            </div>
            <div class="rp-side">
                <span class="rp-value numeric">${i.total_hours != null ? fmtNum(i.total_hours, 1) : '–'} <small>${t('unit-hr')}</small></span>
                ${i.eval ? pill(SLEEP_EVAL_CLASS[i.eval], t('eval-' + i.eval)) : ''}
            </div>
        </div>`);
    html += listCard('sleep', t('sl-list'), rows, s.nights);

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
const INSIGHT_MAX = 4;
const INSIGHT_ICON = { warn: 'warning', good: 'check', info: 'info' };
const INSIGHT_ORDER = { warn: 0, good: 1, info: 2 };

function redShare(days) {
    let judged = 0, red = 0;
    days.forEach(d => { judged += d.green + d.yellow + d.red; red += d.red; });
    return { judged, red, pct: pct(red, judged) };
}

function buildInsights() {
    const out = [];
    const add = (tone, key, vars) => out.push({ tone, text: t(key, vars) });
    const o = report.overview, s = report.sleep, f = report.food, a = report.activity, b = report.body;
    const days = report.range.days;

    // การนอน
    if (s.nights >= 3) {
        const low = s.items.filter(i => i.eval === 1).length;
        const high = s.items.filter(i => i.eval === 3).length;
        if (low / s.nights >= 0.4) add('warn', 'ins-sleep-low', { n: low, t: s.nights });
        else if (s.by_eval[1] === s.nights) add('good', 'ins-sleep-ok', { t: s.nights });
        if (high / s.nights >= 0.4) add('info', 'ins-sleep-high', { n: high, t: s.nights });
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

    // ข้ามส่วน: อาหารสีแดง วันออกกำลังกาย vs ไม่ออก (ต้องมีข้อมูลพอทั้งสองกลุ่ม)
    const minutesByDate = {};
    a.daily.forEach(d => { minutesByDate[d.date] = d.minutes; });
    const foodDays = f.daily.filter(d => d.total > 0);
    const active = foodDays.filter(d => minutesByDate[d.date] > 0);
    const inactive = foodDays.filter(d => !(minutesByDate[d.date] > 0));
    if (active.length >= 3 && inactive.length >= 3) {
        const ra = redShare(active), ri = redShare(inactive);
        if (ra.judged >= 6 && ri.judged >= 6 && Math.abs(ra.pct - ri.pct) >= 15) {
            add(ra.pct < ri.pct ? 'good' : 'info', ra.pct < ri.pct ? 'ins-cross-good' : 'ins-cross-info', { a: ra.pct, b: ri.pct });
        }
    }

    // ความสม่ำเสมอ
    let consistencyGood = false;
    if (days >= 7 && o.logged_days > 0) {
        if (o.consistency_pct >= 80) { consistencyGood = true; add('good', 'ins-consistency-good', { l: o.logged_days, r: days, p: o.consistency_pct }); }
        else if (o.consistency_pct <= 30) add('info', 'ins-consistency-low', { l: o.logged_days, r: days });
    }
    if (!consistencyGood && o.streak_days >= 7) add('good', 'ins-streak', { s: o.streak_days });

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
   7.2 แท็บ: รายวัน — ตารางรวมอาหาร/กิจกรรม/การนอนของแต่ละวัน (ใหม่ → เก่า)
   ============================================================================== */
function dominantLight(d) {
    if (d.total === 0 || d.green + d.yellow + d.red === 0) return 0;
    // เท่ากัน → เลือกสีที่ควรระวังกว่า (แดง > เหลือง > เขียว)
    if (d.red >= d.yellow && d.red >= d.green) return 3;
    if (d.yellow >= d.green) return 2;
    return 1;
}

function renderDaily() {
    const el = $('panel-daily');
    if (report.overview.logged_days === 0) {
        el.innerHTML = emptyBlock(t('empty-title'), t('empty-desc'), 'food-record.html', t('cta-start'));
        return;
    }
    const minutesByDate = {}, sleepByDate = {};
    report.activity.daily.forEach(d => { minutesByDate[d.date] = d.minutes; });
    report.sleep.items.forEach(i => { sleepByDate[i.date] = i; });

    const days = report.food.daily.slice().reverse();
    const shown = Math.min(listShown.daily, days.length);
    const more = days.length - shown;

    const rows = days.slice(0, shown).map(d => {
        const mins = minutesByDate[d.date] || 0;
        const sl = sleepByDate[d.date];
        const light = dominantLight(d);
        const empty = d.total === 0 && mins === 0 && !sl;
        const foodCell = d.total > 0
            ? `<span class="numeric">${d.total}</span>${light ? ` <span class="badge-dot" style="background:${LIGHT_VAR[light]}"></span>` : ''}`
            : '–';
        const tip = tipAttr(fmtDateShort(d.date), empty ? [t('daily-tip-none')] : [
            t('daily-tip-food', { n: d.total }) + (d.total ? ` (${t('light-1')} ${d.green} · ${t('light-2')} ${d.yellow} · ${t('light-3')} ${d.red})` : ''),
            `${t('kpi-activity')}: ${mins} ${t('unit-minutes')}`,
            sl ? `${t('tab-sleep')}: ${sl.total_hours != null ? fmtNum(sl.total_hours, 1) : '–'} ${t('unit-hr')}${sl.eval ? ' · ' + t('eval-' + sl.eval) : ''}` : `${t('tab-sleep')}: –`
        ]);
        return `<tr class="${empty ? 'is-empty' : ''}" data-tip="${tip}">
            <th scope="row" class="numeric">${fmtDateShort(d.date)}</th>
            <td>${foodCell}</td>
            <td class="numeric">${mins > 0 ? fmtNum(mins) : '–'}</td>
            <td class="numeric">${sl && sl.total_hours != null ? fmtNum(sl.total_hours, 1) : '–'}</td>
            <td>${sl && sl.quality ? escapeHtml(t('quality-' + sl.quality)) : '–'}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
        <section class="summary-card">
            <div class="chart-head"><div><div class="chart-title">${t('daily-title')}</div><div class="chart-sub">${t('daily-sub')}</div></div><span class="count-badge numeric">${fmtNum(days.length)}</span></div>
            <div class="daily-scroll">
                <table class="daily-table">
                    <thead><tr>
                        <th scope="col">${t('daily-col-date')}</th>
                        <th scope="col">${t('daily-col-food')}<small>${t('unit-meals')}</small></th>
                        <th scope="col">${t('daily-col-act')}<small>${t('unit-minutes')}</small></th>
                        <th scope="col">${t('daily-col-sleep')}<small>${t('unit-hr')}</small></th>
                        <th scope="col">${t('daily-col-quality')}</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="daily-legend">
                ${[1, 2, 3].map(n => `<span><i class="badge-dot" style="background:${LIGHT_VAR[n]}"></i>${t('light-' + n)}</span>`).join('')}
            </div>
            <p class="summary-insight">${t('daily-legend')}</p>
            <button type="button" class="rp-more" data-more="daily" ${more > 0 ? '' : 'hidden'} style="width:100%">${t('show-more')} (${Math.min(DAILY_PAGE_SIZE, more)})</button>
        </section>`;
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
        Object.keys(listShown).forEach(k => { listShown[k] = k === 'daily' ? DAILY_PAGE_SIZE : LIST_PAGE_SIZE; });
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
    renderDaily();
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

    // ปุ่ม "ดูเพิ่ม" ของรายการในแต่ละแท็บ — เรนเดอร์เฉพาะแท็บนั้นใหม่
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-more]');
        if (!btn || !report) return;
        const key = btn.dataset.more;
        listShown[key] += key === 'daily' ? DAILY_PAGE_SIZE : LIST_PAGE_SIZE;
        ({ body: renderBody, food: renderFood, activity: renderActivity, sleep: renderSleep, daily: renderDaily })[key]();
    });

    initTooltip();
    // #food / #activity / #sleep / #body — เปิดแท็บตรงๆ ได้จากลิงก์
    const hashTab = location.hash.replace('#', '');
    if (TABS.includes(hashTab)) activeTab = hashTab;
    setTab(activeTab);
    loadReport();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back) — โหลดใหม่ให้ตรงกับบันทึกล่าสุด
    window.addEventListener('pageshow', (e) => { if (e.persisted) loadReport(); });
});
