/* ==============================================================================
   CONFIRM DIALOG — popup ยืนยันมาตรฐานเดียวกันทั้งแอพ
   ------------------------------------------------------------------------------
   เรียกใช้ได้จากทุกหน้าที่โหลด app.js (ทุกหน้าโหลดอยู่แล้ว) เช่น:

     showConfirm({
        title: 'ออกจากระบบ',
        message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
        confirmText: 'ออกจากระบบ',
        cancelText: 'ยกเลิก',
        onConfirm: () => { ... สิ่งที่ทำเมื่อกดยืนยัน ... }
     });

   ปุ่มยืนยัน (สีแดง) จะถูกจัดให้อยู่ซ้ายเสมอ ปุ่มยกเลิกอยู่ขวาเสมอ (ด้วย CSS
   order — ดู .confirm-btn-danger / .confirm-btn-cancel ใน style.css)
   ปิดได้ด้วยการกดพื้นหลัง, ปุ่มยกเลิก, หรือกด Esc
   ============================================================================== */
function showConfirm({ title = '', message = '', confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', onConfirm, onCancel } = {}) {
    // ป้องกันเปิดซ้อนกันหลายอันพร้อมกัน
    const existing = document.getElementById('globalConfirmOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'globalConfirmOverlay';
    overlay.innerHTML = `
        <div class="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMessage">
            <div class="confirm-icon">⚠️</div>
            <div class="confirm-title" id="confirmTitle"></div>
            <div class="confirm-message" id="confirmMessage"></div>
            <div class="confirm-actions">
                <button type="button" class="confirm-btn confirm-btn-danger" id="confirmBtnYes"></button>
                <button type="button" class="confirm-btn confirm-btn-cancel" id="confirmBtnNo"></button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmTitle').textContent = title;
    overlay.querySelector('#confirmMessage').textContent = message;
    overlay.querySelector('#confirmBtnYes').textContent = confirmText;
    overlay.querySelector('#confirmBtnNo').textContent = cancelText;

    function onKeydown(e) {
        if (e.key === 'Escape') { close(); if (onCancel) onCancel(); }
    }

    function close() {
        overlay.classList.remove('is-open');
        document.removeEventListener('keydown', onKeydown);
        setTimeout(() => overlay.remove(), 200);
    }

    overlay.querySelector('#confirmBtnYes').addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });
    overlay.querySelector('#confirmBtnNo').addEventListener('click', () => { close(); if (onCancel) onCancel(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });
    document.addEventListener('keydown', onKeydown);

    // เปิดในเฟรมถัดไป เพื่อให้ transition (opacity/scale) เล่นจริง แทนที่จะโผล่มาทันที
    requestAnimationFrame(() => overlay.classList.add('is-open'));
}
window.showConfirm = showConfirm;

/* ==============================================================================
   TOAST — ข้อความแจ้งเตือนสั้นๆ แบบ Samsung One UI ลอยกลางบนจอ หายเองใน 2.5 วิ
   เรียกใช้: showToast('บันทึกแล้ว', 'success')  |  showToast('ผิดพลาด', 'error')  |  showToast('ข้อความทั่วไป')
   ============================================================================== */
const TOAST_ICONS = {
    success: '<svg class="app-toast-icon" viewBox="0 0 20 20" fill="none"><path d="M4 10.5L8 14.5L16 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg class="app-toast-icon" viewBox="0 0 20 20" fill="none"><path d="M6 6L14 14M14 6L6 14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function showToast(message, type) {
    const existing = document.getElementById('globalToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'app-toast' + (type && TOAST_ICONS[type] ? ` app-toast-${type}` : '');
    toast.innerHTML = (type && TOAST_ICONS[type] ? TOAST_ICONS[type] : '') + `<span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-open'));
    setTimeout(() => {
        toast.classList.remove('is-open');
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}
window.showToast = showToast;

/* ==============================================================================
   THEME SYSTEM — โครงสร้าง JS พื้นฐานสำหรับสลับ Light / Dark Mode
   ------------------------------------------------------------------------------
   - Default: Light Mode เสมอ (ไม่มีคลาส .dark-theme ที่ <html>)
   - สถานะถูกจำไว้ใน localStorage ('theme': 'light' | 'dark')
   - ปุ่ม Toggle จริงจะถูกสร้างในหน้า Edit Profile ภายหลัง โดยเรียกใช้
     toggleTheme() ที่เตรียมไว้ตรงนี้ได้เลย เช่น:
       toggleThemeBtn.addEventListener('click', toggleTheme);
   ============================================================================== */

/** ตั้งค่าธีมและบันทึกลง localStorage
 * @param {'light'|'dark'} theme
 */
function setTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark-theme', isDark);
    try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {
        // localStorage อาจใช้ไม่ได้ (เช่น เปิดไฟล์ตรงๆ ผ่าน file:// หรือโหมด Private Browsing)
        // ธีมยังคงสลับได้ตามปกติ เพียงแค่จะไม่ถูกจำไว้ข้ามเซสชัน
    }
}

/** สลับธีมปัจจุบัน (Light <-> Dark) */
function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark-theme');
    setTheme(isDark ? 'light' : 'dark');
}

/** อ่านค่าธีมที่บันทึกไว้ตอนโหลดหน้า (สำรอง — ค่าหลักถูกตั้งไว้ล่วงหน้าใน <head> ของ index.html แล้ว เพื่อลดการกระพริบของหน้าจอ)
 *  สำคัญ: ต้องครอบ try/catch เสมอ — ถ้า localStorage โยน error (เช่นเปิดผ่าน file://)
 *  แล้วไม่ครอบไว้ จะทำให้โค้ดที่รันต่อจากนี้ใน DOMContentLoaded (renderBMIGauge ฯลฯ) หยุดทำงานไปด้วย
 */
function initTheme() {
    try {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            document.documentElement.classList.add('dark-theme');
        }
    } catch (e) {
        // ใช้ Light Mode (ค่า default ของ :root) ต่อไปได้ตามปกติ
    }
}

/* ==============================================================================
   BMI GAUGE — SVG arc + เข็ม คำนวณจากสมการเดียวกัน (single source of truth)
   ------------------------------------------------------------------------------
   ระบบพิกัด: มุม -90deg = ซ้ายสุดของเกจ, 0deg = กึ่งกลางบนสุด, +90deg = ขวาสุด
   (ตรงกับทิศทางของ CSS `rotate()` ที่ใช้หมุนเข็ม จึงใช้สูตรเดียวกันได้ทั้งคู่)

   เดิมพาธสี 4 เส้นถูกวาดมือ (hardcode พิกัด SVG) แยกจากสูตรคำนวณองศาของเข็ม
   ทำให้เข็มกับรอยต่อสีอาจไม่ตรงกันเป๊ะ — ตอนนี้ทั้งสองส่วนอ่านค่าจาก
   BMI_GAUGE_SEGMENTS และ bmiToGaugeAngle() ชุดเดียวกันเสมอ ปรับเกณฑ์ BMI
   ที่เดียวก็พอ ไม่ต้องแก้พิกัด SVG เองอีกต่อไป
   ============================================================================== */

const BMI_GAUGE = {
    cx: 100,      // จุดศูนย์กลางแกน X ของเกจ (ตาม viewBox="0 0 200 110")
    cy: 100,      // จุดศูนย์กลางแกน Y ของเกจ
    r: 80,        // รัศมีเกจ
    strokeWidth: 14,
    gapDeg: 3     // ช่องว่างระหว่างแต่ละแท่งสี (องศา) ให้ดูเป็นเซกเมนต์แยกกันสวยงาม
};

// เกณฑ์ BMI แต่ละช่วง แบ่งเท่าๆ กันช่วงละ 45deg บนครึ่งวงกลม (-90 ถึง 90)
const BMI_GAUGE_SEGMENTS = [
    { label: 'ผอม', angleStart: -90, angleEnd: -45, color: '#3B82F6' },
    { label: 'ปกติ', angleStart: -45, angleEnd: 0, color: '#10B981' },
    { label: 'ท้วม', angleStart: 0, angleEnd: 45, color: '#F59E0B' },
    { label: 'อ้วน', angleStart: 45, angleEnd: 90, color: '#EF4444' }
];

/** แปลงมุม (องศา, 0 = บน, ตามทิศ CSS rotate) เป็นพิกัด x,y บนวงกลมเกจ */
function bmiGaugePoint(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: BMI_GAUGE.cx + BMI_GAUGE.r * Math.sin(rad),
        y: BMI_GAUGE.cy - BMI_GAUGE.r * Math.cos(rad)
    };
}

