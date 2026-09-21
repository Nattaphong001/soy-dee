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
        'target-energy-label': 'เป้าหมายพลังงาน/วัน',
        'dashboard-empty-title': 'ยังไม่มีข้อมูลสุขภาพ',
        'dashboard-empty-desc': 'กรอกข้อมูลร่างกายที่หน้าโปรไฟล์ เพื่อให้ระบบคำนวณ BMI/BMR/TDEE ให้คุณ',
        'dashboard-empty-cta': 'ไปกรอกข้อมูลร่างกาย'
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
        'target-energy-label': 'Daily Energy Target',
        'dashboard-empty-title': 'No health data yet',
        'dashboard-empty-desc': 'Fill in your body stats on the profile page so we can calculate your BMI/BMR/TDEE.',
        'dashboard-empty-cta': 'Go fill in body stats'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    I18N.apply(INDEX_I18N);

    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            showToast('ยังไม่มีการแจ้งเตือนใหม่ในขณะนี้');
        });
    }

    loadDashboardData();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back ของเบราว์เซอร์) — DOMContentLoaded ไม่ยิงซ้ำ
    // ค่าที่แก้จากหน้าโปรไฟล์เลยค้างจนกว่าจะกด refresh เอง แก้โดยโหลดข้อมูลใหม่ทุกครั้งที่ restore
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) loadDashboardData();
    });

    // ซิงก์ชื่อ/รูป/เพศแบบเรียลไทม์ข้ามแท็บ — 'storage' event ยิงเฉพาะแท็บอื่นที่ไม่ได้เป็นคนเซฟ
    window.addEventListener('storage', (e) => {
        if (e.key !== 'soydee_user' || !e.newValue) return;
        try {
            const user = JSON.parse(e.newValue);
            const nameEl = document.querySelector('.user-name');
            if (nameEl && user.full_name) nameEl.textContent = user.full_name;
            if (user.profile_pic) {
                const avatarLink = document.querySelector('.profile-avatar');
                if (avatarLink) avatarLink.innerHTML = `<img src="${SoyDeeAPI.assetUrl(user.profile_pic)}" alt="Profile">`;
            }
            if (user.gender != null) {
                const genderValue = user.gender === 2 ? 'หญิง' : 'ชาย';
                const genderEl = document.getElementById('statGender');
                if (genderEl) genderEl.textContent = I18N.getLang() === 'en' ? (user.gender === 2 ? 'Female' : 'Male') : genderValue;
                setGeckoGender(genderValue);
            }
        } catch (err) { /* malformed storage value — ข้าม */ }
    });

    // แก้น้ำหนัก/ส่วนสูง/ระดับกิจกรรม/เป้าหมาย/วันเกิดที่หน้าโปรไฟล์ (แท็บอื่น) แล้ว
    // ตัวเลข BMI/BMR/TDEE ต้องอัปเดตทันทีที่นี่ โดยไม่ต้องรีเฟรชหน้า — ดู
    // assets/js/shared/app.js (broadcastSync/onSync) และ profile.js (saveBodyTab)
    if (typeof onSync === 'function') {
        onSync((msg) => {
            if (msg.type === 'bmr-updated') {
                renderBmiEnergy({ latest_bmi: msg.payload.bmi, latest_bmr: msg.payload.bmr });
            }
        });
    }
});

/* ==============================================================================
   เชื่อมข้อมูลจริง — โปรไฟล์ + ข้อมูลร่างกายล่าสุด + สรุปสุขภาพ (dashboard)
   ============================================================================== */
const BMI_EVAL_KEY = { 1: 'gauge-underweight', 2: 'gauge-normal', 3: 'gauge-overweight', 4: 'gauge-obese' };
// คลาสสี BMI ตาม mbh_eval_result จริง (ดู .c-thin/.c-normal/.c-over/.c-obese
// ใน shared/style.css) — เดิม .bmi-number/.bmi-status ตรึงเป็นสีเขียวเสมอ
// ไม่ว่า BMI จะอยู่ช่วงไหน ตอนนี้ต้องสลับคลาสตามค่าจริงทุกครั้งที่ render
const BMI_EVAL_CLASS = { 1: 'eval-thin', 2: 'eval-normal', 3: 'eval-over', 4: 'eval-obese' };
const ALL_BMI_EVAL_CLASSES = Object.values(BMI_EVAL_CLASS);

function setBmiEvalClass(el, evalResult) {
    if (!el) return;
    el.classList.remove(...ALL_BMI_EVAL_CLASSES);
    const cls = BMI_EVAL_CLASS[evalResult];
    if (cls) el.classList.add(cls);
}

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

    const content = document.querySelector('.app-content');
    if (content) content.classList.add('is-loading');

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
    } finally {
        if (content) content.classList.remove('is-loading');
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

    // สมาชิกที่ยังไม่เคยมี member_bmr_history เลย (ปกติไม่ควรเจอหลังแก้ transaction
    // ตอนสมัคร แต่กันไว้เผื่อบัญชีเก่า) — ซ่อนการ์ด BMI/พลังงาน แสดง empty state แทน
    const dashboardCard = document.querySelector('.combined-dashboard-card');
    const emptyState = document.getElementById('dashboardEmptyState');
    const hasData = bmi.value != null || bmr.bmr != null;
    if (emptyState) emptyState.hidden = hasData;
    if (dashboardCard) dashboardCard.hidden = !hasData;
    if (!hasData) return;

    const bmiValueEl = document.getElementById('bmiValue');
    const bmiStatusEl = document.getElementById('bmiStatusText');
    if (bmiValueEl) bmiValueEl.textContent = bmi.value != null ? bmi.value.toFixed(1) : '–';
    if (bmiStatusEl) {
        const key = BMI_EVAL_KEY[bmi.eval_result];
        bmiStatusEl.textContent = key ? I18N.t(INDEX_I18N, key) : '–';
    }
    setBmiEvalClass(bmiValueEl, bmi.eval_result);
    setBmiEvalClass(bmiStatusEl, bmi.eval_result);
    if (bmi.value != null && typeof animateBMIGauge === 'function') animateBMIGauge(bmi.value);

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
            if (iconEl) iconEl.innerHTML = SoyIcons.svg('minus');
        } else if (delta > 0) {
            valueEl.textContent = (I18N.getLang() === 'en' ? `Increased ${delta}` : `เพิ่มขึ้น ${delta}`) + ' ↑';
            if (iconEl) iconEl.innerHTML = SoyIcons.svg('trend-up');
        } else {
            valueEl.textContent = (I18N.getLang() === 'en' ? `Decreased ${Math.abs(delta)}` : `ลดลง ${Math.abs(delta)}`) + ' ↓';
            if (iconEl) iconEl.innerHTML = SoyIcons.svg('trend-down');
        }
        box.hidden = false;
    } catch (err) {
        box.hidden = true;
    }
}
