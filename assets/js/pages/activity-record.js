/**
 * activity-record.js — หน้า Daily Activity Record (บันทึกกิจกรรม)
 * เชื่อม API จริง: GET /activities (ตัวเลือก), GET/POST/PUT/DELETE /members/{id}/activity-records
 *
 * หมายเหตุ: showConfirm() มาจาก assets/js/app.js
 *           ระบบภาษา (i18n) ใช้ window.I18N จาก assets/js/shared/i18n.js
 */

/* ==============================================================================
   0. ระบบภาษา (i18n) — คำแปลของหน้านี้
   ============================================================================== */
const ACTIVITY_I18N = {
    th: {
        'page-title': 'บันทึกกิจกรรม',
        'today-btn': 'วันนี้',
        'stat-label-count': 'กิจกรรม',
        'stat-label-duration': 'เวลารวม',
        'stat-label-energy': 'พลังงาน',
        'label-choose-activity': 'เลือกกิจกรรม',
        'duration-placeholder-text': 'แตะเลือกกิจกรรมด้านบนก่อน เพื่อบันทึกระยะเวลาที่ทำ',
        'label-selected-activity': 'กิจกรรมที่เลือก',
        'clear-activity-btn': 'เปลี่ยน',
        'label-hours': 'ชั่วโมง',
        'label-minutes': 'นาที',
        'duration-error-text': 'กรุณาระบุระยะเวลาที่ทำกิจกรรมอย่างน้อย 1 นาที',
        'add-entry-btn': '+ เพิ่มลงบันทึก',
        'section-heading-today-log': 'บันทึกของวันนี้',
        'unit-hour': 'ชม',
        'unit-minute': 'นาที',
        'items-suffix': 'รายการ',
        'logged-at-prefix': 'บันทึกเมื่อ',
        'empty-state-title': 'ยังไม่มีกิจกรรมในวันนี้',
        'empty-state-desc': 'เลือกกิจกรรมด้านบนแล้วระบุระยะเวลา เพื่อเริ่มบันทึกกิจกรรมแรกของวัน',
        'confirm-delete-title': 'ลบรายการกิจกรรม',
        'confirm-delete-message': 'ต้องการลบ "{name}" ({duration}) ออกจากบันทึกใช่หรือไม่?',
        'confirm-delete-confirm-btn': 'ลบรายการ',
        'confirm-delete-cancel-btn': 'ยกเลิก',
        'save-edit-btn': 'บันทึกการแก้ไข',
        'cancel-edit-btn': 'ยกเลิกการแก้ไข',
        'toast-added': 'เพิ่มกิจกรรมแล้ว',
        'toast-updated': 'แก้ไขกิจกรรมแล้ว',
        'toast-deleted': 'ลบกิจกรรมแล้ว',
        'toast-delete-failed': 'ลบรายการไม่สำเร็จ กรุณาลองใหม่',
        'toast-update-failed': 'แก้ไขรายการไม่สำเร็จ กรุณาลองใหม่',
    },
    en: {
        'page-title': 'Activity Record',
        'today-btn': 'Today',
        'stat-label-count': 'Activities',
        'stat-label-duration': 'Total time',
        'stat-label-energy': 'Energy',
        'label-choose-activity': 'Choose an activity',
        'duration-placeholder-text': 'Tap an activity above first to log the duration',
        'label-selected-activity': 'Selected activity',
        'clear-activity-btn': 'Change',
        'label-hours': 'Hours',
        'label-minutes': 'Minutes',
        'duration-error-text': 'Please enter a duration of at least 1 minute',
        'add-entry-btn': '+ Add entry',
        'section-heading-today-log': "Today's log",
        'unit-hour': 'hr',
        'unit-minute': 'min',
        'items-suffix': 'items',
        'logged-at-prefix': 'Logged at',
        'empty-state-title': 'No activities logged today',
        'empty-state-desc': 'Choose an activity above and set a duration to log your first activity of the day',
        'confirm-delete-title': 'Delete activity entry',
        'confirm-delete-message': 'Delete "{name}" ({duration}) from your log?',
        'confirm-delete-confirm-btn': 'Delete',
        'confirm-delete-cancel-btn': 'Cancel',
        'save-edit-btn': 'Save changes',
        'cancel-edit-btn': 'Cancel edit',
        'toast-added': 'Activity added',
        'toast-updated': 'Activity updated',
        'toast-deleted': 'Activity deleted',
        'toast-delete-failed': 'Failed to delete — please try again',
        'toast-update-failed': 'Failed to update — please try again',
    }
};

