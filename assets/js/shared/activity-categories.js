/* ==============================================================================
   ACTIVITY CATEGORIES — ประเภทกิจกรรม (activity_master.act_category) และระดับการใช้แรง (act_intensity)
   ใช้ร่วมกันหน้าบันทึกกิจกรรม (จัดกลุ่มในฟอร์มเพิ่มรายการ / สีตามการใช้แรง) และหน้าแอดมิน (เลือกตอนเพิ่ม/แก้กิจกรรม)
   รหัสตรงกับ backend: models.ActCategory* (1=คาร์ดิโอ 2=ฟิตเนส 3=กีฬา 4=กิจวัตรประจำวัน 5=อื่นๆ)
   และ models.ActIntensity* (1=เบา 2=ปานกลาง 3=หนัก 4=หนักมาก)
   โหลดหลัง i18n.js (ใช้ I18N.getLang() ตอนเรียก label)
   ============================================================================== */
(function (global) {
    'use strict';

    var LIST = [
        { id: 1, th: 'คาร์ดิโอ', en: 'Cardio' },
        { id: 2, th: 'ฟิตเนส', en: 'Fitness' },
        { id: 3, th: 'กีฬา', en: 'Sports' },
        { id: 4, th: 'กิจวัตรประจำวัน', en: 'Daily life' },
        { id: 5, th: 'อื่นๆ', en: 'Other' }
    ];
    var DEFAULT_ID = 5;

    /** รหัสที่ไม่รู้จัก (หรือ API รุ่นเก่าที่ยังไม่ส่ง act_category) ตกไปกลุ่ม "อื่นๆ" */
    function normalize(id) {
        var n = Number(id);
        return LIST.some(function (c) { return c.id === n; }) ? n : DEFAULT_ID;
    }

    function label(id) {
        var lang = (global.I18N && global.I18N.getLang && global.I18N.getLang() === 'en') ? 'en' : 'th';
        var n = normalize(id);
        return LIST.filter(function (c) { return c.id === n; })[0][lang];
    }

    global.SoyDeeActivityCategories = { list: LIST, defaultId: DEFAULT_ID, normalize: normalize, label: label };

    // ระดับการใช้แรง: color = ชื่อ CSS token ของสีระดับนั้น (เขียว→เหลือง→ส้ม→แดง ยิ่งหนักยิ่งร้อน)
    var LEVELS = [
        { id: 1, th: 'เบา', en: 'Light', color: '--color-green' },
        { id: 2, th: 'ปานกลาง', en: 'Moderate', color: '--color-yellow' },
        { id: 3, th: 'หนัก', en: 'Vigorous', color: '--color-orange' },
        { id: 4, th: 'หนักมาก', en: 'Max effort', color: '--color-red' }
    ];
    var DEFAULT_LEVEL = 2;

    /** รหัสที่ไม่รู้จัก (หรือ API รุ่นเก่าที่ยังไม่ส่ง act_intensity) ตกไประดับ "ปานกลาง" */
    function normalizeLevel(id) {
        var n = Number(id);
        return LEVELS.some(function (l) { return l.id === n; }) ? n : DEFAULT_LEVEL;
    }

    function levelLabel(id) {
        var lang = (global.I18N && global.I18N.getLang && global.I18N.getLang() === 'en') ? 'en' : 'th';
        var n = normalizeLevel(id);
        return LEVELS.filter(function (l) { return l.id === n; })[0][lang];
    }

    global.SoyDeeActivityIntensity = { list: LEVELS, defaultId: DEFAULT_LEVEL, normalize: normalizeLevel, label: levelLabel };
})(window);