/** สร้างสตริง path ของส่วนโค้ง (arc) ระหว่างมุมเริ่มและมุมจบ */
function describeBmiArc(angleStart, angleEnd) {
    const start = bmiGaugePoint(angleStart);
    const end = bmiGaugePoint(angleEnd);
    const largeArcFlag = angleEnd - angleStart > 180 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${BMI_GAUGE.r} ${BMI_GAUGE.r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

/** คำนวณองศาของเข็มจากค่า BMI — สูตรเดียวกับที่ใช้แบ่งเซกเมนต์สีด้านบน */
function bmiToGaugeAngle(bmiValue) {
    if (bmiValue < 18.5) {
        const ratio = Math.max(bmiValue, 0) / 18.5;
        return -90 + ratio * 45;
    }
    if (bmiValue <= 22.9) {
        return -45 + ((bmiValue - 18.5) / (22.9 - 18.5)) * 45;
    }
    if (bmiValue <= 24.9) {
        return ((bmiValue - 23.0) / (24.9 - 23.0)) * 45;
    }
    const ratio = Math.min((bmiValue - 25.0) / 10, 1);
    return 45 + ratio * 45;
}

/** วาดแท่งสีของเกจ BMI ด้วย SVG path จริง (แทนพิกัดที่วาดมือแบบเดิม) */
function renderBMIGauge() {
    const svg = document.getElementById('bmiGaugeSvg');
    if (!svg) return;

    svg.innerHTML = '';
    const halfGap = BMI_GAUGE.gapDeg / 2;

    BMI_GAUGE_SEGMENTS.forEach((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === BMI_GAUGE_SEGMENTS.length - 1;
        const start = segment.angleStart + (isFirst ? 0 : halfGap);
        const end = segment.angleEnd - (isLast ? 0 : halfGap);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', describeBmiArc(start, end));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', segment.color);
        path.setAttribute('stroke-width', BMI_GAUGE.strokeWidth);
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    });
}

/** หมุนเข็มเกจ BMI ไปยังตำแหน่งที่สอดคล้องกับค่า BMI ปัจจุบัน */
function animateBMIGauge() {
    const bmiValueEl = document.getElementById('bmiValue');
    const needle = document.getElementById('gaugeNeedle');
    if (!needle || !bmiValueEl) return;

    const bmiValue = parseFloat(bmiValueEl.innerText);
    if (isNaN(bmiValue)) return;

    const degrees = bmiToGaugeAngle(bmiValue);

    setTimeout(() => {
        needle.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
    }, 300);
}

/* ==============================================================================
   INFO POPOVER — ปุ่ม ℹ️ ที่หัวการ์ด BMI / พลังงาน
   ------------------------------------------------------------------------------
   คลิกปุ่มเพื่อเปิด/ปิด popover คำอธิบาย, คลิกปุ่มอื่นจะปิดของเดิมก่อนเปิดใหม่
   (เปิดได้ทีละอันเท่านั้น), คลิกนอกพื้นที่หรือกด Esc จะปิดทั้งหมด
   ============================================================================== */
function initInfoPopovers() {
    const wraps = document.querySelectorAll('.info-tooltip-wrap');
    if (!wraps.length) return;

    function closeAll(exceptWrap) {
        wraps.forEach(wrap => {
            if (wrap === exceptWrap) return;
            const btn = wrap.querySelector('.info-icon');
            const pop = wrap.querySelector('.info-popover');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            if (pop) pop.classList.remove('is-open');
        });
    }

    wraps.forEach(wrap => {
        const btn = wrap.querySelector('.info-icon');
        const pop = wrap.querySelector('.info-popover');
        if (!btn || !pop) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // กันไม่ให้ click bubble ไปโดน document listener แล้วปิดตัวเองทันที
            const willOpen = !pop.classList.contains('is-open');
            closeAll(wrap);
            pop.classList.toggle('is-open', willOpen);
            btn.setAttribute('aria-expanded', String(willOpen));
        });
    });

    // คลิกที่ไหนก็ได้นอก popover ให้ปิดทั้งหมด
    document.addEventListener('click', () => closeAll());
    // กด Esc ปิดทั้งหมด (accessibility)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAll();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderBMIGauge();
    animateBMIGauge();
    initInfoPopovers();
    initGeckoWalker();
});