/* ==============================================================================
   1. State
   ============================================================================== */
let selectedDate = startOfDay(new Date());     // วันที่กำลังดู/บันทึก (dact_date)
let selectedActivityId = null;                  // act_id ที่เลือกอยู่ในฟอร์ม
let editingDactId = null;                        // dact_id ที่กำลังแก้ไข (null = โหมดเพิ่มใหม่)
let mbId = null;
let ACTIVITIES = [];                            // จาก GET /activities
let ACTIVITIES_MAP = {};                        // act_id -> activity
let currentEntries = [];                        // จาก GET /members/{id}/activity-records?date=...

// สีไอคอนวนซ้ำตามลำดับ act_id เพื่อให้แต่ละกิจกรรมแยกแยะง่ายด้วยสายตา
const ICON_COLOR_CLASSES = ['icon-blue', 'icon-green', 'icon-purple', 'icon-orange', 'icon-yellow', 'icon-red'];
function colorClassFor(actId) {
    return ICON_COLOR_CLASSES[(actId - 1) % ICON_COLOR_CLASSES.length];
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

// dact_created_at เป็น datetime เต็ม ("YYYY-MM-DD HH:mm:ss") -> แสดงเฉพาะ HH:mm
function timeLabel(dateTimeStr) {
    if (!dateTimeStr) return '';
    const d = new Date(String(dateTimeStr).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(dateTimeStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// สร้าง markup ไอคอน: มีรูปจริงใช้รูป (พร้อม fallback อีโมจิเมื่อโหลดรูปพัง), ไม่มีรูปใช้อีโมจิเลย
function activityIconMarkup(act) {
    const img = act && act.act_images ? SoyDeeAPI.assetUrl(act.act_images) : '';
    if (!img) return `<span class="icon-emoji">🏃</span>`;
    return `<img src="${img}" alt="" class="icon-img" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"><span class="icon-emoji" style="display:none">🏃</span>`;
}

/* ==============================================================================
   3. Render: Date Picker
   ============================================================================== */
function renderDate() {
    document.getElementById('dateText').textContent = formatThaiDate(selectedDate);

    // ปุ่ม "วันนี้" เน้นสีเมื่อไม่ได้ดูวันนี้อยู่ เพื่อบอกว่ากดกลับได้ (มาตรฐานเดียวกับหน้าอื่น)
    if (activityDatePicker) activityDatePicker.refreshTodayBtn();
}

let activityDatePicker = null;

async function changeDate(newDate) {
    selectedDate = startOfDay(newDate);
    selectedActivityId = null;
    renderDate();
    renderDurationForm();
    await loadEntries();
}

/* ==============================================================================
   4. Render: Activity Chip Selector
   ============================================================================== */
function renderActivityChips() {
    const list = document.getElementById('activityChipList');
    list.innerHTML = '';

    ACTIVITIES.forEach(act => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'activity-chip' + (act.act_id === selectedActivityId ? ' active' : '');
        chip.setAttribute('role', 'option');
        chip.setAttribute('aria-selected', act.act_id === selectedActivityId ? 'true' : 'false');
        chip.dataset.actId = act.act_id;
        chip.innerHTML = `
            <span class="activity-chip-icon">${activityIconMarkup(act)}</span>
            <span class="activity-chip-name">${act.act_name}</span>
        `;
        chip.addEventListener('click', () => selectActivity(act.act_id));
        list.appendChild(chip);
    });
}

function selectActivity(actId) {
    selectedActivityId = actId;
    renderActivityChips();
    renderDurationForm();
    document.getElementById('durationError').hidden = true;
}

/* ==============================================================================
   5. Render: Duration Form
   ============================================================================== */
function renderDurationForm() {
    const placeholder = document.getElementById('durationPlaceholder');
    const form = document.getElementById('durationForm');

    const act = selectedActivityId ? ACTIVITIES_MAP[selectedActivityId] : null;
    if (!act) {
        selectedActivityId = null; // เผื่อกิจกรรมที่เลือกไว้ถูกลบไปแล้วฝั่ง admin
        placeholder.hidden = false;
        form.hidden = true;
        return;
    }

    placeholder.hidden = true;
    form.hidden = false;

    document.getElementById('selectedActivityName').textContent = act.act_name;
    const iconWrap = document.getElementById('selectedActivityIcon');
    iconWrap.className = 'stat-icon ' + colorClassFor(act.act_id);
    iconWrap.innerHTML = activityIconMarkup(act);

    document.getElementById('addEntryBtn').textContent = I18N.t(ACTIVITY_I18N,
        editingDactId ? 'save-edit-btn' : 'add-entry-btn');
    document.getElementById('cancelEditBtn').hidden = !editingDactId;
}

function clearActivitySelection() {
    selectedActivityId = null;
    renderActivityChips();
    renderDurationForm();
}

function startEditEntry(dactId) {
    const entry = currentEntries.find(e => e.dact_id === dactId);
    if (!entry) return;

    editingDactId = dactId;
    selectedActivityId = entry.act_id;
    document.getElementById('durationHours').value = Math.floor((entry.duration_minutes || 0) / 60);
    document.getElementById('durationMinutes').value = (entry.duration_minutes || 0) % 60;
    document.getElementById('durationError').hidden = true;

    renderActivityChips();
    renderDurationForm();
    document.getElementById('durationCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEdit() {
    editingDactId = null;
    document.getElementById('durationHours').value = 0;
    document.getElementById('durationMinutes').value = 30;
    clearActivitySelection();
}

async function addEntry() {
    const act = ACTIVITIES_MAP[selectedActivityId];
    if (!act) return;

    const hours = Math.max(0, parseInt(document.getElementById('durationHours').value, 10) || 0);
    const minutes = Math.max(0, parseInt(document.getElementById('durationMinutes').value, 10) || 0);
    const totalMinutes = hours * 60 + minutes;

    const errorEl = document.getElementById('durationError');
    if (totalMinutes <= 0) {
        errorEl.textContent = I18N.t(ACTIVITY_I18N, 'duration-error-text');
        errorEl.hidden = false;
        return;
    }
    errorEl.hidden = true;

    const addBtn = document.getElementById('addEntryBtn');
    addBtn.disabled = true;

    const isEdit = !!editingDactId;
    const body = { dact_date: dateKey(selectedDate), dact_duration_min: totalMinutes, act_id: act.act_id };

    try {
        if (isEdit) {
            await SoyDeeAPI.request(`/members/${mbId}/activity-records/${editingDactId}`, { method: 'PUT', body });
        } else {
            await SoyDeeAPI.request(`/members/${mbId}/activity-records`, { method: 'POST', body });
        }

        // รีเซ็ตฟอร์มกลับสู่ค่าเริ่มต้น พร้อมยกเลิกการเลือกกิจกรรม/โหมดแก้ไข
        editingDactId = null;
        document.getElementById('durationHours').value = 0;
        document.getElementById('durationMinutes').value = 30;
        clearActivitySelection();

        await loadEntries();
        showToast(I18N.t(ACTIVITY_I18N, isEdit ? 'toast-updated' : 'toast-added'), 'success');
    } catch (err) {
        errorEl.textContent = (err && err.message) || I18N.t(ACTIVITY_I18N, isEdit ? 'toast-update-failed' : 'duration-error-text');
        errorEl.hidden = false;
    } finally {
        addBtn.disabled = false;
    }
}

function deleteEntry(dactId) {
    const entry = currentEntries.find(e => e.dact_id === dactId);
    if (!entry) return;

    const act = ACTIVITIES_MAP[entry.act_id];
    const displayName = act ? act.act_name : '';
    const message = I18N.t(ACTIVITY_I18N, 'confirm-delete-message')
        .replace('{name}', displayName)
        .replace('{duration}', formatDuration(entry.duration_minutes));

    showConfirm({
        title: I18N.t(ACTIVITY_I18N, 'confirm-delete-title'),
        message,
        confirmText: I18N.t(ACTIVITY_I18N, 'confirm-delete-confirm-btn'),
        cancelText: I18N.t(ACTIVITY_I18N, 'confirm-delete-cancel-btn'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${mbId}/activity-records/${dactId}`, { method: 'DELETE' });
                if (editingDactId === dactId) cancelEdit();
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
   6. Render: Summary Card
   ============================================================================== */
function renderSummary() {
    const totalMinutes = currentEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    document.getElementById('summaryCount').textContent = currentEntries.length;
    document.getElementById('summaryDuration').textContent = formatDuration(totalMinutes);
    // ไม่มี field/สูตรพลังงานที่ใช้ไปสำหรับกิจกรรมใน API นี้ (ไม่ใช่ทั้งฝั่ง backend หรือ client) — แสดง placeholder แทนเลขมั่ว
    document.getElementById('summaryKcal').textContent = '–';
}

/* ==============================================================================
   7. Render: Log List
   ============================================================================== */
function renderLogList() {
    const list = document.getElementById('logList');
    const badge = document.getElementById('logCountBadge');
    const entries = [...currentEntries].sort((a, b) => String(a.dact_created_at).localeCompare(String(b.dact_created_at)));

    badge.textContent = `${entries.length} ${I18N.t(ACTIVITY_I18N, 'items-suffix')}`;

    if (entries.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">🗒️</span>
                <div class="empty-state-title">${I18N.t(ACTIVITY_I18N, 'empty-state-title')}</div>
                <div class="empty-state-desc">${I18N.t(ACTIVITY_I18N, 'empty-state-desc')}</div>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    entries.forEach(entry => {
        const act = ACTIVITIES_MAP[entry.act_id];
        const displayName = act ? act.act_name : '';

        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <span class="log-item-icon ${colorClassFor(entry.act_id)}">${activityIconMarkup(act)}</span>
            <div class="log-item-info">
                <span class="log-item-name">${displayName}</span>
                <span class="log-item-meta">
                    <span>${formatDuration(entry.duration_minutes)}</span>
                    <span class="dot">•</span>
                    <span>${I18N.t(ACTIVITY_I18N, 'logged-at-prefix')} ${timeLabel(entry.dact_created_at)}</span>
                </span>
            </div>
            <div class="log-item-actions">
                <button type="button" class="log-item-edit" aria-label="แก้ไขรายการนี้">✏️</button>
                <button type="button" class="log-item-delete" aria-label="ลบรายการนี้">✕</button>
            </div>
        `;
        item.querySelector('.log-item-edit').addEventListener('click', () => startEditEntry(entry.dact_id));
        item.querySelector('.log-item-delete').addEventListener('click', () => deleteEntry(entry.dact_id));
        list.appendChild(item);
    });
}

/* ==============================================================================
   8. Data loading
   ============================================================================== */
async function loadEntries() {
    try {
        currentEntries = await SoyDeeAPI.request(`/members/${mbId}/activity-records`, { query: { date: dateKey(selectedDate) } });
    } catch (err) {
        currentEntries = [];
        console.error('load activity records failed', err);
    }
    renderSummary();
    renderLogList();
}

/* ==============================================================================
   9. Init
   ============================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    I18N.apply(ACTIVITY_I18N);
    mbId = SoyDeeAPI.session.getUserId();

    renderDate();
    renderDurationForm();

    // ปฏิทิน dropdown ที่ใช้ร่วมกันทุกหน้า (assets/js/shared/datepicker.js)
    activityDatePicker = SoyDeeDatePicker.attach({
        pillEl: document.getElementById('datePickerPill'),
        todayBtnEl: document.getElementById('todayBtn'),
        getDate: () => selectedDate,
        onSelect: (date) => changeDate(date)
    });

    document.getElementById('clearActivityBtn').addEventListener('click', clearActivitySelection);
    document.getElementById('addEntryBtn').addEventListener('click', addEntry);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);

    try {
        ACTIVITIES = await SoyDeeAPI.request('/activities');
    } catch (err) {
        ACTIVITIES = [];
        console.error('load activities failed', err);
    }
    ACTIVITIES_MAP = {};
    ACTIVITIES.forEach(a => { ACTIVITIES_MAP[a.act_id] = a; });

    renderActivityChips();
    renderDurationForm();
    await loadEntries();
});
