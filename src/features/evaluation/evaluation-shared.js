// features/evaluation/evaluation-shared.js — shared scrape+render logic for
// TeacherEvaluation.php and CourseEvaluation.php. Both pages are simple
// status-listing tables (Teacher ID/Teacher Name/Course ID/Course Name/
// Section/Evaluate, or Course ID/Course Name/Section/Evaluate) plus a
// deadline banner (`<p class='error'>Deadline is over...</p>` in the sample
// data) and the same Semester/Student/Adviser header block every other page
// has. They're similar enough (same takeover pattern, same table-with-a-
// status-column shape) to share one render/scrape module instead of
// duplicating it twice — the two page-specific files
// (features/teacher-evaluation/teacher-evaluation-ui-content.js,
// features/course-evaluation/course-evaluation-ui-content.js) just call
// window.ULAB_EVAL.run(config) with their column layout.
//
// The "Evaluate" cell only has "Done" in the sample data (deadline already
// passed) — the not-yet-done/still-open state isn't in the sample, so
// nothing about it is invented here: whatever text/markup that cell holds
// is captured as plain text and rendered as a status pill whose tone is
// "success" for literal "Done" and "muted" for anything else (including an
// actual link/form markup, which would just render as its text content —
// safe fallback, not a fabricated guess at what that state looks like).
(function () {
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // PARSER LOCATION: the row scrape and the deadline-banner scrape now
    // live in features/shared/ulab-portal-parsers.js as parseEvaluation(doc,
    // config), so the same code reads both these live pages and a
    // background-fetched copy of TeacherEvaluation.php / CourseEvaluation.php
    // for the side panel. config still carries { headerPatterns, columns };
    // the render layer below is unchanged.
    //
    // config: {
    //   bodyClass, storageKey, pageTitle, mode,
    //   headerPatterns: RegExp[] (to locate the table),
    //   columns: ['teacherId','teacherName','courseId','courseName','section','evaluate']
    //            | ['courseId','courseName','section','evaluate']
    // }
    // pageKey maps a storageKey onto the portal page key the shared data
    // layer knows (see features/shared/ulab-portal-data.js).
    const PAGE_KEY_BY_STORAGE_KEY = {
        ulabTeacherEvaluation: 'teacherEvaluation',
        ulabCourseEvaluation: 'courseEvaluation',
    };

    // Parses the LIVE document (free, no request) and writes the unchanged
    // <storageKey> + <storageKey>ScrapedAt cache.
    function scrapeAndPersist(config) {
        const pageKey = PAGE_KEY_BY_STORAGE_KEY[config.storageKey];
        try {
            if (pageKey) return window.ULAB_PORTAL_DATA.storeFromDocument(pageKey, document);
        } catch (e) {
            console.error('[Student Companion] failed to cache ' + config.storageKey, e);
        }
        try { return window.ULAB_PARSERS.parseEvaluation(document, config); }
        catch (e2) { return { rows: [], deadlineBanner: null }; }
    }

    function evaluatePillClass(value) {
        const v = (value || '').trim().toLowerCase();
        if (v === 'done') return 'pill-success';
        if (!v) return 'pill-warning';
        return 'pill-muted';
    }

    // Dense table, columns matching each page's own legacy table 1:1.
    // Teacher Evaluation keeps Teacher ID AND Teacher Name as their own
    // columns — they are the whole point of that page versus Course
    // Evaluation, so they are never folded into a single text run.
    //
    // The Evaluate cell's content is still passed through defensively: the
    // sample data only ever shows "Done" (deadline passed), so anything else
    // — including a real link or form that the still-open state might render
    // — is shown as its plain text in a muted pill rather than guessed at.
    function renderTable(rows, config) {
        const teacher = config.mode === 'teacher';
        const columns = teacher
            ? ['#', 'Teacher ID', 'Teacher Name', 'Course ID', 'Course Name', 'Section', 'Evaluate']
            : ['#', 'Course ID', 'Course Name', 'Section', 'Evaluate'];
        return `
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
                    <tbody>${rows.map((r, i) => `
                        <tr>
                            <td class="c-num">${i + 1}</td>
                            ${teacher ? `<td class="c-code">${esc(r.teacherId)}</td><td>${esc(r.teacherName)}</td>` : ''}
                            <td class="c-code">${esc(r.courseId)}</td>
                            <td>${esc(r.courseName)}</td>
                            <td class="c-center">${r.section ? esc(r.section) : '—'}</td>
                            <td><span class="pill ${evaluatePillClass(r.evaluate)}">${esc(r.evaluate || 'Pending')}</span></td>
                        </tr>`).join('')}</tbody>
                </table>
            </div>`;
    }

    function injectStyle(viewId) {
        const styleId = viewId + '-css';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        // Everything else comes from bento-ui.css's shared compact layer.
        style.textContent = `
            #${viewId} { display: none; padding: 10px 0 28px; text-align: left; font-family: var(--bento-font-ui); color: var(--bento-fg); }
            body.ulab-shell-mounted #${viewId} { display: block; }
        `;
        document.head.appendChild(style);
    }

    function render(config, rows, info, deadlineBanner) {
        const viewId = 'ulab-' + config.storageKey + '-view';
        const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
        injectStyle(viewId);
        let view = document.getElementById(viewId);
        if (!view) {
            view = document.createElement('div');
            view.id = viewId;
            view.className = 'bento-root';
            contentCell.appendChild(view);
        }

        const doneCount = rows.filter(r => (r.evaluate || '').trim().toLowerCase() === 'done').length;
        const banners = [];
        const isSimple = window.ULAB_SHELL && window.ULAB_SHELL.isSimpleMode();
        let prominentDeadlineHtml = '';

        if (deadlineBanner || isSimple) {
            const msg = deadlineBanner || 'Deadline is over. No changes can be made.';
            prominentDeadlineHtml = `
                <div style="color: #DC2626; font-size: 1.2rem; font-weight: 700; padding: 14px 18px; background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 12px; margin: 16px 0; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 8px rgba(220,38,38,0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>${esc(msg)} Section is read-only.</span>
                </div>`;
        } else if (deadlineBanner) {
            banners.push({ text: deadlineBanner, tone: 'warning' });
        }

        const stats = [
            { label: 'Total', value: rows.length },
            { label: 'Submitted', value: doneCount },
            { label: 'Remaining', value: Math.max(0, rows.length - doneCount) },
        ];
        const headerCardHtml = window.ULAB_SHELL.renderHeaderCard(info, {
            title: config.pageTitle,
            banners,
            stats,
        });

        view.innerHTML = `
            ${headerCardHtml}
            ${prominentDeadlineHtml}
            <h2 class="bento-sectitle">${config.mode === 'teacher' ? 'Teachers' : 'Courses'}</h2>
            ${rows.length ? renderTable(rows, config) : '<div class="bento-empty">No evaluation rows found.</div>'}
        `;
    }

    function run(config) {
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
        window.ULAB_SHELL.mount(config.bodyClass, null, (info) => {
            const parsed = scrapeAndPersist(config);
            render(config, parsed.rows, info, parsed.deadlineBanner);
        });
    }

    window.ULAB_EVAL = { run };
})();
