import { activityIconMarkup, formatDistance, formatDuration, formatPace, formatThaiDate, timeLabel } from './helpers.js';
import { levelOf, state } from './state.js';

/* ==============================================================================
   6. Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
export function openDetail(id, opener) {
    const entry = state.currentEntries.find(e => e.dact_id === id);
    if (!entry) return;
    state.detailId = id;
    state.detailOpener = opener || null;

    const act = state.ACTIVITIES_MAP[entry.act_id];
    const totalMinutes = state.currentEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

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
    document.getElementById('detailDate').textContent = formatThaiDate(state.selectedDate);
    document.getElementById('detailLogged').textContent = timeLabel(entry.dact_created_at) || '—';
    document.getElementById('detailNoteTile').hidden = !entry.dact_detail;
    document.getElementById('detailNote').textContent = entry.dact_detail || '';

    document.getElementById('activityDetailOverlay').classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('detailEditBtn').focus());
}

export function closeDetail() {
    document.getElementById('activityDetailOverlay').classList.remove('is-open');
    if (state.detailOpener && document.contains(state.detailOpener)) state.detailOpener.focus();
    state.detailId = null;
    state.detailOpener = null;
}
