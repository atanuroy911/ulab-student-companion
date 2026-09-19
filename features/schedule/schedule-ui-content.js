// features/schedule/schedule-ui-content.js — content script injected into
// the URMS student portal Class Schedule page (schedule.php). New for the
// UI-revamp phase (see reference-html/schedule.html for the legacy
// structure this replaces) — there was previously no content script for
// this page at all.
//
// SELECTOR CAVEAT: built against reference-html/schedule.html only (no live
// site access in this pass) — table structure identified by header text,
// same brittle-markup precaution used on every other page in this repo. The
// table has one row per class MEETING, not one row per course: a course
// that meets twice a week (e.g. MON + WED) gets its Course ID/Name/Section
// cells `rowspan`'d across both rows, so only the first row of a course has
// 6+ <td> cells (id/name/section/day/time/room); continuation rows have
// just 3 (day/time/room). Parsing below keys off that cell count rather
// than reading rowspan attributes directly, since that's simpler and
// matches exactly how the sample HTML is laid out.
(function () {
    const VIEW_ID = 'ulab-schedule-view';
    const STYLE_ID = 'ulab-schedule-view-css';
    const DAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // ── View mode ("previous calendar like scheduling. may be a toggle can
    // be there for both versions (now and previous)") ────────────────────
    // Both views are offered; the choice is remembered in chrome.storage.local
    // under this key, so it survives reloads and full-page portal navigations
    // (every Select / Advising action reloads schedule.php, so an in-memory
    // choice would be lost on literally every click the student makes here).
    const VIEW_MODE_KEY = 'ulabScheduleViewMode';
    const VIEW_MODES = ['table', 'calendar'];
    // Calendar is the default: a weekly grid is how students actually think
    // about their timetable. The dense table stays one toggle away.
    const DEFAULT_VIEW_MODE = 'calendar';

    function readViewMode(callback) {
        try {
            chrome.storage.local.get([VIEW_MODE_KEY], (store) => {
                const stored = store && store[VIEW_MODE_KEY];
                callback(VIEW_MODES.includes(stored) ? stored : DEFAULT_VIEW_MODE);
            });
        } catch (e) {
            // Storage unavailable (e.g. extension context invalidated after a
            // reload) must degrade to the default view, never blank the page.
            console.warn('[Student Companion] could not read the schedule view preference', e);
            callback(DEFAULT_VIEW_MODE);
        }
    }

    function writeViewMode(mode) {
        try { chrome.storage.local.set({ [VIEW_MODE_KEY]: mode }); }
        catch (e) { console.warn('[Student Companion] could not save the schedule view preference', e); }
    }

    function portalAction(href, label, active) {
        return `<a class="bento-action${active ? ' active' : ''}" href="${esc(href)}">${esc(label)}</a>`;
    }

    // A portal action control wrapper. `disabled` marks it for the shell's
    // disableControl() pass — see ULAB_SHELL.applyDisabledControls(). The
    // control's own markup is NEVER altered here; only whether it is live.
    function actionControl(markup, disabled, title) {
        return `<span class="bento-action-control"${disabled ? ' data-ulab-disabled="1"' : ''}${title ? ` title="${esc(title)}"` : ''}>${markup}</span>`;
    }

    function icon(path, size) {
        return `<svg viewBox="0 0 24 24" width="${size || 13}" height="${size || 13}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }
    const ICON_WARN = '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>';
    const ICON_INFO = '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>';
    const ICON_TABLE = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>';
    const ICON_CAL = '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>';

    // PARSER LOCATION: the schedule scrape (table location, the rowspan
    // meeting-continuation walk, and the extras/banner scrape) now lives in
    // features/shared/ulab-portal-parsers.js as parseSchedule(doc), so the
    // same code reads both this live page and a background-fetched copy of
    // schedule.php for the side panel. The render layer below is unchanged
    // and still receives exactly { courses, extras } with the same shapes.
    function findScheduleTable() {
        return window.ULAB_PARSERS.findScheduleTable(document);
    }

    // Parses the LIVE document (free, no request) and writes the same
    // ulabClassSchedule + ulabScheduleScrapedAt cache as before.
    function scrapeAndPersist() {
        try {
            return window.ULAB_PORTAL_DATA.storeFromDocument('schedule', document);
        } catch (e) {
            console.error('[Student Companion] failed to cache schedule.php data', e);
            try { return window.ULAB_PARSERS.parseSchedule(document); }
            catch (e2) { return { courses: [], extras: {} }; }
        }
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // Parses "4:30 PM - 5:50 PM" into a sortable minutes-since-midnight
    // start time; unparseable strings sort last rather than throwing.
    function startMinutes(timeStr) {
        const m = String(timeStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!m) return 24 * 60;
        let h = parseInt(m[1], 10) % 12;
        if (/PM/i.test(m[3])) h += 12;
        return h * 60 + parseInt(m[2], 10);
    }

    // Groups every course's meetings into a day-of-week agenda (SUN..SAT),
    // each day's meetings sorted by start time — this is a judgment call
    // per the task ("a simple day-grouped agenda view is probably clearest
    // given this is a side-panel/overlay context, not a full calendar
    // grid") rather than building a 2D weekly grid, which needs much more
    // layout room than the extension's panel/overlay width comfortably has.
    function groupByDay(courses) {
        const byDay = new Map(DAY_ORDER.map(d => [d, []]));
        for (const course of courses) {
            for (const meeting of course.meetings) {
                const day = (meeting.day || '').toUpperCase();
                if (!byDay.has(day)) byDay.set(day, []);
                byDay.get(day).push({
                    courseId: course.courseId,
                    courseName: course.courseName,
                    section: course.section,
                    time: meeting.time,
                    room: meeting.room,
                });
            }
        }
        for (const list of byDay.values()) list.sort((a, b) => startMinutes(a.time) - startMinutes(b.time));
        return byDay;
    }

    function todayIso() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function parseMeetingTime(time) {
        const match = String(time || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        const toMinutes = (hour, minute, meridiem) => {
            let value = parseInt(hour, 10) % 12;
            if (/PM/i.test(meridiem)) value += 12;
            return value * 60 + parseInt(minute, 10);
        };
        return { start: toMinutes(match[1], match[2], match[3]), end: toMinutes(match[4], match[5], match[6]) };
    }

    function dateForDay(startIso, day) {
        const [year, month, date] = startIso.split('-').map(Number);
        const result = new Date(year, month - 1, date);
        const target = DAY_ORDER.indexOf(String(day || '').toUpperCase());
        if (target < 0) return null;
        result.setDate(result.getDate() + (target - result.getDay() + 7) % 7);
        return result;
    }

    function pad(value) { return String(value).padStart(2, '0'); }

    function localDateTime(date, minutes) {
        const result = new Date(date);
        result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        return `${result.getFullYear()}${pad(result.getMonth() + 1)}${pad(result.getDate())}T${pad(result.getHours())}${pad(result.getMinutes())}00`;
    }

    function calendarEvents(courses, startIso, weeks) {
        const events = [];
        courses.forEach(course => course.meetings.forEach(meeting => {
            const parsed = parseMeetingTime(meeting.time);
            const date = dateForDay(startIso, meeting.day);
            if (!parsed || !date) return;
            events.push({
                courseId: course.courseId,
                courseName: course.courseName,
                section: course.section,
                room: meeting.room,
                day: String(meeting.day || '').toUpperCase(),
                time: meeting.time,
                date,
                start: localDateTime(date, parsed.start),
                end: localDateTime(date, parsed.end),
                weeks,
            });
        }));
        return events;
    }

    function googleCalendarUrl(event) {
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `${event.courseId} - ${event.courseName}`,
            dates: `${event.start}/${event.end}`,
            details: `ULAB class${event.section ? `, Section ${event.section}` : ''}. Added from ULAB Student Companion.`,
            location: event.room || '',
            recur: `RRULE:FREQ=WEEKLY;COUNT=${event.weeks}`,
            ctz: 'Asia/Dhaka',
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    function icsEscape(value) {
        return String(value || '').replace(/[\\;,\n]/g, match => match === '\\' ? '\\\\' : match === '\n' ? '\\n' : `\\${match}`);
    }

    function buildIcs(events) {
        const now = new Date();
        const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
        const body = events.map((event, index) => [
            'BEGIN:VEVENT',
            `UID:ulab-${Date.now()}-${index}@student-companion`,
            `DTSTAMP:${stamp}`,
            `DTSTART;TZID=Asia/Dhaka:${event.start}`,
            `DTEND;TZID=Asia/Dhaka:${event.end}`,
            `RRULE:FREQ=WEEKLY;COUNT=${event.weeks}`,
            `SUMMARY:${icsEscape(`${event.courseId} - ${event.courseName}`)}`,
            `LOCATION:${icsEscape(event.room)}`,
            `DESCRIPTION:${icsEscape(`ULAB class${event.section ? `, Section ${event.section}` : ''}`)}`,
            'END:VEVENT',
        ].join('\r\n')).join('\r\n');
        return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ULAB Student Companion//Class Schedule//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-TIMEZONE:Asia/Dhaka\r\n${body}\r\nEND:VCALENDAR\r\n`;
    }

    // ── LAYOUT DECISION (compact pass) ──────────────────────────────────
    // The previous view rendered THREE things: a 7-column day-card grid, a
    // <details> agenda per day, and a card list of courses — the same
    // meetings restated three times, and the 7-column grid forced a
    // horizontal scrollbar at panel/overlay width (7 × 132px minimum).
    //
    // Replaced by two dense tables with distinct jobs and no duplication:
    //   1. "Weekly meetings" — one row per MEETING, grouped under a day
    //      sub-header row (SUN..SAT, each day's meetings sorted by start
    //      time). This is the "when am I where" view, and being a table it
    //      reflows to one readable column of rows at any width instead of
    //      seven cramped ones. Carries the per-meeting Google Calendar link.
    //   2. "Registered courses" — one row per COURSE, carrying the portal's
    //      own Class Link and section-change controls verbatim.
    // A course whose meetings are rowspan'd across rows in the legacy table
    // still shows every meeting: table 1 lists each separately, table 2
    // summarises them in a Meetings cell.
    function renderWeek(courses, startIso, weeks) {
        if (!courses.length) return '<div class="bento-empty">No scheduled classes found.</div>';
        const byDay = groupByDay(courses);
        const events = calendarEvents(courses, startIso, weeks);
        const eventIndex = new Map(events.map((event, index) => [`${event.courseId}|${event.day}|${event.time}`, index]));

        // Days the portal reported that aren't in DAY_ORDER still render,
        // after the known week, rather than being silently dropped.
        const days = Array.from(byDay.keys()).sort((a, b) => {
            const ia = DAY_ORDER.indexOf(a), ib = DAY_ORDER.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        const body = days.map((day) => {
            const meetings = byDay.get(day);
            const head = `<tr class="is-group"><td colspan="6">${esc(day)} <span class="c-muted">— ${meetings.length ? `${meetings.length} class${meetings.length === 1 ? '' : 'es'}` : 'no class'}</span></td></tr>`;
            if (!meetings.length) return head;
            return head + meetings.map((m) => {
                const index = eventIndex.get(`${m.courseId}|${day}|${m.time}`);
                return `
                    <tr>
                        <td class="c-nowrap">${esc(m.time || '—')}</td>
                        <td class="c-code">${esc(m.courseId)}</td>
                        <td>${esc(m.courseName)}</td>
                        <td class="c-center">${m.section ? esc(m.section) : '—'}</td>
                        <td class="c-nowrap">${esc(m.room || '—')}</td>
                        <td>${index == null
                            ? '<span class="c-muted">—</span>'
                            : `<a class="bento-action" data-calendar-index="${index}" target="_blank" rel="noopener">Add to Google</a>`}</td>
                    </tr>`;
            }).join('');
        }).join('');

        return `
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>Time</th><th>Course ID</th><th>Course Name</th><th>Sec</th><th>Room No</th><th>Calendar</th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    // ── Calendar / weekly-grid view (restored) ───────────────────────────
    // This is the view the redesign replaced, brought back as the second half
    // of the toggle and restyled onto the current --bento-* tokens (the
    // original used the same tokens for colour but its own ad-hoc geometry).
    //
    // WHY IT WAS REMOVED, AND WHAT CHANGED: the original laid the week out as
    //   grid-template-columns: repeat(7, minmax(132px, 1fr)); overflow-x: auto
    // which is a hard 924px minimum — so inside the extension's panel/overlay
    // width it ALWAYS had a horizontal scrollbar, and every day column was
    // squeezed to its 132px floor. The restored version uses
    //   repeat(auto-fit, minmax(150px, 1fr))
    // with no overflow-x, so the seven day cards REFLOW — 7 columns on a wide
    // page, 3 or 2 in the side panel, 1 on a phone-width overlay — instead of
    // forcing the page sideways. Day cards also drop their fixed 210px
    // min-height in the narrow case, so an empty day costs a line, not a
    // screenful. Same data, same Google Calendar links (same event indices as
    // the table view, since both read calendarEvents(courses, …) in order).
    function renderCalendar(courses, startIso, weeks) {
        if (!courses.length) return '<div class="bento-empty">No scheduled classes found.</div>';
        const byDay = groupByDay(courses);
        const events = calendarEvents(courses, startIso, weeks);
        const eventIndex = new Map(events.map((event, index) => [`${event.courseId}|${event.day}|${event.time}`, index]));

        const days = Array.from(byDay.keys()).sort((a, b) => {
            const ia = DAY_ORDER.indexOf(a), ib = DAY_ORDER.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        const cards = days.map((day) => {
            const meetings = byDay.get(day) || [];
            const items = meetings.length
                ? meetings.map((m) => {
                    const index = eventIndex.get(`${m.courseId}|${day}|${m.time}`);
                    return `
                        <article class="sc-event">
                            <strong>${esc(m.time || '—')}</strong>
                            <span>${esc(m.courseId)}${m.section ? ` · ${esc(m.section)}` : ''}</span>
                            <small>${esc(m.courseName)}${m.room ? ` · ${esc(m.room)}` : ''}</small>
                            ${index == null ? '' : `<a class="sc-gcal" data-calendar-index="${index}" target="_blank" rel="noopener">Add to Google</a>`}
                        </article>`;
                }).join('')
                : '<span class="sc-empty">No class</span>';
            return `
                <section class="sc-day${meetings.length ? '' : ' is-free'}">
                    <div class="sc-day-name">${esc(day)}</div>
                    <div class="sc-day-count">${meetings.length ? `${meetings.length} class${meetings.length === 1 ? '' : 'es'}` : 'Open'}</div>
                    <div class="sc-day-items">${items}</div>
                </section>`;
        }).join('');

        return `<div class="sc-calendar">${cards}</div>`;
    }

    function renderScheduleBody(courses, mode, startIso, weeks) {
        return mode === 'calendar'
            ? renderCalendar(courses, startIso, weeks)
            : renderWeek(courses, startIso, weeks);
    }

    function wireCalendarTools(view, courses) {
        const startInput = view.querySelector('#ulab-calendar-start');
        const weeksInput = view.querySelector('#ulab-calendar-weeks');
        const downloadButton = view.querySelector('#ulab-download-ics');
        // These live in the toolbar ABOVE the swappable body, so they survive
        // a view switch — but guard anyway rather than throwing inside
        // mount()'s try/catch and silently blanking schedule.php.
        if (!startInput || !weeksInput || !downloadButton) {
            console.warn('[Student Companion] schedule calendar tools missing — export controls not wired');
            return { updateLinks() {}, readEvents: () => [] };
        }
        const readEvents = () => {
            const weeks = Math.max(1, Math.min(52, parseInt(weeksInput.value, 10) || 13));
            weeksInput.value = weeks;
            return calendarEvents(courses, startInput.value || todayIso(), weeks);
        };
        const updateLinks = () => readEvents().forEach((event, index) => {
            const link = view.querySelector(`[data-calendar-index="${index}"]`);
            if (link) link.href = googleCalendarUrl(event);
        });
        startInput.addEventListener('change', updateLinks);
        weeksInput.addEventListener('input', updateLinks);
        updateLinks();
        downloadButton.addEventListener('click', () => {
            const events = readEvents();
            if (!events.length) { alert('No class times could be read for calendar export.'); return; }
            const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'ulab-class-schedule.ics';
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
        // Returned so the view toggle can re-point the Google Calendar links
        // after it swaps the body out from under them.
        return { updateLinks, readEvents };
    }

    // One row per registered course. The last two cells are the portal's
    // OWN controls, preserved byte-for-byte from the scrape: the Class Link
    // cell (a real link when a class is live, the literal text the portal
    // rendered — e.g. "Not Available" — otherwise; never hardcoded here)
    // and the section-change control, which is driven by schedule.php's
    // inline callPHP(...) navigation. Both are only restyled by their
    // wrapper, never reimplemented.
    //
    // `sectionLocked` (registration-flow.md step 3→4): picking timings is the
    // step BEFORE "Advising Complete", so once advising is complete — or the
    // page says registration is complete — the per-course Select control is
    // a finished step and must not be clickable. The markup is still rendered
    // (the student can see which section they hold); it is just inert.
    function renderCourseList(courses, sectionLocked) {
        if (!courses.length) return '<div class="bento-empty">No courses found.</div>';
        return `
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>#</th><th>Course ID</th><th>Course Name</th><th>Sec</th><th>Meetings</th><th>Class Link</th><th>Section</th></tr></thead>
                    <tbody>${courses.map((c, i) => `
                        <tr>
                            <td class="c-num">${i + 1}</td>
                            <td class="c-code">${esc(c.courseId)}</td>
                            <td>${esc(c.courseName)}</td>
                            <td class="c-center">${c.section ? esc(c.section) : '—'}</td>
                            <td class="c-sub">${c.meetings.map(m => esc(`${m.day} ${m.time}${m.room ? ` · ${m.room}` : ''}`)).join('<br>') || '—'}</td>
                            <td><span class="bento-action-control">${c.classLinkMarkup || `<span class="c-muted">${esc(c.classLinkLabel || '—')}</span>`}</span></td>
                            <td>${actionControl(
                                c.sectionMarkup || `<span class="c-muted">${esc(c.sectionLabel || '—')}</span>`,
                                sectionLocked && !!c.sectionMarkup,
                                sectionLocked && c.sectionMarkup ? 'Your section is locked in — advising is already complete' : ''
                            )}</td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        // Almost everything this view needs now comes from bento-ui.css's
        // shared compact component layer (.bento-panel / .bento-tablewrap /
        // table.bento-compact / .bento-action* / .bento-field). What's left
        // is this page's visibility + legacy-hide rules and the toolbar row.
        style.textContent = `
            #${VIEW_ID} { display: none; padding: 10px 0 28px; text-align: left; font-family: var(--bento-font-ui); color: var(--bento-fg); }
            body.ulab-page-schedule.ulab-shell-mounted #${VIEW_ID} { display: block; }
            body.ulab-page-schedule.ulab-shell-mounted .ulab-legacy-schedule-table { display: none !important; }
            #${VIEW_ID} .schedule-tools { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:0 0 6px; }
            #${VIEW_ID} .schedule-tools .bento-action { cursor:pointer; }

            /* Calendar / weekly-grid view. auto-fit + minmax(150px,1fr) is
               the fix for the old repeat(7,minmax(132px,1fr)) + overflow-x
               that forced ~924px of horizontal scrolling at panel width:
               the day cards now wrap to as many columns as actually fit. */
            #${VIEW_ID} .sc-calendar { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; align-items:start; }
            #${VIEW_ID} .sc-day { display:flex; flex-direction:column; padding:9px 10px; background:var(--bento-card); border:1px solid var(--bento-border-soft); border-radius:var(--bento-radius-xs); box-shadow:var(--bento-shadow-sm); }
            /* A fixed min-height only makes sense once the full week is side
               by side; when the grid has wrapped, an empty day should cost a
               line, not a screenful. */
            @media (min-width: 1100px) { #${VIEW_ID} .sc-day { min-height:190px; } }
            #${VIEW_ID} .sc-day.is-free { background:var(--bento-card-alt); }
            #${VIEW_ID} .sc-day-name { font-size:10.5px; font-weight:800; letter-spacing:.08em; color:var(--bento-primary); }
            #${VIEW_ID} .sc-day-count { font-size:10px; color:var(--bento-fg-subtle); margin-top:1px; }
            #${VIEW_ID} .sc-day-items { display:flex; flex-direction:column; gap:6px; margin-top:8px; }
            #${VIEW_ID} .sc-event { padding:6px 7px; border-left:3px solid var(--bento-accent); background:var(--bento-card-alt); border-radius:var(--bento-radius-xs); min-width:0; }
            #${VIEW_ID} .sc-day.is-free .sc-event { background:var(--bento-card); }
            #${VIEW_ID} .sc-event strong, #${VIEW_ID} .sc-event span, #${VIEW_ID} .sc-event small, #${VIEW_ID} .sc-event a { display:block; overflow-wrap:anywhere; }
            #${VIEW_ID} .sc-event strong { font-size:10px; color:var(--bento-accent); }
            #${VIEW_ID} .sc-event span { font-size:11.5px; font-weight:800; margin-top:2px; color:var(--bento-fg); }
            #${VIEW_ID} .sc-event small { font-size:10px; line-height:1.35; color:var(--bento-fg-muted); margin-top:2px; }
            #${VIEW_ID} .sc-empty { font-size:10.5px; color:var(--bento-fg-subtle); padding:6px 0; }
            #${VIEW_ID} .sc-gcal { margin-top:5px; color:var(--bento-primary); font-size:9.5px; font-weight:800; text-decoration:none; }
            #${VIEW_ID} .sc-gcal:hover { text-decoration:underline; }
        `;
        document.head.appendChild(style);
    }

    function hideLegacyTable() {
        const table = findScheduleTable();
        if (table) table.classList.add('ulab-legacy-schedule-table');
    }

    function mountView(container) {
        let view = document.getElementById(VIEW_ID);
        if (!view) {
            view = document.createElement('div');
            view.id = VIEW_ID;
            view.className = 'bento-root';
            container.appendChild(view);
        }
        return view;
    }

    function render(courses, info, extras, viewMode) {
        const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
        injectStyle();
        hideLegacyTable();
        const view = mountView(contentCell);
        const mode = VIEW_MODES.includes(viewMode) ? viewMode : DEFAULT_VIEW_MODE;

        // ── Flow state (see registration-flow.md) ────────────────────────
        // "Registration complete. No changes can be made." is the hard lock:
        // when the page says it, EVERY action control on this page is dead.
        // Otherwise the rule is per-step: a step the page reports COMPLETE is
        // disabled, an incomplete one stays live. We never guess — both flags
        // come straight off the page's own ✅/❌ tick images and banner text.
        const registrationLocked = !!extras.registrationBanner;
        const advisingComplete = !!extras.advisingComplete;
        const advisingLocked = advisingComplete || registrationLocked;
        // Timings are step 3, immediately before "Advising Complete" (step 4),
        // so finishing advising closes section selection too.
        const sectionLocked = advisingComplete || registrationLocked;

        const banners = [];
        // "Registration complete. No changes can be made." — the red legacy
        // banner; kept verbatim as a notice strip.
        if (extras.registrationBanner) banners.push({ text: extras.registrationBanner, tone: 'info' });

        // ── Real error states (registration-flow.md) ─────────────────────
        // "Section Capacity exceeded" and "Conflicts found" are states we have
        // never captured in reference-html/, so they are surfaced as proper
        // .bento-notice blocks rather than one-line header banners. The
        // conflict path additionally prints extras.conflictCourses — the list
        // of conflicting courses the portal renders alongside the sentence,
        // which the banner-only regex used to drop. That list is [] on every
        // sample we have, in which case nothing extra is shown; it is never
        // fabricated. See ulab-portal-parsers.js's conflictCourses().
        const notices = [];
        if (extras.capacityNotice) {
            notices.push(`<div class="bento-notice warn">${icon(ICON_WARN)}<div><b>Section capacity exceeded.</b> ${esc(extras.capacityNotice)} Pick a different section for that course.</div></div>`);
        }
        if (extras.conflictNotice) {
            const list = Array.isArray(extras.conflictCourses) ? extras.conflictCourses : [];
            notices.push(`<div class="bento-notice danger">${icon(ICON_WARN)}<div><b>Conflicts found.</b> ${esc(extras.conflictNotice)}${
                list.length
                    ? `<div class="c-sub" style="margin-top:4px">Conflicting courses: ${list.map(item => `<b>${esc(item)}</b>`).join(', ')}</div>`
                    : ''
            }</div></div>`);
        }
        if (extras.selectionNotice) {
            notices.push(`<div class="bento-notice info">${icon(ICON_INFO)}<div>${esc(extras.selectionNotice)}</div></div>`);
        }

        const meetingCount = courses.reduce((sum, c) => sum + c.meetings.length, 0);
        const headerCardHtml = window.ULAB_SHELL.renderHeaderCard(info, {
            title: 'Class Schedule',
            banners,
            // DUPLICATE CONTROL REMOVED: this used to also carry a
            //   { text: `Advising ${…}`, tone: … }
            // status pill, which rendered the same "Advising complete" state
            // a second time, right above the actions row that already states
            // AND performs it. The actions-row control is the one that
            // survives, because it is the actionable one and it already
            // carries the status in its own label ("Advising complete" when
            // done, "Mark advising complete" when not) — whereas the pill
            // could only ever report. Dropping the pill therefore loses no
            // information; dropping the button would have lost the action.
            // schedule.php carries "Advising Complete" only — there is no
            // pre-advising flag on this page (that one is
            // Preregistration.php's). Do not add one here.
            pills: [],
            stats: [
                { label: 'Courses', value: courses.length },
                { label: 'Weekly classes', value: meetingCount },
            ],
        });

        const advisingHref = `/schedule.php?task=changeAdvStatus&studentID=${encodeURIComponent(info.studentId || '')}&select=${advisingComplete ? '0' : '1'}`;
        const advisingTitle = registrationLocked
            ? 'Registration is complete — no changes can be made'
            : (advisingComplete ? 'Advising is already complete' : 'Mark your advising as complete');

        view.innerHTML = `
            ${headerCardHtml}

            ${notices.join('')}

            <div class="bento-actions">
                ${(extras.actionMarkup || []).map(markup => actionControl(markup, advisingLocked, advisingTitle)).join('')}
                ${actionControl(
                    portalAction(advisingHref, advisingComplete ? 'Advising complete' : 'Mark advising complete', advisingComplete),
                    advisingLocked,
                    advisingTitle
                )}
            </div>

            <h2 class="bento-sectitle">Weekly meetings</h2>
            <div class="schedule-tools">
                <div class="bento-segmented" role="group" aria-label="Schedule view">
                    <button type="button" class="bento-chip${mode === 'table' ? ' on' : ''}" data-view-mode="table" aria-pressed="${mode === 'table'}">${icon(ICON_TABLE, 12)}Table</button>
                    <button type="button" class="bento-chip${mode === 'calendar' ? ' on' : ''}" data-view-mode="calendar" aria-pressed="${mode === 'calendar'}">${icon(ICON_CAL, 12)}Calendar</button>
                </div>
                <label class="bento-field" for="ulab-calendar-start">Start date <input id="ulab-calendar-start" type="date" value="${todayIso()}"></label>
                <label class="bento-field" for="ulab-calendar-weeks">Weeks <input id="ulab-calendar-weeks" type="number" min="1" max="52" value="13" style="width:64px"></label>
                <button id="ulab-download-ics" class="bento-action" type="button">Download all .ics</button>
            </div>
            <div id="ulab-schedule-body">${renderScheduleBody(courses, mode, todayIso(), 13)}</div>

            <h2 class="bento-sectitle">Registered courses</h2>
            ${renderCourseList(courses, sectionLocked)}

            <p class="bento-footnote">Calendar export builds a weekly repeating event per class meeting from the start date and week count above; it does not know the university's holiday calendar. <b>Class Link</b> and <b>Section</b> are the portal's own controls, passed through unchanged.${
                sectionLocked ? ' Section changes are shown but not clickable because this step is already complete.' : ''
            }</p>
        `;

        const tools = wireCalendarTools(view, courses);
        // Applied LAST, over the finished DOM, so it catches both the actions
        // row and every per-course Section control in one pass.
        // Defensive: an older cached copy of the shell without this helper
        // would throw here, and mount()'s try/catch would swallow it into a
        // blank page (this project's known bug class). Degrade to "nothing
        // disabled" instead — the page stays usable and says why.
        if (typeof window.ULAB_SHELL.applyDisabledControls === 'function') {
            window.ULAB_SHELL.applyDisabledControls(view);
        } else {
            console.warn('[Student Companion] ULAB_SHELL.applyDisabledControls is missing — completed-step controls will not be disabled.');
        }

        // ── View toggle ──────────────────────────────────────────────────
        // Only the body between the toolbar and "Registered courses" is
        // swapped, so the start-date / weeks / .ics controls (and their
        // in-progress values) and the advising actions row are untouched.
        // updateLinks() re-points the freshly rendered Google Calendar
        // anchors at the same event indices.
        const body = view.querySelector('#ulab-schedule-body');
        Array.from(view.querySelectorAll('[data-view-mode]')).forEach((button) => {
            button.addEventListener('click', () => {
                const next = button.getAttribute('data-view-mode');
                if (!VIEW_MODES.includes(next) || !body) return;
                const startInput = view.querySelector('#ulab-calendar-start');
                const weeksInput = view.querySelector('#ulab-calendar-weeks');
                const weeks = Math.max(1, Math.min(52, parseInt(weeksInput && weeksInput.value, 10) || 13));
                body.innerHTML = renderScheduleBody(courses, next, (startInput && startInput.value) || todayIso(), weeks);
                Array.from(view.querySelectorAll('[data-view-mode]')).forEach((other) => {
                    const on = other === button;
                    other.classList.toggle('on', on);
                    other.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                tools.updateLinks();
                writeViewMode(next);
            });
        });
    }

    function init() {
        // GUARD against this project's known silent-blank-page bug class:
        // these files now depend on the two shared modules
        // (features/shared/ulab-portal-parsers.js and ulab-portal-data.js).
        // If a manifest bundle is missing them, throwing inside mount()'s
        // onMount would be swallowed by its try/catch and blank the whole
        // page. Bail BEFORE mount() instead: the shell's cloak self-clears
        // after 1.5s, so the student gets the untouched legacy page and we
        // get a loud console error, never a blank one.
        if (!window.ULAB_PARSERS || !window.ULAB_PORTAL_DATA) {
            console.error('[Student Companion] shared portal modules are not loaded — skipping the modern view for this page. Add features/shared/ulab-portal-parsers.js and features/shared/ulab-portal-data.js to the content_scripts entry for this page.');
            return;
        }
        window.ULAB_SHELL.mount('ulab-page-schedule', null, (info) => {
            const parsed = scrapeAndPersist();
            // The stored Table/Calendar choice is read before the first paint
            // so a reload (which every portal action causes) comes back in the
            // view the student picked, not the default.
            readViewMode(mode => render(parsed.courses, info, parsed.extras, mode));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
