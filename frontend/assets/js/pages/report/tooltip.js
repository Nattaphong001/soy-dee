import { $, escapeHtml } from './helpers.js';

/* ==============================================================================
   9. Tooltip กลาง (hover เมาส์ / แตะบนจอสัมผัส)
   ============================================================================== */
export function initTooltip() {
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
