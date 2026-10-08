import { evalKeyOf, findRecord, formatHours, formatThaiDate, formatTime, parseDateKey, qualityKey, t } from './helpers.js';
import { setEvalClass } from './render.js';
import { state } from './state.js';

/* ==============================================================================
   6. Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
export function openDetail(id, opener) {
    const rec = findRecord(id);
    if (!rec) return;
    state.detailId = id;
    state.detailOpener = opener || null;

    const evalKey = evalKeyOf(rec);
    setEvalClass(document.getElementById('sleepDetailCard'), evalKey);
    document.getElementById('detailName').textContent = formatThaiDate(parseDateKey(rec.date));
    document.getElementById('detailEvalText').textContent = t(`eval-${evalKey}`);
    document.getElementById('detailDuration').textContent = `${formatHours(rec.hours)} ${t('unit-hour')}`;
    document.getElementById('detailQuality').textContent = t(qualityKey(rec));
    document.getElementById('detailStart').textContent = formatTime(rec.start);
    document.getElementById('detailEnd').textContent = formatTime(rec.end);

    document.getElementById('sleepDetailOverlay').classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('detailEditBtn').focus());
}

export function closeDetail() {
    document.getElementById('sleepDetailOverlay').classList.remove('is-open');
    if (state.detailOpener && document.contains(state.detailOpener)) state.detailOpener.focus();
    state.detailId = null;
    state.detailOpener = null;
}
