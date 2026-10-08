import { loadData } from './data.js';
import { buildSleepDates, computeSleepStats, dateKey, defaultTimes, findRecord, formatHours, formatThaiDate, formatTime, isFutureEnd, parseDateKey, t, tpl } from './helpers.js';
import { LAST_TIMES_KEY, LONG_SLEEP_HOURS, dayCache, state } from './state.js';

/* ==============================================================================
   7. Modal: บันทึก / แก้ไขการนอน (bottom sheet)
   ============================================================================== */
export function setQuality(score) {
    state.selectedQuality = score;
    document.querySelectorAll('.quality-pill').forEach(p => {
        const match = Number(p.dataset.quality) === score;
        p.classList.toggle('active', match);
        p.setAttribute('aria-checked', match ? 'true' : 'false');
    });
}

/** พรีวิวชั่วโมง + ผลประเมินสดในฟอร์ม (ฝั่ง client เท่านั้น) */
export function updatePreview() {
    const range = buildSleepDates(state.sheetDate, document.getElementById('sleepStart').value, document.getElementById('sleepEnd').value);
    const stats = range ? computeSleepStats(range.start, range.end) : null;
    const box = document.getElementById('sleepPreview');
    const noteEl = document.getElementById('sleepPreviewNote');
    const valueEl = document.getElementById('sleepPreviewValue');
    const textEl = document.getElementById('sleepPreviewText');
    const warnEl = document.getElementById('sleepPreviewWarn');

    if (!stats || stats.invalid) {
        box.dataset.eval = '';
        valueEl.textContent = '–';
        textEl.textContent = t('eval-pending');
        noteEl.hidden = true;
        warnEl.hidden = true;
        return;
    }
    // เตือนสด: ตื่นล่วงหน้า (บันทึกไม่ได้) / นอนนานผิดปกติ (บันทึกได้)
    const future = isFutureEnd(range.end);
    const warn = future ? t('err-future-end') : (stats.hours > LONG_SLEEP_HOURS ? t('warn-long-sleep') : '');
    warnEl.classList.toggle('is-caution', !future);   // ตื่นล่วงหน้า = แดง (บันทึกไม่ได้), นอนนาน = เหลือง (เตือนเฉยๆ)
    warnEl.hidden = !warn;
    warnEl.textContent = warn;
    // เริ่มนอนคนละวันกับวันที่ตื่น -> บอกวันที่ของคืนที่เริ่มนอน
    const crossed = dateKey(range.start) !== dateKey(range.end);
    noteEl.hidden = !crossed;
    if (crossed) noteEl.textContent = tpl('preview-prev-night', { date: formatThaiDate(range.start) });
    box.dataset.eval = stats.evalKey;
    valueEl.textContent = `${formatHours(stats.hours)} ${t('unit-hour')}`;
    textEl.textContent = t(`eval-${stats.evalKey}`);
}

function showFormError(msg) {
    const box = document.getElementById('sleepFormError');
    box.textContent = msg;
    box.hidden = false;
}

export function openSheet(rec, dateStr) {
    state.editingId = rec ? rec.id : null;
    state.sheetDate = rec ? rec.date : (dateStr || dateKey(state.selectedDate));

    document.getElementById('sleepSheetTitle').textContent = t(rec ? 'modal-title-edit' : 'modal-title-add');
    document.getElementById('sleepSheetDate').textContent = formatThaiDate(parseDateKey(state.sheetDate));
    // ไม่มีบันทึกเดิม -> ใช้เวลาที่บันทึกล่าสุดเป็นค่าเริ่มต้น (ไม่ใช่ค่าจริง แค่ช่วยกรอก)
    const def = defaultTimes();
    document.getElementById('sleepStart').value = rec ? formatTime(rec.start) : def.start;
    document.getElementById('sleepEnd').value = rec ? formatTime(rec.end) : def.end;
    setQuality(rec ? (rec.qualityScore || 3) : 3);
    document.getElementById('sleepFormError').hidden = true;
    updatePreview();

    document.getElementById('sleepSheetOverlay').classList.add('is-open');
}

export function closeSheet() {
    document.getElementById('sleepSheetOverlay').classList.remove('is-open');
}

export async function handleSave() {
    const startVal = document.getElementById('sleepStart').value;
    const endVal = document.getElementById('sleepEnd').value;
    const range = buildSleepDates(state.sheetDate, startVal, endVal);
    const stats = range ? computeSleepStats(range.start, range.end) : null;
    if (!stats || stats.invalid) { showFormError(t('err-time-order')); return; }
    if (isFutureEnd(range.end)) { showFormError(t('err-future-end')); return; }
    document.getElementById('sleepFormError').hidden = true;

    const payload = {
        dslp_date: state.sheetDate,
        dslp_start_time: range.start.toISOString(),
        dslp_end_time: range.end.toISOString(),
        dslp_quality_score: state.selectedQuality
    };

    const saveBtn = document.getElementById('saveSleepBtn');
    saveBtn.disabled = true;

    try {
        const wasEditing = !!state.editingId;
        const path = wasEditing
            ? `/members/${state.mbId}/sleep-records/${state.editingId}`
            : `/members/${state.mbId}/sleep-records`;
        await SoyDeeAPI.request(path, { method: wasEditing ? 'PUT' : 'POST', body: payload });
        try { localStorage.setItem(LAST_TIMES_KEY, JSON.stringify({ start: startVal, end: endVal })); } catch (e) { /* ข้าม */ }
        closeSheet();
        dayCache.delete(state.sheetDate);
        await loadData();
        showToast(t(wasEditing ? 'toast-updated' : 'toast-added'), 'success');
    } catch (err) {
        showFormError((err && err.message) || t('err-save'));
    } finally {
        saveBtn.disabled = false;
    }
}

export function handleDelete(id) {
    const rec = findRecord(id);
    if (!rec) return;

    showConfirm({
        title: t('delete-title'),
        message: tpl('delete-message-template', { date: formatThaiDate(parseDateKey(rec.date)) }),
        confirmText: t('delete-confirm'),
        cancelText: t('btn-cancel'),
        onConfirm: async () => {
            try {
                await SoyDeeAPI.request(`/members/${state.mbId}/sleep-records/${id}`, { method: 'DELETE' });
                dayCache.delete(rec.date);
                await loadData();
                showToast(t('toast-deleted'), 'success');
            } catch (err) {
                console.error('delete sleep record failed', err);
                showToast(t('toast-delete-failed'), 'error');
            }
        }
    });
}
