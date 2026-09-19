// features/shared/ulab-dashboard-shell.js — shared dashboard shell for every
// authenticated urms-online.ulab.edu.bd student page's modern-UI reskin
// (Home, Teacher/Course Evaluation, Preregistration, Schedule, Billing,
// Result, Profile). Loaded FIRST in each of those content-script bundles
// (see manifest.json) so it initializes before the page-specific file runs,
// and exposes window.ULAB_SHELL for that file to call into.
//
// Ported from ulab-faculty-companion's ulab-dashboard-shell.js (persistent
// dark sidebar, collapsible icon-rail, off-canvas mobile drawer, dark/light
// + font-size + Modern UI controls in the sidebar footer, collapsible nav
// groups, no-emoji inline-SVG icon system) but adapted for this project in
// two structural ways:
//
//   1. MARKUP: this site is 2005-era table-layout HTML — every authenticated
//      page shares the same skeleton (verified against reference-html/
//      dashboard.html, schedule.html, status.html, billing.html,
//      preregistration.html, profile.html):
//        <table class="main"> > tr(header image) > tr(td.top_menu > ul#menubar)
//                              > tr(td.content)    > tr(footer)
//      There is no Bootstrap <header>/<footer>/.container and no real top
//      navbar to inject a hamburger into (faculty's shell inserts one next
//      to header nav.navbar .navbar-brand — that anchor point doesn't
//      exist here). This shell instead: (a) hides the original #menubar's
//      row via `td.top_menu { display:none }` once the sidebar takes over
//      navigation, and (b) pushes content by setting margin-left directly
//      on <body> (not on table.main) — table.main keeps its own
//      align="center", so it re-centers itself within the narrower
//      remaining width, which reads correctly without fighting the
//      align="center" attribute's UA-stylesheet centering. The hamburger
//      itself is a fixed-position button pinned to the top-left of the
//      viewport (judgment call — there's no navbar seam to dock it into on
//      this markup) rather than spliced into page chrome.
//   2. TOKENS: colors reuse this project's bento-ui.css custom properties
//      (teal/orange, Plus Jakarta Sans) instead of faculty's indigo/dark-zinc
//      palette, so the sidebar matches results-view.js / billing-ui-content.js
//      / preregistration-ui-content.js's existing look. The sidebar itself
//      stays a fixed dark-teal surface regardless of the light/dark toggle
//      (same pattern faculty uses: the rail is always dark, only the PAGE
//      switches theme) — bento-ui.css's dark-mode custom properties are
//      reused as literal values here since this file also needs to render
//      before body.ulab-dark exists.
//
// This file also still owns the anti-flash cloak/uncloak trick and the
// shared "Semester / Student / Adviser / Email" header-block scrape
// (scrapeStudentInfo / STORAGE_KEY_INFO) that page-specific files already
// depend on — both kept byte-for-byte compatible with the previous minimal
// shell so every existing caller (home/status/billing/preregistration/
// profile *-ui-content.js) keeps working unmodified:
//   window.ULAB_SHELL.mount(pageBodyClass, onModernChange?, onMount?)
(function () {
    if (window.ULAB_SHELL) return; // idempotent if somehow injected twice

    const KEYS = {
        modern: 'ulabModernUI',
        theme: 'ulabModernTheme',         // 'light' | 'dark'
        mode: 'ulabUiMode',               // 'simple' | 'advanced'
        collapsed: 'ulabSidebarCollapsed',
        fontScale: 'ulabFontScale',        // percentage, e.g. 100
        navGroups: 'ulabNavGroupsCollapsed' // { [groupLabel]: boolean }
    };
    let currentUiMode = 'simple';
    function getUiMode() { return currentUiMode; }
    function isSimpleMode() { return currentUiMode === 'simple'; }
    const FONT_SCALE_MIN = 80;
    const FONT_SCALE_MAX = 150;
    const FONT_SCALE_STEP = 10;
    const CLOAK_ID = 'ulab-cloak-style';
    const SHELL_STYLE_ID = 'ulab-shell-css';
    const SIDEBAR_ID = 'ulab-sidebar';
    const SIDEBAR_BACKDROP_ID = 'ulab-sidebar-backdrop';
    const TOPBAR_TOGGLE_ID = 'ulab-hamburger';
    const FLOATING_TOGGLE_ID = 'ulab-floating-modern-toggle';
    const STORAGE_KEY_INFO = 'ulabStudentInfo';
    const MOBILE_QUERY = '(max-width: 900px)';
    const LOGOUT_HREF = '/index.php?logout=1';
    const LEGACY_WRAP_CLASS = 'ulab-legacy-content-wrap';

    // The student portal's real nav (confirmed via reference-html/*.html
    // #menubar, consistent across every page): Home, Teacher Evaluation,
    // Course Evaluation, Preregistration, Schedule, Billing, Result
    // (Status.php), Profile. Logout is deliberately NOT listed here — it's a
    // plain `<a href="index.php?logout=1">` (no antiforgery-token form like
    // faculty's /LogOff), so it's built directly into the sidebar footer
    // below instead of going through the generic href-item renderer twice.
    const NAV_GROUPS = [
        { label: null, items: [{ label: 'Home', href: '/index.php', icon: 'home' }] },
        {
            label: 'My Portal',
            items: [
                { label: 'Teacher Evaluation', href: '/TeacherEvaluation.php', icon: 'clipboard-check' },
                { label: 'Course Evaluation', href: '/CourseEvaluation.php', icon: 'chart' },
                { label: 'Preregistration', href: '/Preregistration.php', icon: 'edit' },
                { label: 'Schedule', href: '/schedule.php', icon: 'calendar' },
                { label: 'Billing', href: '/Billing.php', icon: 'doc' },
                { label: 'Result', href: '/Status.php', icon: 'sheet' },
                { label: 'Profile', href: '/profile.php', icon: 'people' },
            ]
        },
        // Extension-native features surfaced directly in this URMS-styled
        // sidebar, same pattern as faculty's "My Tools" group — `action`
        // items (no `href`) render as a <button>. Self-Advising Check lives
        // in the side panel (features/advising/advising-feature.js); this
        // just asks background.js to open the panel rather than
        // reimplementing the wizard inline (there is no tools-frame.html
        // iframe-overlay equivalent in this project, and building one just
        // for a single feature isn't worth the duplication).
        {
            label: 'My Tools',
            items: [
                { label: 'Self-Advising Check', icon: 'clipboard-check', action: 'open-tool:self-advising' },
                { label: 'Capstone Eligibility', icon: 'sheet', action: 'open-tool:capstone' },
                { label: 'Course Catalogue', icon: 'book', action: 'open-tool:catalogue' },
                { label: 'Routine & Export', icon: 'calendar', action: 'open-tool:schedule-tools' },
                { label: 'Marks Management', icon: 'chart', action: 'open-tool:marks' },
            ]
        }
    ];

    const ICONS = {
        home: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
        edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        swap: '<path d="M17 3 21 7l-4 4"/><path d="M3 7h18"/><path d="M7 21 3 17l4-4"/><path d="M21 17H3"/>',
        sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>',
        clipboard: '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4V3h6v1"/>',
        'clipboard-check': '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 12l2 2 4-4"/>',
        doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
        chart: '<path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/>',
        people: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
        grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
        'type-size': '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
        book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
        logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    };
    function svg(name, size) {
        size = size || 16;
        return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
    }

    // --- Shared header-block scrape (unchanged from the previous minimal
    // shell — every authenticated page carries the same "Semester / Student
    // / Adviser / Email" plain-text block inside td.content). Kept here,
    // centrally, so every page-specific content script gets it for free
    // through mount(), and so the sidebar's user row can show it too. ---
    function scrapeStudentInfo() {
        const contentCell = document.querySelector('td.content') || document.body;
        const text = (contentCell.textContent || '').replace(/\s+/g, ' ').trim();

        const semMatch = text.match(/Semester:\s*(\S+)\s*\(\s*([^)]+?)\s*\)/i);
        const studentMatch = text.match(/Student:\s*(\d+)\s+([^A-Z]*[A-Za-z .'-]+?)(?=\s+Adviser:|\s*$)/i);
        const adviserMatch = text.match(/Adviser:\s*(.+?)(?=\s*Email:|\s*Registration|\s*CGPA|\s*Total\s+Credit|\s*$)/i);
        // The legacy markup runs the NEXT section's text straight onto the
        // address with no separator once whitespace is collapsed — e.g.
        // "...nazmul.abdal@ulab.edu.bdRegistration complete...". The old
        // pattern used a case-insensitive `[A-Za-z]{2,}` TLD, which happily
        // swallowed "bdRegistration" (all letters) and produced a broken
        // address on every page. Anchor on the portal's known domain first,
        // then fall back to a generic pattern whose TLD is LOWERCASE-only
        // (note: no /i flag, deliberately) so it terminates at the
        // capitalised word that follows.
        const emailMatch = text.match(/[Ee]mail:\s*([\w.+-]+@ulab\.edu\.bd)/)
            || text.match(/[Ee]mail:\s*([\w.+-]+@[\w.-]+\.[a-z]{2,24})(?![a-z])/);

        const info = {
            semesterCode: semMatch ? semMatch[1].trim() : null,
            semesterLabel: semMatch ? semMatch[2].trim() : null,
            studentId: studentMatch ? studentMatch[1].trim() : null,
            studentName: studentMatch ? studentMatch[2].trim() : null,
            adviserName: adviserMatch ? adviserMatch[1].trim() : null,
            adviserEmail: emailMatch ? emailMatch[1].trim() : null,
            scrapedAt: Date.now(),
            sourceUrl: location.href,
        };

        if (info.semesterCode || info.studentId) {
            try { chrome.storage.local.set({ [STORAGE_KEY_INFO]: info }); }
            catch (e) { console.error('[Student Companion] failed to cache student info', e); }
        }
        return info;
    }

    // --- Session expiry -------------------------------------------------
    // When the URMS session dies this portal does NOT redirect: it serves
    // the inline login prompt ("Please login!", StudentID + Password fields,
    // login/close buttons) INSIDE the authenticated page's own content area.
    // Reskinning that produces a page that claims "Signed in" with a full
    // sidebar wrapped around a login form and an empty content section — a
    // correctness/trust bug, not a cosmetic one. Detected here and redirected
    // instead, while the cloak is still up.
    //
    // Detection is deliberately conservative; ALL of these must hold:
    //   1. We are not already on the login/root page. `/index.php` (and `/`)
    //      legitimately contains a login form, so this guard alone is what
    //      makes a redirect loop impossible. Never drop it.
    //   2. A session-expiry marker: the "Please login" banner text, OR the
    //      studentID+password field PAIR. The pair — not a lone password
    //      field — is required because the portal has a "Change Password"
    //      destination (linked from the Home quick links) which would
    //      legitimately carry password inputs but almost certainly not a
    //      studentID one.
    //   3. A re-entrancy guard, so a failed navigation can never loop.
    //
    // Checked against every file in reference-html/: dashboard,
    // preregistration, schedule, status, billing, profile,
    // teacher-evaluation and course-evaluation contain no "please login"
    // text and no studentID/password inputs at all, so none of them can
    // trigger it; login.html has both (and lives at the guarded root path);
    // forgot-password.html has studentID + forgotPassword but NO password
    // input, so the pair test leaves it alone as well.
    let sessionRedirectFired = false;
    const SESSION_REDIRECT_FLAG = 'ulabSessionRedirect';

    function isLoginPath() {
        const path = (location.pathname || '').toLowerCase().replace(/\/+$/, '');
        return path === '' || path === '/index.php';
    }

    function sessionExpired() {
        if (isLoginPath()) {
            // Reaching the login/root page means the redirect did its job (or
            // never needed to happen) — clear the guard so a LATER expiry in
            // this same tab still redirects.
            try { sessionStorage.removeItem(SESSION_REDIRECT_FLAG); } catch (e) { /* blocked storage */ }
            return false;
        }
        const cell = document.querySelector('td.content') || document.body;
        if (!cell) return false;
        const text = (cell.textContent || '').replace(/\s+/g, ' ');
        const hasBanner = /please\s*login/i.test(text);
        const hasFieldPair = !!(document.querySelector('input[name="studentID"]')
            && document.querySelector('input[name="password"]'));
        return hasBanner || hasFieldPair;
    }

    function redirectToLogin() {
        if (sessionRedirectFired) return;
        sessionRedirectFired = true;
        try {
            // Short-lived guard surviving the navigation itself, so a portal
            // that somehow serves the login prompt again cannot ping-pong.
            if (sessionStorage.getItem(SESSION_REDIRECT_FLAG)) return;
            sessionStorage.setItem(SESSION_REDIRECT_FLAG, String(Date.now()));
        } catch (e) { /* private mode / blocked storage — the flag above still holds within this document */ }
        // replace(), not href: the dead page must not sit in history where
        // the back button would bounce the student into it again. No
        // ?next=-style param — this legacy portal ignores query hints, so it
        // would be pure noise.
        location.replace('/index.php');
    }

    function cloak() {
        if (document.getElementById(CLOAK_ID)) return;
        const s = document.createElement('style');
        s.id = CLOAK_ID;
        s.textContent = 'html.ulab-cloak { visibility: hidden !important; }';
        (document.head || document.documentElement).appendChild(s);
        document.documentElement.classList.add('ulab-cloak');
        setTimeout(uncloak, 1500);
    }
    function uncloak() {
        document.documentElement.classList.remove('ulab-cloak');
    }

    function injectShellStyles() {
        if (document.getElementById(SHELL_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = SHELL_STYLE_ID;
        style.textContent = `
            :root {
                --ulab-sidebar-w: 240px;
                --ulab-sidebar-w-collapsed: 64px;
                /* ULAB Logo Palette: #0069B4 (ULAB Royal Blue), #0B2545 (Deep Navy), #F58220 (ULAB Gold Accent), #FFFFFF (White) */
                --ulab-rail-bg: #0B2545;
                --ulab-rail-bg-alt: #103058;
                --ulab-rail-border: rgba(255, 255, 255, 0.12);
                --ulab-rail-fg: #FFFFFF;
                --ulab-rail-fg-muted: #CBD5E1;
                --ulab-rail-active-bg: #0069B4;
                --ulab-rail-accent: #F58220;
                --ulab-rail-accent-alt: #FF9933;
                --ulab-rail-danger: #FB7185;
            }

            html.ulab-cloak, body.ulab-shell-mounted { overflow-x: hidden; }

            /* Push page content by the sidebar's width. table.main keeps its
               own align="center" attribute, BUT that alone is not enough:
               table.main has no explicit width of its own, so its rendered
               width shrinks to fit its widest row's content — the header
               row's <img width="800"> (see reference-html/*.html) — which
               pins it to ~800px and then centers THAT narrow box within the
               remaining space, leaving big empty gutters on both sides
               rather than filling the space beside the sidebar. Force
               table.main (and its header image) to the full remaining
               width explicitly instead of relying on the legacy markup's
               own (fixed, pixel) sizing. */
            body.ulab-shell-mounted {
                margin-left: var(--ulab-sidebar-w) !important;
                transition: margin-left .22s cubic-bezier(0.4, 0, 0.2, 1);
            }
            body.ulab-shell-mounted.ulab-sidebar-collapsed {
                margin-left: var(--ulab-sidebar-w-collapsed) !important;
            }
            body.ulab-shell-mounted table.main {
                width: 100% !important;
                max-width: 100% !important;
                border-collapse: collapse !important;
                border: 0 !important;
                background: var(--bento-bg, #FFFFFF) !important;
            }
            body.ulab-shell-mounted table.main > tbody > tr:first-child,
            body.ulab-shell-mounted table.main > tr:first-child,
            body.ulab-shell-mounted table.main > tbody > tr:last-child,
            body.ulab-shell-mounted table.main > tr:last-child {
                display: none !important;
            }
            body.ulab-shell-mounted table.main > tbody > tr > td > img,
            body.ulab-shell-mounted table.main > tr > td > img {
                width: 100% !important;
                height: auto !important;
                max-width: none !important;
            }
            body.ulab-shell-mounted td.content {
                width: 100% !important;
                box-sizing: border-box;
                padding: 0 28px 48px !important;
                vertical-align: top;
                border: 0 !important;
                background: var(--bento-bg, #FFFFFF) !important;
            }
            body.ulab-shell-mounted,
            body.ulab-shell-mounted #ulab-app-footer { background: var(--bento-bg, #FFFFFF) !important; }
            body.ulab-shell-mounted .bento-root {
                width: 100%; max-width: none; margin: 0; min-height: 100%;
                background: var(--bento-bg, #FFFFFF);
            }

            #ulab-app-header {
                position: sticky; top: 0; z-index: 100010;
                display: flex; align-items: center; justify-content: space-between;
                height: 64px; min-height: 64px; padding: 0 24px; box-sizing: border-box;
                background: rgba(255, 255, 255, .96); border-bottom: 1px solid var(--bento-border, #E6D8C7);
                box-shadow: 0 4px 18px rgba(11,25,87,.06); backdrop-filter: blur(12px);
                font-family: var(--bento-font-ui, -apple-system, "Segoe UI", sans-serif);
                transition: background-color .2s ease, border-color .2s ease;
            }
            #ulab-app-header .ulab-app-header-left {
                display: flex; align-items: center; gap: 14px;
            }
            #ulab-app-header .ulab-app-brand { display:flex; align-items:center; gap:12px; color:var(--bento-fg,#0B1957); text-decoration:none; }
            #ulab-app-header .ulab-app-logo-img {
                width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
                background: #fff; padding: 4px; object-fit: contain; box-sizing: border-box;
                box-shadow: 0 2px 8px rgba(11,25,87,.12); border: 1px solid var(--bento-border, #E6D8C7);
                transition: transform .2s ease;
            }
            #ulab-app-header .ulab-app-brand:hover .ulab-app-logo-img { transform: scale(1.05); }
            #ulab-app-header .ulab-app-brand strong { display:block; font-size:14px; letter-spacing:.01em; }
            #ulab-app-header .ulab-app-brand small { display:block; margin-top:2px; color:var(--bento-fg-muted,#35478C); font-size:11px; }
            #ulab-app-header .ulab-app-context { color:var(--bento-fg-muted,#35478C); font-size:11.5px; text-align:right; }
            #ulab-app-header .ulab-app-user { display:flex; align-items:center; gap:9px; }
            #ulab-app-header .ulab-app-avatar { width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid var(--bento-primary,#0B1957); background:var(--bento-card-alt,#F4F6FB); }
            #ulab-app-footer {
                display:flex; justify-content:space-between; gap:16px; align-items:center;
                padding:18px 28px; color:var(--bento-fg-muted,#35478C); background:var(--bento-card,#fff);
                border-top:1px solid var(--bento-border, #E6D8C7);
                font: 11px var(--bento-font-ui, -apple-system, "Segoe UI", sans-serif);
            }
            #ulab-app-footer strong { color:var(--bento-fg,#0B1957); }
            body.ulab-dark #ulab-app-header { background:#0B1957; border-bottom-color:#263E9B; box-shadow:0 4px 18px rgba(0,0,0,.24); }
            body.ulab-dark #ulab-app-header .ulab-app-brand,
            body.ulab-dark #ulab-app-header .ulab-app-context { color:#FFFFFF; }
            body.ulab-dark #ulab-app-header .ulab-app-brand small { color:#D2E5FA; }
            body.ulab-dark #ulab-app-footer { background:#070E2E; border-top-color:#263E9B; color:#D2E5FA; }
            body.ulab-dark #ulab-app-footer strong { color:#FFFFFF; }

            /* Sidebar top hamburger toggle button */
            #${TOPBAR_TOGGLE_ID} {
                display: inline-flex; align-items: center; justify-content: center;
                width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
                background: var(--ulab-rail-bg-alt, #132778); color: var(--ulab-rail-fg, #F8F3EA);
                border: 1px solid var(--ulab-rail-border);
                cursor: pointer; outline: none; appearance: none; -webkit-appearance: none;
                transition: background .18s ease, color .18s ease, border-color .18s ease, transform .15s ease, box-shadow .18s ease;
            }
            #${TOPBAR_TOGGLE_ID}:hover {
                background: var(--ulab-rail-active-bg, #1B328F);
                color: var(--ulab-rail-accent, #9ECCFA);
                border-color: var(--ulab-rail-accent, #9ECCFA);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(158,204,250,.25);
            }
            #${TOPBAR_TOGGLE_ID}:active { transform: translateY(0); }

            /* The stock #menubar row is replaced by the sidebar's own nav —
               hide it (never remove: links inside stay usable to any script
               that still reads them, e.g. scrapeStudentInfo runs on the same
               td.content regardless). */
            body.ulab-shell-mounted td.top_menu { display: none !important; }
            body.ulab-shell-mounted tr:has(> td.top_menu) { display: none !important; }

            /* z-index sits below nothing important on this legacy site (no
               Bootstrap modal stack to respect here), but keep a sane value
               regardless in case a future page adds its own overlay. */
            #${SIDEBAR_ID} {
                display: none;
                position: fixed; top: 0; left: 0; bottom: 0;
                width: var(--ulab-sidebar-w);
                background: var(--ulab-rail-bg);
                color: var(--ulab-rail-fg-muted);
                z-index: 100030;
                flex-direction: column;
                overflow-y: auto; overflow-x: hidden;
                transition: width .22s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: var(--bento-font-ui, -apple-system, "Segoe UI", sans-serif);
                border-right: 1px solid var(--ulab-rail-border);
            }
            body.ulab-shell-mounted #${SIDEBAR_ID} { display: flex; }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} { width: var(--ulab-sidebar-w-collapsed); }

            #${SIDEBAR_ID} .ulab-sb-text,
            #${SIDEBAR_ID} .ulab-sb-brand span,
            #${SIDEBAR_ID} .ulab-sb-group-label,
            #${SIDEBAR_ID} .ulab-sb-user span {
                opacity: 1; max-width: 160px;
                transition: opacity .14s ease, max-width .22s cubic-bezier(0.4, 0, 0.2, 1);
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-text,
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-brand span,
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-group-label,
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-user span {
                opacity: 0; max-width: 0; margin: 0; pointer-events: none;
                transition: opacity .08s ease, max-width .22s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #${SIDEBAR_ID} .ulab-sb-link, #${SIDEBAR_ID} .ulab-sb-row, #${SIDEBAR_ID} .ulab-sb-logout,
            #${SIDEBAR_ID} .ulab-sb-brand, #${SIDEBAR_ID} .ulab-sb-user {
                transition: background .12s ease, color .12s ease, gap .22s cubic-bezier(0.4, 0, 0.2, 1), padding .22s cubic-bezier(0.4, 0, 0.2, 1), width .22s cubic-bezier(0.4, 0, 0.2, 1), margin .22s cubic-bezier(0.4, 0, 0.2, 1);
            }

            #${SIDEBAR_ID} .ulab-sb-brand {
                display: flex; align-items: center; gap: 12px;
                height: 64px; min-height: 64px; padding: 0 16px; flex-shrink: 0; box-sizing: border-box;
                border-bottom: 1px solid var(--ulab-rail-border);
            }
            #${SIDEBAR_ID} .ulab-sb-brand span { font-weight: 700; font-size: .94rem; color: #fff; white-space: nowrap; overflow: hidden; display: inline-block; }
            #${SIDEBAR_ID} .ulab-sb-logo-img {
                width: 36px; height: 36px; border-radius: 10px; background: #fff; padding: 3px; object-fit: contain; flex-shrink: 0;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); transition: transform .2s ease;
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-brand {
                justify-content: center; padding: 0; width: var(--ulab-sidebar-w-collapsed);
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-brand .ulab-sb-logo-img {
                width: 38px; height: 38px; margin: 0 auto;
            }

            #${SIDEBAR_ID} .ulab-sb-group-label {
                padding: 14px 16px 4px; font-size: .68rem; font-weight: 700;
                text-transform: uppercase; letter-spacing: .06em; color: var(--ulab-rail-fg-muted);
                white-space: nowrap; overflow: hidden; display: block;
            }
            #${SIDEBAR_ID} .ulab-sb-group-header {
                display: flex; align-items: center; justify-content: space-between;
                cursor: pointer; user-select: none;
                border-radius: 6px; margin: 0 8px;
            }
            #${SIDEBAR_ID} .ulab-sb-group-header:hover { background: rgba(255,255,255,.05); }
            #${SIDEBAR_ID} .ulab-sb-group-header .ulab-sb-group-label { padding-left: 8px; margin: 0; }
            #${SIDEBAR_ID} .ulab-sb-group-chevron {
                flex-shrink: 0; opacity: .55; transition: transform .15s ease;
                margin-right: 8px;
            }
            #${SIDEBAR_ID} .ulab-sb-group-header.collapsed .ulab-sb-group-chevron { transform: rotate(-90deg); }
            #${SIDEBAR_ID} .ulab-sb-group-items { overflow: hidden; }
            #${SIDEBAR_ID} .ulab-sb-group-items.collapsed { display: none; }

            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-group-header {
                height: 1px; margin: 12px 14px; padding: 0;
                background: var(--ulab-rail-border); pointer-events: none; border: none; overflow: hidden;
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-group-header .ulab-sb-group-label,
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-group-chevron { display: none !important; }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-group-items.collapsed { display: block; }

            #${SIDEBAR_ID} nav { flex: 1; padding: 6px 0 8px; }
            #${SIDEBAR_ID} .ulab-sb-link {
                display: flex; align-items: center; gap: 12px;
                width: calc(100% - 16px); height: 40px;
                padding: 0 12px; margin: 3px 8px; border-radius: 10px; box-sizing: border-box;
                color: var(--ulab-rail-fg-muted); text-decoration: none !important; font-size: .85rem; font-weight: 500;
                white-space: nowrap; overflow: hidden;
                background: none; border: none; font-family: inherit; text-align: left; cursor: pointer;
            }
            #${SIDEBAR_ID} .ulab-sb-link svg { flex-shrink: 0; opacity: .88; }
            #${SIDEBAR_ID} .ulab-sb-link:hover { background: rgba(45,212,191,.12); color: #fff; }
            #${SIDEBAR_ID} .ulab-sb-link.active {
                background: var(--ulab-rail-active-bg); color: #fff;
                box-shadow: inset 3px 0 0 var(--ulab-rail-accent);
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-link {
                width: 44px; height: 40px; padding: 0; margin: 3px auto;
                justify-content: center; border-radius: 10px; gap: 0;
            }

            #${SIDEBAR_ID} .ulab-sb-footer {
                border-top: 1px solid var(--ulab-rail-border);
                padding: 10px 8px; flex-shrink: 0;
            }
            #${SIDEBAR_ID} .ulab-sb-user {
                display: flex; align-items: center; gap: 10px;
                padding: 8px 10px; font-size: .78rem; color: #9aa7c4;
                white-space: nowrap; overflow: hidden; border-radius: 8px;
            }
            #${SIDEBAR_ID} .ulab-sb-user span { white-space: nowrap; overflow: hidden; display: inline-block; }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-user {
                justify-content: center; width: 44px; height: 38px; margin: 0 auto; padding: 0; gap: 0;
            }
            #${SIDEBAR_ID} .ulab-sb-row {
                display: flex; align-items: center; justify-content: space-between;
                padding: 8px 10px; border-radius: 8px; cursor: pointer;
                font-size: .8rem; color: var(--ulab-rail-fg-muted);
                transition: background .12s ease, padding .18s ease;
            }
            #${SIDEBAR_ID} .ulab-sb-row:hover { background: rgba(255,255,255,.06); color: #fff; }
            #${SIDEBAR_ID} .ulab-sb-row .ulab-sb-row-label { display: flex; align-items: center; gap: 10px; white-space: nowrap; overflow: hidden; transition: gap .18s ease; }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-row .ulab-sb-row-label { gap: 0; }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-row {
                justify-content: center; width: 44px; height: 36px; margin: 2px auto; padding: 0; border-radius: 8px;
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-row .ulab-switch-sm,
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-row .ulab-fontctl {
                display: none !important;
            }
            body.ulab-sidebar-collapsed #${SIDEBAR_ID} .ulab-sb-logout {
                justify-content: center; width: 44px; height: 36px; margin: 2px auto; padding: 0; gap: 0; border-radius: 8px;
            }
            #${SIDEBAR_ID} .ulab-switch-sm {
                position: relative; width: 30px; height: 17px; border-radius: 999px; background: #3f3f46;
                flex-shrink: 0; transition: background .15s ease;
            }
            #${SIDEBAR_ID} .ulab-switch-sm::after {
                content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px;
                border-radius: 50%; background: #fff; transition: transform .15s ease;
            }
            #${SIDEBAR_ID} .ulab-switch-sm.on { background: var(--ulab-rail-accent-alt); }
            #${SIDEBAR_ID} .ulab-switch-sm.on::after { transform: translateX(13px); }

            #${SIDEBAR_ID} .ulab-fontctl { display: flex; align-items: center; gap: 4px; }
            #${SIDEBAR_ID} .ulab-fontctl-btn {
                display: flex; align-items: center; justify-content: center;
                width: 20px; height: 20px; border-radius: 5px;
                background: var(--ulab-rail-bg-alt); color: var(--ulab-rail-fg-muted); border: none;
                font: 700 12px/1 system-ui, sans-serif; cursor: pointer;
                flex-shrink: 0; transition: background .12s ease, color .12s ease;
            }
            #${SIDEBAR_ID} .ulab-fontctl-btn:hover { background: var(--ulab-rail-active-bg); color: #fff; }
            #${SIDEBAR_ID} .ulab-fontctl-btn:disabled { opacity: .35; cursor: not-allowed; }
            #${SIDEBAR_ID} .ulab-fontctl-val {
                min-width: 32px; text-align: center; font-size: .72rem;
                color: var(--ulab-rail-fg-muted); font-variant-numeric: tabular-nums;
            }

            #${SIDEBAR_ID} .ulab-sb-logout {
                display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
                background: none; border: none; color: var(--ulab-rail-danger); font-size: .8rem; font-weight: 500;
                padding: 8px 10px; border-radius: 8px; cursor: pointer; text-decoration: none !important;
                box-sizing: border-box;
            }
            #${SIDEBAR_ID} .ulab-sb-logout:hover { background: rgba(255,255,255,.06); }

            /* Always-visible floating "Modern UI" toggle — the sidebar (and
               its own switch) disappears entirely when modern UI is off, so
               this is the only way back on. */
            #${FLOATING_TOGGLE_ID} {
                position: fixed; right: 16px; bottom: 16px; z-index: 100020;
                display: flex; align-items: center; gap: 8px;
                background: var(--bento-card, #fff); border: 1px solid var(--bento-border-soft, #e4e4e7); border-radius: 999px;
                padding: 6px 14px 6px 10px;
                font: 600 11.5px/1 var(--bento-font-ui, sans-serif);
                color: var(--bento-fg-muted, #52525b);
                box-shadow: var(--bento-shadow-md, 0 1px 3px rgba(0,0,0,.1));
                opacity: .6; transition: opacity .2s ease, box-shadow .2s ease;
                cursor: pointer; user-select: none;
            }
            #${FLOATING_TOGGLE_ID}:hover { opacity: 1; box-shadow: var(--bento-shadow-hover, 0 4px 10px rgba(0,0,0,.15)); }
            #${FLOATING_TOGGLE_ID} .ulab-switch-sm {
                position: relative; width: 30px; height: 17px; border-radius: 999px; background: #d4d4d8;
                transition: background .15s ease; flex-shrink: 0;
            }
            #${FLOATING_TOGGLE_ID} .ulab-switch-sm::after {
                content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px;
                border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3);
                transition: transform .15s ease;
            }
            #${FLOATING_TOGGLE_ID} .ulab-switch-sm.on { background: var(--bento-primary, #0D9488); }
            #${FLOATING_TOGGLE_ID} .ulab-switch-sm.on::after { transform: translateX(13px); }

            #${SIDEBAR_BACKDROP_ID} {
                display: none;
                position: fixed; inset: 0; z-index: 100029;
                background: rgba(11, 27, 25, .5);
                opacity: 0; transition: opacity .18s ease;
            }
            body.ulab-sidebar-open #${SIDEBAR_BACKDROP_ID} { display: block; opacity: 1; }

            @media ${MOBILE_QUERY} {
                body.ulab-shell-mounted,
                body.ulab-shell-mounted.ulab-sidebar-collapsed {
                    margin-left: 0 !important;
                }
                body:not(.ulab-sidebar-collapsed) #${TOPBAR_TOGGLE_ID},
                body.ulab-sidebar-collapsed #${TOPBAR_TOGGLE_ID} { left: 12px; }

                #${SIDEBAR_ID},
                body.ulab-sidebar-collapsed #${SIDEBAR_ID} {
                    width: min(82vw, 280px);
                    transform: translateX(-100%);
                    box-shadow: 2px 0 18px rgba(0,0,0,.35);
                    transition: transform .2s ease;
                }
                body.ulab-sidebar-open #${SIDEBAR_ID} { transform: translateX(0); }

                #${SIDEBAR_ID} .ulab-sb-brand span,
                #${SIDEBAR_ID} .ulab-sb-group-label,
                #${SIDEBAR_ID} .ulab-sb-link span.ulab-sb-text,
                #${SIDEBAR_ID} .ulab-sb-user span,
                #${SIDEBAR_ID} .ulab-sb-logout span.ulab-sb-text,
                #${SIDEBAR_ID} .ulab-sb-row .ulab-switch-sm,
                #${SIDEBAR_ID} .ulab-sb-row-label span.ulab-sb-text { display: revert; }
                #${SIDEBAR_ID} .ulab-sb-brand { justify-content: flex-start; padding-left: 16px; padding-right: 16px; }
                #${SIDEBAR_ID} .ulab-sb-user,
                #${SIDEBAR_ID} .ulab-sb-row,
                #${SIDEBAR_ID} .ulab-sb-logout {
                    justify-content: flex-start; padding-left: 8px; padding-right: 8px; gap: 10px;
                }
                #${SIDEBAR_ID} .ulab-sb-link {
                    justify-content: flex-start; padding-left: 16px; padding-right: 16px; margin-left: 8px; margin-right: 8px; gap: 12px;
                }

                #${FLOATING_TOGGLE_ID} { right: 10px; bottom: 10px; padding: 5px 12px 5px 8px; }
                body.ulab-shell-mounted td.content { padding-left: 14px !important; padding-right: 14px !important; }
                #ulab-app-header { padding: 10px 14px 10px 58px; }
                #ulab-app-header .ulab-app-context { display:none; }
                #ulab-app-footer { padding:16px 14px; flex-wrap:wrap; }
            }

            /* Dark mode (body.ulab-dark, toggled from the sidebar footer) —
               the PAGE's own table/content styling picks this up via
               bento-ui.css's dark tokens + each page file's own rules; the
               sidebar rail itself stays the fixed --ulab-rail-* colors
               above regardless. */
            body.ulab-dark { background: var(--bento-bg, #0B1B19) !important; color: var(--bento-fg, #E6FFFA) !important; }

            /* Full legacy-content takeover (see file header comment + the
               "revamp the whole UI" pass): every authenticated page's
               td.content holds its ENTIRE legacy render (header text,
               banners, tick images, tables, links) as a flat run of direct
               children with no wrapper of its own. wrapLegacyContent()
               below moves that whole run into one <div class="${LEGACY_WRAP_CLASS}">
               so it can be hidden/shown as a single unit with a class
               toggle — non-destructively (nothing is removed from the DOM,
               so turning Modern UI off is an instant, reload-free revert)
               and independently of whatever each page's own *-ui-content.js
               renders alongside it (that new markup is appended as a SIBLING
               of this wrapper inside the same td.content, so hiding the
               wrapper visually replaces the legacy render with the new one). */
            body.ulab-shell-mounted .${LEGACY_WRAP_CLASS} { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    // Moves every existing child node of td.content (text nodes, <br>,
    // <font>, <p>, <table>, images — whatever the legacy PHP emitted) into
    // one wrapper <div>, once, so the whole legacy render can be hidden as a
    // single unit via the LEGACY_WRAP_CLASS CSS rule above. Idempotent and
    // safe to call from every page's mount() — running it twice (e.g. shell
    // loaded more than once, or a page calling it defensively) is a no-op
    // once the wrapper already exists. Returns the content cell so callers
    // can append their own bento view as its sibling.
    function wrapLegacyContent() {
        const contentCell = document.querySelector('td.content');
        if (!contentCell) return null;
        if (contentCell.querySelector(':scope > .' + LEGACY_WRAP_CLASS)) return contentCell;
        const wrap = document.createElement('div');
        wrap.className = LEGACY_WRAP_CLASS;
        while (contentCell.firstChild) {
            wrap.appendChild(contentCell.firstChild);
        }
        contentCell.appendChild(wrap);
        return contentCell;
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // Shared COMPACT header block — the "Pingala"-style identity panel every
    // reskinned page now opens with. It replaces the "Semester / Student /
    // Adviser / Email" plain-text block the legacy pages carried, plus
    // whatever extra parity content (status banners, quick stats, links)
    // that page's own scrape found — so nothing the legacy render conveyed
    // is lost once wrapLegacyContent() hides the original.
    //
    // This used to render a padded bento card with large 24px stat tiles.
    // Preregistration's compact rebuild deliberately bypassed it with a
    // local variant; that variant has now been folded back IN HERE, and all
    // of its markup comes from features/common/bento-ui.css's shared
    // compact component layer (.bento-titlebar / .bento-panel /
    // .bento-infogrid / .bento-pillstrip / .bento-statstrip /
    // .bento-meterwrap / .bento-notice), so all callers share one language.
    //
    // Every option is optional and every previously-supported option keeps
    // its exact shape, so existing callers need no changes:
    //   info          — the object mount()'s onMount callback already receives
    //   opts.title    — page title for the coloured bar (omit → no bar)
    //   opts.subtitle — right-hand text in that bar (defaults to the semester)
    //   opts.rows     — [[label, value], ...] extra Label:Value info rows
    //   opts.banners  — [{ text, tone }] tone: 'info'|'success'|'warning'|'danger'
    //                   rendered as compact notice strips below the panel
    //   opts.pills    — [{ text, tone }] short status pills inside the panel
    //   opts.stats    — [{ label, value, sub?, cls? }] compact stat strip
    //   opts.links    — [{ label, href }] portal links as compact actions
    //   opts.meter    — { label, value, max, note? } horizontal load meter
    //   opts.topHtml  — page-specific markup placed at the TOP of the panel
    //   opts.extraHtml— page-specific markup appended inside the panel
    const HC_PILL_TONE = { info: 'pill-primary', success: 'pill-success', warning: 'pill-warning', danger: 'pill-destructive', accent: 'pill-accent' };
    const HC_NOTICE_TONE = { info: 'info', success: 'success', warning: 'warn', danger: 'danger' };
    const HC_ICON_INFO = '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>';
    const HC_ICON_WARN = '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>';
    function hcIcon(path) {
        return `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }

    function renderHeaderCard(info, opts) {
        opts = opts || {};
        info = info || {};
        const banners = (opts.banners || []).filter(b => b && b.text);
        const pills = (opts.pills || []).filter(p => p && p.text);
        const stats = opts.stats || [];
        const links = opts.links || [];

        // Base identity rows, in the same order the legacy header sentence
        // read them, then any page-specific rows appended after.
        const rows = [];
        const semesterText = info.semesterLabel
            ? `${info.semesterLabel}${info.semesterCode ? ` (${info.semesterCode})` : ''}`
            : info.semesterCode;
        if (semesterText) rows.push(['Semester', semesterText]);
        if (info.studentName) rows.push(['Student', info.studentName]);
        if (info.studentId) rows.push(['Student ID', info.studentId]);
        if (info.adviserName) rows.push(['Adviser', info.adviserName]);
        if (info.adviserEmail) rows.push(['Adviser Email', info.adviserEmail]);
        (opts.rows || []).forEach((row) => {
            if (row && row[0] != null && row[1] != null && row[1] !== '') rows.push([row[0], row[1]]);
        });

        const barHtml = opts.title
            ? `<div class="bento-titlebar"><span>${esc(opts.title)}</span><span class="bento-titlebar-sub">${esc(opts.subtitle != null ? opts.subtitle : (info.semesterLabel || info.semesterCode || ''))}</span></div>`
            : '';

        const infoHtml = rows.length
            ? `<dl class="bento-infogrid">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
            : '';

        const pillsHtml = pills.length
            ? `<div class="bento-pillstrip">${pills.map(p => `<span class="pill ${HC_PILL_TONE[p.tone] || 'pill-muted'}">${esc(p.text)}</span>`).join('')}</div>`
            : '';

        const statsHtml = stats.length
            ? `<div class="bento-statstrip">${stats.map(s => `
                <div class="bento-stat ${esc(s.cls || '')}">
                    <span class="bento-stat-label">${esc(s.label)}</span>
                    <span class="bento-stat-value">${esc(s.value)}</span>
                    ${s.sub ? `<span class="bento-stat-sub">${esc(s.sub)}</span>` : ''}
                </div>`).join('')}</div>`
            : '';

        let meterHtml = '';
        const meter = opts.meter;
        if (meter && meter.value != null && meter.max != null && meter.max > 0) {
            const pct = Math.max(0, Math.min(100, (meter.value / meter.max) * 100));
            const over = meter.value > meter.max;
            const at = !over && meter.value >= meter.max;
            meterHtml = `
                <div class="bento-meterwrap">
                    <div class="bento-meter-head"><span>${esc(meter.label || 'Load')}</span><span><b>${esc(meter.value)}</b> / ${esc(meter.max)}${over ? ' — over limit' : at ? ' — at limit' : ''}</span></div>
                    <div class="bento-meter ${over ? 'over' : at ? 'at' : ''}"><i style="width:${over ? 100 : pct.toFixed(1)}%"></i></div>
                    ${meter.note ? `<p class="bento-meter-note">${esc(meter.note)}</p>` : ''}
                </div>`;
        }

        const linksHtml = links.length
            ? `<div class="bento-actions" style="padding:7px 10px;margin:0;">${links.map(l => `<a class="bento-action" href="${esc(l.href)}">${esc(l.label)}</a>`).join('')}</div>`
            : '';

        const bannerHtml = banners.map(b => `
            <div class="bento-notice ${HC_NOTICE_TONE[b.tone] || 'info'}">${hcIcon(b.tone === 'warning' || b.tone === 'danger' ? HC_ICON_WARN : HC_ICON_INFO)}<div>${esc(b.text)}</div></div>`).join('');

        // topHtml sits above the info grid (Profile's photo/name hero);
        // extraHtml sits below the meter (page-specific additions).
        const panelBody = (opts.topHtml || '') + infoHtml + pillsHtml + statsHtml + meterHtml + (opts.extraHtml || '') + linksHtml;
        const panelHtml = panelBody
            ? `<div class="bento-panel${barHtml ? '' : ' standalone'}">${panelBody}</div>`
            : '';

        return `${barHtml}${panelHtml}${bannerHtml}`;
    }

    function isActiveHref(href) {
        const normalize = (p) => {
            p = (p || '').replace(/\/$/, '');
            if (p === '' || p === '/index.php') return '/';
            return p;
        };
        return normalize(location.pathname) === normalize(href);
    }

    function buildSidebar(navGroupsState, info) {
        if (document.getElementById(SIDEBAR_ID)) return document.getElementById(SIDEBAR_ID);
        navGroupsState = navGroupsState || {};

        const sidebar = document.createElement('nav');
        sidebar.id = SIDEBAR_ID;

        const brand = document.createElement('div');
        brand.className = 'ulab-sb-brand';
        brand.innerHTML = `<button type="button" id="${TOPBAR_TOGGLE_ID}" aria-label="Toggle sidebar" title="Toggle sidebar (Ctrl+B)">${svg('menu', 18)}</button><span>Student Companion</span>`;
        sidebar.appendChild(brand);

        const simpleMode = isSimpleMode();
        const allowedSimpleTools = ['open-tool:capstone', 'open-tool:catalogue', 'open-tool:marks'];

        const navWrap = document.createElement('div');
        NAV_GROUPS.forEach((group) => {
            let itemsToRender = group.items;
            if (group.label === 'My Tools' && simpleMode) {
                itemsToRender = group.items.filter(item => allowedSimpleTools.includes(item.action));
            }
            if (!itemsToRender.length) return;
            const itemsWrap = document.createElement('div');
            itemsWrap.className = 'ulab-sb-group-items';

            if (group.label) {
                const groupKey = group.label;
                const header = document.createElement('div');
                header.className = 'ulab-sb-group-header';
                header.dataset.groupKey = groupKey;
                const chevron = document.createElement('span');
                chevron.className = 'ulab-sb-group-chevron';
                chevron.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
                header.innerHTML = `<span class="ulab-sb-group-label">${group.label}</span>`;
                header.appendChild(chevron);
                if (navGroupsState[groupKey]) {
                    header.classList.add('collapsed');
                    itemsWrap.classList.add('collapsed');
                }
                header.addEventListener('click', () => toggleGroup(groupKey, header, itemsWrap));
                navWrap.appendChild(header);
            }

            itemsToRender.forEach((item) => {
                const el = document.createElement(item.href ? 'a' : 'button');
                el.className = 'ulab-sb-link';
                el.setAttribute('title', item.label);
                if (item.href) {
                    if (isActiveHref(item.href)) el.classList.add('active');
                    el.href = item.href;
                } else {
                    el.type = 'button';
                }
                el.innerHTML = `${svg(item.icon)}<span class="ulab-sb-text">${item.label}</span>`;
                if (item.action) el.addEventListener('click', () => handleNavAction(item.action));
                itemsWrap.appendChild(el);
            });

            navWrap.appendChild(itemsWrap);
        });
        sidebar.appendChild(navWrap);

        const footer = document.createElement('div');
        footer.className = 'ulab-sb-footer';

        const userLabel = (info && (info.studentName || info.studentId))
            ? `${info.studentName || 'Signed in'}${info.studentId ? ` (${info.studentId})` : ''}`
            : 'Signed in';
        const userRow = document.createElement('div');
        userRow.className = 'ulab-sb-user';
        userRow.setAttribute('title', userLabel);
        userRow.innerHTML = `${svg('people', 14)}<span>${userLabel}</span>`;
        footer.appendChild(userRow);

        const modeRow = document.createElement('div');
        modeRow.className = 'ulab-sb-row';
        modeRow.id = 'ulab-mode-row';
        modeRow.setAttribute('title', 'Toggle Simple / Advanced UI Mode');
        modeRow.innerHTML = `<span class="ulab-sb-row-label">${svg('swap', 14)}<span class="ulab-sb-text">${isSimpleMode() ? 'Simple Mode' : 'Advanced Mode'}</span></span><span class="ulab-switch-sm ${isSimpleMode() ? 'on' : ''}"></span>`;
        footer.appendChild(modeRow);

        modeRow.addEventListener('click', () => {
            const nextMode = isSimpleMode() ? 'advanced' : 'simple';
            currentUiMode = nextMode;
            chrome.storage.local.set({ [KEYS.mode]: nextMode }, () => {
                location.reload();
            });
        });

        const themeRow = document.createElement('div');
        themeRow.className = 'ulab-sb-row';
        themeRow.id = 'ulab-theme-row';
        themeRow.setAttribute('title', 'Toggle Dark mode');
        themeRow.innerHTML = `<span class="ulab-sb-row-label">${svg('moon', 14)}<span class="ulab-sb-text">Dark mode</span></span><span class="ulab-switch-sm"></span>`;
        footer.appendChild(themeRow);

        const modernRow = document.createElement('div');
        modernRow.className = 'ulab-sb-row';
        modernRow.id = 'ulab-modern-row';
        modernRow.setAttribute('title', 'Toggle Modern UI');
        modernRow.innerHTML = `<span class="ulab-sb-row-label">${svg('grid', 14)}<span class="ulab-sb-text">Modern UI</span></span><span class="ulab-switch-sm"></span>`;
        footer.appendChild(modernRow);

        const fontRow = document.createElement('div');
        fontRow.className = 'ulab-sb-row';
        fontRow.id = 'ulab-font-row';
        fontRow.setAttribute('title', 'Text size');
        fontRow.innerHTML = `<span class="ulab-sb-row-label">${svg('type-size', 14)}<span class="ulab-sb-text">Text size</span></span>
            <span class="ulab-fontctl">
                <button type="button" class="ulab-fontctl-btn" id="ulab-font-dec" aria-label="Decrease text size">−</button>
                <span class="ulab-fontctl-val" id="ulab-font-val">100%</span>
                <button type="button" class="ulab-fontctl-btn" id="ulab-font-inc" aria-label="Increase text size">+</button>
            </span>`;
        footer.appendChild(fontRow);

        const logoutLink = document.createElement('a');
        logoutLink.className = 'ulab-sb-logout';
        logoutLink.href = LOGOUT_HREF;
        logoutLink.setAttribute('title', 'Logout');
        logoutLink.innerHTML = `${svg('logout', 14)}<span class="ulab-sb-text">Logout</span>`;
        footer.appendChild(logoutLink);

        sidebar.appendChild(footer);
        document.body.appendChild(sidebar);
        buildSidebarBackdrop();
        return sidebar;
    }

    function buildSidebarBackdrop() {
        if (document.getElementById(SIDEBAR_BACKDROP_ID)) return;
        const backdrop = document.createElement('div');
        backdrop.id = SIDEBAR_BACKDROP_ID;
        backdrop.addEventListener('click', closeMobileDrawer);
        document.body.appendChild(backdrop);
    }

    function closeMobileDrawer() {
        document.body.classList.remove('ulab-sidebar-open');
    }

    function buildFloatingToggle(isOn, pageBodyClass, onModernChange, info) {
        if (document.getElementById(FLOATING_TOGGLE_ID)) return;
        const toggle = document.createElement('div');
        toggle.id = FLOATING_TOGGLE_ID;
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('title', 'Toggle modern UI');
        toggle.innerHTML = `<span class="ulab-switch-sm${isOn ? ' on' : ''}"></span><span>Modern UI</span>`;
        toggle.addEventListener('click', () => {
            const next = !document.body.classList.contains(pageBodyClass);
            if (next) { buildSidebar(undefined, info); buildHamburger(); }
            setModern(next, pageBodyClass, onModernChange);
            toggle.querySelector('.ulab-switch-sm').classList.toggle('on', next);
            chrome.storage.local.set({ [KEYS.modern]: next });
        });
        document.body.appendChild(toggle);
    }

    function buildHamburger() {
        let btn = document.getElementById(TOPBAR_TOGGLE_ID);
        if (!btn) {
            const brand = document.querySelector('#ulab-sidebar .ulab-sb-brand');
            if (brand) {
                btn = document.createElement('button');
                btn.id = TOPBAR_TOGGLE_ID;
                btn.type = 'button';
                btn.setAttribute('aria-label', 'Toggle sidebar');
                btn.setAttribute('title', 'Toggle sidebar (Ctrl+B)');
                btn.innerHTML = svg('menu', 18);
                brand.insertBefore(btn, brand.firstChild);
            }
        }
        if (btn && !btn._ulabWired) {
            btn._ulabWired = true;
            btn.addEventListener('click', () => {
                if (window.matchMedia(MOBILE_QUERY).matches) {
                    document.body.classList.toggle('ulab-sidebar-open');
                    return;
                }
                const collapsed = !document.body.classList.contains('ulab-sidebar-collapsed');
                document.body.classList.toggle('ulab-sidebar-collapsed', collapsed);
                chrome.storage.local.set({ [KEYS.collapsed]: collapsed });
            });
        }

        if (!window._ulabKeyShortcutBound) {
            window._ulabKeyShortcutBound = true;
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                    const tag = document.activeElement ? document.activeElement.tagName : '';
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) return;
                    e.preventDefault();
                    const toggleBtn = document.getElementById(TOPBAR_TOGGLE_ID);
                    if (toggleBtn) toggleBtn.click();
                }
            });
        }

        window.matchMedia(MOBILE_QUERY).addEventListener('change', (e) => {
            if (!e.matches) closeMobileDrawer();
        });
    }

    function setTheme(isDark) {
        document.body.classList.toggle('ulab-dark', isDark);
        const row = document.getElementById('ulab-theme-row');
        if (row) row.querySelector('.ulab-switch-sm').classList.toggle('on', isDark);
    }

    function setFontScale(pct) {
        pct = Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, pct));
        const scale = pct / 100;
        document.documentElement.style.fontSize = pct + '%';
        document.documentElement.style.setProperty('--bento-scale', String(scale));

        const targets = [
            document.querySelector('td.content'),
            document.querySelector('table.main'),
            document.querySelector('.bento-root'),
            document.getElementById('content'),
        ];
        targets.forEach(el => {
            if (el) el.style.zoom = String(scale);
        });

        const val = document.getElementById('ulab-font-val');
        if (val) val.textContent = pct + '%';
        const dec = document.getElementById('ulab-font-dec');
        if (dec) dec.disabled = pct <= FONT_SCALE_MIN;
        const inc = document.getElementById('ulab-font-inc');
        if (inc) inc.disabled = pct >= FONT_SCALE_MAX;
        return pct;
    }

    function toggleGroup(groupKey, header, itemsWrap) {
        const collapsed = !header.classList.contains('collapsed');
        header.classList.toggle('collapsed', collapsed);
        itemsWrap.classList.toggle('collapsed', collapsed);
        chrome.storage.local.get([KEYS.navGroups], (result) => {
            const map = result[KEYS.navGroups] || {};
            map[groupKey] = collapsed;
            chrome.storage.local.set({ [KEYS.navGroups]: map });
        });
    }

    // "My Tools" action items open the side panel (features/advising/
    // advising-feature.js is the only registered feature right now — see
    // sidebar/sidebar.js) rather than reimplementing the wizard inline.
    // background.js relays this to chrome.sidePanel.open(), which requires
    // a user-gesture-bound call from a privileged context; content scripts
    // can't call chrome.sidePanel.open() directly.
    function handleNavAction(action) {
        if (action === 'open-tool:self-advising') {
            // Two ways to reach the same feature (both kept, per explicit
            // direction — "the sidebar of extension can be another copy"):
            // the side panel keeps working exactly as before, AND this now
            // also opens an in-page modal overlay loading the extension's
            // own sidebar.html (the same feature-router page the side panel
            // uses — see sidebar/sidebar.js's `?feature=` query-param
            // routing, already built in) inside an iframe, so the tool is
            // reachable without needing the side panel open at all.
            openExtensionFrame('sidebar/sidebar.html?feature=self-advising', 'Self-Advising Check');
        } else if (action === 'open-tool:capstone') {
            openExtensionFrame('sidebar/sidebar.html?feature=capstone', 'Capstone Eligibility');
        } else if (action === 'open-tool:catalogue') {
            openExtensionFrame('sidebar/sidebar.html?feature=catalogue', 'Course Catalogue');
        } else if (action === 'open-tool:schedule-tools') {
            openExtensionFrame('sidebar/sidebar.html?feature=schedule-tools', 'Routine & Export');
        } else if (action === 'open-tool:marks') {
            openExtensionFrame('sidebar/sidebar.html?feature=marks', 'Marks Management');
        }
    }

    // --- Extension pages opened as a full-page in-URMS overlay (ported from
    // ulab-faculty-companion's ulab-dashboard-shell.js openExtensionFrame()/
    // ensureExtFrameShell()/extFrameStyles(), restyled with this project's
    // bento-ui.css tokens instead of faculty's flat dark/white modal chrome).
    // Loads one of the extension's OWN pages via chrome.runtime.getURL()
    // inside an <iframe> — same code, same chrome.storage data as the side
    // panel, zero duplicated UI. Requires "web_accessible_resources" in
    // manifest.json for the URMS origin to be allowed to frame it. ---
    const EXT_FRAME_ID = 'ulab-ext-frame-modal';

    function extFrameStyles() {
        if (document.getElementById('ulab-ext-frame-css')) return;
        const style = document.createElement('style');
        style.id = 'ulab-ext-frame-css';
        style.textContent = `
            #${EXT_FRAME_ID}-overlay {
                display: none; position: fixed; inset: 0; z-index: 1000001;
                background: rgba(6, 20, 18, .6); align-items: center; justify-content: center;
                padding: 24px; font-family: var(--bento-font-ui, -apple-system, "Segoe UI", sans-serif);
            }
            #${EXT_FRAME_ID}-overlay.open { display: flex; }
            #${EXT_FRAME_ID}-card {
                background: var(--bento-card, #fff); width: 100%; height: 100%; max-width: 1100px; max-height: 780px;
                border-radius: var(--bento-radius-lg, 20px); overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,.45);
                border: 1px solid var(--bento-border-soft, rgba(13,148,136,.14));
                display: flex; flex-direction: column;
            }
            #${EXT_FRAME_ID}-bar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 18px; background: var(--ulab-rail-bg, #0B1B19); color: #fff; flex-shrink: 0;
            }
            #${EXT_FRAME_ID}-title { font: 700 13.5px var(--bento-font-ui, sans-serif); }
            #${EXT_FRAME_ID}-close {
                background: rgba(255,255,255,.12); border: none; color: #fff; width: 28px; height: 28px;
                border-radius: 8px; cursor: pointer; font-size: 15px; line-height: 1;
                display: flex; align-items: center; justify-content: center;
            }
            #${EXT_FRAME_ID}-close:hover { background: rgba(255,255,255,.22); }
            #${EXT_FRAME_ID}-iframe { flex: 1; border: none; width: 100%; background: var(--bento-bg, #F0FDFA); }
            @media (max-width: 680px) {
                #${EXT_FRAME_ID}-overlay { padding: 0; }
                #${EXT_FRAME_ID}-card { border-radius: 0; max-width: none; max-height: none; }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureExtFrameShell() {
        if (document.getElementById(`${EXT_FRAME_ID}-overlay`)) return;
        const overlay = document.createElement('div');
        overlay.id = `${EXT_FRAME_ID}-overlay`;
        overlay.innerHTML = `
            <div id="${EXT_FRAME_ID}-card">
                <div id="${EXT_FRAME_ID}-bar">
                    <span id="${EXT_FRAME_ID}-title"></span>
                    <button id="${EXT_FRAME_ID}-close" aria-label="Close" title="Close">&times;</button>
                </div>
                <iframe id="${EXT_FRAME_ID}-iframe"></iframe>
            </div>`;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeExtFrame(); });
        document.body.appendChild(overlay);
        document.getElementById(`${EXT_FRAME_ID}-close`).addEventListener('click', closeExtFrame);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeExtFrame();
        });
    }

    function closeExtFrame() {
        const overlay = document.getElementById(`${EXT_FRAME_ID}-overlay`);
        if (overlay) overlay.classList.remove('open');
        const iframe = document.getElementById(`${EXT_FRAME_ID}-iframe`);
        if (iframe) iframe.src = 'about:blank';
    }

    function openExtensionFrame(path, title) {
        extFrameStyles();
        ensureExtFrameShell();
        document.getElementById(`${EXT_FRAME_ID}-title`).textContent = title || '';
        document.getElementById(`${EXT_FRAME_ID}-iframe`).src = chrome.runtime.getURL(path);
        document.getElementById(`${EXT_FRAME_ID}-overlay`).classList.add('open');
    }

    function setModern(isOn, pageBodyClass, onModernChange) {
        document.body.classList.toggle(pageBodyClass, isOn);
        document.body.classList.toggle('ulab-shell-mounted', isOn);
        const row = document.getElementById('ulab-modern-row');
        if (row) row.querySelector('.ulab-switch-sm').classList.toggle('on', isOn);
        const floating = document.getElementById(FLOATING_TOGGLE_ID);
        if (floating) floating.querySelector('.ulab-switch-sm').classList.toggle('on', isOn);
        if (typeof onModernChange === 'function') onModernChange(isOn);
    }

    function profileFromDocument(doc) {
        const cell = doc.querySelector('td.content') || doc.body;
        const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        const image = cell.querySelector("img[src*='/Photo/']");
        const nameEl = cell.querySelector('h2');
        const idMatch = text.match(/\b(\d{9})\b/);
        const profileId = idMatch ? idMatch[1] : null;
        const profileName = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : null;
        const programMatch = profileId && text.match(new RegExp(`${profileId}\\s+([^]+?)\\s+([A-Z]{2,8})\\s+Tel\\/Mobile`, 'i'));
        const imageUrl = image ? new URL(image.getAttribute('src'), location.origin).href : (profileId ? `${location.origin}/Photo/${profileId}.jpg` : null);
        return {
            studentId: profileId,
            studentName: profileName,
            programCode: programMatch ? programMatch[2].toUpperCase() : null,
            photoUrl: imageUrl,
            scrapedAt: Date.now(),
        };
    }

    function refreshProfileCache(info, onReady) {
        // Preferred path: the shared portal data layer (features/shared/
        // ulab-portal-data.js). It does the same job but correctly —
        // windows-1252 decoding instead of response.text()'s UTF-8 guess
        // (which mojibakes non-ASCII names), an allowlisted bare path
        // instead of a hand-written URL, session-expiry detection, and
        // request de-duplication shared with every other caller. The
        // hand-rolled fetch below is kept only as a fallback for a bundle
        // where those modules are not loaded.
        if (window.ULAB_PORTAL_DATA) {
            window.ULAB_PORTAL_DATA.ensure('profile', { maxAgeMs: 10 * 60 * 1000 })
                .then((res) => {
                    if (!res.ok || !res.data) return;
                    const profile = res.data;
                    if (!profile.studentName && !profile.photoUrl) return;
                    onReady(Object.assign({}, info, profile));
                })
                .catch(() => { /* Profile refresh is additive; cached or scraped page data still works. */ });
            return;
        }
        chrome.storage.local.get(['ulabStudentProfile'], (result) => {
            const cached = result && result.ulabStudentProfile;
            const fresh = cached && cached.scrapedAt && Date.now() - cached.scrapedAt < 10 * 60 * 1000;
            if (fresh) { onReady(Object.assign({}, info, cached)); return; }
            fetch('/profile.php', { credentials: 'include' })
                .then(response => response.ok ? response.text() : '')
                .then(html => {
                    if (!html) return;
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const profile = profileFromDocument(doc);
                    if (!profile.studentName && !profile.photoUrl) return;
                    chrome.storage.local.set({ ulabStudentProfile: profile });
                    onReady(Object.assign({}, info, profile));
                })
                .catch(() => { /* Profile refresh is additive; cached or scraped page data still works. */ });
        });
    }

    function updateAppHeader(info) {
        const header = document.getElementById('ulab-app-header');
        if (!header) return;
        const name = info && info.studentName ? info.studentName : 'Student';
        const context = header.querySelector('.ulab-app-context');
        if (context) context.textContent = `Signed in as ${name}`;
        const avatar = header.querySelector('.ulab-app-avatar');
        if (avatar && info && info.photoUrl) {
            if (avatar.tagName === 'IMG') { avatar.src = info.photoUrl; avatar.alt = name; }
            else {
                const image = document.createElement('img');
                image.className = 'ulab-app-avatar';
                image.src = info.photoUrl;
                image.alt = name;
                avatar.replaceWith(image);
            }
        }
    }

    function buildAppChrome(info) {
        if (document.getElementById('ulab-app-header')) return;
        const header = document.createElement('header');
        header.id = 'ulab-app-header';
        const name = info && info.studentName ? `Signed in as ${esc(info.studentName)}` : 'Student portal';
        const avatar = info && info.photoUrl ? `<img class="ulab-app-avatar" src="${esc(info.photoUrl)}" alt="${esc(info.studentName || 'Student')}">` : '<span class="ulab-app-avatar"></span>';
        const logoUrl = chrome.runtime.getURL('icons/ulab.svg');
        header.innerHTML = `
            <div class="ulab-app-header-left">
                <a class="ulab-app-brand" href="/index.php"><img class="ulab-app-logo-img" src="${logoUrl}" alt="ULAB Logo"><span><strong>ULAB STUDENT URMS PORTAL</strong><small>University of Liberal Arts Bangladesh</small></span></a>
            </div>
            <span class="ulab-app-user">${avatar}<span class="ulab-app-context">${name}</span></span>`;
        document.body.insertBefore(header, document.body.firstChild);
        const footer = document.createElement('footer');
        footer.id = 'ulab-app-footer';
        footer.innerHTML = '<span><strong>ULAB Student Companion</strong> · Your academic workspace</span><span>Built for clearer decisions, every semester.</span>';
        document.body.appendChild(footer);

        const appBrand = header.querySelector('.ulab-app-brand');
        if (appBrand) {
            appBrand.addEventListener('click', (e) => {
                if (window.matchMedia(MOBILE_QUERY).matches) {
                    e.preventDefault();
                    document.body.classList.toggle('ulab-sidebar-open');
                }
            });
        }
    }

    // mount(pageBodyClass, onModernChange?, onMount?) — call once
    // DOMContentLoaded has fired. pageBodyClass is the page-specific class
    // (e.g. 'ulab-page-status') that file's OWN <style> block is scoped
    // under; this function toggles it alongside the shared shell/dark
    // classes so both sets of rules turn on/off together. onMount(info) is
    // called synchronously (before storage reads resolve) with the scraped
    // Semester/Student/Adviser block, matching every existing caller's
    // usage (home/status/billing/preregistration/profile *-ui-content.js).
    // Signature and synchronous-info-first behavior are both unchanged from
    // the previous minimal shell, so no caller needed to change.
    function mount(pageBodyClass, onModernChange, onMount) {
        // Session-expiry bail-out — MUST stay first, before any chrome is
        // built and while the document_start cloak is still up, so the
        // broken mixed UI never paints. See sessionExpired() for why the
        // detection is deliberately narrow.
        if (sessionExpired()) {
            redirectToLogin();
            return;
        }
        injectShellStyles();
        if (pageBodyClass) wrapLegacyContent();
        const info = scrapeStudentInfo();
        buildAppChrome(info);

        refreshProfileCache(info, (profile) => {
            const enriched = Object.assign({}, info, profile, {
                studentName: profile.studentName || info.studentName,
                studentId: profile.studentId || info.studentId,
            });
            if (enriched.studentName !== info.studentName || enriched.studentId !== info.studentId || enriched.photoUrl !== info.photoUrl) {
                updateAppHeader(enriched);
                const sidebarUser = document.querySelector('#ulab-sidebar .ulab-sb-user span');
                if (sidebarUser) sidebarUser.textContent = `${enriched.studentName || 'Signed in'}${enriched.studentId ? ` (${enriched.studentId})` : ''}`;
                if (typeof onMount === 'function') onMount(enriched);
            }
        });

        chrome.storage.local.get([KEYS.modern, KEYS.theme, KEYS.collapsed, KEYS.fontScale, KEYS.navGroups, KEYS.mode], (result) => {
            currentUiMode = result[KEYS.mode] || 'simple';
            document.body.classList.toggle('ulab-mode-simple', isSimpleMode());
            document.body.classList.toggle('ulab-mode-advanced', !isSimpleMode());

            if (typeof onMount === 'function') {
                try { onMount(info); } catch (e) { console.error('[Student Companion] onMount failed', e); }
            }

            const isOn = result[KEYS.modern] !== false; // default on
            const isDark = result[KEYS.theme] === 'dark';
            const isCollapsed = !!result[KEYS.collapsed];
            const fontScale = typeof result[KEYS.fontScale] === 'number' ? result[KEYS.fontScale] : 100;
            const navGroupsState = result[KEYS.navGroups] || {};

            if (pageBodyClass) {
                if (isOn) { buildSidebar(navGroupsState, info); buildHamburger(); }
                buildFloatingToggle(isOn, pageBodyClass, onModernChange, info);
                document.body.classList.toggle('ulab-sidebar-collapsed', isCollapsed);
                setModern(isOn, pageBodyClass, onModernChange);
            }
            setTheme(isDark);
            setFontScale(fontScale);

            const themeRow = document.getElementById('ulab-theme-row');
            if (themeRow) themeRow.addEventListener('click', () => {
                const next = !document.body.classList.contains('ulab-dark');
                setTheme(next);
                chrome.storage.local.set({ [KEYS.theme]: next ? 'dark' : 'light' });
            });
            const modernRow = document.getElementById('ulab-modern-row');
            if (modernRow && pageBodyClass) modernRow.addEventListener('click', () => {
                const next = !document.body.classList.contains(pageBodyClass);
                if (next) { buildSidebar(undefined, info); buildHamburger(); }
                setModern(next, pageBodyClass, onModernChange);
                chrome.storage.local.set({ [KEYS.modern]: next });
            });
            const decBtn = document.getElementById('ulab-font-dec');
            if (decBtn) decBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const next = setFontScale((document.documentElement.style.fontSize ? parseInt(document.documentElement.style.fontSize, 10) : 100) - FONT_SCALE_STEP);
                chrome.storage.local.set({ [KEYS.fontScale]: next });
            });
            const incBtn = document.getElementById('ulab-font-inc');
            if (incBtn) incBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const next = setFontScale((document.documentElement.style.fontSize ? parseInt(document.documentElement.style.fontSize, 10) : 100) + FONT_SCALE_STEP);
                chrome.storage.local.set({ [KEYS.fontScale]: next });
            });

            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace !== 'local') return;
                if (changes[KEYS.fontScale] && typeof changes[KEYS.fontScale].newValue === 'number') {
                    setFontScale(changes[KEYS.fontScale].newValue);
                }
                if (changes[KEYS.theme]) {
                    setTheme(changes[KEYS.theme].newValue === 'dark');
                }
                if (changes[KEYS.mode]) {
                    location.reload();
                }
            });

            uncloak();
        });
        return info;
    }

    // ── Flow-aware disabling of portal action controls ───────────────────
    // registration-flow.md: pre-registration is strictly ordered (select
    // courses → Pre Advising Complete → pick timings → Advising Complete),
    // "once a step is complete its action must not be clickable", and once
    // the page says "Registration complete. No changes can be made." NOTHING
    // is actionable. We have only ever captured the *completed* state in
    // reference-html/, so the rule implemented here is deliberately the safe
    // one: disabled when the page REPORTS that step complete, enabled
    // otherwise. No markup is invented for states we've never seen.
    //
    // Most of these controls are scraped portal markup — anchors with real
    // hrefs and inline onclick handlers that perform genuine, state-mutating
    // navigations. We never change WHAT they do, only whether they can be
    // invoked, so the original href/onclick is PARKED on a data-* attribute
    // rather than destroyed (and is trivially restorable / inspectable).
    //
    // "Disabled" here means all of:
    //   • not clickable — href and onclick removed, buttons/inputs .disabled,
    //     plus a capture-phase click/keydown blocker so a stray handler
    //     registered elsewhere still cannot fire it,
    //   • not reachable by keyboard — tabindex="-1",
    //   • conveyed non-visually — aria-disabled="true" on the control,
    //   • visually distinct — .is-disabled (reduced emphasis + cursor:default
    //     in bento-ui.css), never colour alone.
    function blockDisabledEvent(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function blockDisabledKey(event) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') blockDisabledEvent(event);
    }

    function disableControl(root) {
        if (!root || root.dataset.ulabDisabledApplied === '1') return;
        root.dataset.ulabDisabledApplied = '1';
        root.classList.add('is-disabled');
        root.setAttribute('aria-disabled', 'true');

        const targets = [root].concat(Array.from(root.querySelectorAll('a, button, input, img, [onclick]')));
        targets.forEach((el) => {
            if (el.tagName === 'A' && el.hasAttribute('href')) {
                el.dataset.ulabDisabledHref = el.getAttribute('href');
                el.removeAttribute('href'); // an <a> without href is not a link: no navigation, no Enter activation
            }
            if (el.hasAttribute('onclick')) {
                el.dataset.ulabDisabledOnclick = el.getAttribute('onclick');
                el.removeAttribute('onclick');
            }
            el.onclick = null;
            if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') el.disabled = true;
            el.setAttribute('aria-disabled', 'true');
            el.setAttribute('tabindex', '-1');
            el.classList.add('is-disabled');
        });

        root.addEventListener('click', blockDisabledEvent, true);
        root.addEventListener('keydown', blockDisabledKey, true);
    }

    // Renderers mark a control disabled declaratively, in the HTML string
    // they build: <span class="bento-action-control" data-ulab-disabled="1">.
    // This is then called once on the rendered view.
    function applyDisabledControls(root) {
        if (!root) return;
        Array.from(root.querySelectorAll('[data-ulab-disabled="1"]')).forEach(disableControl);
    }

    // ── Shared "print this document" helper ─────────────────────────────
    // Renders a standalone HTML document into an offscreen iframe and opens
    // the print dialog, which is also the "Save as PDF" path. An iframe
    // rather than window.open() because a popup is unreliable from inside
    // the in-page overlay iframe and blocked outright in some setups.
    // The caller supplies a COMPLETE html document (its own <style>), since
    // the frame inherits none of this page's CSS.
    // Note: features/routine/routine-feature.js keeps its own copy of this —
    // it runs in the side panel, which does not load this shell at all.
    function printDocument(html, frameId) {
        const id = frameId || 'ulab-print-frame';
        const old = document.getElementById(id);
        if (old) old.remove();
        const frame = document.createElement('iframe');
        frame.id = id;
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
        document.body.appendChild(frame);
        const doc = frame.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
        // Small delay so fonts/images settle; printing proceeds either way.
        setTimeout(() => {
            try {
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } catch (err) {
                console.error('[Student Companion] print failed', err);
            }
        }, 350);
    }

    window.ULAB_SHELL = {
        KEYS, cloak, uncloak, mount, scrapeStudentInfo, STORAGE_KEY_INFO,
        wrapLegacyContent, renderHeaderCard, disableControl, applyDisabledControls,
        printDocument, getUiMode, isSimpleMode,
    };

    // Cloak immediately at parse time (this file always loads first, at
    // document_start, in every bundle that includes it) so nothing paints
    // before mount() decides what to show.
    cloak();
})();
