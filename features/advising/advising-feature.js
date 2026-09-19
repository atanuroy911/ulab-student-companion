// features/advising/advising-feature.js — side-panel UI for the "My
// Advising Check" feature. Registers onto window.ULAB_FEATURES per
// sidebar.js's generic feature-router pattern (see
// ulab-faculty-companion/sidebar/sidebar.js — copied verbatim into this
// project's sidebar/sidebar.js).
//
// This is the self-serve, first-person reframing of the faculty
// companion's Student Advising feature: same rule engine
// (features/advising/self-advising.js, ported from advising.js), but
// written for a student checking THEIR OWN record instead of an adviser
// looking up someone else's.
//
// Auto-source (wired): features/status/status-ui-content.js scrapes
// Status.php's "Result of completed/registered courses" table into
// chrome.storage.local under ulabCompletedCourses (one row per completed/
// graded course — the authoritative completed-course source, see that
// file's header comment) and features/profile/profile-ui-content.js
// scrapes the program code (e.g. "CSE") into ulabStudentProfile.programCode
// from profile.php. This feature now reads both at mount time: if
// ulabCompletedCourses has data AND the program code maps to a known
// catalogue in window.ULAB_PROGRAMS, the program picker is pre-selected and
// the completed-courses textarea is pre-filled (formatted the same as the
// manual-paste format so it stays editable) with a small banner explaining
// it was auto-loaded. The manual-paste flow is left fully intact as a
// fallback — a student who hasn't visited Status.php/profile.php in this
// browser session yet (nothing cached), or whose scraped program code
// doesn't match a bundled catalogue, still sees the empty form exactly as
// before. "Courses you're registering for" has no reliable auto-source yet
// (Preregistration.php's tick/x column means "in this semester's plan", not
// finalized, and per that file's own header comment is secondary signal)
// so it stays manual-only.
(function () {
    if (!document.getElementById('ulab-wizard-css')) {
        const link = document.createElement('link');
        link.id = 'ulab-wizard-css';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('features/common/wizard.css');
        document.head.appendChild(link);
    }
    if (!document.getElementById('ulab-sa-css')) {
        const style = document.createElement('style');
        style.id = 'ulab-sa-css';
        style.textContent = `
            #ulab-sa-completed, #ulab-sa-registering {
                width: 100%; height: 100px; box-sizing: border-box;
                background: rgba(var(--overlay-rgb),0.04);
                border: 1px solid rgba(var(--overlay-rgb),0.1); border-radius: 10px; padding: 10px;
                color: var(--text-secondary); font-size: 12px; font-family: monospace; resize: vertical;
                outline: none; margin-bottom: 10px; transition: border-color 0.2s;
            }
            #ulab-sa-completed:focus, #ulab-sa-registering:focus { border-color: rgba(56,189,248,0.5); }
            #ulab-sa-completed, #ulab-sa-registering { background: var(--bento-card-alt, #f8fafc); border-color: var(--bento-border, #94a3b8); color: var(--bento-fg, #172033); }
            .ulab-sa-stepper { display:flex; gap:8px; margin:0 0 18px; }
            .ulab-sa-step { flex:1; padding:8px 10px; border:1px solid var(--bento-border-soft, #cbd5e1); border-radius:8px; color:var(--bento-fg-subtle, #64748b); background:var(--bento-card-alt, #f8fafc); font-size:11px; font-weight:800; }
            .ulab-sa-step.active { color:var(--bento-primary, #0d9488); border-color:var(--bento-primary, #0d9488); background:rgba(13,148,136,.1); }
            .ulab-sa-step-note { margin:0 0 14px; color:var(--bento-fg-muted, #475569); font-size:12px; line-height:1.5; }
            .ulab-sa-field-label { color:var(--bento-fg, #172033) !important; }
            .ulab-sa-light-contrast { color:var(--bento-fg-muted, #475569) !important; }
            .ulab-sa-light-contrast input { color:var(--bento-fg, #172033) !important; border-color:var(--bento-border, #94a3b8) !important; background:var(--bento-card-alt, #f8fafc) !important; }
            .ulab-info-box, .ulab-danger-box, .ulab-threshold-box, .ulab-run-status-msg { color:var(--bento-fg, #172033); }
        `;
        document.head.appendChild(style);
    }

    function el(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    let state = {
        programId: null,
        completedText: '',
        registeringText: '',
        probationText: '',
        result: null, // { info, advising, cat }
        autoLoaded: false, // true once ulabCompletedCourses/ulabStudentProfile were used to pre-fill the form
        // null, or the shared data layer's { error, message } when the
        // background fetch of Status.php / profile.php genuinely failed.
        // Declared here on purpose: an undeclared field read by the renderer
        // is this project's known silent-blank-page bug class.
        dataError: null,
        scheduleByCode: {},
        autoRunCompleted: false,
        step: 1,
    };

    // Formats a scraped completed-course row (see features/status/
    // status-ui-content.js's ulabCompletedCourses shape: {semester, code,
    // name, type, credits, grade, comments}) into the same
    // "CourseId, Grade, Semester, Credit" line format the manual-paste
    // textarea already expects (see self-advising.js's
    // parseCompletedCoursesText), so the auto-filled text stays editable by
    // hand exactly like a manual paste would be.
    function formatCompletedCoursesForTextarea(rows) {
        return (rows || [])
            .filter(r => r && (r.code || r.courseId || r.CourseID || r.CourseId))
            .map(r => [r.code || r.courseId || r.CourseID || r.CourseId, r.grade != null ? r.grade : (r.Grade || ''), r.semester || r.Semester || '', r.credits != null ? r.credits : (r.credit != null ? r.credit : (r.Credit || ''))].join(', '))
            .join('\n');
    }

    function formatRegisteringCoursesForTextarea(rows) {
        return (rows || [])
            .filter(r => r && (r.code || r.courseId))
            .map(r => `${r.code || r.courseId}, ${r.name || r.title || ''}`.replace(/, $/, ''))
            .join('\n');
    }

    function inferProgramId(programs, rows) {
        const codes = (rows || []).map(row => String(row.code || row.courseId || row.CourseID || row.CourseId || '').replace(/\s+/g, '').toUpperCase());
        return (programs || []).find(program => {
            const id = String(program.id || '').toUpperCase();
            return id && codes.some(code => code.startsWith(id));
        })?.id || null;
    }

    // Reads the cached scrape from Status.php (ulabCompletedCourses) and
    // profile.php (ulabStudentProfile.programCode), and — only if both the
    // program code maps to a bundled catalogue AND at least one completed
    // course was found — pre-fills state before the form is first rendered.
    // Falls back silently (state stays at its manual-paste defaults) when
    // either is missing, e.g. the student hasn't visited those pages yet in
    // this browser session.
    // ── Portal data layer, loaded on demand ─────────────────────────────
    // The side panel is an extension-origin page listed in sidebar.html,
    // which another agent owns and this change must not edit. So the two
    // shared modules are injected lazily instead, as ordinary same-origin
    // extension resources (allowed by the extension page's own
    // script-src 'self' CSP). If sidebar.html later gains <script> tags for
    // them, `window.ULAB_PORTAL_DATA` is already defined and this becomes a
    // no-op — the modules are idempotent.
    const PORTAL_MODULES = [
        'features/shared/ulab-portal-parsers.js',
        'features/shared/ulab-portal-data.js',
    ];

    function loadScriptOnce(path) {
        return new Promise((resolve, reject) => {
            const url = chrome.runtime.getURL(path);
            if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
            const tag = document.createElement('script');
            tag.src = url;
            tag.onload = () => resolve();
            tag.onerror = () => reject(new Error('Could not load ' + path));
            document.head.appendChild(tag);
        });
    }

    // Also published as window.ULAB_ENSURE_PORTAL_DATA so sibling side-panel
    // features (e.g. Capstone Eligibility) can await the same one-time load
    // instead of each injecting their own copy of the modules.
    function ensurePortalDataLayer() {
        if (window.ULAB_PORTAL_DATA) return Promise.resolve(true);
        return PORTAL_MODULES
            .reduce((chain, path) => chain.then(() => loadScriptOnce(path)), Promise.resolve())
            .then(() => !!window.ULAB_PORTAL_DATA)
            .catch((e) => { console.error('[Student Companion]', e); return false; });
    }

    // DEAD END REMOVED. This feature used to depend entirely on the student
    // having previously VISITED Status.php and profile.php in this browser —
    // otherwise it silently fell back to an empty manual-paste form. It now
    // asks the shared data layer for that record, which serves it from cache
    // when fresh and otherwise fetches those two pages in the background
    // (allowlisted bare paths, GET only — see background.js).
    //
    // The manual-paste flow is deliberately UNTOUCHED: it is a real escape
    // hatch for a student whose programme has no bundled catalogue, whose
    // record parses oddly, or who simply wants to try a what-if. Auto-loaded
    // text lands in the same editable textareas as a paste would.
    function fetchMissingRecord(result) {
        const need = [];
        if (!(Array.isArray(result.ulabCompletedCourses) && result.ulabCompletedCourses.length)) need.push('status');
        if (!(result.ulabStudentProfile && result.ulabStudentProfile.programCode)) need.push('profile');
        if (!need.length) return Promise.resolve({ result, error: null });

        return ensurePortalDataLayer().then((ready) => {
            if (!ready) return { result, error: { error: 'unavailable', message: 'The portal data layer could not be loaded.' } };
            return window.ULAB_PORTAL_DATA.ensureAll(need).then((results) => {
                const merged = Object.assign({}, result);
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
                return { result: merged, error };
            });
        }).catch((e) => {
            console.error('[Student Companion] advising data fetch failed', e);
            return { result, error: { error: 'unavailable', message: 'Could not read your record from the portal.' } };
        });
    }

    function loadAutoSourcedData(callback) {
        try {
            chrome.storage.local.get(['ulabCompletedCourses', 'ulabInProgressCourses', 'ulabPreregCourses', 'ulabPreregAdvisingExtras', 'ulabClassSchedule', 'ulabStudentProfile'], (cached) => {
                fetchMissingRecord(cached || {}).then(({ result, error }) => {
                    state.dataError = error || null;
                    applyAutoSourcedData(result);
                    callback();
                });
            });
        } catch (e) {
            console.error('[Student Companion] failed to read auto-sourced advising data', e);
            callback();
        }
    }

    function applyAutoSourcedData(result) {
        try {
                const completedRows = result && result.ulabCompletedCourses;
                const inProgressRows = result && result.ulabInProgressCourses;
                const preregRows = result && result.ulabPreregCourses;
                const preregExtras = result && result.ulabPreregAdvisingExtras;
                const scheduleRows = result && result.ulabClassSchedule;
                const profile = result && result.ulabStudentProfile;
                const programs = window.ULAB_PROGRAMS || [];
                const allCompletedRows = (Array.isArray(completedRows) ? completedRows : []).concat(
                    (Array.isArray(inProgressRows) ? inProgressRows : []).map(row => Object.assign({}, row, { grade: '' }))
                );
                const selectedRows = Array.isArray(preregRows) ? preregRows.filter(row => row.registeredThisPlan) : [];
                const registeringRows = selectedRows.length ? selectedRows : (Array.isArray(inProgressRows) ? inProgressRows : []);
                const programId = profile && profile.programCode
                    ? (programs.find(p => p.id === String(profile.programCode).toUpperCase()) || {}).id
                    : inferProgramId(programs, allCompletedRows.concat(registeringRows));
                state.scheduleByCode = {};
                (Array.isArray(scheduleRows) ? scheduleRows : []).forEach(course => {
                    state.scheduleByCode[String(course.courseId || '').replace(/\s+/g, '').toUpperCase()] = course.meetings || [];
                });

                if (programId && allCompletedRows.length) {
                    state.programId = programId;
                    state.completedText = formatCompletedCoursesForTextarea(allCompletedRows);
                    state.autoLoaded = true;
                } else if (programId) {
                    // Program known but no completed courses scraped yet
                    // (e.g. student visited profile.php but not Status.php)
                    // — still worth pre-selecting the program dropdown.
                    state.programId = programId;
                }
                if (registeringRows.length) {
                    state.registeringText = formatRegisteringCoursesForTextarea(registeringRows);
                    state.autoLoaded = true;
                }
                if (preregExtras && preregExtras.probation) {
                    state.probationText = preregExtras.probation;
                    state.autoLoaded = true;
                }
        } catch (e) {
            console.error('[Student Companion] failed to apply auto-sourced advising data', e);
        }
    }

    // ── Custom combobox (replaces the native <select>) ──────────────────
    // A native <select>'s OS-rendered dropdown popup can't be restyled to
    // match this project's dark bento card chrome (it shows up washed-out/
    // disabled-looking against it), and its emoji-prefixed options violate
    // the no-emoji-icon rule bento-ui.css otherwise follows for pills/
    // badges. This builds a small styled listbox instead — a button
    // showing the current selection + a dropdown panel of options, each
    // with a plain monochrome inline-SVG "book" glyph in place of the old
    // per-program emoji (a generic icon on purpose: nothing about a
    // program is visually distinguishable enough to warrant per-option art
    // without inventing one, and a single consistent glyph reads as more
    // deliberate than mismatched emoji). Scoped to just this one picker
    // (only consumer right now); the CSS classes it uses
    // (.bento-combobox/.bento-combobox-btn/-panel/-option) are still
    // written as generic, reusable rules in bento-ui.css so a second
    // consumer can reuse them without duplicating this markup.
    const BOOK_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>';

    function buildProgramCombobox(container, { value, onChange }) {
        const programs = window.ULAB_PROGRAMS || [];
        let current = value || '';
        let open = false;
        let activeIndex = Math.max(0, programs.findIndex(p => p.id === current));

        const root = el('<div class="bento-combobox"></div>');
        const btn = el(`<button type="button" class="bento-combobox-btn" aria-haspopup="listbox"></button>`);
        const panel = el('<div class="bento-combobox-panel" role="listbox"></div>');
        root.appendChild(btn);
        root.appendChild(panel);
        container.innerHTML = '';
        container.appendChild(root);

        function renderButton() {
            const prog = programs.find(p => p.id === current);
            btn.innerHTML = prog
                ? `<span class="bento-combobox-value">${BOOK_ICON_SVG}<span>${esc(prog.name)}</span></span>`
                : `<span class="bento-combobox-value bento-combobox-placeholder">Select your program…</span>`;
            btn.innerHTML += '<svg class="bento-combobox-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
        }

        function renderPanel() {
            panel.innerHTML = programs.map((p, i) => `
                <div class="bento-combobox-option${p.id === current ? ' selected' : ''}${i === activeIndex ? ' active' : ''}"
                     role="option" data-index="${i}" data-id="${esc(p.id)}">
                    ${BOOK_ICON_SVG}<span>${esc(p.name)}</span>
                </div>`).join('');
        }

        function setOpen(next) {
            open = next;
            root.classList.toggle('open', open);
            if (open) {
                activeIndex = Math.max(0, programs.findIndex(p => p.id === current));
                renderPanel();
                const activeEl = panel.querySelector('.bento-combobox-option.active');
                if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
            }
        }

        function select(id) {
            current = id;
            renderButton();
            setOpen(false);
            btn.focus();
            if (typeof onChange === 'function') onChange(id);
        }

        btn.addEventListener('click', () => setOpen(!open));
        panel.addEventListener('click', (e) => {
            const opt = e.target.closest('.bento-combobox-option');
            if (opt) select(opt.dataset.id);
        });
        document.addEventListener('click', (e) => {
            if (!root.contains(e.target)) setOpen(false);
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!open) { setOpen(true); return; }
            }
            if (!open) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(programs.length - 1, activeIndex + 1);
                renderPanel();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(0, activeIndex - 1);
                renderPanel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (programs[activeIndex]) select(programs[activeIndex].id);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
            }
        });

        renderButton();

        return {
            getValue: () => current,
            setValue: (id) => { current = id; renderButton(); },
        };
    }

    function renderStepIndicator() {
        return `<div class="ulab-sa-stepper"><div class="ulab-sa-step${state.step === 1 ? ' active' : ''}">1. Your record</div><div class="ulab-sa-step${state.step === 2 ? ' active' : ''}">2. Courses</div><div class="ulab-sa-step">3. Results</div></div>`;
    }

    function renderForm() {
        // Three honest states, and no fourth "go open the Result page
        // yourself" state:
        //   • loaded     — we have the record (cached or just fetched)
        //   • failed     — say what failed, offer Retry, and leave the
        //                  manual-paste form fully usable underneath
        //   • neither    — a first-time student with nothing to auto-load;
        //                  the plain form, exactly as before
        let autoBanner = '';
        if (state.dataError) {
            const message = state.dataError.error === 'session-expired'
                ? 'Your ULAB portal session has expired, so your record could not be read. Please log in to the portal again, then retry.'
                : (state.dataError.message || 'Your record could not be read from the portal right now.');
            autoBanner = `
                <div class="ulab-danger-box" style="margin-bottom:14px;">
                    ${esc(message)}
                    <div style="margin-top:8px;">
                        <button type="button" class="ulab-secondary-btn" id="ulab-sa-retry">Retry</button>
                    </div>
                    <div style="margin-top:8px;">You can still fill in the fields below by hand.</div>
                </div>`;
        } else if (state.autoLoaded) {
            autoBanner = `
                <div class="ulab-info-box" style="margin-bottom:14px;">
                    Loaded your programme, result, and current-course data automatically.
                    Review it before running the check.
                </div>`;
        }
        const stepOne = `
            <p class="ulab-step-title">Set up your check</p>
            <p class="ulab-sa-step-note">We use your programme and academic standing to choose the right catalogue rules.</p>
            <label class="ulab-sa-field-label" style="display:block;font-size:12px;font-weight:700;margin:10px 0 4px;">Your programme</label>
            <div id="ulab-sa-program"></div>
            <label class="ulab-sa-field-label" style="display:block;font-size:12px;font-weight:700;margin:14px 0 4px;">Academic standing (optional)</label>
            <input id="ulab-sa-probation" class="ulab-id-input" style="width:100%;padding:9px 10px;" placeholder="Leave blank if you are not on probation" />
            <div class="ulab-wizard-nav"><button id="ulab-sa-next" class="ulab-primary-btn" type="button">Next: review courses</button></div>`;
        const stepTwo = `
            <p class="ulab-step-title">Review your courses</p>
            <p class="ulab-sa-step-note">These are used to check prerequisites, retakes, labs, and degree progress. You can edit them before running the check.</p>
            <label class="ulab-sa-field-label" style="display:block;font-size:12px;font-weight:700;margin:10px 0 4px;">Completed and in-progress courses</label>
            <textarea id="ulab-sa-completed" placeholder="CSE1101, A, Fall 2024, 3"></textarea>
            <label class="ulab-sa-field-label" style="display:block;font-size:12px;font-weight:700;margin:14px 0 4px;">Courses registered this semester</label>
            <textarea id="ulab-sa-registering" placeholder="CSE3711, Software Engineering"></textarea>
            <div class="ulab-wizard-nav"><button id="ulab-sa-prev" class="ulab-secondary-btn" type="button">Back</button><button id="ulab-sa-run" class="ulab-primary-btn" type="button">Run advising check</button></div>`;
        return `${renderStepIndicator()}${autoBanner}<div class="ulab-step-slide">${state.step === 1 ? stepOne : stepTwo}</div>`;
    }

    function probationLabel(tier) {
        if (tier === null || tier === undefined) return '';
        return tier === 'unspecified' ? 'You are on academic probation.' : `You are on academic probation — Tier ${tier}.`;
    }

    function renderResult(advising, cat, programLabel) {
        let html = `<button class="ulab-secondary-btn" id="ulab-sa-back" style="margin-bottom:14px;">← Back</button>`;

        if (advising.finalProbation) {
            html += `<div class="ulab-danger-box">🚫 <strong>Final Probation</strong> (Probation 3 — CGPA below 2.00 for the last three consecutive terms): you will not be able to register online by yourself. Please contact your Department Head or Coordinator by email or in person to register.</div>`;
        } else if (advising.probationTier !== null) {
            html += `<div class="ulab-danger-box">⚠️ ${esc(probationLabel(advising.probationTier))} Please meet your advisor as soon as possible to discuss your academic plan.</div>`;
        }

        const openRetakes = (advising.needsRetake || []).filter(r => !r.retakingNow);
        if (openRetakes.length) {
            html += `<div class="ulab-danger-box"><strong>↻ You still need to retake:</strong><ul style="margin:8px 0 0 18px;">
                ${openRetakes.map(r => `<li>${esc(r.courseId)} — ${esc(r.title)} (attempts: ${esc(r.attempts.join(', '))})</li>`).join('')}
                </ul></div>`;
        }
        const retakingNow = (advising.needsRetake || []).filter(r => r.retakingNow);
        if (retakingNow.length) {
            html += `<div class="ulab-info-box">Looks like you're already re-registered for: ${esc(retakingNow.map(r => r.courseId).join(', '))}. ✓</div>`;
        }

        if ((advising.prereqIssues || []).length) {
            html += `<div class="ulab-danger-box"><strong>⛔ Prerequisite issue(s) in what you've added this semester:</strong><ul style="margin:8px 0 0 18px;">
                ${advising.prereqIssues.map(p => `<li>${esc(p.courseId)} (${esc(p.title)}) requires: ${esc(p.missing.map(m => `${m.courseId} (${m.title})`).join(', '))}</li>`).join('')}
                </ul><div style="margin-top:8px;">Consider registering for the missing prerequisite(s) instead this semester.</div></div>`;
        }

        if ((advising.labWithoutTheory || []).length) {
            html += `<div class="ulab-threshold-box"><strong>🧪 Lab registered without its theory course:</strong><ul style="margin:8px 0 0 18px;">
                ${advising.labWithoutTheory.map(l => `<li>${esc(l.labCourseId)} (${esc(l.labTitle)}) — needs theory: ${esc(l.theoryCourseId)} (${esc(l.theoryTitle)})</li>`).join('')}
                </ul><div style="margin-top:8px;">You should register for the theory course alongside the lab this semester.</div></div>`;
        }

        if ((advising.theoryDayConflicts || []).length) {
            html += `<div class="ulab-threshold-box"><strong>Scheduling warning: 3 or more theory courses on the same day:</strong><ul style="margin:8px 0 0 18px;">
                ${advising.theoryDayConflicts.map(c => `<li>${esc(c.day)}: ${esc(c.courses.map(x => `${x.courseId} (${x.title})`).join(', '))}</li>`).join('')}
                </ul><div style="margin-top:8px;">Their final exams may fall on the same day. Review sections with your advisor if this happened during registration.</div></div>`;
        }

        if (!advising.finalProbation && advising.probationTier === null && !openRetakes.length
            && !(advising.prereqIssues || []).length && !(advising.labWithoutTheory || []).length
            && !(advising.theoryDayConflicts || []).length) {
            html += `<div class="ulab-info-box">✓ No issues found in what you entered — looks like you're clear to proceed with registration as planned.</div>`;
        }

        const progress = advising.degreeProgress && advising.degreeProgress.progress;
        if (progress && progress.length) {
            html += `<h3 style="font-size:13px;margin:18px 0 8px;">🎯 Your degree progress</h3>`;
            for (const p of progress) {
                const pct = p.required ? Math.min(100, Math.round(((p.earnedCredits + p.inProgressCredits) / p.required) * 100)) : 0;
                html += `<div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:3px;">
                        <span>${esc(p.label || p.category)}</span>
                        <span>${p.earnedCredits}${p.inProgressCredits ? ` (+${p.inProgressCredits} in progress)` : ''} / ${p.required}</span>
                    </div>
                    <div class="ulab-progress-dots"><div class="ulab-progress-dot ${pct >= 100 ? 'done' : 'active'}" style="flex:${pct};min-width:2%;"></div><div class="ulab-progress-dot" style="flex:${100 - pct};background:rgba(var(--overlay-rgb),0.08);"></div></div>
                </div>`;
            }
        }

        html += `<div class="ulab-run-status-msg" style="margin-top:16px;text-align:left;">
            This is an automated self-check using the ${esc(programLabel || '')} catalogue data bundled with this
            extension (hand-transcribed, best-effort — see docs). Always confirm your remaining requirements and any
            registration decision with your academic advisor before finalizing anything.
        </div>`;

        return html;
    }

    let autoLoadAttempted = false;

    function mount(container) {
        // Only attempt the auto-source read once per side-panel session —
        // after that, "← Back" re-mounting the form should preserve
        // whatever the student has since typed/edited, not clobber it with
        // the original scrape again.
        if (!autoLoadAttempted) {
            autoLoadAttempted = true;
            container.innerHTML = '<div class="ulab-fa-note">Reading your record from the ULAB portal…</div>';
            loadAutoSourcedData(() => mountForm(container));
            return;
        }
        mountForm(container);
    }

    function mountForm(container) {
        const shouldAutoRun = !state.autoRunCompleted && state.autoLoaded && state.programId && (state.completedText || state.registeringText);
        if (shouldAutoRun) {
            state.step = 2;
            state.autoRunCompleted = true;
        }
        container.innerHTML = renderForm();

        const programContainer = container.querySelector('#ulab-sa-program');
        const probationEl = container.querySelector('#ulab-sa-probation');
        const completedEl = container.querySelector('#ulab-sa-completed');
        const registeringEl = container.querySelector('#ulab-sa-registering');
        const programCombobox = programContainer ? buildProgramCombobox(programContainer, {
            value: state.programId || '',
            onChange: (id) => { state.programId = id; },
        }) : null;
        if (probationEl) probationEl.value = state.probationText || '';
        if (completedEl) completedEl.value = state.completedText || '';
        if (registeringEl) registeringEl.value = state.registeringText || '';

        const retryButton = container.querySelector('#ulab-sa-retry');
        if (retryButton) retryButton.addEventListener('click', () => {
            // Keep whatever the student has typed so far — a retry must not
            // wipe a half-filled manual entry.
            if (probationEl) state.probationText = probationEl.value;
            if (completedEl) state.completedText = completedEl.value;
            if (registeringEl) state.registeringText = registeringEl.value;
            container.innerHTML = '<div class="ulab-fa-note">Reading your record from the ULAB portal…</div>';
            state.dataError = null;
            loadAutoSourcedData(() => mountForm(container));
        });

        const nextButton = container.querySelector('#ulab-sa-next');
        if (nextButton) nextButton.addEventListener('click', () => {
            const programId = programCombobox.getValue();
            if (!programId) { alert('Please select your programme first.'); return; }
            state.programId = programId;
            state.probationText = probationEl.value;
            state.step = 2;
            mountForm(container);
        });

        const previousButton = container.querySelector('#ulab-sa-prev');
        if (previousButton) previousButton.addEventListener('click', () => {
            state.completedText = completedEl.value;
            state.registeringText = registeringEl.value;
            state.step = 1;
            mountForm(container);
        });

        const runCheck = () => {
            const programId = programCombobox ? programCombobox.getValue() : state.programId;
            if (!programId) { alert('Please select your program first.'); return; }
            const cat = (window.ULAB_CATALOGUES || {})[programId];
            if (!cat) { alert('Could not find catalogue data for that program.'); return; }

            state.programId = programId;
            state.probationText = probationEl ? probationEl.value : state.probationText;
            state.completedText = completedEl ? completedEl.value : state.completedText;
            state.registeringText = registeringEl ? registeringEl.value : state.registeringText;

            const core = window.ULAB_SELF_ADVISING;
            const info = {
                probation: state.probationText.trim() || null,
                completedCourses: core.parseCompletedCoursesText(state.completedText),
                coursesToRegister: core.parseRegisteringCoursesText(state.registeringText),
            };
            info.coursesToRegister.forEach(course => {
                course.meetings = state.scheduleByCode[String(course.courseId || '').replace(/\s+/g, '').toUpperCase()] || [];
            });
            const advising = core.analyzeSelf(info, cat);
            const program = (window.ULAB_PROGRAMS || []).find(p => p.id === programId);

            container.innerHTML = renderResult(advising, cat, program ? program.name : programId);
            container.querySelector('#ulab-sa-back').addEventListener('click', () => mountForm(container));
        };
        const runButton = container.querySelector('#ulab-sa-run');
        if (runButton) runButton.addEventListener('click', runCheck);
        if (shouldAutoRun) setTimeout(runCheck, 0);
    }

    window.ULAB_ENSURE_PORTAL_DATA = ensurePortalDataLayer;

    window.ULAB_FEATURES = window.ULAB_FEATURES || [];
    window.ULAB_FEATURES.push({
        id: 'self-advising',
        // `icon` is an ICON NAME resolved against sidebar.js's SVG map — the
        // same names ulab-dashboard-shell.js's My Tools menu uses, so a tool
        // looks identical in the menu and in the nav it opens. Never an emoji
        // (project rule) and never a bare letter; an unknown name falls back
        // to the feature's initial.
        icon: 'clipboard-check',
        title: 'My Advising Check',
        subtitle: 'Prerequisite, retake & degree-progress self-check',
        mount,
    });
})();
