import { clockFromNoon, computeConsistency, currentRecord, dateKey, escapeHtml, evalKeyOf, formatHours, formatSpan, formatThaiDate, formatTime, isToday, minutesFromNoon, parseDateKey, qualityKey, t, tpl, windowDates } from './helpers.js';
import { METER_MAX_HOURS, NEAR_AVG_MIN, REGULAR_EVAL, SLEEP_THRESHOLDS, WEEKDAYS, state } from './state.js';

/* ==============================================================================
   4. Render: วันที่ + การ์ดสรุป
   ============================================================================== */
export function renderDate() {
    document.getElementById('dateText').textContent = formatThaiDate(state.selectedDate);
    // ปุ่ม "วันนี้" แสดงเฉพาะตอนดูวันย้อนหลัง — วันนี้อยู่แล้วไม่ต้องมีปุ่มกลับ
    document.getElementById('todayBtn').hidden = isToday(state.selectedDate);
    if (state.sleepDatePicker) state.sleepDatePicker.refreshTodayBtn();
}

export function setEvalClass(el, evalKey) {
    el.classList.remove('eval-low', 'eval-ok', 'eval-high');
    if (evalKey) el.classList.add(`eval-${evalKey}`);
}

export function renderSummary() {
    const rec = currentRecord();
    const evalKey = evalKeyOf(rec);
    const card = document.getElementById('sleepSummary');
    setEvalClass(card, evalKey);

    document.getElementById('summaryTitleText').textContent = isToday(state.selectedDate)
        ? t('summary-title-today')
        : tpl('summary-title-date-template', { date: formatThaiDate(state.selectedDate) });

    document.getElementById('summaryHours').textContent = rec ? formatHours(rec.hours) : '–';
    document.getElementById('summaryHoursUnit').textContent = t('unit-hour');
    document.getElementById('summaryStart').textContent = rec ? formatTime(rec.start) : '–';
    document.getElementById('summaryEnd').textContent = rec ? formatTime(rec.end) : '–';
    document.getElementById('summaryQuality').textContent = rec ? t(qualityKey(rec)) : '–';

    // มีบันทึกแล้ว: กดการ์ดเพื่อดูรายละเอียด (แก้ไข/ลบ)
    card.classList.toggle('is-link', !!rec);
    document.getElementById('summaryChevron').hidden = !rec;
    if (rec) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', t('open-summary-label'));
    } else {
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-label');
    }

    const evalPill = document.getElementById('summaryEval');
    evalPill.hidden = !rec;
    if (rec) document.getElementById('summaryEvalText').textContent = t(`eval-${evalKey}`);

    const meter = document.getElementById('sleepMeter');
    meter.setAttribute('aria-label', t('summary-meter-label'));
    document.getElementById('sleepMeterFill').style.width =
        rec ? `${Math.min(rec.hours / METER_MAX_HOURS, 1) * 100}%` : '0';

    const insight = document.getElementById('summaryInsight');
    if (!rec) {
        insight.textContent = t(emptyInsightKey());
    } else if (evalKey === 'low') {
        insight.textContent = tpl('insight-low', { diff: formatHours(SLEEP_THRESHOLDS.low - rec.hours) });
    } else if (evalKey === 'high') {
        insight.textContent = tpl('insight-high', { diff: formatHours(rec.hours - SLEEP_THRESHOLDS.high) });
    } else {
        insight.textContent = t('insight-ok');
    }

    const action = document.getElementById('summaryActionBtn');
    action.textContent = t(rec ? 'cta-edit' : 'cta-add');
    action.classList.toggle('is-secondary', !!rec);
}

/** วันนี้ที่ยังไม่มีบันทึก: ข้อความตามช่วงเวลา (หลังเที่ยงคืน = ยังไม่ตื่น, หลัง 20:00 = ใกล้เวลานอน) */
function emptyInsightKey() {
    if (!isToday(state.selectedDate)) return 'insight-empty-date';
    const h = new Date().getHours();
    if (h < 5) return 'insight-empty-late';
    return h >= 20 ? 'insight-empty-evening' : 'insight-empty-today';
}

/* ==============================================================================
   4b. Render: ภาพรวม 7 วัน (กราฟแท่ง เก่า → ใหม่ + เส้นค่าเฉลี่ย)
   ============================================================================== */