/* ==============================================================================
   GECKO MASCOT WALKER — ระบบเดินวนรอบการ์ด 2x2 + ท่าทางตอนแวะแต่ละการ์ด
   ------------------------------------------------------------------------------
   หลักการทำงาน:
     1. วัดตำแหน่งจริงของการ์ดทั้ง 4 ใบ (getBoundingClientRect) เทียบกับเวที
     2. สร้าง "เส้นทางเดิน" (route) เป็นลิสต์จุดหมาย โดยบางจุดมีคำสั่ง stop
        (ให้หยุดทำท่า) และบางจุดมีคำสั่ง wrap (เดินทะลุขอบไปโผล่อีกฝั่ง)
     3. เดินด้วย requestAnimationFrame — คำนวณระยะจาก deltaTime ทำให้ลื่นไหล
        และความเร็วคงที่เท่ากันทุกเครื่อง ไม่ว่าจอจะ 60Hz หรือ 120Hz
     4. ระหว่างเดินจะหย่อน "รอยเท้า" เป็นระยะ แล้วให้ CSS จางหายไปเอง

   >>> ปรับแต่งได้ที่ GECKO_CONFIG ด้านล่าง <<<
   ============================================================================== */

const GECKO_CONFIG = {
    speed: 46,            // ความเร็วเดิน (พิกเซล/วินาที) — เพิ่มค่าให้เดินเร็วขึ้น
    pauseAtCard: 2600,    // เวลาหยุดทำท่าที่การ์ดแต่ละใบ (มิลลิวินาที)
    footprintGap: 22,     // ระยะห่างระหว่างรอยเท้าแต่ละรอย (พิกเซล)
    footprintLife: 2400,  // อายุรอยเท้าก่อนจางหาย (มิลลิวินาที)
    arriveThreshold: 1.5, // ระยะที่ถือว่า "ถึงจุดหมายแล้ว" (พิกเซล)
    respectReducedMotion: true  // true = ถ้าเครื่องผู้ใช้ปิด Animation effects จะให้กิ้งก่ายืนนิ่ง
                                 // ตั้งเป็น false ชั่วคราวเวลา dev/เดโม่ เพื่อบังคับให้เดินเสมอ
};

