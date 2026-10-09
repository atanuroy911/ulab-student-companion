// features/profile/profile-ui-content.js — content script injected into the
// URMS student portal My Profile page (profile.php).
//
// Full UI-revamp takeover (matches every other page in this pass): scrapes
// the profile fields (student id/name/program, contact info, status flags,
// photo URL) same as before — still cached into ulabStudentProfile for the
// self-advising feature's program-code fallback — but now also hides the
// ENTIRE legacy render (window.ULAB_SHELL.wrapLegacyContent(), same
// non-destructive class-toggle every other page uses) and renders a bento
// profile view: a header card with photo/name/id/program prominent, status
// pills for Active/Payment/Registration, and a separate contact-info card
// for phone/emails/address — a creative re-layout rather than a literal
// reskin of the legacy label/value table, per the "be creative" direction.
(function () {
    const VIEW_ID = 'ulab-profile-view';
    const STYLE_ID = 'ulab-profile-view-css';
    const BODY_CLASS = 'ulab-page-profile';

    // PARSER LOCATION: the profile scrape now lives in
    // features/shared/ulab-portal-parsers.js as parseProfile(doc) so the
    // same code can read a background-fetched copy of profile.php for the
    // side panel. This page still parses its own LIVE document — free, no
    // request — and caches under the unchanged ulabStudentProfile key.
    function scrapeAndPersistProfile() {
        try {
            return window.ULAB_PORTAL_DATA.storeFromDocument('profile', document);
        } catch (e) {
            console.error('[Student Companion] failed to cache profile', e);
            try { return window.ULAB_PARSERS.parseProfile(document); }
            catch (e2) { return { studentId: null, studentName: null, programCode: null, photoUrl: null }; }
        }
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // Returns a renderHeaderCard() pill *tone*, not a CSS class — the shared
    // helper maps tone → pill-* class.
    function statusPillTone(value) {
        const v = (value || '').toLowerCase();
        if (/inactive|due|incomplete|pending/.test(v)) return 'warning';
        if (/active|ok|complete/.test(v)) return 'success';
        return 'muted';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        // The photo/name/ID hero is kept (it is the one place on the whole
        // portal a student sees their own record as a record), just tightened
        // to the compact scale; the field rows are the shared
        // .bento-infogrid, and status flags the shared pill strip.
        style.textContent = `
            #${VIEW_ID} { display: none; padding: 10px 0 28px; text-align: left; font-family: var(--bento-font-ui); color: var(--bento-fg); }
            body.${BODY_CLASS}.ulab-shell-mounted #${VIEW_ID} { display: block; }
            #${VIEW_ID} .profile-hero { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:8px 10px; border-bottom:1px solid var(--bento-border-soft); }
            #${VIEW_ID} .profile-photo, #${VIEW_ID} .profile-photo-fallback {
                width:64px; height:64px; border-radius:var(--bento-radius-xs); flex-shrink:0;
                border:1px solid var(--bento-border-soft); background:var(--bento-card-alt);
            }
            #${VIEW_ID} .profile-photo { object-fit:cover; }
            #${VIEW_ID} .profile-photo-fallback {
                display:flex; align-items:center; justify-content:center;
                color:var(--bento-fg-subtle); font:800 24px var(--bento-font-ui);
            }
            #${VIEW_ID} .profile-name { font:800 15px var(--bento-font-ui); color:var(--bento-fg); }
            #${VIEW_ID} .profile-meta { font-size:11.5px; color:var(--bento-fg-muted); margin-top:2px; font-variant-numeric:tabular-nums; }
            /* Present Address is stored with real newlines (see the scrape) —
               pre-line keeps the legacy page's line breaks instead of
               collapsing them into one run-on string. */
            #${VIEW_ID} .bento-infogrid dd.multiline { white-space:pre-line; font-weight:600; }
        `;
        document.head.appendChild(style);
    }

    function renderView(profile, info) {
        const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
        injectStyle();
        let view = document.getElementById(VIEW_ID);
        if (!view) {
            view = document.createElement('div');
            view.id = VIEW_ID;
            view.className = 'bento-root';
            contentCell.appendChild(view);
        }

        const displayName = profile.studentName || (info && info.studentName) || 'Student';
        const initial = displayName.trim().charAt(0).toUpperCase() || '?';
        const photoHtml = profile.photoUrl
            ? `<img class="profile-photo" src="${esc(profile.photoUrl)}" alt="${esc(displayName)}" />`
            : `<div class="profile-photo-fallback">${esc(initial)}</div>`;

        // Status flags ride in the shared pill strip; every remaining
        // profile.php field becomes a row in the shared compact info grid,
        // in the legacy page's own order. Present Address is rendered
        // separately so it can keep its <br>-derived line breaks (see the
        // .multiline rule and scrapeAddressLines()).
        const pills = [];
        if (profile.activeStatus) pills.push({ text: `Active: ${profile.activeStatus}`, tone: statusPillTone(profile.activeStatus) });
        if (profile.paymentStatus) pills.push({ text: `Payment: ${profile.paymentStatus}`, tone: statusPillTone(profile.paymentStatus) });
        if (profile.registrationStatus) pills.push({ text: `Registration: ${profile.registrationStatus}`, tone: statusPillTone(profile.registrationStatus) });
        if (!pills.length) pills.push({ text: 'No status flags found', tone: 'muted' });

        const heroHtml = `
            <div class="profile-hero">
                ${photoHtml}
                <div>
                    <div class="profile-name">${esc(displayName)}</div>
                    <div class="profile-meta">${profile.studentId ? esc(profile.studentId) : ''}${profile.programCode ? ` · ${esc(profile.programCode)}` : ''}</div>
                </div>
            </div>`;

        const addressHtml = profile.presentAddress
            ? `<dl class="bento-infogrid"><div><dt>Present Address</dt><dd class="multiline">${esc(profile.presentAddress)}</dd></div></dl>`
            : '';

        view.innerHTML = window.ULAB_SHELL.renderHeaderCard(info, {
            title: 'My Profile',
            topHtml: heroHtml,
            rows: [
                // Student ID is already an info row (from the shared header
                // scrape) and is shown in the hero — not repeated here.
                ['Program', profile.programCode],
                ['Tel/Mobile', profile.phone],
                ['ULAB Mail', profile.ulabEmail],
                ['Personal Mail', profile.personalEmail],
            ],
            pills,
            extraHtml: addressHtml,
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
        window.ULAB_SHELL.mount(BODY_CLASS, null, (info) => {
            const profile = scrapeAndPersistProfile();
            renderView(profile, info);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
