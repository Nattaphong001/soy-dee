import { categoryById, summaryTitleText } from './helpers.js';
import { FOOD_I18N } from './i18n.js';
import { LIGHT_DOT_CLASS, MEAL_TYPES, state } from './state.js';

/* ==============================================================================
   Rendering
   ============================================================================== */
export function renderSummary() {
    document.getElementById('summaryTitleText').textContent = summaryTitleText();
    const counts = { 1: 0, 2: 0, 3: 0 };
    state.records.forEach(r => {
        const cat = categoryById(r.fd_id);
        if (cat) counts[cat.fd_traffic_light] += 1;
    });
    document.getElementById('countGreen').textContent = counts[1];
    document.getElementById('countYellow').textContent = counts[2];
    document.getElementById('countRed').textContent = counts[3];
    document.getElementById('summaryTotal').textContent = I18N.t(FOOD_I18N, 'summary-total-template').replace('{count}', state.records.length);

    // แถบสัดส่วนสถานะ — ความกว้างแต่ละช่วงตามจำนวนรายการ (นับเฉพาะรายการที่มีประเภท)
    const counted = counts[1] + counts[2] + counts[3];
    const bar = document.getElementById('summaryBar');
    bar.classList.toggle('is-empty', counted === 0);
    bar.setAttribute('aria-label', I18N.t(FOOD_I18N, 'summary-bar-label')
        .replace('{g}', counts[1]).replace('{y}', counts[2]).replace('{r}', counts[3]));
    [['barGreen', 1], ['barYellow', 2], ['barRed', 3]].forEach(([id, light]) => {
        const seg = document.getElementById(id);
        seg.style.flexGrow = counts[light];
        seg.hidden = counts[light] === 0;
    });

    const insight = document.getElementById('summaryInsight');
    insight.hidden = counted === 0;
    if (counted > 0) {
        const key = counts[3] === 0 ? 'insight-no-red' : counts[3] > counts[1] ? 'insight-more-red' : 'insight-balanced';
        insight.textContent = I18N.t(FOOD_I18N, key);
    }
}

export function renderLogList() {
    const list = document.getElementById('logList');
    const badge = document.getElementById('logCountBadge');
    const items = [...state.records].sort((a, b) => a.dfd_time.localeCompare(b.dfd_time));

    badge.textContent = `${items.length} ${I18N.t(FOOD_I18N, 'items-suffix')}`;

    if (items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon"><i data-icon="note"></i></span>
                <div class="empty-state-title">${I18N.t(FOOD_I18N, 'empty-state-title')}</div>
                <div class="empty-state-desc">${I18N.t(FOOD_I18N, 'empty-state-desc')}</div>
            </div>
        `;
        return;
    }

    // จัดกลุ่มตามมื้อ (เฉพาะมื้อที่มีรายการ) เรียงกลุ่มตามเวลาแรกของมื้อ — items เรียงเวลาอยู่แล้ว
    const groups = MEAL_TYPES
        .map(meal => ({ meal, rows: items.filter(r => r.dfd_meal_type === meal.id) }))
        .filter(g => g.rows.length)
        .sort((a, b) => a.rows[0].dfd_time.localeCompare(b.rows[0].dfd_time));

    list.innerHTML = groups.map(({ meal, rows }) => `
        <div class="log-group">
            <div class="log-group-head">
                <i data-icon="${meal.icon}"></i>
                <span>${I18N.t(FOOD_I18N, 'meal-' + meal.id)}</span>
            </div>
            ${rows.map(renderLogItemHtml).join('')}
        </div>
    `).join('');
}

/** ไอคอนอาหารเป็นพื้นหลังเสมอ + <img> ทับ — รูปโหลดไม่ได้ก็ถูกลบทิ้ง เหลือไอคอนแทน (ดู listener 'error' ท้ายไฟล์) */
export function foodPhotoHtml(record) {
    const src = record.dfd_image ? SoyDeeAPI.assetUrl(record.dfd_image) : '';
    return `<i data-icon="food"></i>${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async">` : ''}`;
}

function renderLogItemHtml(record) {
    const cat = categoryById(record.fd_id);
    const dotClass = cat ? LIGHT_DOT_CLASS[cat.fd_traffic_light] : 'dot-gray';
    const label = I18N.t(FOOD_I18N, 'open-item-label').replace('{name}', escapeHtml(record.dfd_food_name));

    return `
        <div class="log-item ${cat ? 'light-' + cat.fd_traffic_light : ''}" data-id="${record.dfd_id}" data-open-id="${record.dfd_id}" role="button" tabindex="0" aria-label="${label}">
            <span class="log-thumb">${foodPhotoHtml(record)}</span>
            <div class="log-item-info">
                <span class="log-item-name">${escapeHtml(record.dfd_food_name)}</span>
                <span class="log-item-meta"><span class="numeric">${record.dfd_time.slice(0, 5)}</span>${record.dfd_amount ? ` · ${escapeHtml(record.dfd_amount)}` : ''}</span>
                <span class="cat-pill"><span class="badge-dot ${dotClass}"></span>${cat ? escapeHtml(cat.fd_name) : I18N.t(FOOD_I18N, 'cat-none')}</span>
            </div>
            <span class="log-item-chevron" aria-hidden="true"></span>
        </div>
    `;
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;');
}
