/**
 * activity-record.js — หน้า Daily Activity Record (บันทึกกิจกรรม)
 * เชื่อม API จริง: GET /activities (ตัวเลือก), GET/POST/PUT/DELETE /members/{id}/activity-records
 *
 * โครงหน้าเดียวกับ food-record.js: การ์ดสรุป → รายการ (กดดูรายละเอียด) → FAB เปิด bottom sheet เพิ่ม/แก้ไข
 * หมายเหตุ: showConfirm()/showToast() มาจาก assets/js/shared/app.js
 *           ระบบภาษา (i18n) ใช้ window.I18N จาก assets/js/shared/i18n.js
 */

/* ==============================================================================
   0. ระบบภาษา (i18n) — คำแปลของหน้านี้
   ============================================================================== */
const ACTIVITY_I18N = {
    th: {
        'page-title': 'บันทึกกิจกรรม',
        'page-subtitle': 'จดกิจกรรมที่ทำ แล้วดูเวลารวมของวัน',
        'today-btn': 'วันนี้',
        'summary-title-today': 'สรุปกิจกรรมวันนี้',
        'summary-title-date-template': 'สรุปกิจกรรมวันที่ {date}',
        'summary-total-template': 'ทั้งหมด {count} รายการ',
        'summary-bar-label': 'สัดส่วนเวลาของแต่ละกิจกรรม',
        'stat-label-count': 'กิจกรรม',
        'stat-label-duration': 'เวลารวม',
        'stat-label-distance': 'ระยะทางรวม',
        'insight-goal-reached': 'ครบเป้าหมาย {goal} ต่อวันแล้ว ทำได้ดีมาก',
        'insight-goal-remaining': 'อีก {left} จะครบเป้าหมาย {goal} ต่อวัน',
        'section-heading-today-log': 'บันทึกของวันนี้',
        'items-suffix': 'รายการ',
        'unit-hour': 'ชม',
        'unit-minute': 'นาที',
        'unit-km': 'กม.',
        'unit-km-long': 'กิโลเมตร',
        'unit-pace': '/กม.',
        'empty-state-title': 'ยังไม่มีกิจกรรมในวันนี้',
        'empty-state-desc': 'แตะปุ่ม + เพื่อบันทึกกิจกรรมแรกของวัน',
        'open-item-label': 'ดูรายละเอียด {name}',
        'modal-title-add': 'เพิ่มกิจกรรม',
        'modal-title-edit': 'แก้ไขกิจกรรม',
        'label-choose-activity': 'เลือกกิจกรรม',
        'placeholder-search-activity': 'ค้นหากิจกรรม',
        'aria-filter-category': 'กรองตามประเภท',
        'aria-activity-list': 'กิจกรรม',
        'filter-all': 'ทั้งหมด',
        'empty-activity-search': 'ไม่พบกิจกรรมที่ตรงกับ "{q}"',
        'empty-activity-category': 'ยังไม่มีกิจกรรมในประเภทนี้',
        'label-duration': 'ระยะเวลา',
        'label-hours': 'ชั่วโมง',
        'label-minutes': 'นาที',
        'label-distance': 'ระยะทาง (ถ้ามี)',
        'placeholder-distance': 'เช่น 5.25',
        'label-detail': 'รายละเอียด (ถ้ามี)',
        'detail-placeholder': 'เช่น วิ่งรอบสวนสาธารณะ',
        'btn-cancel': 'ยกเลิก',
        'save-btn': 'บันทึกกิจกรรม',
        'detail-duration': 'ระยะเวลา',
        'detail-share': 'สัดส่วนของวัน',
        'detail-intensity': 'ความหนัก',
        'label-intensity': 'ความหนัก',
        'detail-distance': 'ระยะทาง',
        'detail-pace': 'เพซเฉลี่ย',
        'detail-date': 'วันที่',
        'detail-logged': 'บันทึกเมื่อ',
        'detail-note': 'รายละเอียด',
        'detail-edit': 'แก้ไขรายการ',
        'detail-delete': 'ลบ',
        'err-select-activity': 'กรุณาเลือกกิจกรรม',
        'err-duration-min': 'กรุณาระบุระยะเวลาที่ทำกิจกรรมอย่างน้อย 1 นาที',
        'err-duration-max': 'ระยะเวลารวมต้องไม่เกิน 24 ชั่วโมง',
        'err-distance': 'ระยะทางต้องอยู่ระหว่าง 0.01 – 999.99 กม.',
        'delete-title': 'ลบรายการกิจกรรม',
        'delete-message-template': 'ต้องการลบ "{name}" ({duration}) ออกจากบันทึกใช่หรือไม่?',
        'delete-confirm': 'ลบรายการ',
        'toast-added': 'เพิ่มกิจกรรมแล้ว',
        'toast-updated': 'แก้ไขกิจกรรมแล้ว',
        'toast-deleted': 'ลบกิจกรรมแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่',
        'toast-load-failed': 'โหลดรายการกิจกรรมไม่สำเร็จ กรุณาลองใหม่',
    },
    en: {
        'page-title': 'Activity Record',
        'page-subtitle': 'Log what you did and see your total time for the day',
        'today-btn': 'Today',
        'summary-title-today': "Today's activity summary",
        'summary-title-date-template': 'Activity summary for {date}',
        'summary-total-template': '{count} items in total',
        'summary-bar-label': 'Time share of each activity',
        'stat-label-count': 'Activities',
        'stat-label-duration': 'Total time',
        'stat-label-distance': 'Total distance',
        'insight-goal-reached': "You've reached the {goal} daily goal — well done",
        'insight-goal-remaining': '{left} left to reach the {goal} daily goal',
        'section-heading-today-log': "Today's log",
        'items-suffix': 'items',
        'unit-hour': 'hr',
        'unit-minute': 'min',
        'unit-km': 'km',
        'unit-km-long': 'kilometres',
        'unit-pace': '/km',
        'empty-state-title': 'No activities logged today',
        'empty-state-desc': 'Tap + to log your first activity of the day',
        'open-item-label': 'View details of {name}',
        'modal-title-add': 'Add activity',
        'modal-title-edit': 'Edit activity',
        'label-choose-activity': 'Choose an activity',
        'placeholder-search-activity': 'Search activities',
        'aria-filter-category': 'Filter by category',
        'aria-activity-list': 'Activities',
        'filter-all': 'All',
        'empty-activity-search': 'No activities match "{q}"',
        'empty-activity-category': 'No activities in this category yet',
        'label-duration': 'Duration',
        'label-hours': 'Hours',
        'label-minutes': 'Minutes',
        'label-distance': 'Distance (optional)',
        'placeholder-distance': 'e.g. 5.25',
        'label-detail': 'Details (optional)',
        'detail-placeholder': 'e.g. Jog around the park',
        'btn-cancel': 'Cancel',
        'save-btn': 'Save activity',
        'detail-duration': 'Duration',
        'detail-share': 'Share of the day',
        'detail-intensity': 'Intensity',
        'label-intensity': 'Effort',
        'detail-distance': 'Distance',
        'detail-pace': 'Avg pace',
        'detail-date': 'Date',
        'detail-logged': 'Logged at',
        'detail-note': 'Details',
        'detail-edit': 'Edit entry',
        'detail-delete': 'Delete',
        'err-select-activity': 'Please choose an activity',
        'err-duration-min': 'Please enter a duration of at least 1 minute',
        'err-duration-max': 'Total duration must not exceed 24 hours',
        'err-distance': 'Distance must be between 0.01 and 999.99 km',
        'delete-title': 'Delete activity entry',
        'delete-message-template': 'Delete "{name}" ({duration}) from your log?',
        'delete-confirm': 'Delete',
        'toast-added': 'Activity added',
        'toast-updated': 'Activity updated',
        'toast-deleted': 'Activity deleted',
        'toast-delete-failed': 'Failed to delete — please try again',
        'toast-load-failed': 'Failed to load activity records — please try again',
    }
};

