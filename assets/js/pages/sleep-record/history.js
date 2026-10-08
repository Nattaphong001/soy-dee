import { fetchDays } from './data.js';
import { dateKey, escapeHtml, evalKeyOf, formatHours, formatShortDate, formatSpan, formatThaiDate, formatTime, parseDateKey, qualityKey, t, tpl, windowDates } from './helpers.js';
import { HISTORY_MAX_DAYS, HISTORY_STEP, QUALITY_ICON_BY_SCORE, dayCache, state } from './state.js';

/* ==============================================================================
   5. Render: แถวรายวัน + หน้าประวัติเต็ม (เปิดจากการ์ดภาพรวม/ความสม่ำเสมอ)
   ============================================================================== */
function renderLogItemHtml(rec) {
    const evalKey = evalKeyOf(rec);
    const dateLabel = formatThaiDate(parseDateKey(rec.date));
    const label = tpl('open-item-label', { date: dateLabel });
    const current = rec.date === dateKey(state.selectedDate) ? ' is-current' : '';
    return `
        <div class="log-item eval-${evalKey}${current}" data-open-id="${rec.id}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
            <span class="log-thumb"><i data-icon="${QUALITY_ICON_BY_SCORE[rec.qualityScore] || 'smile'}"></i></span>
            <div class="log-item-info">
                <span class="log-item-name">${dateLabel}</span>
                <span class="log-item-meta"><span class="numeric">${formatTime(rec.start)} – ${formatTime(rec.end)}</span></span>
                <span class="cat-pill"><span class="badge-dot" style="background:var(--lc)"></span>${t('eval-' + evalKey)}</span>
            </div>
            <div class="log-item-side">
                <span class="log-item-hours numeric">${formatHours(rec.hours)}<small>${t('unit-hour')}</small></span>
                <span class="log-item-quality">${tpl('quality-label-template', { q: t(qualityKey(rec)) })}</span>
            </div>
            <span class="log-item-chevron" aria-hidden="true"></span>
        </div>
    `;
}

// คืนที่ยังไม่มีบันทึก: แถวเส้นประ กดเพื่อเพิ่มของวันนั้นได้ทันที (ไม่ต้องเปิดปฏิทิน)
function renderEmptyNightHtml(key) {
    const dateLabel = formatThaiDate(parseDateKey(key));
    const label = tpl('open-add-label', { date: dateLabel });
    const current = key === dateKey(state.selectedDate) ? ' is-current' : '';
    return `
        <div class="log-item is-empty${current}" data-add-date="${key}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
            <span class="log-thumb"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span>
            <div class="log-item-info">
                <span class="log-item-name">${dateLabel}</span>
                <span class="log-item-meta">${t('empty-night-title')}</span>
            </div>
            <span class="log-item-add">${t('empty-night-add')}</span>
        </div>
    `;
}

export function isHistoryOpen() {
    return document.getElementById('historyOverlay').classList.contains('is-open');
}

/** โหลดวันในหน้าประวัติที่ยังไม่มีใน cache — คืน false ถ้าโหลดไม่สำเร็จ (ผู้เรียกถอยกลับ กันแสดงวันว่างผิดๆ) */
export async function fetchMissingHistory() {
    const missing = windowDates(state.historyDays).filter(k => !dayCache.has(k));
    if (!missing.length) return true;
    const failed = await fetchDays(missing);
    if (failed) showToast(t('toast-load-failed'), 'error');
    return !failed;
}

/** แบ่งทีละ 7 วัน: หัวช่วงวันที่ + ค่าเฉลี่ย แล้วตามด้วยแถวรายวัน (มี/ไม่มีบันทึก) */
export function renderHistory() {
    const keys = windowDates(state.historyDays).filter(k => dayCache.has(k));
    let html = '';
    for (let i = 0; i < keys.length; i += HISTORY_STEP) {
        const chunk = keys.slice(i, i + HISTORY_STEP);
        const recs = chunk.map(k => dayCache.get(k)).filter(Boolean);
        const range = `${formatShortDate(parseDateKey(chunk[chunk.length - 1]))} – ${formatShortDate(parseDateKey(chunk[0]))}`;
        const avg = recs.length
            ? `${t('week-avg-prefix')} ${formatSpan(Math.round(recs.reduce((sum, r) => sum + r.hours, 0) / recs.length * 60))}`
            : '–';
        html += `<section class="history-week"><div class="history-week-head"><span class="history-week-range numeric">${range}</span><span class="history-week-avg">${avg}</span></div>` +
            `<div class="log-list">${chunk.map(k => { const r = dayCache.get(k); return r ? renderLogItemHtml(r) : renderEmptyNightHtml(k); }).join('')}</div></section>`;
    }
    document.getElementById('historyList').innerHTML = html;
    document.getElementById('historyCount').textContent =
        `${keys.filter(k => dayCache.get(k)).length}/${keys.length} ${t('unit-night')}`;

    const more = document.getElementById('historyMoreBtn');
    more.hidden = state.historyDays >= HISTORY_MAX_DAYS;
    more.disabled = false;
    more.textContent = t('history-more');
}

export function openHistory(opener) {
    state.historyDays = HISTORY_STEP;
    state.historyOpener = opener || null;
    const overlay = document.getElementById('historyOverlay');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('history-open');
    document.getElementById('historyBackBtn').setAttribute('aria-label', t('history-back'));
    renderHistory();
    document.getElementById('historyBackBtn').focus();
}

export function closeHistory() {
    const overlay = document.getElementById('historyOverlay');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('history-open');
    if (state.historyOpener && document.contains(state.historyOpener)) state.historyOpener.focus();
    state.historyOpener = null;
}

export async function loadMoreHistory() {
    if (state.historyDays >= HISTORY_MAX_DAYS) return;
    const prev = state.historyDays;
    state.historyDays = Math.min(state.historyDays + HISTORY_STEP, HISTORY_MAX_DAYS);
    const more = document.getElementById('historyMoreBtn');
    more.disabled = true;
    more.textContent = t('history-loading');
    if (!(await fetchMissingHistory())) state.historyDays = prev;
    renderHistory();
}
