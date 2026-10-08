import { normalizeRecord, startOfDay, t, windowDates } from './helpers.js';
import { fetchMissingHistory, isHistoryOpen, renderHistory } from './history.js';
import { renderDate, renderRegular, renderSummary, renderWeek } from './render.js';
import { dayCache, state } from './state.js';

/* ==============================================================================
   3. Data
   ============================================================================== */
/** ไม่มี endpoint list ช่วงวันที่สำหรับ sleep-records (มีแค่ ?date= รายวัน ตาม API_SPEC.md §9)
 *  เลยยิง GET แยกทีละวันแบบขนาน เก็บผลลง dayCache — คืนจำนวนวันที่โหลดไม่สำเร็จ */
export async function fetchDays(keys) {
    let failed = 0;
    const results = await Promise.all(keys.map(k =>
        SoyDeeAPI.request(`/members/${state.mbId}/sleep-records`, { query: { date: k } })
            .then(r => (Array.isArray(r) && r.length ? normalizeRecord(r[0]) : null))
            .catch(() => { failed++; return undefined; })
    ));
    keys.forEach((k, i) => { if (results[i] !== undefined) dayCache.set(k, results[i]); });
    return failed;
}

export async function loadData() {
    const seq = ++state.loadSeq;
    const dates = windowDates();
    const failed = await fetchDays(dates);
    if (seq !== state.loadSeq) return;   // มีการเลื่อนวันใหม่ระหว่างรอ — ทิ้งผลนี้
    if (failed === dates.length) showToast(t('toast-load-failed'), 'error');
    state.sleepRecords = dates.map(k => dayCache.get(k)).filter(Boolean);   // ใหม่ → เก่า
    renderSummary();
    renderWeek();
    renderRegular();
    if (isHistoryOpen()) {
        await fetchMissingHistory();
        renderHistory();
    }
}

export async function changeDate(newDate) {
    state.selectedDate = startOfDay(newDate);
    renderDate();
    await loadData();
}
