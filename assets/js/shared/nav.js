/**
 * nav.js — Reusable bottom pill navigation.
 * Markup is static HTML in every page (see #app-nav-bar), NOT built by this
 * script. It must exist in the raw HTML from first paint so the browser can
 * match it by view-transition-name across page navigations — building it
 * from JS on DOMContentLoaded made the cross-page morph unreliable/janky
 * because the named elements didn't exist yet when the browser captured the
 * "new page" snapshot for the transition.
 */
(function () {
    // ระยะเวลาที่ต้องรอให้แอนิเมชันเลื่อนแถบไฮไลต์เล่นจบก่อนค่อยเปลี่ยนหน้าจริง
    // ต้องสอดคล้องกับ transition ของ .nav-indicator ใน nav.css (0.35s)
    const NAV_TRAVEL_MS = 350;

    // เดาแบบคร่าวๆ ว่าเบราว์เซอร์รองรับ Cross-Document View Transitions หรือไม่
    // (ถ้ารองรับ เบราว์เซอร์จะจัดการ morph หน้าเก่า→หน้าใหม่ให้เองแบบ native
    //  จึงไม่จำเป็นต้องหน่วงเวลาด้วย JS ก่อนเปลี่ยนหน้าอีก)
    const supportsViewTransitions = 'startViewTransition' in document;

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function moveIndicator(indicator, item) {
        // left ไม่ใช่ transform — ให้ตรงกับ property ที่ nav.css ใช้ (ดูคอมเมนต์ใน nav.css)
        // จะได้ไม่มี transform ค้างมาทับ/ชนกับตำแหน่งพักที่ CSS ตั้งไว้ล่วงหน้า
        indicator.style.width = `${item.offsetWidth}px`;
        indicator.style.left = `${item.offsetLeft}px`;
    }

    // ใช้ตอนวางตำแหน่งครั้งแรกของหน้าเท่านั้น — ปิด transition ชั่วคราวแล้วค่อยเปิดกลับ
    // เพื่อไม่ให้แถบ "ไหล" จากตำแหน่ง default (home) มาตำแหน่งจริงทุกครั้งที่โหลดหน้าใหม่
    // (ของเดิมมันไหลแบบนี้ทุกครั้ง โดยไม่เกี่ยวกับตำแหน่งที่ผู้ใช้กดมาเลย นั่นคือบั๊ก)
    function placeIndicatorInstantly(indicator, item) {
        indicator.style.transition = 'none';
        moveIndicator(indicator, item);
        // บังคับ reflow 1 ครั้งก่อนคืนค่า transition กลับ ไม่งั้นเบราว์เซอร์อาจรวมสอง
        // การเปลี่ยนแปลงเป็นเฟรมเดียวแล้วยังเห็นมันเลื่อนอยู่ดี
        void indicator.offsetWidth;
        indicator.style.transition = '';
    }

    document.addEventListener('DOMContentLoaded', () => {
        const list = document.getElementById('horizontalNav');
        const indicator = document.getElementById('navIndicator');
        if (!list || !indicator) return;

        const items = list.querySelectorAll('.nav-icon-item');

        const activeItem = list.querySelector('.nav-icon-item.active');
        if (activeItem) {
            // ตำแหน่งเริ่มต้นวางไว้ถูกคร่าวๆ ด้วย CSS (:has selector ใน nav.css)
            // อยู่แล้วตั้งแต่ paint แรก ตรงนี้แค่ปรับให้ตรงพิกเซลเป๊ะด้วย offsetLeft จริง
            requestAnimationFrame(() => placeIndicatorInstantly(indicator, activeItem));
        }
        // ถ้าไม่มีแท็บไหน active (เช่นหน้า Profile) — nav.css ซ่อน indicator ให้เองแล้ว

        items.forEach(item => {
            item.addEventListener('click', function (e) {
                // แท็บที่ปิดไว้ (ยังไม่มีหน้าจริง เช่น รายงาน) — ไม่ทำอะไรเลย
                if (this.classList.contains('is-disabled')) { e.preventDefault(); return; }

                const href = this.getAttribute('href');
                const isAlreadyActive = this.classList.contains('active');

                // กดแท็บที่ "อยู่หน้านั้นอยู่แล้ว" ซ้ำ — ไม่ต้องทำอะไรเลย
                // (กันการรีโหลดหน้าตัวเองโดยไม่จำเป็น ซึ่งเป็นสาเหตุนึงที่รู้สึก "ไม่สมูท")
                if (href && isAlreadyActive) {
                    e.preventDefault();
                    return;
                }

                items.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                indicator.style.opacity = '1';
                moveIndicator(indicator, this);

                if (!href) return; // ปุ่มที่ยังไม่มีหน้าจริงผูกอยู่ (เช่น รอสร้างหน้านั้น)

                // ถ้าเบราว์เซอร์รองรับ View Transitions อยู่แล้ว ปล่อยให้เบราว์เซอร์
                // จัดการ morph แถบนี้ข้ามหน้าให้เองแบบ native ไม่ต้อง delay ด้วย JS
                if (supportsViewTransitions || prefersReducedMotion()) return;

                // เบราว์เซอร์อื่นที่ยังไม่รองรับ: กันไว้ก่อนไม่ให้กระโดดออกจากหน้าทันที
                // รอให้แอนิเมชันเลื่อนแถบเล่นจบสักครู่นึงก่อน ค่อยเปลี่ยนหน้าจริง
                e.preventDefault();
                setTimeout(() => { window.location.href = href; }, NAV_TRAVEL_MS);
            });
        });

        window.addEventListener('resize', () => {
            const current = list.querySelector('.nav-icon-item.active');
            if (current) moveIndicator(indicator, current);
        });
    });
})();