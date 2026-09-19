// features/home/home-ui-content.js — content script injected into the
// urms-online.ulab.edu.bd Home page. Same URL pattern as the login page
// (manifest.json matches "/" and "/index.php*" for both bundles), so this
// checks defensively for #menubar (present only once logged in — see
// reference-html/dashboard.html) before doing anything.
//
// UI-revamp pass ("revamp the whole UI", not reskin on top of it): the
// legacy dashboard is a plain-text semester/student/adviser sentence
// followed by a nested <table> of plain links (Billing History, Current
// Status, Preregistration, ...). Previously this file only restyled that
// markup in place with CSS; per the fuller takeover now applied to every
// other page, it instead scrapes the link list, hides the WHOLE legacy
// td.content via window.ULAB_SHELL.wrapLegacyContent() (same
// non-destructive class-toggle mechanism every other page uses — turning
// Modern UI off instantly reveals the untouched original), and renders a
// bento header card (semester/student/adviser, matching every other page)
// plus a bento grid of quick-link tiles as the only visible content.
(function () {
    const STYLE_ID = 'ulab-home-view-css';
    const VIEW_ID = 'ulab-home-view';
    const BODY_CLASS = 'ulab-page-home';

    // Small monochrome icon set for the dashboard tiles — no emoji, matches
    // the shell's inline-SVG icon system (features/shared/ulab-dashboard-
    // shell.js's ICONS map is scoped to sidebar nav internals, so this file
    // keeps its own tiny copy rather than reaching into that private table).
    const TILE_ICONS = {
        billing: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
        status: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 15l4-6 4 3 5-8"/>',
        prereg: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        schedule: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        profile: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        eval: '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 12l2 2 4-4"/>',
        default: '<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>',
    };
    function pickIcon(label, href) {
        const s = (label + ' ' + (href || '')).toLowerCase();
        if (/billing/.test(s)) return TILE_ICONS.billing;
        if (/status|result/.test(s)) return TILE_ICONS.status;
        if (/prereg/.test(s)) return TILE_ICONS.prereg;
        if (/schedule/.test(s)) return TILE_ICONS.schedule;
        if (/profile/.test(s)) return TILE_ICONS.profile;
        if (/evaluation/.test(s)) return TILE_ICONS.eval;
        return TILE_ICONS.default;
    }
    function svg(pathData) {
        return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`;
    }

    function isDashboard() {
        // #menubar only exists once logged in (reference-html/dashboard.html);
        // its absence means this is actually the login page reusing the same
        // URL, which features/login/login-ui-content.js already handles.
        return !!document.getElementById('menubar');
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // Scrapes the dashboard's nested link table — plain <a href> tags inside
    // td.content, no id/class to key off (per handoff.md's brittle-markup
    // warning), so every anchor inside the content cell that isn't the
    // logout/menubar link is treated as a dashboard shortcut.
    function scrapeLinks() {
        const legacyWrap = document.querySelector('.ulab-legacy-content-wrap') || document.querySelector('td.content');
        if (!legacyWrap) return [];
        const seen = new Set();
        const links = [];
        Array.from(legacyWrap.querySelectorAll('a')).forEach(a => {
            if (a.closest('#' + VIEW_ID) || a.closest('.bento-root')) return;
            const label = (a.textContent || '').trim();
            const href = a.getAttribute('href');
            if (label && href) {
                const key = `${label}|${href}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    links.push({ label, href });
                }
            }
        });
        return links;
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        // The quick-links GRID concept is kept — it is the right shape for a
        // launcher — but retuned to the compact type scale and spacing the
        // rest of the extension now uses, so Home doesn't read as a
        // different app: smaller tiles, 11.5px label, 8px gaps, token-based
        // tint (no hardcoded rgba), and a 1px hover border instead of a
        // scale transform.
        style.textContent = `
            #${VIEW_ID} { display: none; padding: 10px 0 28px; text-align: left; font-family: var(--bento-font-ui); color: var(--bento-fg); }
            body.${BODY_CLASS}.ulab-shell-mounted #${VIEW_ID} { display: block; }
            #${VIEW_ID} .home-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(188px,1fr)); gap:8px; }
            #${VIEW_ID} .home-tile {
                display: flex; align-items: center; gap: 9px;
                padding: 8px 10px; text-decoration: none !important;
                background: var(--bento-card); border: 1px solid var(--bento-border-soft);
                border-radius: var(--bento-radius-xs);
                color: var(--bento-fg) !important; font: 700 11.5px var(--bento-font-ui);
                min-height: 40px;
                transition: border-color var(--bento-motion), background var(--bento-motion);
            }
            #${VIEW_ID} .home-tile:hover { border-color: var(--bento-primary); background: color-mix(in srgb, var(--bento-primary) 7%, var(--bento-card)); }
            #${VIEW_ID} .home-tile .home-tile-icon {
                display: flex; align-items: center; justify-content: center;
                width: 26px; height: 26px; border-radius: var(--bento-radius-xs);
                background: color-mix(in srgb, var(--bento-primary) 12%, transparent);
                color: var(--bento-primary); flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function renderView(info, links) {
        const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
        injectStyle();
        let view = document.getElementById(VIEW_ID);
        if (!view) {
            view = document.createElement('div');
            view.id = VIEW_ID;
            view.className = 'bento-root';
            contentCell.appendChild(view);
        }
        const headerCardHtml = window.ULAB_SHELL.renderHeaderCard(info, {
            title: `Welcome${info && info.studentName ? `, ${info.studentName.split(' ')[0]}` : ''}`,
        });
        // EVERY anchor the legacy dashboard listed is rendered, including
        // destinations this extension does not reskin (e.g. Change Password)
        // — those simply stay working plain links out to the portal.
        view.innerHTML = `
            ${headerCardHtml}
            <h2 class="bento-sectitle">Quick Links</h2>
            <div class="home-grid">
                ${links.length ? links.map(l => `
                    <a class="home-tile" href="${esc(l.href)}">
                        <span class="home-tile-icon">${svg(pickIcon(l.label, l.href))}</span>
                        <span>${esc(l.label)}</span>
                    </a>`).join('') : '<div class="bento-empty">No dashboard links found.</div>'}
            </div>
        `;
    }

    function init() {
        if (!isDashboard()) {
            // Not actually logged in / this is the login page reusing the
            // same URL — let features/login/login-ui-content.js's own
            // cloak/uncloak handle it, don't touch anything here.
            window.ULAB_SHELL && window.ULAB_SHELL.uncloak();
            return;
        }
        window.ULAB_SHELL.mount(BODY_CLASS, null, (info) => {
            const links = scrapeLinks();
            renderView(info, links);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
