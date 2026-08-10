/* =========================================================================
   Shared Calendar Dropdown — ปฏิทินแบบ dropdown ใช้ร่วมกันทุกหน้า
   คู่กับ /assets/css/shared/datepicker.css
   เรียกใช้: SoyDeeDatePicker.attach({ pillEl, todayBtnEl, getDate, onSelect, disableFuture })
   สร้างแยกจากหน้า แล้วเรียกใช้ร่วมกัน (index.html, food-record.html,
   activity-record.html) เพื่อให้ทั้งสถานะปิด (pill) และสถานะเปิด (ปฏิทิน)
   หน้าตาเหมือนกันทุกหน้าตามมาตรฐานเดียว
   ค่าเริ่มต้น disableFuture = true: ห้ามเลือก/เลื่อนไปวันที่หรือเดือนในอนาคต
   (บันทึกข้อมูลล่วงหน้าไม่ได้ เพราะยังไม่เกิดขึ้นจริง)
   ========================================================================= */
(function (global) {
    var THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    var THAI_WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    function isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    }

    function isAfterDay(a, b) {
        var da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        var db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        return da.getTime() > db.getTime();
    }

    function attach(options) {
        var pillEl = options.pillEl;
        var todayBtnEl = options.todayBtnEl || null;
        var getDate = options.getDate;
        var onSelect = options.onSelect;
        var disableFuture = options.disableFuture !== false;

        var panel = null;
        var viewDate = new Date(getDate());

        function refreshTodayBtn() {
            if (!todayBtnEl) return;
            todayBtnEl.classList.toggle('is-away', !isSameDay(getDate(), new Date()));
        }

        function close() {
            if (!panel) return;
            panel.remove();
            panel = null;
            pillEl.classList.remove('is-active');
            document.removeEventListener('mousedown', onOutsideClick, true);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
        }

        function onOutsideClick(e) {
            if (panel && !panel.contains(e.target) && e.target !== pillEl && !pillEl.contains(e.target)) {
                close();
            }
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') close();
        }

        function selectDate(d) {
            if (disableFuture && isAfterDay(d, new Date())) return;
            onSelect(new Date(d));
            refreshTodayBtn();
            close();
        }

        function render() {
            panel.innerHTML = '';

            var header = document.createElement('div');
            header.className = 'calendar-dropdown-header';

            var prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'calendar-nav-btn';
            prevBtn.setAttribute('aria-label', 'เดือนก่อนหน้า');
            prevBtn.textContent = '‹';
            prevBtn.addEventListener('click', function () {
                viewDate.setMonth(viewDate.getMonth() - 1);
                render();
            });

            var label = document.createElement('div');
            label.className = 'calendar-month-label';
            label.textContent = THAI_MONTHS[viewDate.getMonth()] + ' ' + (viewDate.getFullYear() + 543);

            var nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'calendar-nav-btn';
            nextBtn.setAttribute('aria-label', 'เดือนถัดไป');
            nextBtn.textContent = '›';
            var today0 = new Date();
            var viewIsCurrentMonth = viewDate.getFullYear() === today0.getFullYear() &&
                viewDate.getMonth() === today0.getMonth();
            if (disableFuture && viewIsCurrentMonth) {
                nextBtn.disabled = true;
                nextBtn.classList.add('is-disabled');
            } else {
                nextBtn.addEventListener('click', function () {
                    viewDate.setMonth(viewDate.getMonth() + 1);
                    render();
                });
            }

            header.appendChild(prevBtn);
            header.appendChild(label);
            header.appendChild(nextBtn);

            var weekRow = document.createElement('div');
            weekRow.className = 'calendar-weekday-row';
            THAI_WEEKDAYS.forEach(function (w) {
                var s = document.createElement('span');
                s.textContent = w;
                weekRow.appendChild(s);
            });

            var grid = document.createElement('div');
            grid.className = 'calendar-day-grid';

            var firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            var daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
            var today = new Date();
            var selected = getDate();

            for (var i = 0; i < firstOfMonth.getDay(); i++) {
                var empty = document.createElement('span');
                empty.className = 'calendar-day-empty';
                grid.appendChild(empty);
            }
            for (var d = 1; d <= daysInMonth; d++) {
                (function (d) {
                    var cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'calendar-day-cell';
                    btn.textContent = String(d);
                    if (isSameDay(cellDate, today)) btn.classList.add('is-today');
                    if (isSameDay(cellDate, selected)) btn.classList.add('is-selected');
                    if (disableFuture && isAfterDay(cellDate, today)) {
                        btn.disabled = true;
                        btn.classList.add('is-disabled');
                    } else {
                        btn.addEventListener('click', function () { selectDate(cellDate); });
                    }
                    grid.appendChild(btn);
                })(d);
            }

            var footer = document.createElement('div');
            footer.className = 'calendar-dropdown-footer';
            var todayLink = document.createElement('button');
            todayLink.type = 'button';
            todayLink.className = 'calendar-today-link';
            todayLink.textContent = 'ไปวันนี้';
            todayLink.addEventListener('click', function () { selectDate(new Date()); });
            footer.appendChild(todayLink);

            panel.appendChild(header);
            panel.appendChild(weekRow);
            panel.appendChild(grid);
            panel.appendChild(footer);
        }

        function open() {
            if (panel) { close(); return; }
            viewDate = new Date(getDate());
            panel = document.createElement('div');
            panel.className = 'calendar-dropdown';
            document.body.appendChild(panel);
            render();
            pillEl.classList.add('is-active');

            requestAnimationFrame(function () {
                var rect = pillEl.getBoundingClientRect();
                var panelRect = panel.getBoundingClientRect();
                var left = rect.right - panelRect.width;
                left = Math.max(12, Math.min(left, window.innerWidth - panelRect.width - 12));
                var top = rect.bottom + 8;
                if (top + panelRect.height > window.innerHeight - 12) {
                    top = Math.max(12, rect.top - panelRect.height - 8);
                }
                panel.style.left = left + 'px';
                panel.style.top = top + 'px';
                panel.classList.add('is-open');
            });

            document.addEventListener('mousedown', onOutsideClick, true);
            document.addEventListener('keydown', onKeyDown, true);
            window.addEventListener('resize', close);
            window.addEventListener('scroll', close, true);
        }

        pillEl.addEventListener('click', function (e) {
            e.preventDefault();
            open();
        });

        if (todayBtnEl) {
            todayBtnEl.addEventListener('click', function () { selectDate(new Date()); });
            refreshTodayBtn();
        }

        return { close: close, refreshTodayBtn: refreshTodayBtn };
    }

    global.SoyDeeDatePicker = { attach: attach };
})(window);
