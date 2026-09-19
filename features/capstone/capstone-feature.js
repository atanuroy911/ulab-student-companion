(function () {
    const GATES = ['CSE2200', 'CSE3103', 'CSE3200', 'CSE3203'];
    const PASS = /^(A\+?|A-|B\+?|B-|C\+?|C|D)$/i;
    const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const esc = value => String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const styleId = 'ulab-capstone-premium-css';
    function styles() {
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style'); style.id = styleId; style.textContent = `
            .capstone-hero{padding:18px;border:1px solid var(--bento-border-soft);border-radius:16px;background:linear-gradient(135deg,var(--bento-card),rgba(13,148,136,.12));margin-bottom:14px}.capstone-hero h2{margin:0;color:var(--bento-fg);font-size:20px}.capstone-hero p{margin:6px 0 0;color:var(--bento-fg-muted);font-size:12px;line-height:1.5}.capstone-statgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.capstone-stat{padding:12px;background:var(--bento-card);border:1px solid var(--bento-border-soft);border-radius:12px}.capstone-stat small,.capstone-stat strong{display:block}.capstone-stat small{color:var(--bento-fg-subtle);font-size:10px;text-transform:uppercase}.capstone-stat strong{margin-top:5px;color:var(--bento-primary);font-size:22px}.capstone-progress{height:8px;margin:14px 0;background:var(--bento-card-alt);border-radius:99px;overflow:hidden}.capstone-progress span{display:block;height:100%;background:var(--bento-primary);border-radius:inherit}.capstone-check{display:flex;align-items:center;gap:10px;padding:12px;margin:7px 0;background:var(--bento-card);border:1px solid var(--bento-border-soft);border-radius:10px}.capstone-check .mark{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;font-weight:800}.capstone-check.ok .mark{background:rgba(74,222,128,.15);color:var(--bento-success)}.capstone-check.bad .mark{background:rgba(248,113,113,.15);color:var(--bento-destructive)}.capstone-check strong{color:var(--bento-fg);font-size:12px}.capstone-check small{display:block;color:var(--bento-fg-muted);font-size:11px;margin-top:2px}.capstone-note{margin-top:12px;color:var(--bento-fg-subtle);font-size:10.5px;line-height:1.5}@media(max-width:520px){.capstone-statgrid{grid-template-columns:1fr}}
        `; document.head.appendChild(style);
    }
    function mount(container) {
        styles();
        container.innerHTML = '<div class="capstone-hero"><div class="stat-label">CSE progress gate</div><h2>Can I start Capstone?</h2><p>A read-only eligibility view of your Result record, read straight from the portal.</p></div><div class="ulab-info-box">Reading your academic record from the ULAB portal...</div>';
        // DEAD END REMOVED: this used to tell the student to "Refresh Result
        // first for the most accurate answer" and then silently render every
        // gate as "Not found in your Result record" if they hadn't. It now
        // asks the shared data layer, which serves fresh cache or fetches
        // Status.php in the background (see features/shared/ulab-portal-data.js
        // and the allowlist invariant in background.js). The manual portal
        // page is never required.
        const ready = typeof window.ULAB_ENSURE_PORTAL_DATA === 'function'
            ? window.ULAB_ENSURE_PORTAL_DATA()
            : Promise.resolve(!!window.ULAB_PORTAL_DATA);
        ready
            .then(ok => (ok ? window.ULAB_PORTAL_DATA.ensure('status') : { ok: false, error: 'unavailable', message: 'The portal data layer could not be loaded.' }))
            .catch(() => ({ ok: false, error: 'unavailable', message: 'The portal data layer could not be loaded.' }))
            .then(result => {
                if (!result.ok) {
                    const message = result.error === 'session-expired'
                        ? 'Your ULAB portal session has expired, so your Result record could not be read. Please log in to the portal again.'
                        : (result.message || 'Your Result record could not be read from the portal right now.');
                    container.innerHTML = `<div class="capstone-hero"><div class="stat-label">CSE progress gate</div><h2>Can I start Capstone?</h2></div><div class="ulab-danger-box">${esc(message)}<div style="margin-top:8px;"><button type="button" class="ulab-secondary-btn" id="ulab-capstone-retry">Retry</button></div></div>`;
                    const retry = container.querySelector('#ulab-capstone-retry');
                    if (retry) retry.addEventListener('click', () => mount(container));
                    return;
                }
                renderGate(container, {
                    ulabCompletedCourses: result.data.completed,
                    ulabInProgressCourses: result.data.inProgress,
                    ulabAcademicSummary: result.data.summary,
                });
            });
    }

    function renderGate(container, data) {
        {
            const rows = (data.ulabCompletedCourses || []).concat((data.ulabInProgressCourses || []).map(row => Object.assign({}, row, { grade: '' })));
            const byCode = new Map(); rows.forEach(row => { const code = String(row.code || row.courseId || '').replace(/\s+/g, '').toUpperCase(); if (code && !byCode.has(code)) byCode.set(code, row); });
            const summary = data.ulabAcademicSummary || {}; const credits = Number(summary.totalCreditHours || rows.reduce((sum, row) => sum + (Number(row.credits || row.credit) || 0), 0));
            const checks = GATES.map(code => { const row = byCode.get(code); return { code, row, ok: !!row && (!row.grade || PASS.test(row.grade)) }; });
            const eligible = credits >= 105 && checks.every(check => check.ok); const percent = Math.min(100, Math.round(credits / 105 * 100));
            container.innerHTML = `<div class="capstone-hero"><div class="stat-label">CSE progress gate</div><h2>${eligible ? 'You appear ready to start Capstone' : 'Your Capstone checklist is not complete yet'}</h2><p>${eligible ? 'All tracked entry conditions are satisfied in the cached record.' : 'Use the checklist below to see exactly what remains.'}</p></div><div class="capstone-statgrid"><div class="capstone-stat"><small>Eligibility</small><strong style="color:var(--bento-${eligible ? 'success' : 'warning'})">${eligible ? 'Ready' : 'Review'}</strong></div><div class="capstone-stat"><small>Credits</small><strong>${credits.toFixed(1)} / 105</strong></div><div class="capstone-stat"><small>Gateway courses</small><strong>${checks.filter(c => c.ok).length} / ${GATES.length}</strong></div></div><div class="capstone-progress"><span style="width:${percent}%"></span></div><div class="bento-card"><div class="stat-label">Entry requirements</div>${checks.map(check => `<div class="capstone-check ${check.ok ? 'ok' : 'bad'}"><span class="mark">${check.ok ? '✓' : '!'}</span><div><strong>${esc(check.code)}</strong><small>${check.row ? (check.row.grade ? `Latest grade: ${esc(check.row.grade)}` : 'In progress') : 'Not found in your Result record'}</small></div></div>`).join('')}</div><div class="capstone-note">This is an academic planning aid, not an approval. Confirm eligibility with your department before registering.</div>`;
        }
    }
    window.ULAB_FEATURES = window.ULAB_FEATURES || [];
    window.ULAB_FEATURES.push({ id: 'capstone', icon: 'sheet', title: 'Capstone Eligibility', subtitle: 'A visual readiness check for your capstone gate', mount });
})();
