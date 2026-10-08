import { FOOD_I18N } from './i18n.js';
import { MEAL_TYPES, THAI_MONTHS_SHORT, state } from './state.js';

/* ==============================================================================
   Helpers
   ============================================================================== */
export function todayISO(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowTimeHHMM() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDateThai(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    if (I18N.getLang() === 'en') {
        return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const buddhistYear = y + 543;
    return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${buddhistYear}`;
}

// "สรุปโภชนาการวันนี้" ถ้ากำลังดูวันนี้ ไม่งั้นสลับเป็นวันที่จริงที่เลือก
export function summaryTitleText() {
    return state.currentDate === todayISO()
        ? I18N.t(FOOD_I18N, 'summary-title-today')
        : I18N.t(FOOD_I18N, 'summary-title-date-template').replace('{date}', formatDateThai(state.currentDate));
}

export function categoryById(fdId) {
    return state.categoryMap[fdId] || null;
}

export function mealById(id) {
    return MEAL_TYPES.find(m => m.id === id) || null;
}

/** เดามื้อที่น่าจะตรงกับตอนนี้ ใช้ตอนกดปุ่ม FAB (ไม่ได้เจาะจงมื้อจากการ์ด) */
export function guessCurrentMeal() {
    const h = new Date().getHours();
    if (h >= 5 && h < 10) return 1;
    if (h >= 10 && h < 14) return 2;
    if (h >= 17 && h < 21) return 3;
    return 4;
}
