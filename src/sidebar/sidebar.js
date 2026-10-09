// sidebar.js — feature router for ULAB Student Companion

// ── Theme: auto (follows OS) → light → dark → back to auto. ────────────
const THEME_ORDER = ['auto', 'light', 'dark'];
// SVG, not emoji (project rule) — same glyph set as the icons further down.
const THEME_ICON = {
    auto:  '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark:  '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
};
const themeToggle = document.getElementById('ulab-theme-toggle');

function applyTheme(theme) {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    // Safe innerHTML: the value is one of the three literal path strings
    // above, keyed by a theme name this module itself controls.
    if (themeToggle) {
        themeToggle.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${THEME_ICON[theme] || THEME_ICON.auto}</svg>`;
    }
}

function initTheme() {
    chrome.storage.local.get(['ulabTheme'], ({ ulabTheme }) => {
        applyTheme(THEME_ORDER.includes(ulabTheme) ? ulabTheme : 'auto');
    });
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        chrome.storage.local.get(['ulabTheme'], ({ ulabTheme }) => {
            const current = THEME_ORDER.includes(ulabTheme) ? ulabTheme : 'auto';
            const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
            chrome.storage.local.set({ ulabTheme: next }, () => applyTheme(next));
        });
    });
}

initTheme();

// ── Font Scale: syncs across side panel & portal pages ────────────────
const FONT_SCALE_MIN = 80;
const FONT_SCALE_MAX = 150;
const FONT_SCALE_STEP = 10;
const fontDecBtn = document.getElementById('ulab-font-dec');
const fontIncBtn = document.getElementById('ulab-font-inc');
const fontValSpan = document.getElementById('ulab-font-val');

function applyFontScale(pct) {
    pct = Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, pct || 100));
    const scale = pct / 100;
    document.documentElement.style.fontSize = pct + '%';
    if (document.body) document.body.style.zoom = String(scale);
    if (fontValSpan) fontValSpan.textContent = pct + '%';
    if (fontDecBtn) fontDecBtn.disabled = pct <= FONT_SCALE_MIN;
    if (fontIncBtn) fontIncBtn.disabled = pct >= FONT_SCALE_MAX;
    return pct;
}

function initFontScale() {
    chrome.storage.local.get(['ulabFontScale'], ({ ulabFontScale }) => {
        applyFontScale(typeof ulabFontScale === 'number' ? ulabFontScale : 100);
    });
}

if (fontDecBtn) {
    fontDecBtn.addEventListener('click', () => {
        chrome.storage.local.get(['ulabFontScale'], ({ ulabFontScale }) => {
            const current = typeof ulabFontScale === 'number' ? ulabFontScale : 100;
            const next = applyFontScale(current - FONT_SCALE_STEP);
            chrome.storage.local.set({ ulabFontScale: next });
        });
    });
}

if (fontIncBtn) {
    fontIncBtn.addEventListener('click', () => {
        chrome.storage.local.get(['ulabFontScale'], ({ ulabFontScale }) => {
            const current = typeof ulabFontScale === 'number' ? ulabFontScale : 100;
            const next = applyFontScale(current + FONT_SCALE_STEP);
            chrome.storage.local.set({ ulabFontScale: next });
        });
    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    if (changes.ulabFontScale && typeof changes.ulabFontScale.newValue === 'number') {
        applyFontScale(changes.ulabFontScale.newValue);
    }
});

initFontScale();

// Each feature module registers itself on window.ULAB_FEATURES before this
// script runs, e.g. { id, icon, title, subtitle, mount(container) }.
const FEATURES = window.ULAB_FEATURES || [];

const rail    = document.getElementById('rail');
const content = document.getElementById('content');

// ── Feature icons ──────────────────────────────────────────────────────
// `feature.icon` used to hold a single display CHARACTER — 'C', 'B', 'M',
// 'R', one '🎓' — which sidebar.js dropped into the rail via textContent.
// That is what the user saw as "weird icons". It is now an ICON NAME looked
// up here, so the nav can render real inline SVG.
//
// The paths are copied from ulab-dashboard-shell.js's ICONS map on purpose:
// the shell is a content script and is NOT loaded on this page, so there is
// no shared object to import, and pulling the whole shell in for five paths
// would be far worse. The names match the shell's My Tools entries exactly
// (features/shared/ulab-dashboard-shell.js) so a tool carries the same glyph
// in the menu and in the nav that menu opens.
//
// PROJECT RULE: SVG only. The faculty companion's tools frame uses emoji in
// this slot; this project does not, so only the pill FORMAT is borrowed.
const ICONS = {
    'clipboard-check': '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 12l2 2 4-4"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
};

// Builds the icon element for a feature. A registration that still carries an
// unknown value (an old letter, or a name we have no path for) degrades to
// that feature's initial as TEXT — it never dumps raw markup into the DOM.
function iconNode(feature, size) {
    const name = String(feature.icon || '');
    const span = document.createElement('span');
    span.className = 'nav-pill-icon';
    span.setAttribute('aria-hidden', 'true');
    if (Object.prototype.hasOwnProperty.call(ICONS, name)) {
        // Safe innerHTML: the value is one of our own literal path strings
        // above, selected by an own-property check — never feature-supplied.
        span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
    } else {
        span.textContent = (feature.title || name || '?').trim().charAt(0).toUpperCase();
    }
    return span;
}

// Horizontal row of rounded icon+label pills, active one highlighted — the
// layout the user pointed at in the faculty companion's tools frame
// (.tf-dot). Replaces the 68px vertical letter rail.
function renderRail(activeId) {
    rail.innerHTML = '';
    for (const feature of FEATURES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-pill' + (feature.id === activeId ? ' active' : '');
        btn.title = feature.title;
        btn.setAttribute('aria-pressed', feature.id === activeId ? 'true' : 'false');
        btn.appendChild(iconNode(feature, 15));
        const label = document.createElement('span');
        label.className = 'nav-pill-label';
        label.textContent = feature.title;
        btn.appendChild(label);
        btn.addEventListener('click', () => selectFeature(feature.id));
        rail.appendChild(btn);
    }
}

function renderFeature(feature) {
    content.innerHTML = `
        <div class="feature-header">
            <h1></h1>
            <p></p>
        </div>
        <div class="feature-body" id="feature-body"></div>
    `;
    // Built as nodes, not an interpolated template: the heading now carries an
    // SVG, and title/subtitle are feature-supplied strings that must stay text.
    const heading = content.querySelector('.feature-header h1');
    heading.appendChild(iconNode(feature, 17));
    const titleText = document.createElement('span');
    titleText.textContent = feature.title;
    heading.appendChild(titleText);
    content.querySelector('.feature-header p').textContent = feature.subtitle || '';
    feature.mount(document.getElementById('feature-body'));
}

function selectFeature(id) {
    const feature = FEATURES.find(f => f.id === id);
    if (!feature) return;
    renderRail(id);
    renderFeature(feature);
}

// Lets a feature module (e.g. "My Schedule" with nothing saved yet) jump
// straight to another tab instead of just telling the user to go find it.
window.ULAB_SIDEBAR_GOTO = selectFeature;

const requestedId = new URLSearchParams(location.search).get('feature')
    || (location.hash ? location.hash.slice(1) : null);

if (FEATURES.length) {
    const initial = (requestedId && FEATURES.some(f => f.id === requestedId)) ? requestedId : FEATURES[0].id;
    selectFeature(initial);
} else {
    content.innerHTML = `
        <div class="empty-state">
            <div class="icon"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS.grid}</svg></div>
            <div>No features registered yet.</div>
        </div>`;
}
