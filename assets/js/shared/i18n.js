/**
 * i18n.js — เอนจินภาษากลาง (ไทย/อังกฤษ) ใช้ร่วมกันทุกหน้า
 * อ่าน/เขียน localStorage key 'lang' เดียวกับที่ profile.js ใช้อยู่แล้ว
 * เพื่อให้ตั้งค่าภาษาที่หน้าโปรไฟล์แล้วมีผลกับทุกหน้าในแอป
 *
 * วิธีใช้ในแต่ละหน้า:
 *   const PAGE_I18N = { th: { 'key': 'ข้อความ' }, en: { 'key': 'text' } };
 *   document.addEventListener('DOMContentLoaded', () => I18N.apply(PAGE_I18N));
 *   ใน HTML: <span data-i18n="key">ข้อความ</span>
 *   ข้อความ dynamic ใน JS: I18N.t(PAGE_I18N, 'key')
 */
window.I18N = (function () {
    function getLang() {
        try { return localStorage.getItem('lang') || 'th'; } catch (e) { return 'th'; }
    }

    function setLang(lang) {
        try { localStorage.setItem('lang', lang); } catch (e) { /* localStorage ใช้ไม่ได้ — ข้ามไป */ }
    }

    function t(dict, key) {
        const d = dict[getLang()] || dict.th;
        return d[key] !== undefined ? d[key] : (dict.th[key] || key);
    }

    function apply(dict) {
        const d = dict[getLang()] || dict.th;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (el.dataset.i18nLock === '1') return; // ข้อความที่ JS คุมสถานะเองอยู่ (เช่น ปุ่ม success ชั่วคราว)
            if (typeof d[key] === 'string') el.textContent = d[key];
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (typeof d[key] === 'string') el.placeholder = d[key];
        });

        document.documentElement.lang = getLang() === 'en' ? 'en' : 'th';
    }

    return { getLang, setLang, t, apply };
})();
