/* ==============================================================================
   1. ตัวช่วยทั่วไป
   ============================================================================== */

export const TABS = ['body', 'food', 'activity', 'sleep'];
// Mutable page state: ES module bindings are read-only across modules, so shared
// variables live on this object (state.x = ... from any module).
export const state = {
    mbId: null,
    report: null,
    rangeMode: '30',
    activeTab: 'body',
    loadSeq: 0,
};