// ท่าทาง + ข้อความ + สีรอยเท้า ของการ์ดแต่ละใบ
const GECKO_CARD_ACTIONS = {
    gender:  { pose: 'pose-flex',    bubble: 'แข็งแรง! 💪',  color: '#A855F7' },
    age:     { pose: 'pose-cool',    bubble: 'ยังเด็กอยู่ 😎', color: '#3B82F6' },
    height:  { pose: 'pose-stretch', bubble: 'ยืดตัวหน่อย!',  color: '#10B981' },
    weight:  { pose: 'pose-weigh',   bubble: 'โอ้โห! ⚖️',     color: '#F97316' }
};

const ALL_POSE_CLASSES = Object.values(GECKO_CARD_ACTIONS).map(a => a.pose);

/** ตรวจว่าผู้ใช้เปิด "ลดการเคลื่อนไหว" ไว้หรือไม่
 *  ครอบ try/catch เผื่อสภาพแวดล้อมที่ไม่มี matchMedia จะได้ไม่ทำให้โค้ดทั้งก้อนพัง */
function prefersReducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
        return false;
    }
}

class GeckoWalker {
    constructor(stage, gecko, footprintLayer) {
        this.stage = stage;
        this.gecko = gecko;
        this.footprintLayer = footprintLayer;
        this.bubble = gecko.querySelector('.g-bubble');

        this.geckoW = 58;   // ต้องตรงกับ .gecko ใน style.css
        this.geckoH = 74;

        this.route = [];
        this.routeIndex = 0;
        this.pos = { x: 0, y: 0 };
        this.isPaused = false;
        this.lastFrame = 0;
        this.distanceSinceFootprint = 0;
        this.footStep = 0;   // สลับซ้าย/ขวาของรอยเท้า
        this.pauseTimer = null;

        this.buildRoute();
        if (this.route.length) {
            this.pos = { ...this.route[0] };
            this.routeIndex = 1 % this.route.length;
            this.applyPosition();
        }
    }

