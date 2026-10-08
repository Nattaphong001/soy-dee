import { loadEntries } from './data.js';
import { activityIconMarkup, dateKey, escapeHtml, formatDuration, hasDistance, tpl } from './helpers.js';
import { ACTIVITY_I18N } from './i18n.js';
import { levelOf, state } from './state.js';

/* ==============================================================================
   7. Modal: เพิ่ม / แก้ไขกิจกรรม (bottom sheet)
   ============================================================================== */
// กิจกรรมที่ตรงกับคำค้น (ชื่อกิจกรรม หรือชื่อประเภท) — ยังไม่กรองตามประเภท
function activitiesMatchingQuery() {
    const cats = SoyDeeActivityCategories;
    if (!state.activityQuery) return state.ACTIVITIES;
    return state.ACTIVITIES.filter(a =>
        String(a.act_name).toLowerCase().includes(state.activityQuery) ||
        cats.label(cats.normalize(a.act_category)).toLowerCase().includes(state.activityQuery));
}

// คำอธิบายสีตามระดับการใช้แรง ใต้รายการเลือกกิจกรรม (สร้างครั้งเดียว ภาษาไม่เปลี่ยนกลางหน้า)
export function renderIntensityLegend() {
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
    const present = cats.list.filter(c => state.ACTIVITIES.some(a => cats.normalize(a.act_category) === c.id));
    const chip = (key, label, n) => `
        <button type="button" class="filter-chip${String(state.activityFilterCat) === String(key) ? ' active' : ''}${n === 0 ? ' is-dim' : ''}" data-cat="${key}" aria-pressed="${String(state.activityFilterCat) === String(key)}">
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
export function renderActivityGrid() {
    const cats = SoyDeeActivityCategories;
    const list = document.getElementById('activityChipList');
    list.setAttribute('aria-label', I18N.t(ACTIVITY_I18N, 'aria-activity-list'));

    const matched = activitiesMatchingQuery();
    renderActivityFilter(matched);

    const visible = state.activityFilterCat === 'all' ? matched : matched.filter(a => cats.normalize(a.act_category) === state.activityFilterCat);
    if (!visible.length) {
        const msg = state.activityQuery
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

export function updateActivityGridUI() {
    document.querySelectorAll('#activityChipList .activity-chip').forEach(chip => {
        const on = Number(chip.dataset.actId) === state.selectedActivityId;
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-selected', String(on));
    });
    // ชื่อกิจกรรมที่เลือกอยู่ข้างหัวข้อ — ยังเห็นได้แม้รายการถูกกรอง/ค้นหาจนชิปนั้นหายไป
    const picked = state.ACTIVITIES_MAP[state.selectedActivityId];
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

export function openSheet(entry) {
    state.editingId = entry ? entry.dact_id : null;
    state.selectedActivityId = entry ? entry.act_id : null;
    // เปิดฟอร์มทุกครั้งเริ่มจากไม่กรอง/ไม่ค้นหา
    state.activityFilterCat = 'all';
    state.activityQuery = '';
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

export function closeSheet() {
    document.getElementById('activitySheetOverlay').classList.remove('is-open');
}

function showFormError(key) {
    const box = document.getElementById('actFormError');
    box.textContent = I18N.t(ACTIVITY_I18N, key);
    box.hidden = false;
}

export async function handleSave() {
    const act = state.ACTIVITIES_MAP[state.selectedActivityId];
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
    const body = { dact_date: dateKey(state.selectedDate), dact_duration_min: totalMinutes, dact_distance_km: distanceKm, act_id: act.act_id, dact_detail: detail || null };

    try {
        const wasEditing = !!state.editingId;
        if (state.editingId) {
            await SoyDeeAPI.request(`/members/${state.mbId}/activity-records/${state.editingId}`, { method: 'PUT', body });
        } else {
            await SoyDeeAPI.request(`/members/${state.mbId}/activity-records`, { method: 'POST', body });
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

export function handleDelete(id) {
    const entry = state.currentEntries.find(e => e.dact_id === id);
    if (!entry) return;

    const act = state.ACTIVITIES_MAP[entry.act_id];
    showConfirm({
        title: I18N.t(ACTIVITY_I18N, 'delete-title'),
        message: tpl('delete-message-template', { name: act ? act.act_name : '', duration: formatDuration(entry.duration_minutes) }),
        confirmText: I18N.t(ACTIVITY_I18N, 'delete-confirm'),
        cancelText: I18N.t(ACTIVITY_I18N, 'btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${state.mbId}/activity-records/${id}`, { method: 'DELETE' });
                await loadEntries();
                showToast(I18N.t(ACTIVITY_I18N, 'toast-deleted'), 'success');
            } catch (err) {
                console.error('delete activity record failed', err);
                showToast(I18N.t(ACTIVITY_I18N, 'toast-delete-failed'), 'error');
            }
        },
    });
}