/* ==============================================================================
   1. State
   ============================================================================== */
const DAILY_GOAL_MIN = 30;                      // เป้าหมายกิจกรรมต่อวัน (นาที) ตามคำแนะนำทั่วไป

let selectedDate = startOfDay(new Date());     // วันที่กำลังดู/บันทึก (dact_date)
let mbId = null;
let ACTIVITIES = [];                            // จาก GET /activities
let ACTIVITIES_MAP = {};                        // act_id -> activity
let currentEntries = [];                        // จาก GET /members/{id}/activity-records?date=...
let editingId = null;                           // dact_id ที่กำลังแก้ไข (null = กำลังเพิ่มใหม่)
let selectedActivityId = null;                  // act_id ที่เลือกในฟอร์ม
let activityFilterCat = 'all';                  // ตัวกรองประเภทในฟอร์ม: 'all' หรือ id ประเภท (1-5)
let activityQuery = '';                         // คำค้นหาในฟอร์ม (พิมพ์เล็ก ตัดช่องว่างแล้ว)
let detailId = null;                            // dact_id ที่เปิดดูรายละเอียดอยู่
let detailOpener = null;                        // element ที่กดเปิดรายละเอียด ไว้คืน focus ตอนปิด
let activityDatePicker = null;

// สีประจำกิจกรรมตามระดับการใช้แรง (activity_master.act_intensity): 1 เบา=เขียว 2 ปานกลาง=เหลือง 3 หนัก=ส้ม 4 หนักมาก=แดง
// class .ac-1 … .ac-4 ใน CSS ตั้ง --lc ตามระดับ; API รุ่นเก่าที่ไม่ส่งระดับ ตกไประดับ 2
function levelOf(actId) {
    const act = ACTIVITIES_MAP[actId];
    return SoyDeeActivityIntensity.normalize(act && act.act_intensity);
}
function levelVar(level) {
    return SoyDeeActivityIntensity.list.filter(l => l.id === level)[0].color;
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const ENGLISH_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ==============================================================================
   2. Helpers
   ============================================================================== */
function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function isToday(d) {
    return dateKey(d) === dateKey(new Date());
}

function formatThaiDate(d) {
    if (I18N.getLang() === 'en') {
        return `${d.getDate()} ${ENGLISH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }
    const buddhistYear = d.getFullYear() + 543;
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${buddhistYear}`;
}

function formatDuration(totalMinutes) {
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
function formatDistance(km) {
    return `${parseFloat(Number(km).toFixed(2))} ${I18N.t(ACTIVITY_I18N, 'unit-km')}`;
}

// เพซเฉลี่ย (นาที/กม.) รูปแบบ m:ss จากเวลารวมและระยะทางของรายการ
function formatPace(minutes, km) {
    const totalSec = Math.round((minutes * 60) / km);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')} ${I18N.t(ACTIVITY_I18N, 'unit-pace')}`;
}

function hasDistance(act) {
    return !!(act && act.act_has_distance);
}

// dact_created_at เป็น datetime เต็ม ("YYYY-MM-DD HH:mm:ss") -> แสดงเฉพาะ HH:mm
function timeLabel(dateTimeStr) {
    if (!dateTimeStr) return '';
    const d = new Date(String(dateTimeStr).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(dateTimeStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML.replace(/"/g, '&quot;');
}

function tpl(key, vars) {
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
function activityIconMarkup(act) {
    const img = act && act.act_images ? SoyDeeAPI.assetUrl(act.act_images) : '';
    const icon = activityIconName(act);
    if (!img) return `<i data-icon="${icon}"></i>`;
    return `<img src="${escapeHtml(img)}" alt="" class="icon-img"><i data-icon="${icon}" style="display:none"></i>`;
}

/* ==============================================================================
   3. Data
   ============================================================================== */
async function loadEntries() {
    try {
        currentEntries = (await SoyDeeAPI.request(`/members/${mbId}/activity-records`, { query: { date: dateKey(selectedDate) } })) || [];
    } catch (err) {
        currentEntries = [];
        console.error('load activity records failed', err);
        showToast(I18N.t(ACTIVITY_I18N, 'toast-load-failed'), 'error');
    }
    renderSummary();
    renderLogList();
}

async function changeDate(newDate) {
    selectedDate = startOfDay(newDate);
    renderDate();
    await loadEntries();
}

/* ==============================================================================
   4. Render: วันที่ + การ์ดสรุป
   ============================================================================== */
function renderDate() {
    document.getElementById('dateText').textContent = formatThaiDate(selectedDate);
    // ปุ่ม "วันนี้" แสดงเฉพาะตอนดูวันย้อนหลัง — วันนี้อยู่แล้วไม่ต้องมีปุ่มกลับ
    document.getElementById('todayBtn').hidden = isToday(selectedDate);
    if (activityDatePicker) activityDatePicker.refreshTodayBtn();
}

function summaryTitleText() {
    return isToday(selectedDate)
        ? I18N.t(ACTIVITY_I18N, 'summary-title-today')
        : tpl('summary-title-date-template', { date: formatThaiDate(selectedDate) });
}

// รวมนาทีต่อระดับการใช้แรง เรียงจากเบาไปหนัก — ใช้ทั้งแถบสัดส่วนและ legend
function minutesByLevel() {
    const totals = {};
    currentEntries.forEach(e => { const lv = levelOf(e.act_id); totals[lv] = (totals[lv] || 0) + (e.duration_minutes || 0); });
    return SoyDeeActivityIntensity.list
        .map(l => ({ level: l.id, minutes: totals[l.id] || 0 }))
        .filter(g => g.minutes > 0);
}

function renderSummary() {
    const totalMinutes = currentEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    document.getElementById('summaryTitleText').textContent = summaryTitleText();
    document.getElementById('summaryTotal').textContent = tpl('summary-total-template', { count: currentEntries.length });
    document.getElementById('summaryCount').textContent = currentEntries.length;
    document.getElementById('summaryDuration').textContent = formatDuration(totalMinutes);

    // ระยะทางรวม: แสดงชิปเฉพาะวันที่มีรายการที่บันทึกระยะทางไว้
    const totalKm = currentEntries.reduce((sum, e) => sum + (Number(e.dact_distance_km) || 0), 0);
    document.getElementById('summaryDistanceChip').hidden = totalKm <= 0;
    document.getElementById('summaryDistance').textContent = formatDistance(totalKm);

    // แถบสัดส่วนเวลา — ความกว้างแต่ละช่วงตามจำนวนนาทีของระดับการใช้แรงนั้น
    const groups = minutesByLevel();
    const bar = document.getElementById('summaryBar');
    bar.classList.toggle('is-empty', groups.length === 0);
    bar.innerHTML = groups.map(g =>
        `<span class="bar-seg" style="flex-grow:${g.minutes};background:var(${levelVar(g.level)})"></span>`
    ).join('');

    const legend = document.getElementById('summaryLegend');
    legend.innerHTML = groups.map(g =>
        `<span class="legend-item"><span class="badge-dot" style="background:var(${levelVar(g.level)})"></span>`
        + `<span class="legend-name">${SoyDeeActivityIntensity.label(g.level)}</span><span class="numeric">${formatDuration(g.minutes)}</span></span>`
    ).join('');

    // เป้าหมายรายวัน: ซ่อนตอนยังไม่มีรายการ (เหมือนหน้าอาหาร)
    const insight = document.getElementById('summaryInsight');
    insight.hidden = totalMinutes === 0;
    if (totalMinutes > 0) {
        const goal = formatDuration(DAILY_GOAL_MIN);
        insight.textContent = totalMinutes >= DAILY_GOAL_MIN
            ? tpl('insight-goal-reached', { goal })
            : tpl('insight-goal-remaining', { left: formatDuration(DAILY_GOAL_MIN - totalMinutes), goal });
    }
}

/* ==============================================================================
   5. Render: Log List
   ============================================================================== */
function renderLogItemHtml(entry) {
    const act = ACTIVITIES_MAP[entry.act_id];
    const name = act ? act.act_name : '';
    const label = tpl('open-item-label', { name: escapeHtml(name) });
    const km = Number(entry.dact_distance_km) || 0;
    return `
        <div class="log-item ac-${levelOf(entry.act_id)}" data-open-id="${entry.dact_id}" role="button" tabindex="0" aria-label="${label}">
            <span class="log-thumb">${activityIconMarkup(act)}</span>
            <div class="log-item-info">
                <span class="log-item-name">${escapeHtml(name)}</span>
                <span class="log-item-meta"><span class="numeric">${formatDuration(entry.duration_minutes)}</span>${km > 0 ? ` · <span class="numeric">${formatDistance(km)}</span>` : ''}<span class="log-level"><i class="level-dot" aria-hidden="true"></i>${SoyDeeActivityIntensity.label(levelOf(entry.act_id))}</span></span>
                ${entry.dact_detail ? `<span class="cat-pill">${escapeHtml(entry.dact_detail)}</span>` : ''}
            </div>
            <span class="log-item-time numeric">${timeLabel(entry.dact_created_at)}</span>
            <span class="log-item-chevron" aria-hidden="true"></span>
        </div>
    `;
}

function renderLogList() {
    const list = document.getElementById('logList');
    const badge = document.getElementById('logCountBadge');
    const entries = [...currentEntries].sort((a, b) => String(a.dact_created_at).localeCompare(String(b.dact_created_at)));

    badge.textContent = `${entries.length} ${I18N.t(ACTIVITY_I18N, 'items-suffix')}`;

    if (entries.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon"><i data-icon="note"></i></span>
                <div class="empty-state-title">${I18N.t(ACTIVITY_I18N, 'empty-state-title')}</div>
                <div class="empty-state-desc">${I18N.t(ACTIVITY_I18N, 'empty-state-desc')}</div>
            </div>
        `;
        return;
    }
    list.innerHTML = entries.map(renderLogItemHtml).join('');
}

/* ==============================================================================
   6. Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
function openDetail(id, opener) {
    const entry = currentEntries.find(e => e.dact_id === id);
    if (!entry) return;
    detailId = id;
    detailOpener = opener || null;

    const act = ACTIVITIES_MAP[entry.act_id];
    const totalMinutes = currentEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    document.getElementById('activityDetailCard').className = `detail-card ac-${levelOf(entry.act_id)}`;
    document.getElementById('detailPhotoMedia').innerHTML = activityIconMarkup(act);
    document.getElementById('detailName').textContent = act ? act.act_name : '';
    document.getElementById('detailDuration').textContent = formatDuration(entry.duration_minutes);
    document.getElementById('detailShare').textContent = totalMinutes > 0
        ? `${Math.round((entry.duration_minutes || 0) / totalMinutes * 100)}%` : '—';
    const km = Number(entry.dact_distance_km) || 0;
    document.getElementById('detailDistanceTile').hidden = km <= 0;
    document.getElementById('detailPaceTile').hidden = km <= 0;
    if (km > 0) {
        document.getElementById('detailDistance').textContent = formatDistance(km);
        document.getElementById('detailPace').textContent = formatPace(entry.duration_minutes || 0, km);
    }
    document.getElementById('detailIntensity').innerHTML = `<i class="level-dot" aria-hidden="true"></i>${SoyDeeActivityIntensity.label(levelOf(entry.act_id))}`;
    document.getElementById('detailDate').textContent = formatThaiDate(selectedDate);
    document.getElementById('detailLogged').textContent = timeLabel(entry.dact_created_at) || '—';
    document.getElementById('detailNoteTile').hidden = !entry.dact_detail;
    document.getElementById('detailNote').textContent = entry.dact_detail || '';

    document.getElementById('activityDetailOverlay').classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('detailEditBtn').focus());
}

function closeDetail() {
    document.getElementById('activityDetailOverlay').classList.remove('is-open');
    if (detailOpener && document.contains(detailOpener)) detailOpener.focus();
    detailId = null;
    detailOpener = null;
}

/* ==============================================================================
   7. Modal: เพิ่ม / แก้ไขกิจกรรม (bottom sheet)
   ============================================================================== */
// กิจกรรมที่ตรงกับคำค้น (ชื่อกิจกรรม หรือชื่อประเภท) — ยังไม่กรองตามประเภท
function activitiesMatchingQuery() {
    const cats = SoyDeeActivityCategories;
    if (!activityQuery) return ACTIVITIES;
    return ACTIVITIES.filter(a =>
        String(a.act_name).toLowerCase().includes(activityQuery) ||
        cats.label(cats.normalize(a.act_category)).toLowerCase().includes(activityQuery));
}

// คำอธิบายสีตามระดับการใช้แรง ใต้รายการเลือกกิจกรรม (สร้างครั้งเดียว ภาษาไม่เปลี่ยนกลางหน้า)
function renderIntensityLegend() {
    const el = document.getElementById('activityLegendItems');
    if (!el) return;
    el.innerHTML = SoyDeeActivityIntensity.list.map(l =>
        `<span class="level-key"><i class="level-dot" style="background:var(${l.color})" aria-hidden="true"></i>${SoyDeeActivityIntensity.label(l.id)}</span>`
    ).join('');
}

// แถบกรองประเภท: "ทั้งหมด" + ประเภทที่มีกิจกรรม พร้อมจำนวนที่ตรงกับคำค้นตอนนี้
function renderActivityFilter(matched) {
    const cats = SoyDeeActivityCategories;
    const countOf = id => matched.filter(a => cats.normalize(a.act_category) === id).length;
    const present = cats.list.filter(c => ACTIVITIES.some(a => cats.normalize(a.act_category) === c.id));
    const chip = (key, label, n) => `
        <button type="button" class="filter-chip${String(activityFilterCat) === String(key) ? ' active' : ''}${n === 0 ? ' is-dim' : ''}" data-cat="${key}" aria-pressed="${String(activityFilterCat) === String(key)}">
            <span>${escapeHtml(label)}</span><span class="filter-chip-count numeric">${n}</span>
        </button>`;
    const bar = document.getElementById('activityFilterBar');
    bar.setAttribute('aria-label', I18N.t(ACTIVITY_I18N, 'aria-filter-category'));
    // มีประเภทเดียว = ไม่ต้องกรอง ซ่อนแถบไว้
    bar.hidden = present.length < 2;
    const keepScroll = bar.scrollLeft;   // render ใหม่แล้วไม่ให้แถบเด้งกลับซ้ายสุด
    bar.innerHTML = chip('all', I18N.t(ACTIVITY_I18N, 'filter-all'), matched.length) +
        present.map(c => chip(c.id, cats.label(c.id), countOf(c.id))).join('');
    bar.scrollLeft = keepScroll;
}

// รายการกิจกรรมในฟอร์ม: กรองตามคำค้น + ประเภท แล้วแยกกลุ่มตามประเภท (เรียงตามลำดับประเภท เฉพาะประเภทที่มีรายการ)
function renderActivityGrid() {
    const cats = SoyDeeActivityCategories;
    const list = document.getElementById('activityChipList');
    list.setAttribute('aria-label', I18N.t(ACTIVITY_I18N, 'aria-activity-list'));

    const matched = activitiesMatchingQuery();
    renderActivityFilter(matched);

    const visible = activityFilterCat === 'all' ? matched : matched.filter(a => cats.normalize(a.act_category) === activityFilterCat);
    if (!visible.length) {
        const msg = activityQuery
            ? tpl('empty-activity-search', { q: escapeHtml(document.getElementById('activitySearchInput').value.trim()) })
            : I18N.t(ACTIVITY_I18N, 'empty-activity-category');
        list.innerHTML = `<div class="activity-empty">${msg}</div>`;
        updateActivityGridUI();
        return;
    }

    list.innerHTML = cats.list.map(cat => {
        const items = visible.filter(a => cats.normalize(a.act_category) === cat.id);
        if (!items.length) return '';
        const title = escapeHtml(cats.label(cat.id));
        return `
            <div class="activity-group" role="group" aria-label="${title}">
                <div class="activity-group-head"><span>${title}</span><span class="activity-group-count numeric">${items.length}</span></div>
                <div class="activity-group-grid">
                    ${items.map(act => `
                        <button type="button" class="activity-chip ac-${levelOf(act.act_id)}" role="option" aria-selected="false" data-act-id="${act.act_id}">
                            <span class="activity-chip-icon">${activityIconMarkup(act)}</span>
                            <span class="activity-chip-name">${escapeHtml(act.act_name)}</span>
                        </button>`).join('')}
                </div>
            </div>`;
    }).join('');
    updateActivityGridUI();
}

// เลื่อนรายการในกรอบให้เห็นชิปที่เลือกอยู่ (ใช้ตอนเปิดฟอร์มแก้ไข) — ไม่แตะการเลื่อนของตัวฟอร์ม
function scrollPickedIntoView() {
    const list = document.getElementById('activityChipList');
    const chip = list.querySelector('.activity-chip.active');
    list.scrollTop = chip ? Math.max(0, chip.offsetTop - 40) : 0;
}

function updateActivityGridUI() {
    document.querySelectorAll('#activityChipList .activity-chip').forEach(chip => {
        const on = Number(chip.dataset.actId) === selectedActivityId;
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-selected', String(on));
    });
    // ชื่อกิจกรรมที่เลือกอยู่ข้างหัวข้อ — ยังเห็นได้แม้รายการถูกกรอง/ค้นหาจนชิปนั้นหายไป
    const picked = ACTIVITIES_MAP[selectedActivityId];
    const pickedEl = document.getElementById('activityPicked');
    pickedEl.textContent = picked ? '· ' + picked.act_name : '';
    pickedEl.hidden = !picked;
    // ช่องระยะทางแสดงเฉพาะกิจกรรมที่วัดระยะทางได้ (act_has_distance)
    document.getElementById('distanceField').hidden = !hasDistance(picked);
}

function readTotalMinutes() {
    const hours = Math.max(0, parseInt(document.getElementById('actHoursInput').value, 10) || 0);
    const minutes = Math.max(0, parseInt(document.getElementById('actMinutesInput').value, 10) || 0);
    return hours * 60 + minutes;
}

function setDurationInputs(totalMinutes) {
    document.getElementById('actHoursInput').value = Math.floor(totalMinutes / 60);
    document.getElementById('actMinutesInput').value = totalMinutes % 60;
}

function openSheet(entry) {
    editingId = entry ? entry.dact_id : null;
    selectedActivityId = entry ? entry.act_id : null;
    // เปิดฟอร์มทุกครั้งเริ่มจากไม่กรอง/ไม่ค้นหา
    activityFilterCat = 'all';
    activityQuery = '';
    document.getElementById('activitySearchInput').value = '';
    renderActivityGrid();

    document.getElementById('activitySheetTitle').textContent = I18N.t(ACTIVITY_I18N, entry ? 'modal-title-edit' : 'modal-title-add');
    setDurationInputs(entry ? (entry.duration_minutes || 0) : 30);
    document.getElementById('actDistanceInput').value = entry && entry.dact_distance_km ? parseFloat(Number(entry.dact_distance_km).toFixed(2)) : '';
    document.getElementById('actDetailInput').value = entry ? (entry.dact_detail || '') : '';
    document.getElementById('actFormError').hidden = true;
    updateActivityGridUI();

    document.getElementById('activitySheetOverlay').classList.add('is-open');
    scrollPickedIntoView();
}

function closeSheet() {
    document.getElementById('activitySheetOverlay').classList.remove('is-open');
}

function showFormError(key) {
    const box = document.getElementById('actFormError');
    box.textContent = I18N.t(ACTIVITY_I18N, key);
    box.hidden = false;
}

async function handleSave() {
    const act = ACTIVITIES_MAP[selectedActivityId];
    if (!act) { showFormError('err-select-activity'); return; }

    const totalMinutes = readTotalMinutes();
    if (totalMinutes <= 0) { showFormError('err-duration-min'); return; }
    if (totalMinutes > 1440) { showFormError('err-duration-max'); return; }

    // ระยะทางส่งเฉพาะกิจกรรมที่วัดระยะทางได้ และเว้นว่างได้ (ส่ง null)
    let distanceKm = null;
    const rawDistance = document.getElementById('actDistanceInput').value.trim();
    if (hasDistance(act) && rawDistance !== '') {
        distanceKm = Math.round(parseFloat(rawDistance) * 100) / 100;
        if (!(distanceKm > 0 && distanceKm <= 999.99)) { showFormError('err-distance'); return; }
    }
    document.getElementById('actFormError').hidden = true;

    const saveBtn = document.getElementById('actSaveBtn');
    saveBtn.disabled = true;

    const detail = document.getElementById('actDetailInput').value.trim();
    const body = { dact_date: dateKey(selectedDate), dact_duration_min: totalMinutes, dact_distance_km: distanceKm, act_id: act.act_id, dact_detail: detail || null };

    try {
        const wasEditing = !!editingId;
        if (editingId) {
            await SoyDeeAPI.request(`/members/${mbId}/activity-records/${editingId}`, { method: 'PUT', body });
        } else {
            await SoyDeeAPI.request(`/members/${mbId}/activity-records`, { method: 'POST', body });
        }
        closeSheet();
        await loadEntries();
        showToast(I18N.t(ACTIVITY_I18N, wasEditing ? 'toast-updated' : 'toast-added'), 'success');
    } catch (err) {
        const box = document.getElementById('actFormError');
        box.textContent = (err && err.message) || I18N.t(ACTIVITY_I18N, 'err-duration-min');
        box.hidden = false;
    } finally {
        saveBtn.disabled = false;
    }
}

function handleDelete(id) {
    const entry = currentEntries.find(e => e.dact_id === id);
    if (!entry) return;

    const act = ACTIVITIES_MAP[entry.act_id];
    showConfirm({
        title: I18N.t(ACTIVITY_I18N, 'delete-title'),
        message: tpl('delete-message-template', { name: act ? act.act_name : '', duration: formatDuration(entry.duration_minutes) }),
        confirmText: I18N.t(ACTIVITY_I18N, 'delete-confirm'),
        cancelText: I18N.t(ACTIVITY_I18N, 'btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${mbId}/activity-records/${id}`, { method: 'DELETE' });
                await loadEntries();
                showToast(I18N.t(ACTIVITY_I18N, 'toast-deleted'), 'success');
            } catch (err) {
                console.error('delete activity record failed', err);
                showToast(I18N.t(ACTIVITY_I18N, 'toast-delete-failed'), 'error');
            }
        },
    });
}

/* ==============================================================================
   8. Init + bind events
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(ACTIVITY_I18N);
    mbId = SoyDeeAPI.session.getUserId();
    if (!mbId) return;

    renderDate();

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js)
    activityDatePicker = SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => selectedDate,
        onSelect: (date) => changeDate(date)
    });

    // กดการ์ดรายการ → เปิดรายละเอียด (event delegation; รองรับ Enter/Space สำหรับคีย์บอร์ด)
    const logList = document.getElementById('logList');
    logList.addEventListener('click', (e) => {
        const card = e.target.closest('[data-open-id]');
        if (card) openDetail(Number(card.dataset.openId), card);
    });
    logList.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('[data-open-id]');
        if (!card) return;
        e.preventDefault();
        openDetail(Number(card.dataset.openId), card);
    });

    // รายละเอียด: ปิด / แก้ไข / ลบ
    const detailOverlay = document.getElementById('activityDetailOverlay');
    const sheetOverlay = document.getElementById('activitySheetOverlay');
    document.getElementById('detailCloseBtn').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDetail(); });
    document.getElementById('detailEditBtn').addEventListener('click', () => {
        const entry = currentEntries.find(e => e.dact_id === detailId);
        closeDetail();
        if (entry) openSheet(entry);
    });
    document.getElementById('detailDeleteBtn').addEventListener('click', () => {
        const id = detailId;
        closeDetail();
        if (id !== null) handleDelete(id);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (detailOverlay.classList.contains('is-open')) closeDetail();
        else if (sheetOverlay.classList.contains('is-open')) closeSheet();
    });

    // รูปกิจกรรมที่โหลดไม่ได้ (ไฟล์หาย/เน็ตหลุด) → เอา <img> ทิ้ง แล้วโชว์ไอคอนสำรองที่ซ่อนอยู่แทน
    document.addEventListener('error', (e) => {
        const t = e.target;
        if (!t || t.tagName !== 'IMG' || !t.classList.contains('icon-img')) return;
        const fallback = t.nextElementSibling;
        if (fallback && fallback.hasAttribute('data-icon')) fallback.style.display = '';
        t.remove();
    }, true);

    // ปุ่มลอย (FAB) — เพิ่มกิจกรรมใหม่
    document.getElementById('fabAddBtn').addEventListener('click', () => openSheet(null));

    // ค้นหากิจกรรม (พิมพ์แล้วกรองทันที) + กรองตามประเภท
    document.getElementById('activitySearchInput').addEventListener('input', (e) => {
        activityQuery = e.target.value.trim().toLowerCase();
        renderActivityGrid();
        document.getElementById('activityChipList').scrollTop = 0;
    });
    document.getElementById('activityFilterBar').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-chip');
        if (!btn) return;
        activityFilterCat = btn.dataset.cat === 'all' ? 'all' : Number(btn.dataset.cat);
        renderActivityGrid();
        document.getElementById('activityChipList').scrollTop = 0;
    });

    // เลือกกิจกรรมในฟอร์ม
    document.getElementById('activityChipList').addEventListener('click', (e) => {
        const chip = e.target.closest('.activity-chip');
        if (!chip) return;
        selectedActivityId = Number(chip.dataset.actId);
        updateActivityGridUI();
        document.getElementById('actFormError').hidden = true;
    });

    // บันทึก / ยกเลิก
    document.getElementById('actSaveBtn').addEventListener('click', handleSave);
    document.getElementById('actCancelBtn').addEventListener('click', closeSheet);
    sheetOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });

    try {
        ACTIVITIES = (await SoyDeeAPI.request('/activities')) || [];
    } catch (err) {
        ACTIVITIES = [];
        console.error('load activities failed', err);
    }
    ACTIVITIES_MAP = {};
    ACTIVITIES.forEach(a => { ACTIVITIES_MAP[a.act_id] = a; });

    renderIntensityLegend();
    renderActivityGrid();
    await loadEntries();

    // กลับมาหน้านี้ผ่าน bfcache (ปุ่ม back ของเบราว์เซอร์) — DOMContentLoaded ไม่ยิงซ้ำ
    // บันทึกที่เพิ่ง/แก้ไว้เลยค้างจนกว่าจะกด refresh เอง แก้โดยโหลดรายการใหม่ทุกครั้งที่ restore
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) loadEntries();
    });
});