    /* ---- แปลงจุด "ที่เท้าเหยียบ" เป็นพิกัด transform ของ element ----
       หมายเหตุ: y ถูกลบด้วยความสูงตัวกิ้งก่า (เพราะจุดอ้างอิงคือ "เท้า" ไม่ใช่มุมบนซ้าย)
       ถ้าเลนอยู่สูงกว่าความสูงตัว กิ้งก่าจะทะลุออกนอกเวทีด้านบน จึงต้อง clamp เสมอ
       ยกเว้นจุด wrap ที่ตั้งใจให้เดินออกนอกจอ (ส่ง allowOutside = true) */
    toElementXY(footX, footY, allowOutside = false) {
        let x = footX - this.geckoW / 2;
        let y = footY - this.geckoH;

        if (!allowOutside) {
            const maxX = Math.max(this.stageW - this.geckoW - 2, 2);
            const maxY = Math.max(this.stageH - this.geckoH - 2, 2);
            x = Math.min(Math.max(x, 2), maxX);
            y = Math.min(Math.max(y, 2), maxY);
        }
        return { x, y };
    }

    /* ---- สร้างเส้นทางเดินจากตำแหน่งจริงของการ์ด ---- */
    buildRoute() {
        const stageRect = this.stage.getBoundingClientRect();
        // เก็บขนาดเวทีไว้ให้ toElementXY ใช้ clamp ไม่ให้กิ้งก่าหลุดออกนอกกรอบ
        this.stageW = stageRect.width;
        this.stageH = stageRect.height;
        const cards = {};
        this.stage.querySelectorAll('.stat-card[data-card]').forEach(card => {
            const r = card.getBoundingClientRect();
            cards[card.dataset.card] = {
                el: card,
                left: r.left - stageRect.left,
                right: r.right - stageRect.left,
                top: r.top - stageRect.top,
                bottom: r.bottom - stageRect.top,
                midY: r.top - stageRect.top + r.height / 2,
                midX: r.left - stageRect.left + r.width / 2
            };
        });

        if (!cards.gender || !cards.age || !cards.height || !cards.weight) {
            this.route = [];
            return;
        }

        const w = stageRect.width;
        const pad = 20;                              // ระยะห่างจากขอบการ์ด
        const midLane = (cards.gender.bottom + cards.height.top) / 2;   // ทางเดินกลาง (แนวนอน)
        const botLane = cards.height.bottom + 16;
        const leftLane = Math.max(cards.gender.left - pad, 16);
        const rightLane = Math.min(cards.age.right + pad, w - 16);
        const topRowY = cards.gender.midY;            // แถวบน (เพศ/อายุ) อยู่กึ่งกลางแนวเดียวกัน

        /* เส้นทาง: เริ่มซ้ายบน → แวะเพศ → เดินทะลุขอบซ้าย (wrap) ไปโผล่ขวา → แวะอายุ (ขวาบน)
           → ลงทางขวา → แวะน้ำหนัก → เดินทะลุขอบขวา (wrap) ไปโผล่ซ้าย
           → แวะส่วนสูง → กลับขึ้นไปเริ่มใหม่ */
        // extra.wrapTo = จุดที่ตั้งใจให้เดินออกนอกจอ จึงไม่ต้อง clamp
        const p = (x, y, extra = {}) =>
            Object.assign({ ...this.toElementXY(x, y, typeof extra.wrapTo === 'number') }, extra);

        this.route = [
            p(leftLane, topRowY, { stop: 'gender' }),
            // เดินออกนอกขอบซ้าย แล้วไปโผล่ที่ขอบขวา (screen wrapping)
            p(-this.geckoW, topRowY, { wrapTo: w + this.geckoW }),
            p(rightLane, topRowY, { stop: 'age' }),
            p(rightLane, midLane),
            p(rightLane, cards.weight.midY, { stop: 'weight' }),
            p(rightLane, botLane),
            // เดินออกนอกขอบขวา แล้วไปโผล่ที่ขอบซ้าย (screen wrapping)
            p(w + this.geckoW, botLane, { wrapTo: -this.geckoW }),
            p(cards.height.left - 4, botLane),
            p(leftLane, cards.height.midY, { stop: 'height' }),
            p(leftLane, midLane)
        ];
    }

