/* ==============================================================================
   UI - Welcome (Splash)
   ------------------------------------------------------------------------------
   ใช้ i18n เพื่อแสดงข้อความตามภาษาที่บันทึกไว้ใน localStorage['lang']
   (ตั้งค่าได้จากหน้าโปรไฟล์ — ดู assets/js/pages/profile.js)
   ============================================================================== */
(function () {
    'use strict';

    var WELCOME_I18N = {
        th: {
            'tagline-line1': 'ดูแลสุขภาพในทุกๆ วัน',
            'tagline-line2': 'อย่างเข้าใจตัวเองมากขึ้น',
            'loader-text': 'กำลังเตรียมข้อมูลของคุณ…'
        },
        en: {
            'tagline-line1': 'Take care of your health every day,',
            'tagline-line2': 'with a deeper understanding of yourself',
            'loader-text': 'Preparing your data…'
        }
    };

    // ต้องตรงกับเวลารวมของ CSS animation welcomeLoaderFill (delay 0.3s + duration 2.15s)
    // ดู .welcome-loader-fill ใน assets/css/pages/auth.css
    var REDIRECT_DELAY_MS = 2450;

    document.addEventListener('DOMContentLoaded', function () {
        I18N.apply(WELCOME_I18N);

        window.setTimeout(function () {
            window.location.href = 'login.html';
        }, REDIRECT_DELAY_MS);
    });
})();
