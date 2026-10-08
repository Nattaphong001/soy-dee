import { activityIconMarkup, escapeHtml, formatDistance, formatDuration, formatThaiDate, isToday, timeLabel, tpl } from './helpers.js';
import { ACTIVITY_I18N } from './i18n.js';
import { DAILY_GOAL_MIN, levelOf, levelVar, state } from './state.js';

/* ==============================================================================
   4. Render: วันที่ + การ์ดสรุป
   ============================================================================== */
export function renderDate() {
    document.getElementById('dateText').textContent = formatThaiDate(state.selectedDate);
    // ปุ่ม "วันนี้" แสดงเฉพาะตอนดูวันย้อนหลัง — วันนี้อยู่แล้วไม่ต้องมีปุ่มกลับ
    document.getElementById('todayBtn').hidden = isToday(state.selectedDate);
    if (state.activityDatePicker) state.activityDatePicker.refreshTodayBtn();
}

function summaryTitleText() {
    return isToday(state.selectedDate)
        ? I18N.t(ACTIVITY_I18N, 'summary-title-today')
        : tpl('summary-title-date-template', { date: formatThaiDate(state.selectedDate) });
}

// รวมนาทีต่อระดับการใช้แรง เรียงจากเบาไปหนัก — ใช้ทั้งแถบสัดส่วนและ legend
function minutesByLevel() {
    const totals = {};
    state.currentEntries.forEach(e => { const lv = levelOf(e.act_id); totals[lv] = (totals[lv] || 0) + (e.duration_minutes || 0); });
    return SoyDeeActivityIntensity.list
        .map(l => ({ level: l.id, minutes: totals[l.id] || 0 }))
        .filter(g => g.minutes > 0);
}

export function renderSummary() {
    const totalMinutes = state.currentEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    document.getElementById('summaryTitleText').textContent = summaryTitleText();
    document.getElementById('summaryTotal').textContent = tpl('summary-total-template', { count: state.currentEntries.length });
    document.getElementById('summaryCount').textContent = state.currentEntries.length;
    document.getElementById('summaryDuration').textContent = formatDuration(totalMinutes);

    // ระยะทางรวม: แสดงชิปเฉพาะวันที่มีรายการที่บันทึกระยะทางไว้
    const totalKm = state.currentEntries.reduce((sum, e) => sum + (Number(e.dact_distance_km) || 0), 0);
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
    const act = state.ACTIVITIES_MAP[entry.act_id];
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

export function renderLogList() {
    const list = document.getElementById('logList');
    const badge = document.getElementById('logCountBadge');
    const entries = [...state.currentEntries].sort((a, b) => String(a.dact_created_at).localeCompare(String(b.dact_created_at)));

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