    applyPosition() {
        this.gecko.style.transform = `translate3d(${this.pos.x.toFixed(1)}px, ${this.pos.y.toFixed(1)}px, 0)`;
    }

    /* ---- หย่อนรอยเท้าหนึ่งรอย ---- */
    dropFootprint(color) {
        if (prefersReducedMotion()) return;

        const print = document.createElement('span');
        print.className = 'footprint';
        // สลับซ้าย/ขวาเล็กน้อย ให้ดูเหมือนรอยเท้าสองข้างจริงๆ
        const sideOffset = (this.footStep % 2 === 0) ? -5 : 5;
        this.footStep++;

        print.style.left = `${this.pos.x + this.geckoW / 2 + sideOffset}px`;
        print.style.top = `${this.pos.y + this.geckoH - 6}px`;
        print.style.color = color || '#8A93A8';
        print.style.setProperty('--footprint-life', `${GECKO_CONFIG.footprintLife}ms`);

        this.footprintLayer.appendChild(print);
        setTimeout(() => print.remove(), GECKO_CONFIG.footprintLife);
    }

    /* ---- สีของรอยเท้า อิงจากการ์ดที่กำลังจะไปแวะ ---- */
    currentTrailColor() {
        for (let i = this.routeIndex; i < this.routeIndex + this.route.length; i++) {
            const node = this.route[i % this.route.length];
            if (node.stop) return GECKO_CARD_ACTIONS[node.stop].color;
        }
        return '#8A93A8';
    }

    /* ---- หยุดทำท่าที่การ์ด ---- */
    stopAtCard(cardKey) {
        const action = GECKO_CARD_ACTIONS[cardKey];
        if (!action) return;

        const card = this.stage.querySelector(`.stat-card[data-card="${cardKey}"]`);
        this.isPaused = true;

        this.gecko.classList.remove('is-walking');
        this.gecko.classList.add(action.pose);
        if (card) card.classList.add('is-visited');

        if (this.bubble) {
            this.bubble.textContent = action.bubble;
            this.bubble.classList.add('is-visible');
        }

        this.pauseTimer = setTimeout(() => {
            this.gecko.classList.remove(...ALL_POSE_CLASSES);
            this.gecko.classList.add('is-walking');
            if (card) card.classList.remove('is-visited');
            if (this.bubble) this.bubble.classList.remove('is-visible');
            this.isPaused = false;
        }, GECKO_CONFIG.pauseAtCard);
    }

    /* ---- ลูปหลัก: เดินเข้าหาจุดหมายทีละเฟรม ---- */
    tick(timestamp) {
        if (!this.lastFrame) this.lastFrame = timestamp;
        // จำกัด dt ไม่ให้กระโดด (เช่นตอนสลับแท็บกลับมา)
        const dt = Math.min((timestamp - this.lastFrame) / 1000, 0.05);
        this.lastFrame = timestamp;

        if (this.isPaused || !this.route.length) return;

        const target = this.route[this.routeIndex];
        const dx = target.x - this.pos.x;
        const dy = target.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        // หันหน้าตามทิศที่เดิน (เฉพาะตอนขยับแนวนอนพอสมควร)
        if (Math.abs(dx) > 2) {
            this.gecko.classList.toggle('facing-left', dx < 0);
        }

        if (dist <= GECKO_CONFIG.arriveThreshold) {
            this.pos.x = target.x;
            this.pos.y = target.y;
            this.applyPosition();

            // ทะลุขอบจอ → ไปโผล่อีกฝั่ง
            if (typeof target.wrapTo === 'number') {
                this.gecko.classList.add('is-hidden');
                setTimeout(() => {
                    this.pos.x = target.wrapTo;
                    this.applyPosition();
                    this.gecko.classList.remove('is-hidden');
                }, 180);
            }

            if (target.stop) this.stopAtCard(target.stop);

            this.routeIndex = (this.routeIndex + 1) % this.route.length;
            return;
        }

        const step = Math.min(GECKO_CONFIG.speed * dt, dist);
        this.pos.x += (dx / dist) * step;
        this.pos.y += (dy / dist) * step;
        this.applyPosition();

        // หย่อนรอยเท้าเมื่อเดินครบระยะที่กำหนด
        this.distanceSinceFootprint += step;
        if (this.distanceSinceFootprint >= GECKO_CONFIG.footprintGap) {
            this.distanceSinceFootprint = 0;
            this.dropFootprint(this.currentTrailColor());
        }
    }

