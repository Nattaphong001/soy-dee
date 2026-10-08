import { loadReport } from './data.js';
import { $, ymd } from './helpers.js';
import { REPORT_I18N } from './i18n.js';
import { TABS, state } from './state.js';
import { initTooltip } from './tooltip.js';

/**
 * report.js — หน้ารายงานของสมาชิก
 * ดึงข้อมูลชุดเดียวจาก GET /members/:id/report?from&to (Go เป็นผู้รวมสถิติทั้งหมด)
 * แล้ววาด: ภาพรวม 4 ตัวเลข + ข้อสังเกตสั้นๆ + แท็บแยกย่อย ร่างกาย/อาหาร/กิจกรรม/การนอน (แท็บละไม่กี่กราฟ)
 * กราฟเป็น CSS/SVG ล้วน (ไม่พึ่งไลบรารี) — ตัวเลขรหัส enum จาก API ถูกแปลเป็นข้อความที่นี่ (i18n)
 * ช่วงยาวเกิน 31 วัน กราฟรายวันจะถูกรวมเป็นรายสัปดาห์ (ทีละ 7 วัน) ให้แท่งไม่เล็กเกินอ่าน
 * หมายเหตุ: ระบบภาษาใช้ window.I18N จาก assets/js/shared/i18n.js
 */

/* ==============================================================================
   10. เริ่มต้นหน้า
   ============================================================================== */
function setRangeMode(mode) {
    state.rangeMode = mode;
    document.querySelectorAll('.range-chip').forEach(c => c.setAttribute('aria-checked', String(c.dataset.range === mode)));
    $('rangeCustom').hidden = mode !== 'custom';
    if (mode !== 'custom') loadReport();
}

function setTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.report-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
    });
    TABS.forEach(k => { $('panel-' + k).hidden = k !== tab; });
}

document.addEventListener('DOMContentLoaded', () => {
    I18N.apply(REPORT_I18N);
    state.mbId = SoyDeeAPI.session.getUserId();

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
    if (TABS.includes(hashTab)) state.activeTab = hashTab;
    setTab(state.activeTab);
    loadReport();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back) — โหลดใหม่ให้ตรงกับบันทึกล่าสุด
    window.addEventListener('pageshow', (e) => { if (e.persisted) loadReport(); });
});
