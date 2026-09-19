// features/preregistration/preregistration-ui-content.js — content script
// injected into the URMS student portal Preregistration page
// (Preregistration.php).
//
// IMPORTANT (superseded finding — read status-ui-content.js too): the
// "Taken?" tick/x column scraped here is really "registered THIS semester's
// plan", not "completed with a grade" — Status.php's "Result of completed/
// registered courses" table (see features/status/status-ui-content.js) is
// the authoritative completed-course source for the self-advising feature
// (it has per-course letter grades / "S" / blank-for-in-progress, which is
// what prerequisite/retake logic actually needs). This file's scrape is kept
// and still cached (as ulabPreregCourses) since it's still useful signal —
// e.g. "mandatory but not yet registered" warnings, or cross-checking against
// Status.php's in-progress rows — but is no longer the primary source for
// window.ULAB_SHELL's completed-courses story.
//
// RENDER LAYER (compact rebuild): the page's job is helping the student pick
// from ~51 offered courses, so the view is a dense Pingala-style info block +
// credit meter + one sticky-header data table carrying prerequisite /
// eligibility / category decision support pulled from catalogues/*.js.
// The scraping half below is unchanged.
(function () {
    // PARSER LOCATION: the Preregistration.php scrape (course tables, the
    // #ccc co-curricular split, and the header/banner extras) now lives in
    // features/shared/ulab-portal-parsers.js as parsePreregistration(doc),
    // so the same code reads both this live page and a background-fetched
    // copy for the side panel. The render layer below is unchanged and still
    // receives exactly { courses, extras } with the same shapes.
    function findCourseTables() {
        return window.ULAB_PARSERS.findCourseTables(document);
    }

    function portalAction(href, label, active) {
        return `<a class="bento-action${active ? ' active' : ''}" href="${esc(href)}">${esc(label)}</a>`;
    }

    // Wraps a portal action control. `disabled` only MARKS it — the shell's
    // applyDisabledControls() pass does the actual neutralising (href/onclick
    // parked on data-*, tabindex -1, aria-disabled, capture-phase blocker).
    // The control's own markup is never rewritten, so what it does is
    // unchanged; only whether it can be invoked.
    function actionControl(markup, disabled, title) {
        return `<span class="bento-action-control"${disabled ? ' data-ulab-disabled="1"' : ''}${title ? ` title="${esc(title)}"` : ''}>${markup}</span>`;
    }

    // Parses the LIVE document (free, no request) and writes the unchanged
    // ulabPreregCourses / ulabPreregAdvisingExtras / ulabPreregScrapedAt keys.
    function scrapeAndPersist() {
        try {
            return window.ULAB_PORTAL_DATA.storeFromDocument('preregistration', document);
        } catch (e) {
            console.error('[Student Companion] failed to cache preregistration courses', e);
            try { return window.ULAB_PARSERS.parsePreregistration(document); }
            catch (e2) { return { courses: [], extras: {} }; }
        }
    }

    const VIEW_ID = 'ulab-prereg-view';
    const STYLE_ID = 'ulab-prereg-view-css';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // ── Catalogue lookup ────────────────────────────────────────────────
    // catalogues/*.js each register onto window.ULAB_CATALOGUES[id]
    // (see manifest.json's Preregistration.php content_scripts entry — the
    // same file order sidebar/sidebar.html uses: factory, programs,
    // registry). Resolution order per course code: the student's own program
    // catalogue first (ulabStudentProfile.programCode), then any other
    // loaded catalogue. Course codes are near-unique across ULAB programs,
    // so this fallback is a lenient lookup of real catalogue data, never a
    // guess: a code that resolves nowhere simply renders as "—".
    function normCode(code) {
        return String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }

    function catalogueList(programCode) {
        const all = window.ULAB_CATALOGUES || {};
        const ids = Object.keys(all);
        const preferred = [];
        const wanted = String(programCode || '').toUpperCase();
        // profile.programCode is the department code the portal shows (e.g.
        // "CSE", "BBA"). For most programs that equals the catalogue id, but
        // not all: the registry lists English's id as "ENGLISH" while the
        // portal reports "DEH". So match the id first, then the registry's
        // own `short` for that id, which carries exactly those divergences
        // (CSE/BBA/DEH/MSJ/EEE/Bangla) — no invented mappings.
        const shortToId = {};
        (window.ULAB_PROGRAMS || []).forEach((program) => {
            if (program && program.short) shortToId[String(program.short).toUpperCase()] = program.id;
        });
        const viaShort = shortToId[wanted];
        ids.forEach((id) => {
            const upper = id.toUpperCase();
            if (upper === wanted || (viaShort && upper === String(viaShort).toUpperCase())) preferred.push(id);
        });
        const rest = ids.filter(id => !preferred.includes(id));
        return preferred.concat(rest).map(id => ({ id, catalogue: all[id] })).filter(entry => entry.catalogue);
    }

    // Returns { id, catalogue, course } for the first catalogue resolving
    // `code`, or null.
    function lookup(catalogues, code) {
        for (const entry of catalogues) {
            const course = entry.catalogue.resolve(code);
            if (course) return { id: entry.id, catalogue: entry.catalogue, course };
        }
        return null;
    }

    const CATEGORY_LABELS = {
        GED: 'GED',
        ESK: 'ESK',
        Mathematics: 'Math',
        BasicScience: 'Basic Sci',
        OtherEngineering: 'Other Engg',
        MajorCore: 'Major Core',
        MajorElective: 'Major Elective',
        OptionalMinor: 'Optional/Minor',
        Unknown: '—',
    };

    // ── Course history → passed / failed / in-progress sets ─────────────
    // Verified against features/status/status-ui-content.js's
    // scrapeResultTable(): it splits Status.php's "Result of completed/
    // registered courses" rows on the Result cell, stored per row as
    // `grade`. Non-blank grade (a letter grade or "S") → ulabCompletedCourses;
    // blank grade → ulabInProgressCourses. So here:
    //   PASSED      = in ulabCompletedCourses with grade !== 'F'
    //   FAILED      = in ulabCompletedCourses with grade === 'F' (retake
    //                 candidate — NOT counted as satisfying a prerequisite)
    //   IN PROGRESS = in ulabInProgressCourses (blank grade)
    function buildHistory(completed, inProgress, catalogues) {
        const passed = new Set();
        const failed = new Set();
        const progress = new Set();
        const passedCredits = [];   // { category, credits }
        // key -> the Status.php row that passed it, so the offered-course
        // table can show WHEN and with WHAT GRADE a course was passed
        // instead of a bare "Retake" pill. Read-only display data.
        const passedInfo = new Map();

        function keysFor(rawCode) {
            const keys = [normCode(rawCode)];
            const hit = lookup(catalogues, rawCode);
            if (hit) {
                keys.push(normCode(hit.course.code));
                keys.push(normCode(hit.course.unescoCode));
            }
            return { keys, hit };
        }

        (completed || []).forEach((row) => {
            const isFail = /^F$/i.test((row.grade || '').trim());
            const { keys, hit } = keysFor(row.code);
            keys.forEach(k => (isFail ? failed : passed).add(k));
            if (!isFail) keys.forEach(k => passedInfo.set(k, row));
            if (!isFail && hit) {
                passedCredits.push({
                    code: hit.course.code,
                    category: hit.catalogue.categoryFor(row.code),
                    credits: typeof row.credits === 'number' ? row.credits : 0,
                });
            }
        });
        // A later pass of the same course overrides an earlier F.
        (completed || []).forEach((row) => {
            if (/^F$/i.test((row.grade || '').trim())) return;
            keysFor(row.code).keys.forEach(k => failed.delete(k));
        });
        (inProgress || []).forEach((row) => {
            keysFor(row.code).keys.forEach(k => progress.add(k));
        });

        return { passed, failed, progress, passedCredits, passedInfo };
    }

    // ── Degree-gap marking ──────────────────────────────────────────────
    // degreeRequirements is { labels, credits: {Category: creditsRequired},
    // total } — a per-CATEGORY credit total, not a per-course checklist. So
    // the only honest per-course answer it supports is "this course's
    // category still has unearned credits left", computed as
    // required[category] - (credits passed in that category). That is exactly
    // what's rendered (a small "gap" marker on the category cell), and only
    // when Status.php history is available AND the category appears in the
    // requirements table. Categories absent from the table (e.g. ESK for
    // CSE) get no marker rather than a wrong one. Per-course "you still need
    // THIS course" is deliberately NOT claimed — the table cannot express it.
    function buildDegreeGaps(degreeRequirements, passedCredits) {
        if (!degreeRequirements || !degreeRequirements.credits) return null;
        const remaining = {};
        Object.keys(degreeRequirements.credits).forEach((cat) => {
            remaining[cat] = degreeRequirements.credits[cat];
        });
        passedCredits.forEach((row) => {
            if (remaining[row.category] == null) return;
            remaining[row.category] -= (row.credits || 0);
        });
        return remaining;
    }

    // ── Eligibility ─────────────────────────────────────────────────────
    // state: 'unknown' | 'retake' | 'no-prereq' | 'eligible' | 'in-progress'
    //        | 'missing' | 'no-history'
    function computeEligibility(course, hit, history, haveHistory) {
        if (!hit) return { state: 'unknown', unmet: [] };
        const codeKeys = [normCode(course.code), normCode(hit.course.code), normCode(hit.course.unescoCode)];
        const alreadyPassed = codeKeys.some(k => history.passed.has(k));
        const previouslyFailed = codeKeys.some(k => history.failed.has(k));
        const prereq = Array.isArray(hit.course.prereq) ? hit.course.prereq : [];

        if (!haveHistory) return { state: 'no-history', unmet: [], prereq };
        if (alreadyPassed) {
            // ALREADY PASSED. The student asked to be able to see, from this
            // page, the courses they have already taken — without going to
            // the Result page first. `retake` is the state this codebase
            // already uses for "you passed this and it's being offered
            // again", so the passing row is attached to it rather than
            // inventing a parallel concept. Display only: the row stays
            // read-only, and the portal's own Select control is what would
            // register it, exactly as before.
            const passedKey = codeKeys.find(k => history.passedInfo && history.passedInfo.has(k));
            const passedRow = passedKey ? history.passedInfo.get(passedKey) : null;
            return { state: 'retake', unmet: [], prereq, passedRow };
        }

        // GED / ESK / elective categories carry empty prereq arrays in the
        // catalogue — only Math / Basic Science / Other Engineering / Major
        // Core declare prerequisites. An empty array therefore means "nothing
        // to verify", NOT "verified clear", so it gets its own neutral state
        // instead of an affirmative green Eligible.
        if (!prereq.length) return { state: 'no-prereq', unmet: [], prereq, previouslyFailed };

        const unmet = prereq.filter(p => !history.passed.has(normCode(p)));
        if (!unmet.length) return { state: 'eligible', unmet: [], prereq, previouslyFailed };
        const running = unmet.filter(p => history.progress.has(normCode(p)));
        if (running.length === unmet.length) return { state: 'in-progress', unmet, prereq, previouslyFailed };
        return { state: 'missing', unmet, prereq, previouslyFailed };
    }

    // ── Curriculum-position heuristic (NOT official curriculum data) ────
    // The catalogues carry no semester/term/year field — nothing in
    // catalogues/*.js says when a course is "meant" to be taken. What
    // the ULAB course code itself encodes is the curriculum position:
    // DEPT + <yearDigit><termDigit><seq>, with 3 semesters per academic year
    // (semester codes like 233/241/242 → trailing digit 1=Spring, 2=Summer,
    // 3=Fall; handoff.md's "263 → Fall 2026"), giving:
    //     semesterPosition = (yearDigit - 1) * 3 + termDigit
    // Spot-checked against reference-html/status.html (CSE1102 → 1, taken in
    // that student's first semester, 233); the stored reference file is
    // truncated, so only the earliest rows could be re-verified here.
    // TREAT THIS AS A HEURISTIC read off code numbering, never as an
    // official roadmap — it is surfaced as advisory in the UI for that
    // reason. Codes that do not fit the pattern (CCC100, CSE4098-A/-B, any
    // 3-digit or oddly-suffixed code) return null rather than a forced
    // number.
    function semesterPosition(rawCode) {
        const m = String(rawCode || '').toUpperCase().match(/^[A-Z]{2,4}[\s-]*(\d)(\d)\d{2}(?:[\s-]*[A-Z])?$/);
        if (!m) return null;
        const year = parseInt(m[1], 10);
        const term = parseInt(m[2], 10);
        if (!(year >= 1 && year <= 6) || !(term >= 1 && term <= 3)) return null;
        return (year - 1) * 3 + term;
    }

    // Sequencing judgement applies to structured/major-track categories
    // only. GED / ESK / electives / minors are deliberately flexible in the
    // ULAB curriculum — the same student in reference-html/status.html took
    // a position-2 business course in their 8th semester, which is normal —
    // so those are never called "catch-up" or out-of-sequence.
    const SEQUENCED_CATEGORIES = ['MajorCore', 'Mathematics', 'BasicScience', 'OtherEngineering'];
    function isSequenced(category) {
        return SEQUENCED_CATEGORIES.includes(category);
    }

    const ELIG_PILL = {
        eligible: ['pill-success', 'Eligible'],
        'no-prereq': ['pill-muted', 'No prereqs listed'],
        'in-progress': ['pill-warning', 'Prereq in progress'],
        missing: ['pill-destructive', 'Missing prereq'],
        retake: null,
        unknown: ['pill-muted', 'Unknown'],
        'no-history': ['pill-muted', '—'],
    };

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        // The compact info grid / pill strip / meter / chips / search /
        // notice / data table / footnote that this page introduced now live
        // in features/common/bento-ui.css's shared compact component layer,
        // as GLOBAL (un-id-scoped) classes. That also retired the `S()`
        // dual-scoping helper this file used to need: the recommendation
        // modal is appended to <body>, outside #ulab-prereg-view (so its
        // `position:fixed` can never be trapped by an ancestor's stacking
        // context), and a global class reaches it for free.
        //
        // What stays local below is genuinely page-specific: this view's
        // visibility/legacy-hide rules and the modal's own chrome. Every
        // colour still resolves through a --bento-* custom property, so
        // light (:root) and dark (body.ulab-dark) both work.
        style.textContent = `
            #${VIEW_ID} { display: none; padding: 10px 0 28px; text-align: left; font-family: var(--bento-font-ui); color: var(--bento-fg); }
            body.ulab-page-preregistration.ulab-shell-mounted #${VIEW_ID} { display: block; }
            body.ulab-page-preregistration.ulab-shell-mounted .ulab-legacy-prereg-table { display: none !important; }

            #ulab-prereg-rec-modal { position:fixed; inset:0; z-index:1000002; display:flex; align-items:center; justify-content:center; padding:20px; background:color-mix(in srgb, var(--bento-fg) 55%, transparent); font-family:var(--bento-font-ui); }
            #ulab-prereg-rec-modal .pg-rec-card { display:flex; flex-direction:column; width:100%; max-width:920px; max-height:88vh; background:var(--bento-card); color:var(--bento-fg); border:1px solid var(--bento-border-soft); border-radius:var(--bento-radius-sm); box-shadow:var(--bento-shadow-hover); overflow:hidden; }
            #ulab-prereg-rec-modal .pg-rec-bar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:7px 10px; background:var(--bento-primary); color:var(--bento-accent-fg); font-size:12.5px; font-weight:800; }
            #ulab-prereg-rec-modal .pg-rec-close { display:inline-flex; align-items:center; justify-content:center; padding:3px; background:transparent; border:1px solid color-mix(in srgb, var(--bento-accent-fg) 40%, transparent); border-radius:var(--bento-radius-xs); color:inherit; cursor:pointer; }
            #ulab-prereg-rec-modal .pg-rec-body { overflow-y:auto; padding:10px 12px 14px; }
            #ulab-prereg-rec-modal .pg-rec-head { display:flex; flex-wrap:wrap; gap:6px 16px; padding:6px 9px; margin-bottom:8px; border:1px solid var(--bento-border-soft); border-radius:var(--bento-radius-xs); background:var(--bento-card-alt); font-size:11.5px; color:var(--bento-fg-muted); }
            #ulab-prereg-rec-modal .pg-rec-head b { color:var(--bento-fg); }
            #ulab-prereg-rec-modal .pg-rec-group { margin-bottom:14px; }
            #ulab-prereg-rec-modal .pg-rec-group h3 { margin:0 0 2px; font-size:12px; font-weight:800; color:var(--bento-fg); }
            #ulab-prereg-rec-modal .pg-rec-group h3 span { display:inline-block; margin-left:5px; padding:0 6px; border-radius:999px; background:color-mix(in srgb, var(--bento-primary) 14%, transparent); color:var(--bento-primary); font-size:10px; }
            #ulab-prereg-rec-modal .pg-rec-group p { margin:0 0 6px; font-size:10.5px; color:var(--bento-fg-subtle); }
        `;
        document.head.appendChild(style);
    }

    function hideLegacyTables(tables) {
        tables.forEach(t => t.classList.add('ulab-legacy-prereg-table'));
    }

    function icon(path, size) {
        return `<svg viewBox="0 0 24 24" width="${size || 13}" height="${size || 13}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }
    const ICON_SEARCH = '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>';
    const ICON_INFO = '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>';
    const ICON_WARN = '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>';

    // ── Row rendering ───────────────────────────────────────────────────
    // The action control is preserved byte-for-byte from the scrape
    // (course.actionMarkup — the page's own Select/Unselect anchor, which
    // performs a REAL full-page navigation), with the same
    // /Preregistration.php?task=changeTakenStatus&... fallback as before for
    // the read-only "Registration complete" state where the page emits only
    // an image. Nothing is intercepted client-side: the credit meter above
    // reflects server state at page load, and the server is what changes it.
    //
    // `selectionLocked` (registration-flow.md step 1→2): clicking courses is
    // step 1, and "Pre Advising Complete" is step 2 — so once the page reports
    // pre-advising complete (or registration complete), course selection is a
    // finished step and its Select / Unselect control must not be clickable.
    // The control is still rendered so the student can see the state; it is
    // simply inert. Enabled otherwise — we never invent a state we have not
    // captured in reference-html/.
    function renderRow(course, index, info, selectionLocked) {
        const e = course.elig;
        const pillInfo = ELIG_PILL[e.state] || ELIG_PILL.unknown;
        const fallbackAction = portalAction(
            `/Preregistration.php?task=changeTakenStatus&studentID=${encodeURIComponent(info.studentId || '')}&course=${encodeURIComponent(course.code)}&taken=${course.registeredThisPlan ? '0' : '1'}`,
            course.registeredThisPlan ? 'Unselect' : 'Select',
            course.registeredThisPlan
        );

        let eligCell = (pillInfo && pillInfo[1]) ? `<span class="pill ${pillInfo[0]}">${esc(pillInfo[1])}</span>` : '';
        if (e.state === 'missing' || e.state === 'in-progress') {
            const list = e.unmet.map(c => esc(c)).join(', ');
            eligCell += `<div class="c-sub">Needs ${list}</div>`;
        }
        // Read-only "you already took this" detail, straight off the
        // Status.php row that passed it. Purely informational — it adds no
        // control and changes nothing about the row's portal action.
        if (e.state === 'retake' && e.passedRow) {
            const when = e.passedRow.semester ? ` in ${e.passedRow.semester}` : '';
            const grade = e.passedRow.grade ? `Passed with ${e.passedRow.grade}` : 'Already passed';
            eligCell += `<div class="c-sub">${esc(grade)}${esc(when)}</div>`;
        }

        const prereqText = e.prereq && e.prereq.length ? e.prereq.join(', ') : (course.hit ? 'None listed' : '—');
        const catLabel = course.hit ? (CATEGORY_LABELS[course.category] || course.category || '—') : '—';
        const gapTag = course.fillsGap ? `<span class="bento-tag gap" title="This category still has unearned credits in your degree requirements">gap</span>` : '';

        const filterKey = [
            course.registeredThisPlan ? 'registered' : 'unregistered',
            e.state === 'eligible' ? 'eligible' : '',
            e.state === 'missing' ? 'missing' : '',
            e.state === 'retake' ? 'passed' : '',
        ].filter(Boolean).join(' ');

        return `
            <tr class="${course.registeredThisPlan ? 'is-ok' : ''}" data-course-search="${esc(`${course.code} ${course.name}`.toLowerCase())}" data-filter="${esc(filterKey)}">
                <td class="c-num">${index}</td>
                <td class="c-code">${esc(course.code)}</td>
                <td>${esc(course.name)}${course.mandatory ? '<span class="bento-tag mand">Mandatory</span>' : ''}</td>
                <td class="c-sub">${esc(prereqText)}</td>
                <td>${esc(catLabel)}${gapTag}</td>
                <td class="c-center">${course.credits != null ? esc(course.credits) : '—'}</td>
                <td>${eligCell}</td>
                <td><span class="pill ${course.registeredThisPlan ? 'pill-success' : 'pill-muted'}">${course.registeredThisPlan ? 'Registered' : 'Not reg.'}</span></td>
                <td>${actionControl(
                    course.actionMarkup || fallbackAction,
                    selectionLocked,
                    selectionLocked ? 'Locked — pre-advising is already complete' : 'Change registration'
                )}</td>
            </tr>`;
    }

    const COLUMNS = ['#', 'Course ID', 'Course Name', 'Prerequisite', 'Category', 'Cr', 'Eligibility', 'Status', 'Action'];

    function renderTable(courses, info, selectionLocked) {
        return `
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr>${COLUMNS.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
                    <tbody>${courses.map((c, i) => renderRow(c, i + 1, info, selectionLocked)).join('')}</tbody>
                </table>
            </div>`;
    }

    // ── Search + filter wiring ──────────────────────────────────────────
    // Both inputs write to the SAME visibility pass (applyFilters), so they
    // compose instead of overwriting each other's hidden state.
    function wireControls(view, total) {
        const input = view.querySelector('#ulab-prereg-search');
        const countEl = view.querySelector('.bento-count');
        const chips = Array.from(view.querySelectorAll('.bento-chip[data-filter]'));
        const rows = Array.from(view.querySelectorAll('tr[data-course-search]'));
        let active = 'all';

        function applyFilters() {
            const query = input ? input.value.trim().toLowerCase() : '';
            let visible = 0;
            rows.forEach((row) => {
                const matchesQuery = !query || row.dataset.courseSearch.includes(query);
                const matchesChip = active === 'all' || (row.dataset.filter || '').split(' ').includes(active);
                const show = matchesQuery && matchesChip;
                row.classList.toggle('bento-hidden', !show);
                if (show) visible++;
            });
            if (countEl) {
                countEl.textContent = (query || active !== 'all')
                    ? `Showing ${visible} of ${total} offered courses`
                    : `${total} offered courses in your current plan`;
            }
        }

        if (input) input.addEventListener('input', applyFilters);
        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                active = chip.dataset.filter;
                chips.forEach(c => c.classList.toggle('on', c === chip));
                applyFilters();
            });
        });
        applyFilters();
    }

    // ── Sort ────────────────────────────────────────────────────────────
    // Decision-making order, deterministic (ties fall back to the page's own
    // row order so the view never reshuffles between loads):
    //   1. already registered this plan  (what you've committed to — review first)
    //   2. eligible AND filling a remaining degree-requirement category
    //   3. eligible (prereqs actually existed and are satisfied)
    //   4. no prereqs listed / unknown  (nothing verifiable either way)
    //   5. prereq currently in progress (possible next semester, not now)
    //   6. missing prereq               (can't take)
    //   7. already passed → retake      (lowest priority)
    function sortRank(course) {
        if (course.registeredThisPlan) return 0;
        const s = course.elig.state;
        if (s === 'eligible') return course.fillsGap ? 1 : 2;
        if (s === 'no-prereq' || s === 'unknown' || s === 'no-history') return 3;
        if (s === 'in-progress') return 4;
        if (s === 'missing') return 5;
        return 6; // retake
    }

    function sortCourses(courses) {
        return courses
            .map((course, i) => ({ course, i }))
            .sort((a, b) => (sortRank(a.course) - sortRank(b.course)) || (a.i - b.i))
            .map(entry => entry.course);
    }

    // ── Recommended courses ─────────────────────────────────────────────
    // Entirely client-side and read-only: it re-reads the same scraped
    // offered-course list, the same eligibility results computed above, and
    // the same cached Status.php history. Nothing is submitted, auto-selected
    // or fetched — the student still uses the page's own Select links.
    //
    // Recommendable = offered in the portal now, not already passed, not
    // already registered this plan, and prerequisite-eligible (states
    // 'eligible' or 'no-prereq' straight off computeEligibility()).
    function buildRecommendations(courses, history) {
        // Current curriculum position = the furthest position the student
        // has actually passed among sequenced (major-track) courses. Flexible
        // GED/ESK/elective passes are ignored so an out-of-order GED can't
        // inflate it.
        let current = 0;
        history.passedCredits.forEach((row) => {
            if (!isSequenced(row.category)) return;
            const pos = semesterPosition(row.code);
            if (pos != null && pos > current) current = pos;
        });

        const buckets = { catchup: [], ontrack: [], ahead: [], fillers: [] };
        courses.forEach((course) => {
            if (course.table === 'co-curricular') return;
            if (course.registeredThisPlan) return;
            if (!course.hit) return;
            if (course.elig.state !== 'eligible' && course.elig.state !== 'no-prereq') return;

            const pos = semesterPosition(course.code);
            const sequenced = isSequenced(course.category);
            const entry = { course, pos };
            if (!sequenced || pos == null) {
                buckets.fillers.push(entry);
            } else if (current > 0 && pos < current) {
                buckets.catchup.push(entry);
            } else if (current === 0 || pos <= current + 1) {
                buckets.ontrack.push(entry);
            } else {
                buckets.ahead.push(entry);
            }
        });

        const bySeq = (a, b) => (a.pos == null) - (b.pos == null) || (a.pos - b.pos) || a.course.code.localeCompare(b.course.code);
        Object.keys(buckets).forEach(k => buckets[k].sort(bySeq));
        // Degree-gap fillers first within the flexible bucket, since those
        // are the ones that actually still count toward the degree.
        buckets.fillers.sort((a, b) => (b.course.fillsGap - a.course.fillsGap) || bySeq(a, b));
        return { current, buckets };
    }

    const REC_GROUPS = [
        ['catchup', 'Catch-up — earlier in your track, offered again now', 'These sit before your current curriculum position: courses you skipped, failed or missed. Most actionable.'],
        ['ontrack', 'On track — your current semester position', 'Sequenced courses at or just after where your passed major courses put you.'],
        ['ahead', 'Ahead — later in the track, but you already qualify', 'Prerequisites are satisfied even though these normally come later.'],
        ['fillers', 'Flexible slots — GED, ESK, electives and minors', 'Deliberately unsequenced in the curriculum. Taking these out of order is normal.'],
    ];

    function renderRecommendationBody(recs, extras, haveHistory, programCode) {
        // DEAD ENDS REMOVED. Both of this modal's empty states used to
        // refuse to compute and send the student off to fetch data by hand
        // ("Open your Profile page once in this browser…", "Open the Result
        // page once in this browser…"). Those pages are now fetched by the
        // extension before the view renders, so by the time this modal can
        // be opened the data is either present or genuinely unobtainable.
        // What is left is only the genuine-failure path, which says what
        // failed instead of assigning the student homework — the Retry
        // button lives on the page's own notice, above the table.
        if (!programCode || !haveHistory) {
            const what = !programCode && !haveHistory ? 'your programme and grade history'
                : (!programCode ? 'your programme' : 'your grade history');
            return `<div class="bento-notice warn">${icon(ICON_WARN)}<div><b>Recommendations aren't available right now.</b> ${esc(what.charAt(0).toUpperCase() + what.slice(1))} could not be read from the portal — without it there's no way to tell what you've already passed or where you are in the curriculum. Use <b>Retry</b> on the notice above this table, or log in again if your session has expired.</div></div>`;
        }

        const used = extras.totalUsedCredit;
        const max = extras.maxCredit;
        const room = (used != null && max != null) ? (max - used) : null;
        const headHtml = `
            <div class="pg-rec-head">
                <span>Curriculum position: <b>semester ${recs.current || '—'}</b> (inferred)</span>
                ${room != null ? `<span>Credit room left: <b>${esc(room.toFixed(1))}</b> of ${esc(max)}</span>` : ''}
            </div>`;

        let running = 0;
        const groupsHtml = REC_GROUPS.map(([key, title, blurb]) => {
            const list = recs.buckets[key];
            if (!list.length) return '';
            const rows = list.map(({ course, pos }) => {
                running += (course.credits || 0);
                const overRoom = room != null && running > room;
                return `
                    <tr>
                        <td class="c-code">${esc(course.code)}</td>
                        <td>${esc(course.name)}${course.mandatory ? '<span class="bento-tag mand">Mandatory</span>' : ''}${course.fillsGap ? '<span class="bento-tag gap">gap</span>' : ''}</td>
                        <td class="c-muted">${pos != null ? `Sem ${pos}` : '—'}</td>
                        <td class="c-muted">${esc(CATEGORY_LABELS[course.category] || course.category || '—')}</td>
                        <td class="c-center">${course.credits != null ? esc(course.credits) : '—'}</td>
                        <td class="c-center ${overRoom ? "c-over" : "c-muted"}">${running.toFixed(1)}</td>
                    </tr>`;
            }).join('');
            return `
                <section class="pg-rec-group">
                    <h3>${esc(title)} <span>${list.length}</span></h3>
                    <p>${esc(blurb)}</p>
                    <div class="bento-tablewrap">
                        <table class="bento-compact">
                            <thead><tr><th>Course ID</th><th>Course Name</th><th>Track Pos.</th><th>Category</th><th>Cr</th><th>Cum. Cr</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </section>`;
        }).join('');

        if (!groupsHtml) {
            return headHtml + `<div class="bento-notice info">${icon(ICON_INFO)}<div>Nothing to recommend: every offered course you're eligible for is either already registered or already passed.</div></div>`;
        }

        return headHtml + groupsHtml + `
            <p class="bento-footnote">Recommendations use only data already on your screen and in this browser — the courses this portal is offering you, your cached Result-page grades, and a hand-transcribed course catalogue. Curriculum position is <b>inferred from course-code numbering</b>, not official curriculum data, and cumulative credits are a reading aid, not a registration. Confirm with your adviser before registering.</p>`;
    }

    // Local modal rather than the shell's openExtensionFrame(): that one is
    // hard-wired to load an extension page into an <iframe> (it builds the
    // card around an iframe element and drives it by src), and the
    // Self-Advising / Capstone / Catalogue tools on every page depend on
    // that exact behavior. Generalizing it to take arbitrary DOM would mean
    // reworking a shared code path used by five callers for one page's
    // benefit, so this small, self-contained dialog lives here instead.
    function renderModalTypicalPlan(cat) {
        if (!cat || !cat.semesterPlan || !cat.semesterPlan.length) {
            return `<div class="bento-notice info" style="margin:12px;">No standard semester-by-semester plan defined for this program yet.</div>`;
        }
        let totalCourses = 0;
        let totalCredits = 0;
        cat.semesterPlan.forEach(sem => {
            sem.courses.forEach(code => {
                totalCourses++;
                const course = cat.resolve(code);
                totalCredits += (course && typeof course.credits === 'number') ? course.credits : 3;
            });
        });

        let html = `
            <div class="bento-statstrip" style="margin-bottom:12px; border-bottom:1px solid var(--bento-border-soft);">
                <div class="bento-stat">
                    <span class="bento-stat-label">Semesters</span>
                    <span class="bento-stat-value">${cat.semesterPlan.length}</span>
                </div>
                <div class="bento-stat">
                    <span class="bento-stat-label">Planned Courses</span>
                    <span class="bento-stat-value">${totalCourses}</span>
                </div>
                <div class="bento-stat">
                    <span class="bento-stat-label">Est. Credits</span>
                    <span class="bento-stat-value">${totalCredits}</span>
                </div>
            </div>
        `;

        cat.semesterPlan.forEach((sem, idx) => {
            let semCredits = 0;
            sem.courses.forEach(c => {
                const co = cat.resolve(c);
                semCredits += (co && typeof co.credits === 'number') ? co.credits : 3;
            });

            html += `
                <details class="bento-panel standalone" style="margin-bottom:10px;" ${idx < 2 ? 'open' : ''}>
                    <summary style="padding:8px 12px; font-weight:800; font-size:12px; cursor:pointer; background:var(--bento-card-alt); color:var(--bento-fg); display:flex; justify-content:space-between; align-items:center;">
                        <span>${esc(sem.label || ('Semester ' + (idx + 1)))}</span>
                        <span style="font-size:11px; font-weight:600; color:var(--bento-fg-muted);">${sem.courses.length} courses (${semCredits} cr)</span>
                    </summary>
                    <div style="padding:10px;">
                        ${sem.courses.length ? `
                            <div class="bento-tablewrap">
                                <table class="bento-compact">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Title</th>
                                            <th>Type</th>
                                            <th class="c-center">Credits</th>
                                            <th>Prerequisites</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sem.courses.map(code => {
                                            const co = cat.resolve(code);
                                            const cCode = co ? co.code : code;
                                            const title = co ? co.title : (cat.titleFor(code) || '—');
                                            const type = co ? (co.courseType || co.category || 'Course') : 'Course';
                                            const cr = co ? (co.credits != null ? co.credits : '—') : '3';
                                            const prereqs = (co && co.prereq && co.prereq.length) ? co.prereq.join(', ') : 'None';
                                            return `
                                                <tr>
                                                    <td class="c-code">${esc(cCode)}</td>
                                                    <td>${esc(title)}</td>
                                                    <td class="c-sub">${esc(type)}</td>
                                                    <td class="c-center">${esc(cr)}</td>
                                                    <td class="c-sub">${esc(prereqs)}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<div style="font-size:11.5px; color:var(--bento-fg-subtle); font-style:italic; padding:4px 0;">No specific core courses scheduled for this term.</div>'}
                        ${sem.note ? `<div class="bento-notice info" style="margin-top:8px;">${esc(sem.note)}</div>` : ''}
                    </div>
                </details>
            `;
        });

        return html;
    }

    function renderModalMyJourney(cat, completedRows, inProgressRows) {
        if (!cat || !cat.semesterPlan || !cat.semesterPlan.length) {
            return `<div class="bento-notice info" style="margin:12px;">No standard semester-by-semester plan defined for this program yet.</div>`;
        }

        const completedMap = new Map();
        (completedRows || []).forEach(item => {
            if (item && item.code) completedMap.set(normCode(item.code), item);
        });

        const inProgressSet = new Set();
        (inProgressRows || []).forEach(item => {
            if (item && item.code) inProgressSet.add(normCode(item.code));
        });

        const semSet = new Set();
        (completedRows || []).forEach(item => {
            if (item && item.semester) semSet.add(item.semester.trim());
        });
        const estCurrentSemIdx = Math.max(0, semSet.size);

        let totalPassedCr = 0;
        let passedCount = 0;
        let inProgressCount = (inProgressRows || []).length;
        let retakeCount = 0;

        (completedRows || []).forEach(item => {
            const g = (item.grade || '').trim().toUpperCase();
            if (g === 'F') {
                retakeCount++;
            } else if (g && g !== 'W' && g !== 'WF' && g !== 'WP') {
                passedCount++;
                totalPassedCr += Number(item.credits || item.credit || 3);
            }
        });

        let html = `
            <div class="bento-statstrip" style="margin-bottom:12px; border-bottom:1px solid var(--bento-border-soft);">
                <div class="bento-stat success">
                    <span class="bento-stat-label">Passed</span>
                    <span class="bento-stat-value">${passedCount} <span style="font-size:11px;font-weight:600;">(${totalPassedCr} cr)</span></span>
                </div>
                <div class="bento-stat">
                    <span class="bento-stat-label">In Progress</span>
                    <span class="bento-stat-value">${inProgressCount}</span>
                </div>
                <div class="bento-stat ${retakeCount > 0 ? 'destructive' : ''}">
                    <span class="bento-stat-label">Retakes Needed</span>
                    <span class="bento-stat-value">${retakeCount}</span>
                </div>
            </div>
        `;

        cat.semesterPlan.forEach((sem, semIdx) => {
            let semPassed = 0;
            let semTotal = sem.courses.length;

            const courseRowsHtml = sem.courses.map(code => {
                const co = cat.resolve(code);
                const candidates = new Set();
                candidates.add(normCode(code));
                if (co) {
                    if (co.code) candidates.add(normCode(co.code));
                    if (co.unescoCode) candidates.add(normCode(co.unescoCode));
                    if (Array.isArray(co.oldCodes)) co.oldCodes.forEach(oc => candidates.add(normCode(oc)));
                }

                let status = null;
                for (const cand of candidates) {
                    if (inProgressSet.has(cand)) {
                        status = { label: 'In Progress', pillClass: 'pill-primary', rowClass: '', note: 'Current Term' };
                        break;
                    }
                }
                if (!status) {
                    for (const cand of candidates) {
                        if (completedMap.has(cand)) {
                            const item = completedMap.get(cand);
                            const g = (item.grade || '').trim().toUpperCase();
                            if (g === 'F') {
                                status = { label: `Failed (${g})`, pillClass: 'pill-destructive', rowClass: '', note: 'Retake Needed' };
                            } else if (g === 'W' || g === 'WF' || g === 'WP') {
                                status = { label: `Withdrawn (${g})`, pillClass: 'pill-warning', rowClass: '', note: 'Withdrawn' };
                            } else {
                                semPassed++;
                                status = { label: `Passed (${g || 'P'})`, pillClass: 'pill-success', rowClass: 'is-ok', note: `Grade: ${g || 'P'}` };
                            }
                            break;
                        }
                    }
                }
                if (!status) {
                    if (semIdx < estCurrentSemIdx) {
                        status = { label: 'Skipped', pillClass: 'pill-accent', rowClass: '', note: 'Not Taken' };
                    } else {
                        status = { label: 'Upcoming', pillClass: '', rowClass: '', note: 'Planned' };
                    }
                }

                const displayCode = co ? co.code : code;
                const displayTitle = co ? co.title : (cat.titleFor(code) || '—');
                const displayCr = co ? (co.credits != null ? co.credits : '—') : '3';

                return `
                    <tr class="${status.rowClass}">
                        <td class="c-code">${esc(displayCode)}</td>
                        <td>${esc(displayTitle)}</td>
                        <td class="c-center">${esc(displayCr)}</td>
                        <td class="c-center"><span class="pill ${status.pillClass}">${esc(status.label)}</span></td>
                        <td class="c-sub">${esc(status.note)}</td>
                    </tr>
                `;
            }).join('');

            html += `
                <details class="bento-panel standalone" style="margin-bottom:10px;" ${semIdx <= estCurrentSemIdx ? 'open' : ''}>
                    <summary style="padding:8px 12px; font-weight:800; font-size:12px; cursor:pointer; background:var(--bento-card-alt); color:var(--bento-fg); display:flex; justify-content:space-between; align-items:center;">
                        <span>${esc(sem.label || ('Semester ' + (semIdx + 1)))}</span>
                        <span style="font-size:11px; font-weight:600; color:var(--bento-fg-muted);">${semPassed}/${semTotal} Passed</span>
                    </summary>
                    <div style="padding:10px;">
                        ${semTotal ? `
                            <div class="bento-tablewrap">
                                <table class="bento-compact">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Title</th>
                                            <th class="c-center">Credits</th>
                                            <th class="c-center">Status</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${courseRowsHtml}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<div style="font-size:11.5px; color:var(--bento-fg-subtle); font-style:italic; padding:4px 0;">No specific core courses scheduled for this term.</div>'}
                        ${sem.note ? `<div class="bento-notice info" style="margin-top:8px;">${esc(sem.note)}</div>` : ''}
                    </div>
                </details>
            `;
        });

        return html;
    }

    function openRecommendationModal(recs, extras, haveHistory, programCode, completedRows, inProgressRows) {
        const existing = document.getElementById('ulab-prereg-rec-modal');
        if (existing) existing.remove();

        const catalogues = catalogueList(programCode);
        const cat = catalogues.length ? catalogues[0].catalogue : null;

        const offeredRecsHtml = renderRecommendationBody(recs, extras, haveHistory, programCode);
        const planHtml = renderModalTypicalPlan(cat);
        const journeyHtml = renderModalMyJourney(cat, completedRows, inProgressRows);

        const opener = document.activeElement;
        const overlay = document.createElement('div');
        overlay.id = 'ulab-prereg-rec-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Recommended courses');
        overlay.innerHTML = `
            <div class="pg-rec-card">
                <div class="pg-rec-bar">
                    <span>Recommended Courses</span>
                    <button type="button" class="pg-rec-close" aria-label="Close">${icon('<path d="M18 6 6 18M6 6l12 12"/>', 15)}</button>
                </div>
                <div style="padding:10px 12px 0; border-bottom:1px solid var(--bento-border-soft); background:var(--bento-card-alt);">
                    <div class="bento-segmented" id="ulab-rec-modal-tabs">
                        <button type="button" class="bento-chip on" data-tab="offered">Offered Recs</button>
                        <button type="button" class="bento-chip" data-tab="plan">Typical Plan</button>
                        <button type="button" class="bento-chip" data-tab="journey">My Journey</button>
                    </div>
                </div>
                <div class="pg-rec-body" id="ulab-rec-modal-content">${offeredRecsHtml}</div>
            </div>`;
        document.body.appendChild(overlay);

        const tabButtons = overlay.querySelectorAll('#ulab-rec-modal-tabs .bento-chip');
        const contentEl = overlay.querySelector('#ulab-rec-modal-content');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
                const tab = btn.dataset.tab;
                if (tab === 'offered') contentEl.innerHTML = offeredRecsHtml;
                else if (tab === 'plan') contentEl.innerHTML = planHtml;
                else if (tab === 'journey') contentEl.innerHTML = journeyHtml;
            });
        });

        const prevOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        function close() {
            document.removeEventListener('keydown', onKey, true);
            document.documentElement.style.overflow = prevOverflow;
            overlay.remove();
            if (opener && typeof opener.focus === 'function') opener.focus();
        }
        function onKey(e) {
            if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
            if (e.key !== 'Tab') return;
            const focusables = overlay.querySelectorAll('a[href], button:not([disabled])');
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('.pg-rec-close').addEventListener('click', close);
        document.addEventListener('keydown', onKey, true);
        overlay.querySelector('.pg-rec-close').focus();
    }

    // ── Already-passed courses, read-only ───────────────────────────────
    // The student asked to be able to see what they have already taken from
    // THIS page — "just see, if not interact with. right now i should go to
    // result and then check." So the full Status.php pass history is
    // surfaced here as a collapsed, purely-informational table. It carries
    // NO controls: no Select link, no action column, nothing registerable.
    // Courses that are ALSO offered this semester are additionally flagged
    // in the main table (the existing `retake` eligibility state, now
    // labelled "Already passed" and annotated with grade + semester), so
    // this section and that state are one concept, not two.
    //
    // `rows` is ulabCompletedCourses, i.e. Status.php rows with a non-blank
    // Result. Rows graded F are excluded — those are failures the student
    // still owes, and calling them "passed" would be a correctness bug.
    function renderPassedSection(rows) {
        const passedRows = (Array.isArray(rows) ? rows : []).filter(r => r && r.code && !/^F$/i.test((r.grade || '').trim()));
        if (!passedRows.length) return '';
        // Newest first, using the portal's own semester code (e.g. 233, 241)
        // — it sorts correctly as a plain string comparison of equal-length
        // numeric codes, and no semester calendar is needed.
        const sorted = passedRows.slice().sort((a, b) => String(b.semester || '').localeCompare(String(a.semester || '')));
        const totalCredits = sorted.reduce((sum, r) => sum + (typeof r.credits === 'number' ? r.credits : 0), 0);
        const body = sorted.map(r => `
            <tr>
                <td class="c-code">${esc(r.code)}</td>
                <td>${esc(r.name)}</td>
                <td class="c-muted">${esc(r.semester || '—')}</td>
                <td class="c-muted">${esc(r.type || '—')}</td>
                <td class="c-center">${r.credits != null ? esc(r.credits) : '—'}</td>
                <td class="c-center">${esc(r.grade || '—')}</td>
            </tr>`).join('');
        return `
            <h2 class="bento-sectitle">Courses you have already passed</h2>
            <p class="bento-count">${sorted.length} courses · ${totalCredits} credits · read-only, from your Result record</p>
            <div class="bento-toolbar">
                <button type="button" class="bento-chip" id="ulab-prereg-passed-toggle" aria-expanded="false" aria-controls="ulab-prereg-passed">Show my passed courses</button>
            </div>
            <div id="ulab-prereg-passed" class="bento-hidden">
                <div class="bento-tablewrap">
                    <table class="bento-compact">
                        <thead><tr><th>Course ID</th><th>Course Title</th><th>Semester</th><th>Type</th><th>Cr</th><th>Grade</th></tr></thead>
                        <tbody>${body}</tbody>
                    </table>
                </div>
                <p class="bento-footnote">Straight from your Result record — nothing here is selectable or registerable. A course in this list that is offered again this semester is marked <b>Already passed</b> in the table above.</p>
            </div>`;
    }

    function wirePassedSection(view) {
        const toggle = view.querySelector('#ulab-prereg-passed-toggle');
        const panel = view.querySelector('#ulab-prereg-passed');
        if (!toggle || !panel) return;
        toggle.addEventListener('click', () => {
            const open = panel.classList.toggle('bento-hidden') === false;
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.classList.toggle('on', open);
            toggle.textContent = open ? 'Hide my passed courses' : 'Show my passed courses';
        });
    }

    // fetchState is null (settled), { loading: true } while the background
    // fetch of Status.php / profile.php is in flight, or { failure: result }
    // when it failed — where result is the shared data layer's
    // { error, message } (see features/shared/ulab-portal-data.js).
    function renderView(courses, info, extras, store, fetchState) {
        const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
        injectStyle();
        hideLegacyTables(findCourseTables());

        let view = document.getElementById(VIEW_ID);
        if (!view) {
            view = document.createElement('div');
            view.id = VIEW_ID;
            view.className = 'bento-root';
            contentCell.appendChild(view);
        }

        const profile = store.ulabStudentProfile || {};
        const completed = store.ulabCompletedCourses;
        const inProgress = store.ulabInProgressCourses;
        const haveHistory = Array.isArray(completed) && completed.length > 0;

        const catalogues = catalogueList(profile.programCode);
        const history = buildHistory(completed, inProgress, catalogues);

        // Degree requirements come from the student's own program catalogue
        // only (the first entry when programCode matched) — mixing several
        // programs' requirement tables would be meaningless.
        const ownCatalogue = catalogues.length && profile.programCode
            && catalogues[0].id.toUpperCase() === String(profile.programCode).toUpperCase()
            ? catalogues[0].catalogue : null;
        const gaps = haveHistory && ownCatalogue ? buildDegreeGaps(ownCatalogue.degreeRequirements, history.passedCredits) : null;

        courses.forEach((course) => {
            const hit = lookup(catalogues, course.code);
            course.hit = hit;
            course.category = hit ? hit.catalogue.categoryFor(course.code) : null;
            course.elig = computeEligibility(course, hit, history, haveHistory);
            course.fillsGap = !!(gaps && course.category && gaps[course.category] > 0);
        });

        const main = sortCourses(courses.filter(c => c.table !== 'co-curricular'));
        const coCurricular = sortCourses(courses.filter(c => c.table === 'co-curricular'));

        // ── Lab-without-theory check (current registered plan only) ──────
        const notices = [];
        // DEAD END REMOVED: this used to read "Eligibility checks are off.
        // Open the Result page once in this browser… then reload this page."
        // The extension now fetches Status.php itself. What remains is an
        // honest in-flight state and an honest failure state — never an
        // instruction to go and do it by hand.
        if (fetchState && fetchState.loading) {
            notices.push(`<div class="bento-notice info">${icon(ICON_INFO)}<div><b>Loading your record…</b> Reading your grade history and programme from the portal so eligibility, degree gaps and already-passed courses can be filled in.</div></div>`);
        } else if (fetchState && fetchState.failure) {
            const failure = fetchState.failure;
            const message = failure.error === 'session-expired'
                ? 'Your ULAB portal session has expired, so your grade history could not be read. Please log in again.'
                : (failure.message || 'Your grade history could not be read from the portal right now.');
            notices.push(`<div class="bento-notice warn">${icon(ICON_WARN)}<div><b>Eligibility checks are limited.</b> ${esc(message)} <button type="button" class="bento-chip" id="ulab-prereg-retry">Retry</button></div></div>`);
        }
        // ── Real error states (registration-flow.md) ─────────────────────
        // "Maximum credit limit exceeded" (step 1) and "Conflicts found"
        // (step 3) are states we have never captured in reference-html/, so
        // they get explicit .bento-notice treatment rather than a bare
        // sentence. The conflict path also prints extras.conflictCourses —
        // the list of conflicting courses the portal renders alongside the
        // banner, which the banner-only regex used to drop. That list is []
        // on every sample we have, in which case nothing extra is shown; it
        // is never fabricated. See ulab-portal-parsers.js's conflictCourses().
        if (extras.limitNotice) {
            notices.push(`<div class="bento-notice danger">${icon(ICON_WARN)}<div><b>Maximum credit limit exceeded.</b> ${esc(extras.limitNotice)} Unselect a course before continuing.</div></div>`);
        }
        if (extras.conflictNotice) {
            const conflicts = Array.isArray(extras.conflictCourses) ? extras.conflictCourses : [];
            notices.push(`<div class="bento-notice danger">${icon(ICON_WARN)}<div><b>Conflicts found.</b> ${esc(extras.conflictNotice)}${
                conflicts.length
                    ? `<div class="c-sub" style="margin-top:4px">Conflicting courses: ${conflicts.map(item => `<b>${esc(item)}</b>`).join(', ')}</div>`
                    : ''
            }</div></div>`);
        }
        if (extras.probation) notices.push(`<div class="bento-notice warn">${icon(ICON_WARN)}<div>${esc(extras.probation)}</div></div>`);

        const registered = courses.filter(c => c.registeredThisPlan);
        const registeredKeys = new Set();
        registered.forEach((c) => {
            registeredKeys.add(normCode(c.code));
            if (c.hit) { registeredKeys.add(normCode(c.hit.course.code)); registeredKeys.add(normCode(c.hit.course.unescoCode)); }
        });
        registered.forEach((c) => {
            if (!c.hit) return;
            const theory = c.hit.catalogue.theoryForLab(c.code);
            if (!theory) return; // not a lab, or a lab opted out of pairing
            const keys = [normCode(theory.code), normCode(theory.unescoCode)];
            const covered = keys.some(k => registeredKeys.has(k)) || (haveHistory && keys.some(k => history.passed.has(k)));
            if (!covered) {
                notices.push(`<div class="bento-notice warn">${icon(ICON_WARN)}<div><b>${esc(c.code)}</b> (${esc(c.name)}) is a lab, but its paired theory course <b>${esc(theory.code)}</b> — ${esc(theory.title)} — is neither registered this semester nor already passed.</div></div>`);
            }
        });
        // Reverse direction (theory registered, its lab not) is only cheaply
        // detectable through the same derived pairing map, read backwards:
        registered.forEach((c) => {
            if (!c.hit || c.hit.course.courseType === 'Lab') return;
            const pairedLab = (c.hit.catalogue.courses || []).find(x => x.courseType === 'Lab' && !x.noTheoryPairing
                && c.hit.catalogue.theoryForLab(x.code) && c.hit.catalogue.theoryForLab(x.code).code === c.hit.course.code);
            if (!pairedLab) return;
            const keys = [normCode(pairedLab.code), normCode(pairedLab.unescoCode)];
            const covered = keys.some(k => registeredKeys.has(k)) || (haveHistory && keys.some(k => history.passed.has(k)));
            // Only warn when that lab is actually OFFERED this semester —
            // otherwise the student can do nothing about it.
            const offered = courses.some(x => normCode(x.code) === normCode(pairedLab.code));
            if (!covered && offered) {
                notices.push(`<div class="bento-notice warn">${icon(ICON_WARN)}<div><b>${esc(c.code)}</b> is registered but its paired lab <b>${esc(pairedLab.code)}</b> — ${esc(pairedLab.title)} — is offered this semester and not selected.</div></div>`);
            }
        });

        // ── Compact info block ───────────────────────────────────────────
        // This page's local compact Label:Value grid / pill strip / credit
        // meter have been folded INTO window.ULAB_SHELL.renderHeaderCard(),
        // which is now the shared compact variant every page uses. Same
        // markup and the same shared bento-ui.css classes as before — the
        // panel renders identically, it is just no longer page-local.
        //
        // Credit meter numbers are server-side as of page load. The Select /
        // Unselect links navigate the whole page, so there is no client-side
        // live total to keep in sync (and faking one would desync).
        const headerHtml = window.ULAB_SHELL.renderHeaderCard(info, {
            title: 'Preregistration — Course Plan',
            rows: [
                ['Program', profile.programCode],
                ['Max Credit', extras.maxCredit],
                ['Used Credit', extras.totalUsedCredit],
                ['Courses Taken', extras.totalTaken],
            ],
            // DUPLICATE CONTROL REMOVED (same call as schedule.php's advising
            // pill): the "Pre-advising complete/incomplete" pill that used to
            // sit here restated exactly what the actions row below both states
            // and performs. The actionable control wins; the report-only pill
            // goes. The "Registration complete" pill STAYS — that one has no
            // counterpart in the actions row, it is the page's own lock
            // statement, and it is what explains why everything below is
            // inert.
            pills: [
                extras.registrationBanner ? { text: extras.registrationBanner, tone: 'info' } : null,
                { text: `${registered.length} registered / ${courses.length} offered`, tone: 'muted' },
            ].filter(Boolean),
            meter: (extras.totalUsedCredit != null && extras.maxCredit != null)
                ? {
                    label: 'Credit load',
                    value: extras.totalUsedCredit,
                    max: extras.maxCredit,
                    note: 'Server figure as of page load; Select / Unselect reloads the page and updates it.',
                }
                : null,
        });

        const counts = {
            all: main.length,
            eligible: main.filter(c => c.elig.state === 'eligible').length,
            missing: main.filter(c => c.elig.state === 'missing').length,
            registered: main.filter(c => c.registeredThisPlan).length,
            unregistered: main.filter(c => !c.registeredThisPlan).length,
            // Offered-again courses the student has already passed.
            passed: main.filter(c => c.elig.state === 'retake').length,
        };
        const chipDefs = [
            ['all', 'All'], ['eligible', 'Eligible'], ['missing', 'Missing prereq'],
            ['registered', 'Registered'], ['unregistered', 'Not registered'],
        ];

        // ── Flow state (see registration-flow.md) ────────────────────────
        // "Registration complete. No changes can be made." is the hard lock:
        // when the page says it, every control on this page is dead. Below
        // that, it is per-step — a step the page reports COMPLETE is disabled,
        // an incomplete one stays live. Both facts come straight off the
        // page's own banner text and ✅/❌ tick image; nothing is inferred.
        const registrationLocked = !!extras.registrationBanner;
        const preAdvisingComplete = !!extras.preAdvisingComplete;
        const preAdvLocked = preAdvisingComplete || registrationLocked;
        // Course selection is step 1 and pre-advising is step 2, so completing
        // pre-advising closes course selection too.
        const selectionLocked = preAdvLocked;
        const preAdvTitle = registrationLocked
            ? 'Registration is complete — no changes can be made'
            : (preAdvisingComplete ? 'Pre-advising is already complete' : 'Mark your pre-advising as complete');

        const controlLinks = [];
        if (extras.retakeHref) controlLinks.push(portalAction(extras.retakeHref, 'Add retake courses', false));
        if (extras.coCurricularHref && coCurricular.length) controlLinks.push(portalAction(extras.coCurricularHref, 'Co-curricular courses', false));

        view.innerHTML = `
            ${headerHtml}

            ${notices.join('')}

            <div class="bento-actions">
                ${(extras.actionMarkup || []).map(markup => actionControl(markup, preAdvLocked, preAdvTitle)).join('')}
                ${actionControl(
                    portalAction(
                        `/Preregistration.php?task=changePreAdvStatus&studentID=${encodeURIComponent(info.studentId || '')}&select=${extras.preAdvisingComplete ? '0' : '1'}`,
                        extras.preAdvisingComplete ? 'Pre-advising complete' : 'Mark pre-advising complete',
                        extras.preAdvisingComplete
                    ),
                    preAdvLocked,
                    preAdvTitle
                )}
                ${controlLinks.map(link => actionControl(link, registrationLocked, registrationLocked ? 'Registration is complete — no changes can be made' : '')).join('')}
            </div>

            <div class="bento-toolbar">
                <button type="button" class="bento-chip accent" id="ulab-prereg-rec-btn">Recommended Courses</button>
                <label class="bento-search" for="ulab-prereg-search">${icon(ICON_SEARCH, 14)}<input id="ulab-prereg-search" type="search" autocomplete="off" placeholder="Search course code or name..."></label>
                ${chipDefs.map(([key, label]) => `<button type="button" class="bento-chip${key === 'all' ? ' on' : ''}" data-filter="${key}">${esc(label)} <span>${counts[key]}</span></button>`).join('')}
            </div>
            <p class="bento-count">${main.length} offered courses in your current plan</p>

            ${renderTable(main, info, selectionLocked)}

            ${coCurricular.length ? `<h2 class="bento-sectitle">Co-curricular Courses</h2>${renderTable(coCurricular, info, selectionLocked)}` : ''}

            ${renderPassedSection(completed)}

            <p class="bento-footnote">Prerequisite, category and degree-requirement data comes from a hand-transcribed course catalogue and is <b>advisory only</b>. Electives and non-core categories are classified heuristically, and only Math, Basic Science, Other Engineering and Major Core courses declare prerequisites at all. Always confirm your plan with your adviser before finalising registration.</p>
        `;
        wireControls(view, main.length);
        wirePassedSection(view);
        // Applied LAST, over the finished DOM, so one pass covers the actions
        // row and every per-course Select / Unselect control.
        // Defensive: an older cached copy of the shell without this helper
        // would throw here, and mount()'s try/catch would swallow it into a
        // blank page (this project's known bug class). Degrade to "nothing
        // disabled" instead — the page stays usable and says why.
        if (typeof window.ULAB_SHELL.applyDisabledControls === 'function') {
            window.ULAB_SHELL.applyDisabledControls(view);
        } else {
            console.warn('[Student Companion] ULAB_SHELL.applyDisabledControls is missing — completed-step controls will not be disabled.');
        }

        const retryBtn = view.querySelector('#ulab-prereg-retry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                renderView(courses, info, extras, store, { loading: true });
                // force: true — a retry after a failure must not be answered
                // out of the same stale cache that failed to refresh.
                fetchMissing(store, { force: true }).then((outcome) => {
                    renderView(courses, info, extras, outcome.store, outcome.error ? { failure: outcome.error } : null);
                });
            });
        }

        const recs = buildRecommendations(courses, history);
        const recBtn = view.querySelector('#ulab-prereg-rec-btn');
        if (recBtn) {
            recBtn.addEventListener('click', () => {
                openRecommendationModal(recs, extras, haveHistory, profile.programCode, completed, registered);
            });
        }
    }

    // ── Data acquisition ────────────────────────────────────────────────
    // DEAD END REMOVED. This page used to tell the student "Open the Result
    // page once in this browser, then reload this page" whenever grade
    // history or the program code was missing — i.e. it refused to do its
    // job and sent the student off to fetch data by hand. It now fetches
    // Status.php and profile.php itself, in the background, through the
    // allowlisted fetch layer (see background.js's safety invariant — bare
    // paths only, GET only, never a scraped href).
    //
    // Sequence: render immediately with whatever is cached (so the table is
    // never blocked on the network), show a small inline loading chip while
    // the missing pieces come in, then re-render once. If the fetch genuinely
    // fails — network down, or the session expired — a plain message with a
    // Retry button replaces the chip. There is no third "go do it yourself"
    // state any more.
    function fetchMissing(store, options) {
        const force = !!(options && options.force);
        const need = [];
        if (force || !(Array.isArray(store.ulabCompletedCourses) && store.ulabCompletedCourses.length)) need.push('status');
        if (force || !(store.ulabStudentProfile && store.ulabStudentProfile.programCode)) need.push('profile');
        if (!need.length) return Promise.resolve({ needed: false, store, error: null });
        // Sequential (ensureAll), never parallel — one student's browser
        // against a shared university server.
        return window.ULAB_PORTAL_DATA.ensureAll(need, { force }).then((results) => {
            const merged = Object.assign({}, store);
            let error = null;
            if (results.status) {
                if (results.status.ok) {
                    merged.ulabCompletedCourses = results.status.data.completed;
                    merged.ulabInProgressCourses = results.status.data.inProgress;
                } else if (!error) error = results.status;
            }
            if (results.profile) {
                if (results.profile.ok) merged.ulabStudentProfile = results.profile.data;
                else if (!error) error = results.profile;
            }
            return { needed: true, store: merged, error };
        }).catch((e) => {
            console.error('[Student Companion] portal data fetch failed', e);
            return { needed: true, store, error: { error: 'unavailable', message: 'Could not load your record from the portal.' } };
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
        window.ULAB_SHELL.mount('ulab-page-preregistration', null, (info) => {
            const parsed = scrapeAndPersist();
            const courses = parsed.courses;
            const extras = parsed.extras;
            const keys = ['ulabCompletedCourses', 'ulabInProgressCourses', 'ulabStudentProfile'];
            const start = (store) => {
                const initial = store || {};
                const needsFetch = !(Array.isArray(initial.ulabCompletedCourses) && initial.ulabCompletedCourses.length)
                    || !(initial.ulabStudentProfile && initial.ulabStudentProfile.programCode);
                renderView(courses, info, extras, initial, needsFetch ? { loading: true } : null);
                if (!needsFetch) return;
                fetchMissing(initial).then((outcome) => {
                    renderView(courses, info, extras, outcome.store, outcome.error ? { failure: outcome.error } : null);
                });
            };
            try {
                chrome.storage.local.get(keys, (store) => start(store));
            } catch (e) {
                console.error('[Student Companion] failed to read course history', e);
                start({});
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