    start() {
        this.gecko.classList.add('is-walking');
        const loop = (t) => {
            this.tick(t);
            this._raf = requestAnimationFrame(loop);
        };
        this._raf = requestAnimationFrame(loop);
    }

    stop() {
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this.pauseTimer) clearTimeout(this.pauseTimer);
        this.gecko.classList.remove('is-walking');
    }

    /* ---- เรียกเมื่อขนาดจอเปลี่ยน: คำนวณเส้นทางใหม่ ---- */
    recalculate() {
        const wasIndex = this.routeIndex;
        this.buildRoute();
        this.routeIndex = Math.min(wasIndex, Math.max(this.route.length - 1, 0));
        this.footprintLayer.innerHTML = '';
    }
}

/** สลับโมเดลกิ้งก่าตามเพศของผู้ใช้ ('ชาย' | 'หญิง' | 'male' | 'female')
 *  ตัวเมียจะมีเสื้อ กระโปรงสีส้มปะการัง และขนตา ตามภาพอ้างอิง */
function setGeckoGender(gender) {
    const gecko = document.getElementById('gecko');
    if (!gecko) return;
    const isFemale = ['หญิง', 'female', 'f', '2'].includes(String(gender).trim().toLowerCase());
    gecko.classList.toggle('female', isFemale);
    gecko.classList.toggle('male', !isFemale);
}

/** อ่านเพศจากการ์ด "เพศ" บนหน้าจอ แล้วตั้งค่าโมเดลให้ตรงกัน
 *  (เมื่อเชื่อม API จริงแล้ว ให้เรียก setGeckoGender(ค่าจากฐานข้อมูล) แทน) */
function initGeckoGenderFromUI() {
    const el = document.getElementById('statGender');
    setGeckoGender(el ? el.textContent : 'ชาย');
}

function initGeckoWalker() {
    const stage = document.getElementById('mascotStage');
    const gecko = document.getElementById('gecko');
    const layer = document.getElementById('footprintLayer');
    if (!stage || !gecko || !layer) return;

    initGeckoGenderFromUI();

    const walker = new GeckoWalker(stage, gecko, layer);
    // เผื่อเรียกใช้/ดีบักจาก console — ต้องตั้งค่านี้ "ก่อน" เช็ค reduced-motion เสมอ
    // (บั๊กเดิม: เคยตั้งไว้บรรทัดสุดท้ายของฟังก์ชัน ทำให้ตอน reduced-motion เป็น true
    //  โค้ด return ออกไปก่อนถึงบรรทัดนั้น window.geckoWalker เลยกลายเป็น undefined)
    window.geckoWalker = walker;

    // เคารพ prefers-reduced-motion: ให้ยืนนิ่งข้างการ์ดเพศ ไม่เดินวน
    // (ปิดพฤติกรรมนี้ชั่วคราวได้ด้วย GECKO_CONFIG.respectReducedMotion = false)
    if (GECKO_CONFIG.respectReducedMotion && prefersReducedMotion()) return;

    walker.start();

    // คำนวณเส้นทางใหม่เมื่อจอเปลี่ยนขนาด (debounce กันคำนวณถี่เกินไป)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => walker.recalculate(), 200);
    });

    // หยุดลูปเมื่อผู้ใช้สลับแท็บออกไป (ประหยัดแบตเตอรี่)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            walker.stop();
        } else {
            walker.lastFrame = 0;
            walker.start();
        }
    });
}