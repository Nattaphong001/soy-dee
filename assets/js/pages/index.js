/**
 * index.js — หน้าแรก/แดชบอร์ดสุขภาพ: รองรับ i18n (ไทย/อังกฤษ)
 *
 * หน้านี้ไม่มีสวิตช์เปลี่ยนภาษาเอง (สวิตช์อยู่ที่หน้าโปรไฟล์เท่านั้น)
 * สคริปต์นี้แค่ "รับ" ค่าภาษาที่ถูกบันทึกไว้ใน localStorage (key: 'lang')
 * แล้วแปลข้อความ static บนหน้าจอให้ตรงกัน โดยใช้เอนจินกลาง window.I18N
 * (ดู assets/js/shared/i18n.js)
 *
 * หมายเหตุ: หน่วย/คำย่อเฉพาะทาง เช่น BMI, BMR, TDEE, kg, cm, kcal
 * จะไม่ถูกแปล (คงเดิมทั้งสองภาษา) ตามธรรมเนียมเดียวกับหน้าโปรไฟล์
 */
const INDEX_I18N = {
    th: {
        'edit-profile-btn': 'แก้ไขข้อมูล',
        'stat-label-gender': 'เพศ',
        'stat-label-age': 'อายุ',
        'unit-years': 'ปี',
        'stat-label-height': 'ส่วนสูง',
        'unit-cm': 'ซม.',
        'stat-label-weight': 'น้ำหนัก',
        'unit-kg': 'กก.',
        'bmi-panel-title': 'ดัชนีมวลกาย (BMI)',
        'bmi-tooltip-title': 'BMI (ดัชนีมวลกาย)',
        'bmi-tooltip-desc': 'คำนวณจากน้ำหนัก (กก.) หารด้วยส่วนสูง² (เมตร) ใช้ประเมินสัดส่วนร่างกายเบื้องต้นเท่านั้น ไม่สามารถใช้แทนคำวินิจฉัยทางการแพทย์ได้ ควรปรึกษาแพทย์หรือนักโภชนาการเพื่อการประเมินที่แม่นยำ',
        'bmi-your-value-label': 'ค่า BMI ของคุณ',
        'gauge-underweight': 'ผอม',
        'gauge-normal': 'ปกติ',
        'gauge-overweight': 'ท้วม',
        'gauge-obese': 'อ้วน',
        'comp-label': 'เปรียบเทียบกับครั้งล่าสุด',
        'energy-panel-title': 'พลังงาน',
        'energy-tooltip-mid': 'คือพลังงานขั้นต่ำที่ร่างกายใช้ขณะพักนิ่ง ส่วน',
        'energy-tooltip-end': 'คือพลังงานรวมที่ใช้ทั้งวันเมื่อรวมกิจกรรมต่างๆ เข้าไปด้วย ตัวเลขเหล่านี้เป็นการประมาณจากสูตรมาตรฐาน อาจคลาดเคลื่อนจากการเผาผลาญจริงของแต่ละบุคคลได้',
        'bmr-desc': 'พลังงานพื้นฐานที่ร่างกายใช้ต่อวัน',
        'target-energy-label': 'เป้าหมายพลังงาน/วัน'
    },
    en: {
        'edit-profile-btn': 'Edit Info',
        'stat-label-gender': 'Gender',
        'stat-label-age': 'Age',
        'unit-years': 'yrs',
        'stat-label-height': 'Height',
        'unit-cm': 'cm',
        'stat-label-weight': 'Weight',
        'unit-kg': 'kg',
        'bmi-panel-title': 'Body Mass Index (BMI)',
        'bmi-tooltip-title': 'BMI (Body Mass Index)',
        'bmi-tooltip-desc': 'Calculated from weight (kg) divided by height² (meters). Used only as a rough estimate of body proportions — it cannot replace a medical diagnosis. Consult a doctor or nutritionist for an accurate assessment.',
        'bmi-your-value-label': 'Your BMI Value',
        'gauge-underweight': 'Underweight',
        'gauge-normal': 'Normal',
        'gauge-overweight': 'Overweight',
        'gauge-obese': 'Obese',
        'comp-label': 'Compared to last time',
        'energy-panel-title': 'Energy',
        'energy-tooltip-mid': 'is the minimum energy your body uses at rest, while',
        'energy-tooltip-end': 'is the total energy used per day including all activities. These numbers are estimates from standard formulas and may differ from your actual metabolism.',
        'bmr-desc': 'Base energy your body uses per day',
        'target-energy-label': 'Daily Energy Target'
    }
};

