import { renderActivity } from './activity.js';
import { renderBody } from './body.js';
import { renderFood } from './food.js';
import { $, dayCount, t, ymd } from './helpers.js';
import { renderOverview } from './kpi.js';
import { renderInsights, renderSleep } from './sleep.js';
import { TABS, state } from './state.js';

/* ==============================================================================
   8. โหลดข้อมูล + ช่วงเวลา
   ============================================================================== */
function currentRange() {
    if (state.rangeMode === 'custom') {
        const from = $('rangeFrom').value, to = $('rangeTo').value;
        if (!from || !to) return { error: 'range-missing' };
        if (from > to) return { error: 'range-invalid' };
        if (dayCount(from, to) > 366) return { error: 'range-too-long' };
        return { from, to };
    }
    const n = Number(state.rangeMode);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1));
    return { from: ymd(start), to: ymd(today) };
}

function showError(msg, canRetry) {
    $('reportErrorText').textContent = msg;
    $('reportRetry').hidden = !canRetry; // ข้อผิดพลาดจากการกรอกช่วงวันที่ไม่ต้องมีปุ่มลองใหม่
    $('reportError').hidden = false;
}

function setLoading(on) {
    TABS.forEach(k => {
        if (on && !state.report) $('panel-' + k).innerHTML = `<div class="rp-loading">${t('loading')}</div>`;
    });
    $('reportContent').classList.toggle('is-loading', on);
    $('rangeApply').disabled = on;
}

export async function loadReport() {
    const range = currentRange();
    $('reportError').hidden = true;
    if (range.error) { showError(t(range.error), false); return; }

    const seq = ++state.loadSeq;
    setLoading(true);
    try {
        const data = await SoyDeeAPI.request(`/members/${state.mbId}/report`, { query: { from: range.from, to: range.to } });
        if (seq !== state.loadSeq) return; // มีคำขอใหม่กว่าแล้ว — ทิ้งผลเก่า
        state.report = data;
        renderAll();
    } catch (err) {
        if (seq !== state.loadSeq) return;
        showError(`${t('load-error')}: ${err && err.message ? err.message : ''}`, true);
    } finally {
        if (seq === state.loadSeq) setLoading(false);
    }
}

function renderAll() {
    renderOverview();
    renderBody();
    renderFood();
    renderActivity();
    renderSleep();
    renderInsights();
}
