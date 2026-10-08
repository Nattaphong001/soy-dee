import { ACTIVITY_I18N } from './i18n.js';
import { ENGLISH_MONTHS_SHORT, THAI_MONTHS_SHORT } from './state.js';

/* ==============================================================================
   2. Helpers
   ============================================================================== */
export function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function isToday(d) {
    return dateKey(d) === dateKey(new Date());
}

export function formatThaiDate(d) {
    if (I18N.getLang() === 'en') {
        return `${d.getDate()} ${ENGLISH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }
    const buddhistYear = d.getFullYear() + 543;
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${buddhistYear}`;
}

export function formatDuration(totalMinutes) {
    const total = totalMinutes || 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    const hUnit = I18N.t(ACTIVITY_I18N, 'unit-hour');
    const mUnit = I18N.t(ACTIVITY_I18N, 'unit-minute');
    if (h > 0 && m > 0) return `${h} ${hUnit} ${m} ${mUnit}`;
    if (h > 0) return `${h} ${hUnit}`;
    return `${m} ${mUnit}`;
}

// ระยะทาง (กม.): ตัดศูนย์ท้ายทศนิยม 5.50 -> "5.5", 5 -> "5"
export function formatDistance(km) {
    return `${parseFloat(Number(km).toFixed(2))} ${I18N.t(ACTIVITY_I18N, 'unit-km')}`;
}

// เพซเฉลี่ย (นาที/กม.) รูปแบบ m:ss จากเวลารวมและระยะทางของรายการ
export function formatPace(minutes, km) {
    const totalSec = Math.round((minutes * 60) / km);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')} ${I18N.t(ACTIVITY_I18N, 'unit-pace')}`;
}

export function hasDistance(act) {
    return !!(act && act.act_has_distance);
}

// dact_created_at เป็น datetime เต็ม ("YYYY-MM-DD HH:mm:ss") -> แสดงเฉพาะ HH:mm
export function timeLabel(dateTimeStr) {
    if (!dateTimeStr) return '';
    const d = new Date(String(dateTimeStr).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(dateTimeStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML.replace(/"/g, '&quot;');
}

export function tpl(key, vars) {
    return Object.keys(vars || {}).reduce(
        (s, k) => s.replace(`{${k}}`, vars[k]),
        I18N.t(ACTIVITY_I18N, key)
    );
}

// ไอคอนตามชื่อกิจกรรม (จับ keyword ตามลำดับ — ตัวที่เฉพาะกว่าต้องมาก่อน เช่น "เดินขึ้นบันได" ก่อน "เดิน")
const ACTIVITY_ICON_RULES = [
    [/บันได|stair/i, 'stairs'],
    [/แอโรบิก|เต้น|aerobic|dance/i, 'music'],
    [/ว่าย|swim/i, 'swim'],
    [/โยคะ|yoga/i, 'yoga'],
    [/เวท|ยกน้ำหนัก|weight|gym|ออกกำลัง|workout/i, 'muscle'],
    [/กีฬา|ฟุตบอล|บาส|แบด|sport|ball/i, 'ball'],
    [/เชือก|rope/i, 'heartbeat'],
    [/สวน|garden/i, 'plant'],
    [/บ้าน|ทำความสะอาด|house|clean/i, 'broom'],
    [/เดิน|walk/i, 'walk'],
    [/วิ่ง|run|jog/i, 'run']
];

function activityIconName(act) {
    const name = act && act.act_name ? act.act_name : '';
    const hit = ACTIVITY_ICON_RULES.find(rule => rule[0].test(name));
    return hit ? hit[1] : 'run';
}

// สร้าง markup ไอคอน: มีรูปจริงใช้รูป (พร้อม fallback ไอคอนเมื่อโหลดรูปพัง), ไม่มีรูปใช้ไอคอนตามชื่อกิจกรรม
export function activityIconMarkup(act) {
    const img = act && act.act_images ? SoyDeeAPI.assetUrl(act.act_images) : '';
    const icon = activityIconName(act);
    if (!img) return `<i data-icon="${icon}"></i>`;
    return `<img src="${escapeHtml(img)}" alt="" class="icon-img"><i data-icon="${icon}" style="display:none"></i>`;
}