/* ==============================================================================
   Date Pill — ใช้ปฏิทิน dropdown ร่วมกับหน้าอื่น (assets/js/shared/datepicker.js)
   หน้านี้ยังไม่มีข้อมูลรายวันผูกอยู่ (สถิติเป็นข้อมูลรวม/ล่าสุดของผู้ใช้) จึงแค่
   อัปเดตข้อความวันที่ให้ตรงกับที่เลือก — เมื่อเชื่อมข้อมูลรายวันจริงในอนาคต
   ให้เพิ่ม onSelect ให้โหลดข้อมูลของวันนั้นต่อจากนี้ได้เลย
   ============================================================================== */
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

let selectedDate = new Date();

function formatDateThai(date) {
    if (I18N.getLang() === 'en') {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function renderDate() {
    document.getElementById('dateText').textContent = formatDateThai(selectedDate);
}

document.addEventListener('DOMContentLoaded', () => {
    I18N.apply(INDEX_I18N);
    renderDate();

    SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        getDate: () => selectedDate,
        onSelect: (date) => {
            selectedDate = date;
            renderDate();
        }
    });

    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            showToast('ยังไม่มีการแจ้งเตือนใหม่ในขณะนี้');
        });
    }

    loadDashboardData();
});

/* ==============================================================================
   เชื่อมข้อมูลจริง — โปรไฟล์ + ข้อมูลร่างกายล่าสุด + สรุปสุขภาพ (dashboard)
   ============================================================================== */
const BMI_EVAL_KEY = { 1: 'gauge-underweight', 2: 'gauge-normal', 3: 'gauge-overweight', 4: 'gauge-obese' };

