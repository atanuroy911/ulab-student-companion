// features/status/results-view.js — Bento-styled, semester-grouped
// replacement view for Status.php's flat "Result of completed/registered
// courses" table (see reference-html/status.html). Loaded right after
// status-ui-content.js (manifest.json), which is what actually scrapes and
// persists ulabCompletedCourses / ulabInProgressCourses / ulabSemesterGPA /
// ulabAcademicSummary into chrome.storage.local — this file only reads that
// cache and renders on top of it.
//
// Answers ui-feedback.md points 5, 9, 10:
//   - group results by semester in collapsible sections (newest first,
//     current/latest semester expanded by default, rest collapsed)
//   - drop the "Comments" column (always empty in real scraped data)
// Toggled by the existing shell "Modern UI" switch: visible only while
// body.ulab-page-status.ulab-shell-mounted is active (mirrors how the shell
// scopes every other page's polish), so the legacy table remains the
// fallback whenever modern mode is off.
(function () {
    const KEY_COMPLETED = 'ulabCompletedCourses';
    const KEY_IN_PROGRESS = 'ulabInProgressCourses';
    const KEY_GPA = 'ulabSemesterGPA';
    const KEY_SUMMARY = 'ulabAcademicSummary';
    const VIEW_ID = 'ulab-results-view';
    const STYLE_ID = 'ulab-results-view-css';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function gradePillClass(grade) {
        const g = (grade || '').trim().toUpperCase();
        if (!g) return 'pill-muted';
        if (g === 'F') return 'pill-destructive';
        if (g === 'S') return 'pill-primary';
        if (g.startsWith('A')) return 'pill-success';
        if (g.startsWith('B')) return 'pill-primary';
        if (g.startsWith('C') || g.startsWith('D')) return 'pill-warning';
        return 'pill-muted';
    }

    // Sorts semester codes like "263", "233" descending (newest first).
    // URMS semester codes are Term(2)+Year(1)-ish tokens observed as plain
    // ascending numeric strings across the sample data, so a numeric sort
    // is a safe, non-fabricated ordering (no calendar mapping invented).
    function sortSemestersDesc(codes) {
        return [...codes].sort((a, b) => {
            const na = parseFloat(a), nb = parseFloat(b);
            if (!isNaN(na) && !isNaN(nb)) return nb - na;
            return String(b).localeCompare(String(a));
        });
    }

    function groupBySemester(courses) {
        const map = new Map();
        for (const c of courses) {
            const key = c.semester || 'Unknown';
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(c);
        }
        return map;
    }

    // Semester-wise GPA table (Status.php's FIRST table: Semester | Credit
    // Hours Completed | GPA | CGPA). It is a distinct table from the results
    // table below and is not merged into it — the per-semester CGPA
    // progression is information the results rows cannot express.
    // ── GPA trend chart ─────────────────────────────────────────────────
    // Hand-rolled inline SVG rather than a charting library: this is a
    // content script on a legacy page, the project vendors no chart dep, and
    // the shape here is two polylines. Colours are CSS custom properties, so
    // it themes light/dark with everything else for free.
    function ascendingSemesters(gpaRows) {
        return gpaRows.slice().sort((a, b) => String(a.semester).localeCompare(String(b.semester), undefined, { numeric: true }));
    }

    function renderGpaChart(gpaRows) {
        const rows = ascendingSemesters(gpaRows || []);
        if (rows.length < 2) {
            return '<div class="bento-empty">A trend needs at least two graded semesters. Once you have more, the curve shows up here.</div>';
        }
        const W = 660, H = 220, PAD_L = 34, PAD_R = 14, PAD_T = 14, PAD_B = 34;
        const plotW = W - PAD_L - PAD_R;
        const plotH = H - PAD_T - PAD_B;
        const values = rows.reduce((acc, r) => {
            if (typeof r.gpa === 'number') acc.push(r.gpa);
            if (typeof r.cgpa === 'number') acc.push(r.cgpa);
            return acc;
        }, []);
        if (!values.length) return '<div class="bento-empty">No GPA figures were recorded for these semesters.</div>';
        const hi = 4;
        // Floor the axis just below the worst point so the curve uses the
        // full height instead of hugging the top of a 0–4 axis.
        const lo = Math.max(0, Math.floor((Math.min(...values) - 0.25) * 2) / 2);
        const span = (hi - lo) || 1;
        const x = i => PAD_L + (i * plotW) / (rows.length - 1);
        const y = v => PAD_T + plotH - ((v - lo) / span) * plotH;

        const line = (key) => {
            const pts = rows.map((r, i) => (typeof r[key] === 'number' ? `${x(i).toFixed(1)},${y(r[key]).toFixed(1)}` : null)).filter(Boolean);
            return pts.length > 1 ? `<polyline points="${pts.join(' ')}" fill="none" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : '';
        };
        const dots = (key) => rows.map((r, i) => (typeof r[key] === 'number'
            ? `<circle cx="${x(i).toFixed(1)}" cy="${y(r[key]).toFixed(1)}" r="3"><title>${esc(r.semester)} · ${key.toUpperCase()} ${r[key].toFixed(2)}</title></circle>`
            : '')).join('');

        // Tick step scales with the range: a strong student's GPAs can sit
        // inside a 0.5 band, where a fixed 0.5 step would draw two lines and
        // read as flat. Finer steps on a narrow span keep it legible.
        const tickStep = span <= 0.6 ? 0.1 : span <= 1.5 ? 0.25 : 0.5;
        const ticks = [];
        for (let v = Math.ceil(lo / tickStep) * tickStep; v <= hi + 0.001; v += tickStep) {
            ticks.push(Math.round(v * 100) / 100);
        }
        const grid = ticks.map(v => `
            <line class="gpa-grid" x1="${PAD_L}" y1="${y(v).toFixed(1)}" x2="${W - PAD_R}" y2="${y(v).toFixed(1)}"/>
            <text class="gpa-axis" x="${PAD_L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${v.toFixed(1)}</text>`).join('');
        // Thin out x labels so they never collide on a long history.
        const step = Math.ceil(rows.length / 10);
        const xLabels = rows.map((r, i) => (i % step === 0 || i === rows.length - 1
            ? `<text class="gpa-axis" x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(r.semester)}</text>`
            : '')).join('');

        return `
            <div class="gpa-chart">
                <svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet"
                     aria-label="Semester GPA and cumulative CGPA trend">
                    ${grid}${xLabels}
                    <g class="gpa-line-cgpa">${line('cgpa')}${dots('cgpa')}</g>
                    <g class="gpa-line-gpa">${line('gpa')}${dots('gpa')}</g>
                </svg>
                <div class="gpa-legend">
                    <span class="gpa-key gpa-key-gpa">Semester GPA</span>
                    <span class="gpa-key gpa-key-cgpa">Cumulative CGPA</span>
                </div>
            </div>`;
    }

    // Table and chart are two readings of the same rows — segmented toggle,
    // both rendered up front so switching is instant and needs no re-fetch.
    function renderGpaSection(gpaRows) {
        if (!gpaRows || !gpaRows.length) return '';
        return `
            <div class="gpa-head">
                <h2 class="bento-sectitle" style="margin:0;">Semester-wise GPA</h2>
                <div class="bento-segmented" role="group" aria-label="GPA view">
                    <button type="button" class="bento-chip on" data-gpa-view="table" aria-pressed="true">Table</button>
                    <button type="button" class="bento-chip" data-gpa-view="chart" aria-pressed="false">Trend</button>
                </div>
            </div>
            <div data-gpa-panel="table">${renderGpaTable(gpaRows, true)}</div>
            <div data-gpa-panel="chart" hidden>${renderGpaChart(gpaRows)}</div>`;
    }

    function wireGpaToggle(view) {
        const buttons = Array.from(view.querySelectorAll('[data-gpa-view]'));
        buttons.forEach((btn) => btn.addEventListener('click', () => {
            const wanted = btn.dataset.gpaView;
            buttons.forEach((b) => {
                const on = b === btn;
                b.classList.toggle('on', on);
                b.setAttribute('aria-pressed', String(on));
            });
            view.querySelectorAll('[data-gpa-panel]').forEach((panel) => {
                panel.hidden = panel.dataset.gpaPanel !== wanted;
            });
        }));
    }

    function renderGpaTable(gpaRows, headless) {
        if (!gpaRows || !gpaRows.length) return '';
        const max = Math.max(...gpaRows.map(r => r.gpa || 0), 4);
        return `
            ${headless ? '' : '<h2 class="bento-sectitle">Semester-wise GPA</h2>'}
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>Semester</th><th>Credit Hours Completed</th><th>GPA</th><th>CGPA</th><th>Trend</th></tr></thead>
                    <tbody>${gpaRows.map(r => `
                        <tr>
                            <td class="c-code">${esc(r.semester)}</td>
                            <td class="c-right">${r.creditHours != null ? esc(r.creditHours) : '—'}</td>
                            <td class="c-right">${r.gpa != null ? esc(r.gpa.toFixed(2)) : '—'}</td>
                            <td class="c-right">${r.cgpa != null ? esc(r.cgpa.toFixed(2)) : '—'}</td>
                            <td style="width:120px"><span class="bento-meter"><i style="width:${Math.max(2, Math.round((r.gpa || 0) / max * 100))}%"></i></span></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    // Result rows. Columns mirror Status.php's own table 1:1 —
    // Course | Course Title | Type | Credit | Result — minus Comments, which
    // stays dropped on purpose (ui-feedback.md point 10: always empty in
    // real scraped data, and students asked for it gone). It is still
    // scraped and cached by status-ui-content.js, so nothing is lost from
    // storage; it simply isn't given a column here.
    function renderCourseRow(course) {
        return `
            <tr>
                <td class="c-code">${esc(course.code)}</td>
                <td>${esc(course.name)}</td>
                <td class="c-sub">${course.type ? esc(course.type) : '—'}</td>
                <td class="c-right">${course.credits != null ? esc(course.credits) : '—'}</td>
                <td><span class="pill ${gradePillClass(course.grade)}">${esc(course.grade || 'In Progress')}</span></td>
            </tr>`;
    }

    // Semester grouping is kept (ui-feedback.md points 5 & 9) but as compact
    // <details> wrappers around one dense table each, instead of stacks of
    // chunky .course-row cards. The current semester stays open by default.
    function renderSemesterSections(completed, inProgress, gpaRows, currentSemester) {
        const gpaByCode = new Map((gpaRows || []).map(r => [String(r.semester), r]));
        const grouped = groupBySemester([...(inProgress || []), ...(completed || [])]);
        const codes = sortSemestersDesc(Array.from(grouped.keys()));
        if (!codes.length) return '<div class="bento-empty">No course results found yet. Reload this page while logged in to refresh.</div>';
        const activeCode = codes.includes(String(currentSemester)) ? String(currentSemester) : codes[0];

        return codes.map((code) => {
            const courses = grouped.get(code);
            const gpa = gpaByCode.get(code);
            const hasInProgress = courses.some(c => !c.grade);
            const isCurrent = String(code) === activeCode;
            const credits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);
            const metaBits = [`${courses.length} course${courses.length === 1 ? '' : 's'}`, `${credits} cr`];
            if (gpa) metaBits.push(`GPA ${gpa.gpa != null ? gpa.gpa.toFixed(2) : '—'}`);
            if (gpa && gpa.cgpa != null) metaBits.push(`CGPA ${gpa.cgpa.toFixed(2)}`);
            if (hasInProgress) metaBits.push('in progress');
            return `
                <details class="results-group" ${isCurrent ? 'open' : ''}>
                    <summary>
                        <span>Semester ${esc(code)}${isCurrent ? ' <span class="pill pill-accent">Current</span>' : ''}</span>
                        <span class="c-muted">${esc(metaBits.join(' · '))}</span>
                    </summary>
                    <div class="bento-tablewrap">
                        <table class="bento-compact">
                            <thead><tr><th>Course</th><th>Course Title</th><th>Type</th><th>Credit</th><th>Result</th></tr></thead>
                            <tbody>${courses.map(renderCourseRow).join('')}</tbody>
                        </table>
                    </div>
                </details>`;
        }).join('');
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${VIEW_ID} { display: none; padding: 16px 0 32px; text-align: left; }
            body.ulab-page-status.ulab-shell-mounted #${VIEW_ID} { display: block; }
            /* Hide the legacy flat tables (Semester-wise GPA + Result table)
               once the modern view is mounted, so we don't show both. The
               legacy markup has no id/class hooks (per handoff.md's brittle-
               markup warning), so we hide by matching the same header-text
               heuristic status-ui-content.js already uses, applied inline
               below via JS (adding a class), not pure CSS. */
            body.ulab-page-status.ulab-shell-mounted .ulab-legacy-result-table { display: none !important; }
            /* Compact semester group: a thin bar you click, wrapped around a
               shared .bento-compact table. Everything else on this page now
               comes from bento-ui.css's shared compact layer. */
            #${VIEW_ID} .results-group { margin-bottom:6px; }
            #${VIEW_ID} .results-group > summary {
                list-style:none; cursor:pointer; user-select:none;
                display:flex; align-items:center; justify-content:space-between; gap:10px;
                padding:5px 10px; font-size:11.5px; font-weight:800; color:var(--bento-fg);
                background:var(--bento-card-alt); border:1px solid var(--bento-border-soft);
                border-radius:var(--bento-radius-xs);
            }
            #${VIEW_ID} .results-group[open] > summary { border-radius:var(--bento-radius-xs) var(--bento-radius-xs) 0 0; border-bottom:0; }
            #${VIEW_ID} .results-group > summary::-webkit-details-marker { display:none; }
            #${VIEW_ID} .results-group > summary::after { content:'▾'; color:var(--bento-fg-subtle); font-size:11px; }
            #${VIEW_ID} .results-group[open] > summary::after { content:'▴'; }
            #${VIEW_ID} .results-group > summary:hover { border-color:var(--bento-primary); }
            #${VIEW_ID} .results-group[open] .bento-tablewrap { border-radius:0 0 var(--bento-radius-xs) var(--bento-radius-xs); }
            #${VIEW_ID} .results-group .bento-meter { width:100%; }
            /* GPA trend chart. Stroke/fill come from bento tokens so the
               chart themes with the rest; no chart library involved. */
            #${VIEW_ID} .gpa-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin:18px 0 8px; }
            #${VIEW_ID} .gpa-chart { padding:12px 6px 6px; background:var(--bento-card); border:1px solid var(--bento-border-soft); border-radius:var(--bento-radius-md); box-shadow:var(--bento-shadow-sm); }
            #${VIEW_ID} .gpa-chart svg { display:block; width:100%; height:auto; }
            #${VIEW_ID} .gpa-grid { stroke:var(--bento-border-soft); stroke-width:1; }
            #${VIEW_ID} .gpa-axis { fill:var(--bento-fg-subtle); font:500 9px var(--bento-font-ui); }
            #${VIEW_ID} .gpa-line-gpa { stroke:var(--bento-accent); fill:var(--bento-accent); }
            #${VIEW_ID} .gpa-line-cgpa { stroke:var(--bento-primary); fill:var(--bento-primary); }
            #${VIEW_ID} .gpa-legend { display:flex; gap:16px; justify-content:center; padding:6px 0 2px; }
            #${VIEW_ID} .gpa-key { display:inline-flex; align-items:center; gap:6px; font-size:10.5px; color:var(--bento-fg-muted); }
            #${VIEW_ID} .gpa-key::before { content:''; width:14px; height:3px; border-radius:2px; }
            #${VIEW_ID} .gpa-key-gpa::before { background:var(--bento-accent); }
            #${VIEW_ID} .gpa-key-cgpa::before { background:var(--bento-primary); }
        `;
        document.head.appendChild(style);
    }

    function hideLegacyTables() {
        const tables = Array.from(document.querySelectorAll('table'));
        for (const table of tables) {
            const headerText = (table.querySelector('tr') || {}).textContent || '';
            const isGpaTable = /Semester/i.test(headerText) && /Credit Hours/i.test(headerText) && /GPA/i.test(headerText) && /CGPA/i.test(headerText);
            const isResultTable = /Semester/i.test(headerText) && /Course/i.test(headerText) && /Result/i.test(headerText);
            if (isGpaTable || isResultTable) table.classList.add('ulab-legacy-result-table');
        }
    }

    function mountView(container) {
        let view = document.getElementById(VIEW_ID);
        if (!view) {
            view = document.createElement('div');
            view.id = VIEW_ID;
            view.className = 'bento-root';
            container.insertBefore(view, container.firstChild ? container.firstChild.nextSibling : null);
        }
        return view;
    }

    // ── Unofficial transcript (print / Save as PDF) ─────────────────────
    // A complete standalone document: the print iframe inherits none of this
    // page's CSS, so everything it needs is inlined here. Literal colours are
    // deliberate — this is printed ink, with no theme and no --bento-* vars
    // in scope. Ordering is ascending, as a transcript conventionally reads.
    // It is explicitly labelled unofficial: it is assembled from what the
    // student's own portal page shows, and carries no registrar authority.
    function transcriptHtml(completed, inProgress, gpaRows, summary, info, profile) {
        const gpaBySemester = new Map((gpaRows || []).map(r => [String(r.semester), r]));
        const groups = groupBySemester(completed || []);
        const semesters = Object.keys(groups).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
        const generated = new Date().toLocaleString();
        const program = (profile && profile.programCode) || '';

        const idLine = [
            info.studentId ? `ID ${esc(info.studentId)}` : '',
            program ? esc(program) : '',
            info.semesterLabel ? `as of ${esc(info.semesterLabel)}` : '',
        ].filter(Boolean).join(' &middot; ');

        const semesterBlock = (code) => {
            const rows = groups[code] || [];
            const g = gpaBySemester.get(String(code));
            const credits = rows.reduce((sum, c) => sum + (c.credits || 0), 0);
            const meta = [
                g && g.gpa != null ? `GPA ${g.gpa.toFixed(2)}` : '',
                g && g.cgpa != null ? `CGPA ${g.cgpa.toFixed(2)}` : '',
                `${credits} credit${credits === 1 ? '' : 's'}`,
            ].filter(Boolean).join(' &middot; ');
            return `
            <section class="sem">
                <h2>Semester ${esc(code)} <span class="meta">${meta}</span></h2>
                <table>
                    <thead><tr><th>Course</th><th>Title</th><th>Type</th><th class="r">Credit</th><th class="r">Grade</th></tr></thead>
                    <tbody>${rows.map(c => `
                        <tr>
                            <td class="mono">${esc(c.code || '')}</td>
                            <td>${esc(c.name || '')}</td>
                            <td>${esc(c.type || '')}</td>
                            <td class="r">${c.credits != null ? esc(c.credits) : ''}</td>
                            <td class="r b">${esc(c.grade || '')}</td>
                        </tr>`).join('')}</tbody>
                </table>
            </section>`;
        };

        const inProgressBlock = (inProgress && inProgress.length) ? `
            <section class="sem">
                <h2>In progress <span class="meta">not yet graded</span></h2>
                <table>
                    <thead><tr><th>Course</th><th>Title</th><th>Type</th><th class="r">Credit</th></tr></thead>
                    <tbody>${inProgress.map(c => `
                        <tr>
                            <td class="mono">${esc(c.code || '')}</td>
                            <td>${esc(c.name || '')}</td>
                            <td>${esc(c.type || '')}</td>
                            <td class="r">${c.credits != null ? esc(c.credits) : ''}</td>
                        </tr>`).join('')}</tbody>
                </table>
            </section>` : '';

        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transcript — ${esc(info.studentName || 'ULAB student')}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font: 11px/1.45 "Segoe UI", system-ui, sans-serif; color: #12211f; margin: 0; }
  header { border-bottom: 2px solid #0D9488; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 17px; margin: 0 0 2px; letter-spacing: -.01em; }
  .sub { color: #4B7A76; font-size: 11px; }
  .badge { display:inline-block; margin-top:6px; padding:2px 7px; border:1px solid #D97706; color:#92400e;
           border-radius:999px; font-size:9.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
  .summary { display:flex; flex-wrap:wrap; gap:18px; margin:0 0 16px; padding:9px 12px;
             background:#F0FDFA; border:1px solid #99F6E4; border-radius:6px; }
  .summary div { font-size:10.5px; color:#4B7A76; }
  .summary b { display:block; font-size:14px; color:#134E4A; }
  section.sem { margin-bottom: 13px; page-break-inside: avoid; }
  h2 { font-size: 12px; margin: 0 0 5px; padding-bottom: 3px; border-bottom: 1px solid #cfe9e5; }
  h2 .meta { float: right; font-weight: 400; color: #4B7A76; font-size: 10.5px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .05em;
       color: #4B7A76; border-bottom: 1px solid #cfe9e5; padding: 4px 6px; }
  td { padding: 3.5px 6px; border-bottom: 1px solid #edf5f4; }
  .r { text-align: right; } .b { font-weight: 700; }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #cfe9e5;
           color: #6B8E8B; font-size: 9.5px; }
</style></head><body>
<header>
  <h1>Academic Transcript</h1>
  <div class="sub">${esc(info.studentName || '')}${idLine ? ' &middot; ' + idLine : ''}</div>
  <div class="badge">Unofficial &middot; student-generated</div>
</header>
<div class="summary">
  <div>CGPA <b>${summary.cgpa != null ? esc(summary.cgpa.toFixed(2)) : '—'}</b></div>
  <div>Credit hours completed <b>${summary.totalCreditHours != null ? esc(summary.totalCreditHours) : '—'}</b></div>
  <div>Courses completed <b>${summary.coursesCompletedTotal != null ? esc(summary.coursesCompletedTotal) : (completed || []).length}</b></div>
  <div>Semesters <b>${semesters.length}</b></div>
</div>
${semesters.map(semesterBlock).join('')}
${inProgressBlock}
<footer>
  Generated ${esc(generated)} by ULAB Student Companion from this student's own URMS portal pages.
  <b>This is not an official transcript</b> and has no registrar authority — request an official
  transcript from the university for any formal purpose.
</footer>
</body></html>`;
    }

    function render() {
        const infoKey = (window.ULAB_SHELL && window.ULAB_SHELL.STORAGE_KEY_INFO) || 'ulabStudentInfo';
        chrome.storage.local.get([KEY_COMPLETED, KEY_IN_PROGRESS, KEY_GPA, KEY_SUMMARY, infoKey, 'ulabStudentProfile'], (data) => {
            const completed = data[KEY_COMPLETED] || [];
            const inProgress = data[KEY_IN_PROGRESS] || [];
            const gpaRows = data[KEY_GPA] || [];
            const summary = data[KEY_SUMMARY] || {};
            const info = data[infoKey] || {};
            // Only used to print the programme code on the transcript; absent
            // profile simply omits that field rather than blocking the export.
            const profile = data.ulabStudentProfile || {};
            const currentSemester = info.semesterCode || '';

            const contentCell = (window.ULAB_SHELL && window.ULAB_SHELL.wrapLegacyContent && window.ULAB_SHELL.wrapLegacyContent())
                || document.querySelector('td.content') || document.body;
            injectStyle();
            hideLegacyTables();
            const view = mountView(contentCell);
            // Every header figure Status.php prints above its tables — CGPA,
            // Total Credit Hours completed, Courses Completed Before This
            // semester, Courses Completed in This semester, Total Number of
            // Courses Completed — mapped onto the compact stat strip, plus
            // in-progress credits derived from the ungraded rows.
            const inProgressCredits = (inProgress || []).reduce((sum, c) => sum + (c.credits || 0), 0);
            const headerCardHtml = window.ULAB_SHELL ? window.ULAB_SHELL.renderHeaderCard(info, {
                title: 'Result — Academic Progress',
                stats: [
                    { label: 'CGPA', value: summary.cgpa != null ? summary.cgpa.toFixed(2) : '—' },
                    { label: 'Credit Hours Completed', value: summary.totalCreditHours != null ? summary.totalCreditHours : '—' },
                    { label: 'Completed Before', value: summary.coursesCompletedBeforeThisSemester != null ? summary.coursesCompletedBeforeThisSemester : '—' },
                    { label: 'Completed This Sem', value: summary.coursesCompletedThisSemester != null ? summary.coursesCompletedThisSemester : '—' },
                    { label: 'Total Completed', value: summary.coursesCompletedTotal != null ? summary.coursesCompletedTotal : '—' },
                ],
                pills: inProgress.length
                    ? [{ text: `${inProgress.length} course${inProgress.length === 1 ? '' : 's'} in progress · ${inProgressCredits} cr`, tone: 'accent' }]
                    : [{ text: 'No ungraded courses this semester', tone: 'muted' }],
            }) : '';
            view.innerHTML = `
                ${headerCardHtml}
                <div class="bento-actions">
                    <button type="button" class="bento-chip" id="ulab-export-transcript">Export transcript (PDF)</button>
                </div>
                ${renderGpaSection(gpaRows)}
                <h2 class="bento-sectitle">Results by Semester</h2>
                ${renderSemesterSections(completed, inProgress, gpaRows, currentSemester)}
                <p class="bento-footnote">The portal's <b>Comments</b> column is intentionally not shown — it is empty in practice and students asked for it to go. It is still scraped and cached, so nothing is lost.</p>
            `;
            wireGpaToggle(view);
            const exportBtn = view.querySelector('#ulab-export-transcript');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    if (!(window.ULAB_SHELL && window.ULAB_SHELL.printDocument)) return;
                    window.ULAB_SHELL.printDocument(
                        transcriptHtml(completed, inProgress, gpaRows, summary, info, profile),
                        'ulab-transcript-print-frame'
                    );
                });
            }
        });
    }

    function init() {
        // status-ui-content.js does the actual scrape+persist inside its own
        // shell.mount() callback; we just need the cache to exist. A short
        // fixed delay isn't reliable across machines, so instead: render once
        // immediately (in case of a warm cache from a previous load) and
        // again whenever the relevant keys change.
        render();
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if ([KEY_COMPLETED, KEY_IN_PROGRESS, KEY_GPA, KEY_SUMMARY].some(k => k in changes)) render();
        });
        // Also re-render once the shell finishes mounting (toggles modern
        // class asynchronously after its own storage.get resolves).
        setTimeout(render, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
