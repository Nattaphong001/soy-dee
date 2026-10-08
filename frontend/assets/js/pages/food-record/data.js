import { formatDateThai, todayISO } from './helpers.js';
import { FOOD_I18N } from './i18n.js';
import { renderLogList, renderSummary } from './render.js';
import { state } from './state.js';

/* ==============================================================================
   Data — โหลดจาก backend จริง
   ============================================================================== */
export async function fetchCategories() {
    try {
        state.categories = (await SoyDeeAPI.request('/food-categories')) || [];
    } catch (e) {
        state.categories = [];
    }
    state.categoryMap = {};
    state.categories.forEach(c => { state.categoryMap[c.fd_id] = c; });
}

async function fetchRecords(date) {
    try {
        state.records = (await SoyDeeAPI.request(`/members/${state.mbId}/food-records`, { query: { date } })) || [];
    } catch (e) {
        state.records = [];
        showToast(I18N.t(FOOD_I18N, 'toast-load-failed'), 'error');
    }
}

export async function loadAndRender() {
    document.getElementById('dateText').textContent = formatDateThai(state.currentDate);
    // ปุ่ม "วันนี้" แสดงเฉพาะตอนดูวันย้อนหลัง — วันนี้อยู่แล้วไม่ต้องมีปุ่มกลับ
    document.getElementById('todayBtn').hidden = state.currentDate === todayISO();
    await fetchRecords(state.currentDate);
    renderSummary();
    renderLogList();
}