function calcAge(birthDateStr) {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

function formatKcal(value) {
    if (value === null || value === undefined) return '–';
    return Math.round(value).toLocaleString(I18N.getLang() === 'en' ? 'en-US' : 'th-TH');
}

async function loadDashboardData() {
    const mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;

    try {
        const [profile, dashboard, bodyStatsLatest] = await Promise.all([
            SoyDeeAPI.request(`/members/${mbId}/profile`),
            SoyDeeAPI.request(`/members/${mbId}/dashboard`),
            SoyDeeAPI.request(`/members/${mbId}/body-stats/latest`).catch(() => null)
        ]);

        renderProfileStats(profile, bodyStatsLatest);
        renderBmiEnergy(dashboard);
        await renderBmiComparison(mbId, dashboard);
    } catch (err) {
        console.error('loadDashboardData failed', err);
        showToast(I18N.getLang() === 'en' ? 'Failed to load your data' : 'โหลดข้อมูลไม่สำเร็จ');
    }
}

function renderProfileStats(profile, bodyStats) {
    const nameEl = document.querySelector('.user-name');
    if (nameEl && profile.mb_full_name) nameEl.textContent = profile.mb_full_name;

    const genderValue = profile.mb_gender === 2 ? 'หญิง' : 'ชาย';
    const genderEl = document.getElementById('statGender');
    if (genderEl) {
        genderEl.removeAttribute('data-i18n'); // ค่าจริงจาก DB ไม่ใช่ข้อความ i18n แบบ static อีกต่อไป
        genderEl.textContent = I18N.getLang() === 'en' ? (profile.mb_gender === 2 ? 'Female' : 'Male') : genderValue;
    }
    setGeckoGender(genderValue);

    if (profile.mb_profile_pic) {
        const avatarLink = document.querySelector('.profile-avatar');
        if (avatarLink) {
            avatarLink.innerHTML = `<img src="${SoyDeeAPI.assetUrl(profile.mb_profile_pic)}" alt="Profile">`;
        }
    }

    const age = calcAge(profile.mb_birth_date);
    const ageValueEl = document.querySelector('[data-card="age"] .stat-value');
    if (ageValueEl && age !== null) ageValueEl.firstChild.textContent = `${age} `;

    if (bodyStats) {
        const heightEl = document.querySelector('[data-card="height"] .stat-value');
        if (heightEl && bodyStats.mbs_height != null) heightEl.firstChild.textContent = `${bodyStats.mbs_height} `;
        const weightEl = document.querySelector('[data-card="weight"] .stat-value');
        if (weightEl && bodyStats.mbs_weight != null) weightEl.firstChild.textContent = `${bodyStats.mbs_weight} `;
    }

    // การ์ดกว้างขึ้น/แคบลงตามความยาวข้อความจริง — คำนวณเส้นทางเดินของกิ้งก่าใหม่
    if (window.geckoWalker) window.geckoWalker.recalculate();
}

function renderBmiEnergy(dashboard) {
    const bmi = dashboard.latest_bmi || {};
    const bmr = dashboard.latest_bmr || {};

    const bmiValueEl = document.getElementById('bmiValue');
    const bmiStatusEl = document.getElementById('bmiStatusText');
    if (bmiValueEl) bmiValueEl.textContent = bmi.value != null ? bmi.value.toFixed(1) : '–';
    if (bmiStatusEl) {
        const key = BMI_EVAL_KEY[bmi.eval_result];
        bmiStatusEl.textContent = key ? I18N.t(INDEX_I18N, key) : '–';
    }
    if (bmi.value != null && typeof animateBMIGauge === 'function') animateBMIGauge();

    const bmrValueEl = document.querySelector('.energy-block .e-value');
    if (bmrValueEl) bmrValueEl.innerHTML = `${formatKcal(bmr.bmr)} <small>kcal</small>`;

    const tdeeValueEl = document.querySelector('.tt-row:nth-child(1) .tt-value');
    if (tdeeValueEl) tdeeValueEl.innerHTML = `${formatKcal(bmr.tdee)} <small>kcal</small>`;

    const targetValueEl = document.querySelector('.tt-value-target');
    if (targetValueEl) targetValueEl.innerHTML = `${formatKcal(bmr.tdee_target)} <small>kcal</small>`;
}

async function renderBmiComparison(mbId, dashboard) {
    const box = document.querySelector('.comparison-box');
    if (!box) return;

    try {
        const history = await SoyDeeAPI.request(`/members/${mbId}/bmr/history`, { query: { limit: 2, page: 1 } });
        const items = (history && history.items) || [];
        const currentBmi = dashboard.latest_bmi && dashboard.latest_bmi.value;

        if (items.length < 2 || currentBmi == null) {
            box.hidden = true;
            return;
        }

        const previousBmi = items[1].mbh_bmi;
        const delta = Math.round((currentBmi - previousBmi) * 10) / 10;
        const valueEl = box.querySelector('.comp-value');
        const iconEl = box.querySelector('.comp-icon');
        if (!valueEl) return;

        if (delta === 0) {
            valueEl.textContent = I18N.getLang() === 'en' ? 'No change' : 'ไม่เปลี่ยนแปลง';
            if (iconEl) iconEl.textContent = '➖';
        } else if (delta > 0) {
            valueEl.textContent = (I18N.getLang() === 'en' ? `Increased ${delta}` : `เพิ่มขึ้น ${delta}`) + ' ↑';
            if (iconEl) iconEl.textContent = '📈';
        } else {
            valueEl.textContent = (I18N.getLang() === 'en' ? `Decreased ${Math.abs(delta)}` : `ลดลง ${Math.abs(delta)}`) + ' ↓';
            if (iconEl) iconEl.textContent = '📉';
        }
        box.hidden = false;
    } catch (err) {
        box.hidden = true;
    }
}