export function renderWeek() {
    const card = document.getElementById('weekCard');
    card.hidden = state.sleepRecords.length === 0;
    card.setAttribute('aria-label', t('history-open-label'));
    if (state.sleepRecords.length === 0) return;

    const days = windowDates().reverse();
    const byDate = {};
    state.sleepRecords.forEach(r => { byDate[r.date] = r; });
    const wd = WEEKDAYS[I18N.getLang()] || WEEKDAYS.th;
    const selKey = dateKey(state.selectedDate);

    document.getElementById('weekBars').innerHTML = days.map((k, i) => {
        const rec = byDate[k];
        if (!rec) return '<div class="week-bar-wrap is-none"><span class="week-bar"></span></div>';
        const pct = Math.min(rec.hours / METER_MAX_HOURS, 1) * 100;
        const sel = k === selKey ? ' is-selected' : '';
        return `<div class="week-bar-wrap eval-${evalKeyOf(rec)}${sel}"><span class="week-bar" style="height:${pct}%;--i:${i}"></span></div>`;
    }).join('');

    document.getElementById('weekLabels').innerHTML = days.map(k => {
        const d = parseDateKey(k);
        return `<span class="week-label${k === selKey ? ' is-current' : ''}">${wd[d.getDay()]}<br>${d.getDate()}</span>`;
    }).join('');

    document.getElementById('weekChart').setAttribute('aria-label', t('week-chart-label'));
    document.getElementById('weekTotal').textContent = tpl('week-total-template', { n: state.sleepRecords.length });
    const avg = state.sleepRecords.reduce((sum, r) => sum + r.hours, 0) / state.sleepRecords.length;
    document.getElementById('weekAvg').textContent = formatSpan(Math.round(avg * 60));
    document.getElementById('weekAvgLine').style.bottom = `${Math.min(avg / METER_MAX_HOURS, 1) * 100}%`;
    document.getElementById('weekInRange').textContent = tpl('week-in-range-template', {
        n: state.sleepRecords.filter(r => evalKeyOf(r) === 'ok').length,
        m: state.sleepRecords.length
    });
}

/* ==============================================================================
   4c. Render: ความสม่ำเสมอ (จุดต่อคืน แถวเข้านอน/ตื่น เทียบค่าเฉลี่ย 7 วัน)
   ============================================================================== */
export function renderRegular() {
    const card = document.getElementById('regularCard');
    card.hidden = state.sleepRecords.length === 0;
    card.setAttribute('aria-label', t('history-open-label'));
    if (state.sleepRecords.length === 0) return;

    const c = computeConsistency(state.sleepRecords);
    card.classList.toggle('is-unrated', !c.level);   // ยังไม่ครบ 3 คืน: ซ่อนคำอธิบายสีใกล้/ห่าง
    const days = windowDates().reverse();
    const byDate = {};
    state.sleepRecords.forEach(r => { byDate[r.date] = r; });
    const wd = WEEKDAYS[I18N.getLang()] || WEEKDAYS.th;
    const selKey = dateKey(state.selectedDate);
    const near = (dt, avg) => Math.abs(minutesFromNoon(dt) - avg) <= NEAR_AVG_MIN;

    // ยังไม่ครบ 3 คืน = ไม่ประเมินใกล้/ห่าง แสดงจุดสีเดียวว่าบันทึกแล้ว
    const dot = (rec, field, avg, labelKey) => {
        if (!rec) return '<span class="regular-dot is-none"></span>';
        const cls = c.level ? (near(rec[field], avg) ? 'is-near' : 'is-far') : 'is-logged';
        return `<span class="regular-dot ${cls}" title="${escapeHtml(t(labelKey) + ' ' + formatTime(rec[field]))}"></span>`;
    };
    const row = (icon, field, avg, labelKey) =>
        `<div class="regular-row"><span class="regular-ico" title="${escapeHtml(t(labelKey))}"><i data-icon="${icon}"></i></span>${days.map(k => dot(byDate[k], field, avg, labelKey)).join('')}</div>`;
    const labels = days.map(k => `<span class="week-label${k === selKey ? ' is-current' : ''}">${wd[parseDateKey(k).getDay()]}<br>${parseDateKey(k).getDate()}</span>`).join('');
    document.getElementById('regularGrid').innerHTML =
        row('moon', 'start', c.bed, 'row-bed') + row('sun', 'end', c.wake, 'row-wake') +
        `<div class="regular-row is-days"><span></span>${labels}</div>`;

    const nearNights = state.sleepRecords.filter(r => near(r.start, c.bed) && near(r.end, c.wake)).length;
    document.getElementById('regularSub').textContent = c.level
        ? tpl('regular-sub-template', { n: nearNights, m: state.sleepRecords.length })
        : t('regular-need-more');
    const pill = document.getElementById('regularLevel');
    pill.hidden = !c.level;
    setEvalClass(pill, c.level ? REGULAR_EVAL[c.level] : '');
    if (c.level) document.getElementById('regularLevelText').textContent = tpl('regular-level-template', { l: t(`regular-${c.level}`) });

    document.getElementById('weekAvgStart').textContent = clockFromNoon(c.bed);
    document.getElementById('weekAvgEnd').textContent = clockFromNoon(c.wake);
    const note = document.getElementById('weekRegularNote');
    note.hidden = !c.level;
    if (c.level) note.textContent = c.span < 5 ? t('week-spread-same') : tpl('week-spread-template', { span: formatSpan(c.span) });
}
