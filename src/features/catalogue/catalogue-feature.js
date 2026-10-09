(function () {
    const esc = value => String(value == null ? '' : value)
        .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function normCode(str) {
        return String(str || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }

    function getCourseKeys(item, cat) {
        const keys = new Set();
        if (!item) return [];

        const raw = String(item.code || item.courseId || item.CourseID || item.CourseId || item.unescoCode || '').trim();
        if (raw) {
            const norm = normCode(raw);
            if (norm) keys.add(norm);
        }

        const name = String(item.name || item.courseName || item.title || '').trim();
        const match = name.match(/^([A-Za-z]{2,6}\s*[-]?\s*\d{3,4}[A-Za-z]?)/);
        if (match) {
            const norm = normCode(match[1]);
            if (norm) keys.add(norm);
        }

        const currentKeys = Array.from(keys);
        for (const key of currentKeys) {
            if (cat && typeof cat.resolve === 'function') {
                const co = cat.resolve(key);
                if (co) {
                    if (co.code) keys.add(normCode(co.code));
                    if (co.unescoCode) keys.add(normCode(co.unescoCode));
                    if (Array.isArray(co.oldCodes)) {
                        co.oldCodes.forEach(oc => keys.add(normCode(oc)));
                    }
                }
            }
        }

        return Array.from(keys);
    }

    function mount(container) {
        const programs = window.ULAB_PROGRAMS || [
            { id: 'CSE', name: 'BSc in Computer Science & Engineering' },
            { id: 'BBA', name: 'Bachelor of Business Administration' },
            { id: 'ENGLISH', name: 'BA in English and Humanities' },
            { id: 'MSJ', name: 'BSS in Media Studies & Journalism' },
            { id: 'EEE', name: 'BSc in Electrical & Electronic Engineering' },
            { id: 'BANGLA', name: 'BA in Bangla Language and Literature' },
        ];

        container.innerHTML = `
            <div style="margin-bottom: 14px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:180px;">
                        <label for="ulab-cat-prog-select" style="font-size:11.5px; font-weight:700; color:var(--bento-fg-muted, #64748b); white-space:nowrap;">Program:</label>
                        <select id="ulab-cat-prog-select" class="bento-select" style="flex:1; width:100%;">
                            ${programs.map(p => `<option value="${esc(p.id)}">${esc(p.name || p.short || p.id)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="bento-segmented" id="ulab-cat-tabs">
                        <button type="button" class="bento-chip on" data-tab="plan">Typical Plan</button>
                        <button type="button" class="bento-chip" data-tab="journey">My Journey</button>
                        <button type="button" class="bento-chip" data-tab="search">Search</button>
                    </div>
                </div>
            </div>
            <div id="ulab-cat-body"></div>
        `;

        const progSelect = container.querySelector('#ulab-cat-prog-select');
        const tabButtons = container.querySelectorAll('#ulab-cat-tabs .bento-chip');
        const bodyEl = container.querySelector('#ulab-cat-body');

        let currentTab = 'plan';
        let selectedProgram = progSelect.value || 'CSE';
        let completedCourses = [];
        let inProgressCourses = [];
        let scheduleCourses = [];
        let preregCourses = [];
        let searchQuery = '';

        // Tab selection
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
                currentTab = btn.dataset.tab;
                render();
            });
        });

        // Program change
        progSelect.addEventListener('change', () => {
            selectedProgram = progSelect.value;
            render();
        });

        // Load storage & trigger portal sync
        function loadData() {
            chrome.storage.local.get(['ulabCompletedCourses', 'ulabInProgressCourses', 'ulabClassSchedule', 'ulabPreregCourses', 'ulabStudentProfile'], (data) => {
                if (data.ulabCompletedCourses && data.ulabCompletedCourses.length) {
                    completedCourses = data.ulabCompletedCourses;
                }
                if (data.ulabInProgressCourses && data.ulabInProgressCourses.length) {
                    inProgressCourses = data.ulabInProgressCourses;
                }
                if (data.ulabClassSchedule && data.ulabClassSchedule.length) {
                    scheduleCourses = data.ulabClassSchedule;
                }
                if (data.ulabPreregCourses && data.ulabPreregCourses.length) {
                    preregCourses = data.ulabPreregCourses;
                }
                const profile = data.ulabStudentProfile;
                if (profile && profile.programCode) {
                    const pCode = String(profile.programCode).toUpperCase();
                    const match = programs.find(p => p.id.toUpperCase() === pCode || (p.short && p.short.toUpperCase() === pCode));
                    if (match) {
                        selectedProgram = match.id;
                        progSelect.value = selectedProgram;
                    }
                }
                render();

                // Background sync via shared portal data layer
                const ready = typeof window.ULAB_ENSURE_PORTAL_DATA === 'function'
                    ? window.ULAB_ENSURE_PORTAL_DATA()
                    : Promise.resolve(!!window.ULAB_PORTAL_DATA);

                ready
                    .then(ok => (ok && window.ULAB_PORTAL_DATA ? window.ULAB_PORTAL_DATA.ensureAll(['status', 'schedule']) : { ok: false }))
                    .catch(() => ({ ok: false }))
                    .then(result => {
                        if (result) {
                            if (result.status && result.status.ok && result.status.data) {
                                completedCourses = result.status.data.completed || [];
                                inProgressCourses = result.status.data.inProgress || [];
                            }
                            if (result.schedule && result.schedule.ok && result.schedule.data) {
                                scheduleCourses = result.schedule.data.courses || [];
                            }
                            render();
                        }
                    });
            });
        }

        loadData();

        function render() {
            const catalogues = window.ULAB_CATALOGUES || {};
            const cat = catalogues[selectedProgram] || null;

            if (currentTab === 'plan') {
                renderTypicalPlan(cat);
            } else if (currentTab === 'journey') {
                renderMyJourney(cat);
            } else if (currentTab === 'search') {
                renderSearch(cat);
            }
        }

        function renderTypicalPlan(cat) {
            if (!cat || !cat.semesterPlan || !cat.semesterPlan.length) {
                bodyEl.innerHTML = `<div class="bento-notice info">No standard semester-by-semester plan defined for this program yet.</div>`;
                return;
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

            let html = '';

            if (selectedProgram === 'BANGLA') {
                html += `<div class="bento-notice info" style="margin-bottom:10px;">Note: Bangla curriculum data is partial.</div>`;
            }

            html += `
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

            bodyEl.innerHTML = html;
        }

        function renderMyJourney(cat) {
            if (!cat || !cat.semesterPlan || !cat.semesterPlan.length) {
                bodyEl.innerHTML = `<div class="bento-notice info">No standard semester-by-semester plan defined for this program yet.</div>`;
                return;
            }

            const norm = str => String(str || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

            // Build maps for fast lookups
            const completedMap = new Map();
            completedCourses.forEach(item => {
                const keys = getCourseKeys(item, cat);
                keys.forEach(k => completedMap.set(k, item));
            });

            const inProgressMap = new Map();
            const addInProgressItem = (item, source) => {
                if (!item) return;
                const keys = getCourseKeys(item, cat);
                const rec = {
                    code: item.code || item.courseId || '',
                    name: item.name || item.title || item.courseName || '',
                    semester: item.semester || 'Current Term',
                    source: source
                };
                keys.forEach(k => {
                    if (!inProgressMap.has(k)) inProgressMap.set(k, rec);
                });
            };

            (inProgressCourses || []).forEach(item => addInProgressItem(item, 'Status'));
            (scheduleCourses || []).forEach(item => addInProgressItem(item, 'Schedule'));
            (preregCourses || []).filter(item => item && /Enrolled|Registered|Selected/i.test(item.status || '')).forEach(item => addInProgressItem(item, 'Prereg'));

            // Calculate estimated current semester
            const semSet = new Set();
            completedCourses.forEach(item => {
                if (item && item.semester) semSet.add(item.semester.trim());
            });
            const estCurrentSemIdx = Math.max(0, semSet.size);

            // Compute overall stats
            let totalPassedCr = 0;
            let passedCount = 0;
            let retakeCount = 0;

            completedCourses.forEach(item => {
                const g = (item.grade || '').trim().toUpperCase();
                if (g === 'F') {
                    retakeCount++;
                } else if (g && g !== 'W' && g !== 'WF' && g !== 'WP') {
                    passedCount++;
                    totalPassedCr += Number(item.credits || item.credit || 3);
                }
            });
            const inProgressCount = inProgressMap.size;

            let html = '';

            if (completedCourses.length === 0 && inProgressMap.size === 0) {
                html += `
                    <div class="bento-notice warn" style="margin-bottom:12px;">
                        <span>No course history loaded yet. Syncing transcript from URMS...</span>
                    </div>
                `;
            }

            html += `
                <div class="bento-statstrip" style="margin-bottom:12px; border-bottom:1px solid var(--bento-border-soft);">
                    <div class="bento-stat success">
                        <span class="bento-stat-label">Passed</span>
                        <span class="bento-stat-value">${passedCount} <span style="font-size:11px;font-weight:600;">(${totalPassedCr} cr)</span></span>
                    </div>
                    <div class="bento-stat">
                        <span class="bento-stat-label">In Progress / Enrolled</span>
                        <span class="bento-stat-value">${inProgressCount}</span>
                    </div>
                    <div class="bento-stat ${retakeCount > 0 ? 'destructive' : ''}">
                        <span class="bento-stat-label">Retakes Needed</span>
                        <span class="bento-stat-value">${retakeCount}</span>
                    </div>
                </div>
            `;

            const matchedKeys = new Set();

            cat.semesterPlan.forEach((sem, semIdx) => {
                let semPassed = 0;
                let semTotal = sem.courses.length;

                const courseRowsHtml = sem.courses.map(code => {
                    const co = cat.resolve(code);
                    const candidates = new Set();
                    candidates.add(norm(code));
                    if (co) {
                        if (co.code) candidates.add(norm(co.code));
                        if (co.unescoCode) candidates.add(norm(co.unescoCode));
                        if (Array.isArray(co.oldCodes)) co.oldCodes.forEach(oc => candidates.add(norm(oc)));
                    }

                    let status = null;

                    // Check in-progress / schedule
                    for (const cand of candidates) {
                        if (inProgressMap.has(cand)) {
                            const item = inProgressMap.get(cand);
                            matchedKeys.add(cand);
                            candidates.forEach(c => matchedKeys.add(c));
                            const sourceLabel = item.source ? ` (${item.source})` : '';
                            status = { label: 'In Progress', pillClass: 'pill-primary', rowClass: '', note: `Currently Enrolled${sourceLabel}` };
                            break;
                        }
                    }

                    // Check completed
                    if (!status) {
                        for (const cand of candidates) {
                            if (completedMap.has(cand)) {
                                const item = completedMap.get(cand);
                                matchedKeys.add(cand);
                                candidates.forEach(c => matchedKeys.add(c));
                                const g = (item.grade || '').trim().toUpperCase();
                                const termLabel = item.semester ? ` (${item.semester})` : '';
                                if (g === 'F') {
                                    status = { label: `Failed (${g})`, pillClass: 'pill-destructive', rowClass: '', note: `Retake Needed${termLabel}` };
                                } else if (g === 'W' || g === 'WF' || g === 'WP') {
                                    status = { label: `Withdrawn (${g})`, pillClass: 'pill-warning', rowClass: '', note: `Withdrawn${termLabel}` };
                                } else {
                                    semPassed++;
                                    status = { label: `Passed (${g || 'P'})`, pillClass: 'pill-success', rowClass: 'is-ok', note: `Grade: ${g || 'P'}${termLabel}` };
                                }
                                break;
                            }
                        }
                    }

                    // Fallback to skipped / upcoming
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

            // Additional, Elective & Custom Courses section
            const unmatchedItems = [];
            const seenUnmatchedCodes = new Set();

            // 1. In Progress unmatched
            inProgressMap.forEach((item, key) => {
                if (!matchedKeys.has(key) && !seenUnmatchedCodes.has(key)) {
                    seenUnmatchedCodes.add(key);
                    const sourceLabel = item.source ? ` (${item.source})` : '';
                    unmatchedItems.push({
                        code: item.code || key,
                        title: item.name || (cat ? cat.titleFor(item.code || key) : '') || '—',
                        credits: 3,
                        statusLabel: 'In Progress',
                        pillClass: 'pill-primary',
                        note: item.semester ? `Enrolled ${item.semester}${sourceLabel}` : `Current Schedule${sourceLabel}`
                    });
                }
            });

            // 2. Completed unmatched
            completedCourses.forEach(item => {
                if (!item) return;
                const keys = getCourseKeys(item, cat);
                const isMatched = keys.some(k => matchedKeys.has(k));
                const primaryCode = norm(item.code || item.name || '');
                if (!isMatched && primaryCode && !seenUnmatchedCodes.has(primaryCode)) {
                    seenUnmatchedCodes.add(primaryCode);
                    keys.forEach(k => seenUnmatchedCodes.add(k));

                    const g = (item.grade || '').trim().toUpperCase();
                    let statusLabel = `Passed (${g || 'P'})`;
                    let pillClass = 'pill-success';
                    if (g === 'F') { statusLabel = `Failed (${g})`; pillClass = 'pill-destructive'; }
                    else if (g === 'W' || g === 'WF' || g === 'WP') { statusLabel = `Withdrawn (${g})`; pillClass = 'pill-warning'; }

                    const termLabel = item.semester ? `Taken in ${item.semester}` : 'Completed';
                    unmatchedItems.push({
                        code: item.code || primaryCode,
                        title: item.name || (cat ? cat.titleFor(item.code) : '') || '—',
                        credits: item.credits != null ? item.credits : 3,
                        statusLabel: statusLabel,
                        pillClass: pillClass,
                        note: termLabel
                    });
                }
            });

            if (unmatchedItems.length > 0) {
                const passedUnmatchedCount = unmatchedItems.filter(i => i.pillClass === 'pill-success').length;
                html += `
                    <details class="bento-panel standalone" style="margin-bottom:10px;" open>
                        <summary style="padding:8px 12px; font-weight:800; font-size:12px; cursor:pointer; background:var(--bento-card-alt); color:var(--bento-fg); display:flex; justify-content:space-between; align-items:center;">
                            <span>Additional, Elective & Custom Courses Taken (${unmatchedItems.length})</span>
                            <span style="font-size:11px; font-weight:600; color:var(--bento-fg-muted);">${passedUnmatchedCount} Passed</span>
                        </summary>
                        <div style="padding:10px;">
                            <p style="font-size:11.5px; color:var(--bento-fg-muted); margin-bottom:8px;">Courses taken outside the standard semester plan template (electives, custom sequence, or completed in different terms):</p>
                            <div class="bento-tablewrap">
                                <table class="bento-compact">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Title</th>
                                            <th class="c-center">Credits</th>
                                            <th class="c-center">Status</th>
                                            <th>Details / Term</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${unmatchedItems.map(item => `
                                            <tr>
                                                <td class="c-code">${esc(item.code)}</td>
                                                <td>${esc(item.title)}</td>
                                                <td class="c-center">${esc(item.credits)}</td>
                                                <td class="c-center"><span class="pill ${item.pillClass}">${esc(item.statusLabel)}</span></td>
                                                <td class="c-sub">${esc(item.note)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </details>
                `;
            }

            bodyEl.innerHTML = html;
        }

        function renderSearch(cat) {
            bodyEl.innerHTML = `
                <div style="margin-bottom:10px;">
                    <div class="bento-search">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input id="ulab-cat-search-input" type="text" placeholder="Search course code, title, or prereq..." value="${esc(searchQuery)}">
                    </div>
                    <div id="ulab-cat-search-count" class="bento-count" style="margin-top:6px;"></div>
                </div>
                <div id="ulab-cat-search-list"></div>
            `;

            const searchInput = bodyEl.querySelector('#ulab-cat-search-input');
            const countEl = bodyEl.querySelector('#ulab-cat-search-count');
            const listEl = bodyEl.querySelector('#ulab-cat-search-list');

            const updateSearch = () => {
                searchQuery = searchInput.value;
                const query = searchQuery.toLowerCase().trim();
                const courses = cat ? cat.courses : [];
                const matched = courses.filter(c => {
                    const text = `${c.code} ${c.unescoCode} ${c.title} ${(c.prereq || []).join(' ')} ${c.courseType || ''}`.toLowerCase();
                    return text.includes(query);
                });

                countEl.textContent = `${matched.length} course${matched.length === 1 ? '' : 's'} found`;

                if (!matched.length) {
                    listEl.innerHTML = `<div class="empty-state" style="padding:24px 0;">No matching courses found.</div>`;
                    return;
                }

                listEl.innerHTML = matched.slice(0, 100).map(c => {
                    const theory = cat.theoryForLab ? cat.theoryForLab(c.unescoCode) : null;
                    const prereqs = (c.prereq && c.prereq.length) ? c.prereq.join(', ') : 'None';
                    return `
                        <div class="bento-panel standalone" style="padding:10px; margin-bottom:8px;">
                            <div style="font-weight:800; font-size:12.5px; color:var(--bento-primary); display:flex; justify-content:space-between; align-items:center;">
                                <span>${esc(c.code)} · ${esc(c.title)}</span>
                                <span style="font-size:11px; font-weight:700; color:var(--bento-fg-muted);">${c.credits || '—'} cr</span>
                            </div>
                            <div style="font-size:11px; color:var(--bento-fg-subtle); margin-top:3px;">
                                <span>${esc(c.unescoCode)}</span> · <span>${esc(c.courseType || 'Course')}</span>
                            </div>
                            <div style="font-size:11px; color:var(--bento-fg-muted); margin-top:4px;">
                                <strong>Prerequisites:</strong> ${esc(prereqs)}
                                ${theory ? ` · <strong>Theory pair:</strong> ${esc(theory.code)}` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            };

            searchInput.addEventListener('input', updateSearch);
            updateSearch();
            searchInput.focus();
        }
    }

    window.ULAB_FEATURES = window.ULAB_FEATURES || [];
    window.ULAB_FEATURES.push({
        id: 'catalogue',
        icon: 'book',
        title: 'Recommended Courses',
        subtitle: 'Typical plan & your journey through the curriculum',
        mount
    });
})();
