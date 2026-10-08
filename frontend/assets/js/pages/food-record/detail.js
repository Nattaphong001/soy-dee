import { categoryById, mealById } from './helpers.js';
import { FOOD_I18N } from './i18n.js';
import { escapeHtml, foodPhotoHtml } from './render.js';
import { LIGHT_DOT_CLASS, state } from './state.js';

/* ==============================================================================
   Modal: ดูรายละเอียด (แยกจากฟอร์มแก้ไข) — แก้ไข/ลบ ทำจากในนี้
   ============================================================================== */
export function openDetail(id, opener) {
    const rec = state.records.find(r => r.dfd_id === id);
    if (!rec) return;
    state.detailId = id;
    state.detailOpener = opener || null;

    const cat = categoryById(rec.fd_id);
    const meal = mealById(rec.dfd_meal_type);
    const light = cat ? cat.fd_traffic_light : 0;

    document.getElementById('foodDetailCard').className = 'detail-card' + (light ? ' light-' + light : '');
    document.getElementById('detailPhotoMedia').innerHTML = foodPhotoHtml(rec);
    document.getElementById('detailName').textContent = rec.dfd_food_name;
    document.getElementById('detailCat').innerHTML =
        `<span class="badge-dot ${light ? LIGHT_DOT_CLASS[light] : 'dot-gray'}"></span>${cat ? escapeHtml(cat.fd_name) : I18N.t(FOOD_I18N, 'cat-none')}`;
    document.getElementById('detailMeal').innerHTML = meal
        ? `<i data-icon="${meal.icon}"></i>${I18N.t(FOOD_I18N, 'meal-' + meal.id)}` : '—';
    document.getElementById('detailTime').textContent = rec.dfd_time.slice(0, 5) + I18N.t(FOOD_I18N, 'time-suffix');
    document.getElementById('detailAmount').textContent = rec.dfd_amount || I18N.t(FOOD_I18N, 'detail-no-amount');
    document.getElementById('detailLight').innerHTML = light
        ? `<span class="badge-dot ${LIGHT_DOT_CLASS[light]}"></span>${I18N.t(FOOD_I18N, ['', 'light-green', 'light-yellow', 'light-red'][light])}` : '—';

    document.getElementById('foodDetailOverlay').classList.add('is-open');
    requestAnimationFrame(() => document.getElementById('detailEditBtn').focus());
}

export function closeDetail() {
    document.getElementById('foodDetailOverlay').classList.remove('is-open');
    if (state.detailOpener && document.contains(state.detailOpener)) state.detailOpener.focus();
    state.detailId = null;
    state.detailOpener = null;
}
