// features/routine/routine-feature.js — "Routine & Export": a student-facing
// class-routine editor with printable / Word / calendar exports.
//
// REPLACES the previous one-line-per-function features/schedule/
// schedule-tools-feature.js, keeping its feature id ('schedule-tools') so
// the already-wired My Tools entry (ulab-dashboard-shell.js's
// `open-tool:schedule-tools` -> openExtensionFrame('sidebar/sidebar.html
// ?feature=schedule-tools')) and the side-panel rail both keep working with
// no manifest or shell change. The old version saved edits straight back
// over `ulabClassSchedule` — the scrape target — so the next visit to
// schedule.php silently destroyed them. That is the bug this rewrite exists
// to fix.
//
// Ported from ulab-faculty-companion's features/class-schedule/ (the weekly
// Time x Day grid, the .docx export — see routine-docx.js — and the ICS /
// Google-Calendar date maths from results.js). Consultation hours are
// faculty-only and are deliberately NOT ported: consultation-modal.js and
// consultation-schedule.js have no student counterpart.
//
// Data flow:
//   ulabClassSchedule  (written by features/schedule/schedule-ui-content.js)
//     -> read-only baseline, never written to from here
//   ulabRoutineDraft   (owned by this file)
//     -> the student's edited copy + header overrides + a fingerprint of
//        the baseline it was derived from, so a later re-scrape can be
//        DETECTED and offered, never silently applied.
(function () {
    const SCRAPE_KEY = 'ulabClassSchedule';
    const DRAFT_KEY = 'ulabRoutineDraft';
    const PROFILE_KEY = 'ulabStudentProfile';
    const INFO_KEY = 'ulabStudentInfo';
    const PORTAL = 'https://urms-online.ulab.edu.bd';

    const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const DAY_NAMES = {
        SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday',
        THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday',
    };

    const esc = (value) => String(value == null ? '' : value)
        .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ── Model ───────────────────────────────────────────────────────────
    // The scrape is course-shaped (one entry per course, N meetings each);
    // editing is meeting-shaped (one editable row per class slot). Flatten
    // on load, regroup on export.
    let rows = [];            // [{ uid, courseId, courseName, section, day, time, room }]
    let header = {};          // { name, studentId, program, semester, note }
    let scraped = [];         // read-only baseline
    let baseline = '';        // fingerprint of `scraped` when the draft was saved
    let profile = null;
    let info = null;
    let dirty = false;
    let photoState = { url: null, failed: false };
    let root = null;
    let uidCounter = 0;
    // Calendar-export settings live in module state, not only in the DOM, so
    // a structural re-render (add/remove row) doesn't reset them.
    let calStart = '';
    let calWeeks = 14;

    function nextUid() { uidCounter += 1; return `r${Date.now().toString(36)}${uidCounter}`; }

    function flatten(courses) {
        const out = [];
        (courses || []).forEach((course) => {
            (course.meetings || []).forEach((meeting) => {
                out.push({
                    uid: nextUid(),
                    courseId: course.courseId || '',
                    courseName: course.courseName || '',
                    section: course.section || '',
                    day: String(meeting.day || '').toUpperCase(),
                    time: meeting.time || '',
                    room: meeting.room || '',
                });
            });
        });
        return out;
    }

    function fingerprint(courses) {
        return (courses || []).map((course) => [
            course.courseId, course.section,
            (course.meetings || []).map((m) => `${m.day}@${m.time}@${m.room}`).join(','),
        ].join('|')).join(';');
    }

    function startMinutes(timeText) {
        const m = String(timeText || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!m) return 24 * 60 + 1; // unparseable slots sort last, never crash
        let h = parseInt(m[1], 10) % 12;
        if (/PM/i.test(m[3])) h += 12;
        return h * 60 + parseInt(m[2], 10);
    }

    function endMinutes(timeText) {
        const all = String(timeText || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
        if (!all || all.length < 2) return null;
        const m = all[1].match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        let h = parseInt(m[1], 10) % 12;
        if (/PM/i.test(m[3])) h += 12;
        return h * 60 + parseInt(m[2], 10);
    }

    function usedDays() {
        const present = new Set(rows.map((r) => r.day).filter(Boolean));
        const known = DAYS.filter((d) => present.has(d));
        const extra = Array.from(present).filter((d) => !DAYS.includes(d)).sort();
        return known.concat(extra);
    }

    function usedSlots() {
        const seen = new Map();
        rows.forEach((r) => { if (r.time && !seen.has(r.time)) seen.set(r.time, startMinutes(r.time)); });
        return Array.from(seen.keys()).sort((a, b) => seen.get(a) - seen.get(b));
    }

    function rowsAt(day, slot) {
        return rows.filter((r) => r.day === day && r.time === slot);
    }

    // Regroups the flat editable rows back into the course-shaped structure
    // the exporters want, preserving first-seen course order.
    function groupedCourses() {
        const byCourse = new Map();
        rows.forEach((r) => {
            const key = `${r.courseId}|${r.section}`;
            if (!byCourse.has(key)) {
                byCourse.set(key, { courseId: r.courseId, courseName: r.courseName, section: r.section, meetings: [] });
            }
            byCourse.get(key).meetings.push({ day: r.day, time: r.time, room: r.room });
        });
        return Array.from(byCourse.values());
    }

    // ── Header (auto-filled from the profile + shell scrapes) ───────────
    function defaultHeader() {
        const semester = info && (info.semesterLabel || info.semesterCode)
            ? (info.semesterLabel && info.semesterCode
                ? `${info.semesterLabel} (${info.semesterCode})`
                : (info.semesterLabel || info.semesterCode))
            : '';
        return {
            name: (profile && profile.studentName) || (info && info.studentName) || '',
            studentId: (profile && profile.studentId) || (info && info.studentId) || '',
            program: (profile && profile.programCode) || '',
            semester,
            note: '',
        };
    }

    // The photo comes from profile.php's scrape (ulabStudentProfile.photoUrl,
    // typically the relative "Photo/<id>.jpg"); when that is missing we can
    // still reconstruct it from the student ID, because the portal serves
    // every student photo at a fixed path. Either way it is only ever a
    // CANDIDATE url: it 404s when not signed in, so every consumer must
    // handle failure (the UI swaps in an initial avatar, the .docx simply
    // omits the picture).
    function photoUrl() {
        const raw = profile && profile.photoUrl;
        if (raw) {
            if (/^https?:/i.test(raw)) return raw;
            return `${PORTAL}/${String(raw).replace(/^\/+/, '')}`;
        }
        const id = (profile && profile.studentId) || (info && info.studentId);
        return id ? `${PORTAL}/Photo/${id}.jpg` : null;
    }

    function initials() {
        const name = (header.name || '').trim();
        if (!name) return '?';
        const parts = name.split(/\s+/);
        return ((parts[0][0] || '') + (parts.length > 1 ? (parts[parts.length - 1][0] || '') : '')).toUpperCase();
    }

    // Fetches the photo as a data URL + natural size, for embedding into the
    // .docx. Resolves to null on any failure (404, signed out, CORS) —
    // the export must never be blocked by a missing picture.
    function loadPhotoForExport() {
        const url = photoUrl();
        if (!url || photoState.failed) return Promise.resolve(null);
        return fetch(url, { credentials: 'include' })
            .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('photo ' + res.status))))
            .then((blob) => new Promise((resolve, reject) => {
                if (!/^image\//.test(blob.type)) { reject(new Error('not an image')); return; }
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('read failed'));
                reader.readAsDataURL(blob);
            }))
            .then((dataUrl) => new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = () => resolve({ dataUrl, width: 0, height: 0 });
                img.src = dataUrl;
            }))
            .catch(() => null);
    }

    // ── Persistence ─────────────────────────────────────────────────────
    function saveDraft() {
        return new Promise((resolve) => {
            const draft = {
                rows: rows.map((r) => ({
                    courseId: r.courseId, courseName: r.courseName, section: r.section,
                    day: r.day, time: r.time, room: r.room,
                })),
                header,
                baseline: fingerprint(scraped),
                savedAt: Date.now(),
            };
            chrome.storage.local.set({ [DRAFT_KEY]: draft }, () => {
                baseline = draft.baseline;
                dirty = false;
                resolve();
            });
        });
    }

    function resetToScraped() {
        rows = flatten(scraped);
        header = Object.assign(defaultHeader(), { note: header.note || '' });
        dirty = true;
        saveDraft().then(render);
    }

    // ── Export: printable page (the "PDF" path — the browser's own
    // print-to-PDF, same approach faculty's results.js used, but rendered
    // into an offscreen iframe rather than window.open(), which is
    // unreliable inside a side panel and an in-page overlay iframe). ─────
    function printableHtml() {
        const days = usedDays();
        const slots = usedSlots();
        const photo = !photoState.failed && photoUrl();
        const grid = days.length && slots.length
            ? `<table><thead><tr><th>Time</th>${days.map((d) => `<th>${esc(DAY_NAMES[d] || d)}</th>`).join('')}</tr></thead>
               <tbody>${slots.map((slot) => `<tr><td class="t">${esc(slot)}</td>${days.map((day) => {
                const cell = rowsAt(day, slot);
                return `<td>${cell.length ? cell.map((r) => `<b>${esc(r.courseId)}</b>${r.section ? ` (${esc(r.section)})` : ''}<br><span class="s">${esc(r.courseName)}</span>${r.room ? `<br><span class="s">${esc(r.room)}</span>` : ''}`).join('<hr>') : '<span class="s">&mdash;</span>'}</td>`;
            }).join('')}</tr>`).join('')}</tbody></table>`
            : '<p>No class meetings in this routine.</p>';
        const courses = groupedCourses();
        const list = courses.length
            ? `<h2>Courses</h2><table><thead><tr><th>Course</th><th>Title</th><th>Sec</th><th>Meetings</th></tr></thead>
               <tbody>${courses.map((c) => `<tr><td><b>${esc(c.courseId)}</b></td><td>${esc(c.courseName)}</td><td>${esc(c.section || '—')}</td><td class="s">${c.meetings.map((m) => esc(`${m.day} ${m.time}${m.room ? ' · ' + m.room : ''}`)).join('<br>')}</td></tr>`).join('')}</tbody></table>`
            : '';
        // Standalone printed document: a fixed ink-on-paper palette, not the
        // extension's themed UI, so literal colours are correct here.
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(header.name || 'Class')} — Routine</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
body { font: 12px/1.45 "Segoe UI", system-ui, sans-serif; color: #17211f; margin: 0; }
.head { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #0D9488; padding-bottom: 10px; margin-bottom: 14px; }
.head img { width: 72px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #d5e3e1; }
.head .n { font-size: 22px; font-weight: 800; color: #0D9488; margin: 0 0 4px; }
.head .m { color: #55635f; font-size: 12px; }
h2 { font-size: 14px; margin: 18px 0 6px; }
table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
th, td { border: 1px solid #cbd5e1; padding: 6px 7px; text-align: left; vertical-align: top; font-size: 11px; }
th { background: #D7F2EF; font-weight: 800; }
td.t { background: #f3f5f5; font-weight: 700; white-space: nowrap; }
.s { color: #55635f; font-size: 10px; }
hr { border: 0; border-top: 1px dashed #cbd5e1; margin: 4px 0; }
.note { margin-top: 14px; color: #77837f; font-size: 10px; }
</style></head><body>
<div class="head">${photo ? `<img src="${esc(photo)}" alt="">` : ''}
<div><p class="n">${esc(header.name || 'Student')}</p>
<div class="m">${[header.studentId && 'ID: ' + header.studentId, header.program && 'Program: ' + header.program, header.semester && 'Semester: ' + header.semester].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ')}</div></div></div>
<h2>Weekly Routine</h2>${grid}${list}
${header.note ? `<p class="note">${esc(header.note)}</p>` : ''}
</body></html>`;
    }

    function printRoutine() {
        const old = document.getElementById('ulab-routine-print-frame');
        if (old) old.remove();
        const frame = document.createElement('iframe');
        frame.id = 'ulab-routine-print-frame';
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
        document.body.appendChild(frame);
        const doc = frame.contentDocument;
        doc.open();
        doc.write(printableHtml());
        doc.close();
        // Give the (possibly 404ing) photo a moment; printing proceeds either way.
        setTimeout(() => {
            try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch (err) {
                console.error('[Routine] print failed', err);
                flash('Could not open the print dialog.', 'danger');
            }
        }, 350);
    }

    // ── Export: .docx (routine-docx.js) ─────────────────────────────────
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function fileStem() {
        const base = (header.name || header.studentId || 'ulab').trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        return base || 'ulab';
    }

    function exportDocx() {
        if (!window.ULAB_RoutineDocx) {
            flash('The Word exporter did not load.', 'danger');
            return;
        }
        flash('Building your Word document…', 'info');
        loadPhotoForExport().then((photo) => {
            const blob = window.ULAB_RoutineDocx.buildRoutineDocx({
                header,
                photo,
                days: usedDays(),
                dayNames: DAY_NAMES,
                slots: usedSlots(),
                cellLinesFor: (day, slot) => rowsAt(day, slot).map((r) => {
                    const head = `${r.courseId}${r.section ? ` (${r.section})` : ''}`;
                    return [head, r.courseName, r.room].filter(Boolean).join(' — ');
                }),
                courseRows: groupedCourses().map((c) => [
                    c.courseId, c.courseName, c.section || '—',
                    c.meetings.map((m) => `${m.day} ${m.time}${m.room ? ` · ${m.room}` : ''}`),
                ]),
            });
            downloadBlob(blob, `${fileStem()}_routine.docx`);
            flash(photo ? 'Word document downloaded (photo included).' : 'Word document downloaded — photo unavailable, so it was left out.', 'success');
        });
    }

    // ── Export: .ics (weekly repeating events) ──────────────────────────
    function pad2(n) { return String(n).padStart(2, '0'); }

    function icsEscape(s) {
        return String(s == null ? '' : s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    }

    function firstOccurrence(startDate, day) {
        const idx = DAYS.indexOf(day);
        if (idx === -1) return null;
        const d = new Date(startDate);
        d.setDate(d.getDate() + ((idx - d.getDay() + 7) % 7));
        return d;
    }

    function stamp(date, minutes) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setMinutes(minutes);
        return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
    }

    function exportIcs() {
        const startValue = root.querySelector('#routine-start').value;
        const weeks = Math.max(1, parseInt(root.querySelector('#routine-weeks').value, 10) || 14);
        if (!startValue) { flash('Pick a semester start date first.', 'warn'); return; }
        const [y, m, d] = startValue.split('-').map(Number);
        const startDate = new Date(y, m - 1, d);

        const now = new Date();
        const dtStamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}T${pad2(now.getHours())}${pad2(now.getMinutes())}00`;
        const lines = [
            'BEGIN:VCALENDAR', 'VERSION:2.0',
            'PRODID:-//ULAB Student Companion//Class Routine//EN',
            'CALSCALE:GREGORIAN', 'X-WR-TIMEZONE:Asia/Dhaka',
        ];
        let count = 0;
        rows.forEach((r, i) => {
            const start = startMinutes(r.time);
            const end = endMinutes(r.time);
            const day0 = firstOccurrence(startDate, r.day);
            if (!day0 || end == null || start > 24 * 60) return;
            count += 1;
            lines.push(
                'BEGIN:VEVENT',
                `UID:ulab-routine-${i}-${Date.now()}@student-companion`,
                `DTSTAMP:${dtStamp}`,
                `DTSTART;TZID=Asia/Dhaka:${stamp(day0, start)}`,
                `DTEND;TZID=Asia/Dhaka:${stamp(day0, end)}`,
                `RRULE:FREQ=WEEKLY;COUNT=${weeks}`,
                `SUMMARY:${icsEscape(`${r.courseId}${r.courseName ? ' - ' + r.courseName : ''}`)}`,
                `LOCATION:${icsEscape(r.room)}`,
                `DESCRIPTION:${icsEscape(`ULAB class${r.section ? `, Section ${r.section}` : ''}`)}`,
                'END:VEVENT'
            );
        });
        lines.push('END:VCALENDAR');
        if (!count) { flash('No rows have a readable time range to put in a calendar.', 'warn'); return; }
        downloadBlob(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }), `${fileStem()}_routine.ics`);
        flash(`Calendar file downloaded — ${count} weekly event(s).`, 'success');
    }

    // ── Rendering ───────────────────────────────────────────────────────
    const STYLE_ID = 'ulab-routine-css';
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        // Every colour resolves through a --bento-* token, so light,
        // body.ulab-dark (content pages) and :root[data-theme] (side panel)
        // all work with no hardcoded hex.
        style.textContent = `
.routine-head { display: flex; gap: 12px; align-items: flex-start; padding: 10px; }
.routine-photo, .routine-photo-fallback {
    flex: 0 0 auto; width: 62px; height: 78px; border-radius: var(--bento-radius-xs);
    border: 1px solid var(--bento-border-soft); object-fit: cover; background: var(--bento-card-alt);
}
.routine-photo-fallback {
    display: flex; align-items: center; justify-content: center;
    font-family: var(--bento-font-ui); font-weight: 800; font-size: 20px;
    color: var(--bento-accent-fg); background: var(--bento-primary); letter-spacing: .02em;
}
.routine-headfields { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; }
.routine-field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.routine-field label { font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: var(--bento-fg-subtle); }
.routine-field input, .routine-field select {
    width: 100%; min-width: 0; box-sizing: border-box; padding: 4px 6px; font: inherit; font-size: 11.5px;
    color: var(--bento-fg); background: var(--bento-card); border: 1px solid var(--bento-border-soft);
    border-radius: var(--bento-radius-xs);
}
.routine-field input:focus, .routine-field select:focus { outline: none; border-color: var(--bento-primary); }
table.bento-compact td.routine-cell input, table.bento-compact td.routine-cell select {
    width: 100%; min-width: 60px; box-sizing: border-box; padding: 3px 5px; font: inherit; font-size: 11px;
    color: var(--bento-fg); background: var(--bento-card); border: 1px solid var(--bento-border-soft);
    border-radius: var(--bento-radius-xs);
}
table.bento-compact td.routine-cell input:focus, table.bento-compact td.routine-cell select:focus { outline: none; border-color: var(--bento-primary); }
.routine-remove {
    border: 1px solid var(--bento-border-soft); background: transparent; color: var(--bento-destructive);
    border-radius: var(--bento-radius-xs); cursor: pointer; font: inherit; font-size: 11px; font-weight: 800;
    line-height: 1; padding: 4px 7px; min-height: 22px;
}
.routine-remove:hover { border-color: var(--bento-destructive); }
.routine-slot { font-weight: 800; }
.routine-gridcell b { color: var(--bento-primary); }
.routine-gridcell span { color: var(--bento-fg-muted); }
.routine-gridcell + .routine-gridcell { border-top: 1px dashed var(--bento-border-soft); margin-top: 3px; padding-top: 3px; }
.routine-flash { margin: 0 0 8px; }
.routine-dirty { color: var(--bento-warning); font-weight: 800; font-size: 10.5px; }
`;
        document.head.appendChild(style);
    }

    function flash(message, tone) {
        const host = root && root.querySelector('#routine-flash');
        if (!host) return;
        host.innerHTML = `<div class="bento-notice ${tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : tone === 'success' ? 'success' : 'info'} routine-flash">${esc(message)}</div>`;
    }

    function headerFieldsHtml() {
        const field = (key, label, placeholder) =>
            `<div class="routine-field"><label for="routine-h-${key}">${esc(label)}</label>
             <input id="routine-h-${key}" data-header="${key}" value="${esc(header[key] || '')}" placeholder="${esc(placeholder)}"></div>`;
        return `
            <div class="routine-head">
                <div id="routine-photo-slot"></div>
                <div class="routine-headfields">
                    ${field('name', 'Name', 'Your name')}
                    ${field('studentId', 'Student ID', '000000000')}
                    ${field('program', 'Program', 'CSE')}
                    ${field('semester', 'Semester', 'Fall 2025')}
                    ${field('note', 'Footer note (optional)', 'e.g. Printed for section change')}
                </div>
            </div>`;
    }

    function mountPhoto() {
        const slot = root.querySelector('#routine-photo-slot');
        if (!slot) return;
        const url = photoUrl();
        const fallback = () => {
            slot.innerHTML = `<div class="routine-photo-fallback" title="Profile photo unavailable">${esc(initials())}</div>`;
        };
        if (!url || photoState.failed) { fallback(); return; }
        // Never render a bare <img> that can show a broken-image glyph: the
        // portal 404s the photo when the session is gone. Load it detached
        // and only attach once it actually decoded.
        fallback();
        const probe = new Image();
        probe.onload = () => {
            photoState.url = url;
            const img = document.createElement('img');
            img.className = 'routine-photo';
            img.src = url;
            img.alt = header.name ? `${header.name}'s photo` : 'Profile photo';
            slot.innerHTML = '';
            slot.appendChild(img);
        };
        probe.onerror = () => { photoState.failed = true; };
        probe.src = url;
    }

    function gridHtml() {
        const days = usedDays();
        const slots = usedSlots();
        if (!days.length || !slots.length) {
            return '<div class="bento-empty">Nothing to preview yet — add a class below.</div>';
        }
        return `
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>Time</th>${days.map((d) => `<th>${esc(DAY_NAMES[d] || d)}</th>`).join('')}</tr></thead>
                    <tbody>${slots.map((slot) => `
                        <tr>
                            <td class="c-nowrap routine-slot">${esc(slot)}</td>
                            ${days.map((day) => {
            const cell = rowsAt(day, slot);
            if (!cell.length) return '<td class="c-muted">—</td>';
            return `<td>${cell.map((r) => `<div class="routine-gridcell"><b>${esc(r.courseId || '—')}</b>${r.section ? ` (${esc(r.section)})` : ''}<br><span>${esc(r.courseName || '')}${r.room ? ` · ${esc(r.room)}` : ''}</span></div>`).join('')}</td>`;
        }).join('')}
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    function editorHtml() {
        if (!rows.length) {
            return '<div class="bento-empty">No class slots yet. Use “Add a class slot” below, or reset to your portal schedule.</div>';
        }
        const dayOptions = (selected) => DAYS.map((d) => `<option value="${d}"${d === selected ? ' selected' : ''}>${d}</option>`).join('')
            + (selected && !DAYS.includes(selected) ? `<option value="${esc(selected)}" selected>${esc(selected)}</option>` : '');
        return `
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>#</th><th>Day</th><th>Time</th><th>Course</th><th>Title</th><th>Sec</th><th>Room</th><th></th></tr></thead>
                    <tbody>${rows.map((r, i) => `
                        <tr data-uid="${esc(r.uid)}">
                            <td class="c-num">${i + 1}</td>
                            <td class="routine-cell"><select data-field="day" aria-label="Day">${dayOptions(r.day)}</select></td>
                            <td class="routine-cell"><input data-field="time" value="${esc(r.time)}" placeholder="08:30 AM - 09:50 AM" aria-label="Time"></td>
                            <td class="routine-cell"><input data-field="courseId" value="${esc(r.courseId)}" placeholder="CSE1111" aria-label="Course code"></td>
                            <td class="routine-cell"><input data-field="courseName" value="${esc(r.courseName)}" placeholder="Course title" aria-label="Course title"></td>
                            <td class="routine-cell"><input data-field="section" value="${esc(r.section)}" placeholder="1" aria-label="Section"></td>
                            <td class="routine-cell"><input data-field="room" value="${esc(r.room)}" placeholder="Room" aria-label="Room"></td>
                            <td><button type="button" class="routine-remove" data-remove="${esc(r.uid)}" title="Remove this slot">Remove</button></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    function defaultStartValue() {
        const today = new Date();
        today.setDate(today.getDate() + ((0 - today.getDay() + 7) % 7)); // the coming Sunday
        return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
    }

    function noticesHtml() {
        const out = [];
        if (!scraped.length) {
            out.push(`<div class="bento-notice warn">Your class schedule hasn't been captured yet. Open
                <a href="${PORTAL}/schedule.php" target="_blank" rel="noopener">Class Schedule</a> on the portal once
                while signed in, then come back — everything here will fill in automatically. You can also just build a
                routine by hand below.</div>`);
        }
        if (!profile && !info) {
            out.push(`<div class="bento-notice info">Your name, ID and photo come from
                <a href="${PORTAL}/profile.php" target="_blank" rel="noopener">My Profile</a>. Visit it once while signed in
                to fill the header in automatically, or type it in below.</div>`);
        }
        if (scraped.length && baseline && baseline !== fingerprint(scraped)) {
            out.push(`<div class="bento-notice warn">Your portal schedule changed since you last edited this routine.
                Your edits are kept as-is — use <b>Reset to my actual schedule</b> when you're ready to take the new version.</div>`);
        }
        return out.join('');
    }

    function statsHtml() {
        return `
            <div class="bento-stat"><span class="bento-stat-label">Class slots</span><span class="bento-stat-value">${rows.length}</span></div>
            <div class="bento-stat accent"><span class="bento-stat-label">Days used</span><span class="bento-stat-value">${usedDays().length}</span></div>
            <div class="bento-stat"><span class="bento-stat-label">Courses</span><span class="bento-stat-value">${groupedCourses().length}</span></div>`;
    }

    // Recomputes only the derived views (preview grid + counters), leaving
    // the editor table's live inputs alone.
    function refreshPreview() {
        const preview = root.querySelector('#routine-preview');
        if (preview) preview.innerHTML = gridHtml();
        const stats = root.querySelector('#routine-stats');
        if (stats) stats.innerHTML = statsHtml();
    }

    function render() {
        injectStyle();
        root.innerHTML = `
            <div id="routine-flash"></div>
            ${noticesHtml()}

            <div class="bento-titlebar"><span>Routine header</span><span class="bento-titlebar-sub">${esc(header.semester || '')}</span></div>
            <div class="bento-panel">
                ${headerFieldsHtml()}
                <div class="bento-statstrip" id="routine-stats">${statsHtml()}</div>
            </div>

            <div class="bento-titlebar"><span>Weekly preview</span><span class="bento-titlebar-sub">exactly what gets exported</span></div>
            <div class="bento-panel" id="routine-preview">${gridHtml()}</div>

            <div class="bento-titlebar"><span>Edit my routine</span><span class="bento-titlebar-sub" id="routine-dirty">${dirty ? 'unsaved changes' : 'saved'}</span></div>
            <div class="bento-panel">
                ${editorHtml()}
                <div class="bento-toolbar" style="padding:8px 10px;margin:0">
                    <button type="button" class="bento-chip" id="routine-add">Add a class slot</button>
                    <button type="button" class="bento-chip" id="routine-save">Save routine</button>
                    <button type="button" class="bento-chip" id="routine-reset">Reset to my actual schedule</button>
                </div>
            </div>

            <div class="bento-titlebar"><span>Export</span><span class="bento-titlebar-sub">Word · print/PDF · calendar</span></div>
            <div class="bento-panel">
                <div class="bento-toolbar" style="padding:8px 10px;margin:0">
                    <button type="button" class="bento-chip accent" id="routine-docx">Download Word (.docx)</button>
                    <button type="button" class="bento-chip" id="routine-print">Print / Save as PDF</button>
                    <button type="button" class="bento-chip" id="routine-ics">Download calendar (.ics)</button>
                </div>
                <div class="bento-toolbar" style="padding:0 10px 8px;margin:0">
                    <label class="bento-field">Semester starts
                        <input type="date" id="routine-start" value="${esc(calStart || defaultStartValue())}">
                    </label>
                    <label class="bento-field">Repeat for
                        <input type="number" id="routine-weeks" min="1" max="30" value="${esc(calWeeks)}" style="width:60px">
                    </label>
                    <span class="bento-count" style="margin:0">weeks — used by the calendar export only.</span>
                </div>
                <p class="bento-footnote" style="padding:0 10px 10px">The Word export embeds your profile photo when the
                    portal serves it; otherwise it is simply left out. Your edits are stored only in this browser.</p>
            </div>`;

        mountPhoto();
        bind();
    }

    function markDirty() {
        dirty = true;
        const el = root.querySelector('#routine-dirty');
        if (el) { el.textContent = 'unsaved changes'; el.className = 'bento-titlebar-sub routine-dirty'; }
    }

    function bind() {
        root.querySelectorAll('[data-header]').forEach((input) => {
            input.addEventListener('input', () => {
                header[input.dataset.header] = input.value;
                markDirty();
            });
            // Persist on blur as well, so a student who edits the header and
            // exports straight away doesn't lose it on reopen.
            input.addEventListener('change', () => { saveDraft(); });
        });

        root.querySelectorAll('tr[data-uid] [data-field]').forEach((input) => {
            const uid = input.closest('tr[data-uid]').dataset.uid;
            const field = input.dataset.field;
            input.addEventListener('change', () => {
                const row = rows.find((r) => r.uid === uid);
                if (!row) return;
                row[field] = field === 'day' ? String(input.value).toUpperCase() : input.value;
                markDirty();
                // Only the preview + counters are recomputed here, never the
                // editor table itself: a full re-render would blow away the
                // row the student is still tabbing through.
                saveDraft().then(refreshPreview);
            });
        });

        root.querySelectorAll('[data-remove]').forEach((button) => {
            button.addEventListener('click', () => {
                rows = rows.filter((r) => r.uid !== button.dataset.remove);
                markDirty();
                saveDraft().then(render);
            });
        });

        root.querySelector('#routine-add').addEventListener('click', () => {
            rows.push({ uid: nextUid(), courseId: '', courseName: '', section: '', day: 'SUN', time: '', room: '' });
            markDirty();
            saveDraft().then(render);
        });

        root.querySelector('#routine-save').addEventListener('click', () => {
            saveDraft().then(() => {
                render();
                flash('Routine saved in this browser. Your portal schedule is untouched.', 'success');
            });
        });

        root.querySelector('#routine-reset').addEventListener('click', () => {
            if (!scraped.length) {
                flash('Nothing to reset to yet — your portal schedule hasn\'t been captured.', 'warn');
                return;
            }
            const ok = window.confirm('Replace your edited routine with the schedule captured from the portal? Your edits will be lost.');
            if (!ok) return;
            resetToScraped();
        });

        root.querySelector('#routine-docx').addEventListener('click', exportDocx);
        root.querySelector('#routine-print').addEventListener('click', printRoutine);
        root.querySelector('#routine-ics').addEventListener('click', exportIcs);

        const startInput = root.querySelector('#routine-start');
        const weeksInput = root.querySelector('#routine-weeks');
        calStart = startInput.value;
        startInput.addEventListener('change', () => { calStart = startInput.value; });
        weeksInput.addEventListener('change', () => {
            calWeeks = Math.min(30, Math.max(1, parseInt(weeksInput.value, 10) || 14));
            weeksInput.value = calWeeks;
        });
    }

    // ── Mount ───────────────────────────────────────────────────────────
    function mount(container) {
        root = container;
        root.innerHTML = '<div class="bento-empty">Loading your routine…</div>';
        chrome.storage.local.get([SCRAPE_KEY, DRAFT_KEY, PROFILE_KEY, INFO_KEY], (data) => {
            scraped = Array.isArray(data[SCRAPE_KEY]) ? data[SCRAPE_KEY] : [];
            profile = data[PROFILE_KEY] || null;
            info = data[INFO_KEY] || null;

            const draft = data[DRAFT_KEY];
            if (draft && Array.isArray(draft.rows)) {
                rows = draft.rows.map((r) => ({
                    uid: nextUid(),
                    courseId: r.courseId || '', courseName: r.courseName || '', section: r.section || '',
                    day: String(r.day || '').toUpperCase(), time: r.time || '', room: r.room || '',
                }));
                baseline = draft.baseline || '';
                const auto = defaultHeader();
                // A saved header wins, but any field the student left blank
                // still picks up freshly scraped profile data.
                header = Object.assign(auto, Object.fromEntries(
                    Object.entries(draft.header || {}).filter(([, v]) => v)
                ));
            } else {
                rows = flatten(scraped);
                header = defaultHeader();
                baseline = fingerprint(scraped);
            }
            dirty = false;
            render();
        });
    }

    window.ULAB_FEATURES = window.ULAB_FEATURES || [];
    window.ULAB_FEATURES.push({
        id: 'schedule-tools',
        // An ICON NAME resolved against sidebar.js's SVG map (project rule:
        // SVG only, never emoji) — matches the My Tools entry for this tool
        // in ulab-dashboard-shell.js.
        icon: 'calendar',
        title: 'Routine & Export',
        subtitle: 'Edit your weekly class routine and export it to Word, PDF or your calendar',
        mount,
    });
})();
