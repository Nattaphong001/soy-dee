import { dateKey, startOfDay } from './helpers.js';
import { ACTIVITY_I18N } from './i18n.js';
import { renderDate, renderLogList, renderSummary } from './render.js';
import { state } from './state.js';

/* ==============================================================================
   3. Data
   ============================================================================== */
export async function loadEntries() {
    try {
        state.currentEntries = (await SoyDeeAPI.request(`/members/${state.mbId}/activity-records`, { query: { date: dateKey(state.selectedDate) } })) || [];
    } catch (err) {
        state.currentEntries = [];
        console.error('load activity records failed', err);
        showToast(I18N.t(ACTIVITY_I18N, 'toast-load-failed'), 'error');
    }
    renderSummary();
    renderLogList();
}

export async function changeDate(newDate) {
    state.selectedDate = startOfDay(newDate);
    renderDate();
    await loadEntries();
}
