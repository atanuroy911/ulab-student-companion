// background.js — service worker for ULAB Student Companion.
//
// Minimal on purpose: this project only needs the side panel to open on the
// toolbar icon click. The faculty companion's background.js additionally
// handles MMS grade-import/grade-fill relaying and a Google Classroom
// download-rename trick — none of that applies here (no MMS integration, no
// Classroom feature), so it's intentionally left out rather than carried
// over unused.

// Open the side panel when the toolbar icon is clicked.
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Student Companion]', error));

// The sidebar's "My Tools" nav group (see features/shared/
// ulab-dashboard-shell.js) lets a student open the side panel directly from
// a URMS page instead of clicking the toolbar icon. Content scripts can't
// call chrome.sidePanel.open() themselves (Chrome restricts it to
// privileged/user-gesture-bound extension contexts), so they relay the
// request here instead. Kept minimal, matching the rest of this file —
// there's only one feature registered in the side panel right now
// (self-advising), so opening the panel at its default path is enough;
// no per-feature deep link is needed yet.
chrome.runtime.onMessage.addListener((message, sender) => {
    if (!message || message.type !== 'ulab-open-side-panel') return;
    const windowId = sender && sender.tab && sender.tab.windowId;
    if (windowId == null) return;
    chrome.sidePanel.open({ windowId }).catch((error) => console.error('[Student Companion]', error));
});

// ═══════════════════════════════════════════════════════════════════════
//  PORTAL DATA FETCH LAYER
// ═══════════════════════════════════════════════════════════════════════
//
// Why it lives HERE and not in a content script:
//   1. The side panel (sidebar/sidebar.html) is an EXTENSION-ORIGIN page.
//      It has no access to any portal DOM whatsoever, so a background
//      fetch is the ONLY way side-panel features (My Advising Check,
//      Capstone, Schedule Tools…) can ever see fresh portal data.
//   2. The service worker holds host_permissions and is not subject to the
//      portal page's CSP.
//   3. One choke point = one place to enforce the safety invariant below.
//
// ───────────────────────────────────────────────────────────────────────
//  ⚠⚠⚠  HARD SAFETY INVARIANT — DO NOT RELAX THIS. READ IT TWICE.  ⚠⚠⚠
// ───────────────────────────────────────────────────────────────────────
// The URMS student portal performs STATE-MUTATING OPERATIONS THROUGH PLAIN
// GET LINKS. These four are confirmed present in reference-html/:
//
//   • task=changeTakenStatus      REGISTERS / UNREGISTERS A COURSE
//   • task=selectSection          CHANGES THE STUDENT'S SECTION
//   • task=changeAdvStatus        FLIPS ADVISING STATUS
//   • task=changePreAdvStatus     FLIPS PRE-ADVISING STATUS
//
// There is no confirmation step and no POST. A fetcher that followed an
// href scraped off a page — or that accepted a caller-supplied URL — would
// REALLY register and unregister the student's courses, silently, and we
// have NO way to undo it. That is an academic-record-destroying bug, not a
// cosmetic one.
//
// Therefore, permanently:
//   1. Only bare paths from PORTAL_PAGES below are ever requested. Callers
//      pass a PAGE KEY (a symbolic name), never a URL.
//   2. Any query string ('?') or fragment ('#') is REJECTED at the single
//      choke point buildPortalUrl(), defensively, even though (1) already
//      makes one impossible. Belt and braces.
//   3. Links scraped from page content are NEVER followed.
//   4. method: 'GET' only. Never POST. Never any other verb.
//
// If a future page needs data, ADD ITS BARE PATH to PORTAL_PAGES. Do not
// add a "just this once" URL parameter. Every one of the four tasks above
// rides on the same host and would sail straight through a relaxed check.
// ───────────────────────────────────────────────────────────────────────

const PORTAL_ORIGIN = 'https://urms-online.ulab.edu.bd';

// pageKey -> bare path. No query strings, no fragments, ever.
const PORTAL_PAGES = {
    status: '/Status.php',
    profile: '/profile.php',
    preregistration: '/Preregistration.php',
    schedule: '/schedule.php',
    billing: '/Billing.php',
    teacherEvaluation: '/TeacherEvaluation.php',
    courseEvaluation: '/CourseEvaluation.php',
};

// THE choke point. Throws rather than sanitising — a caller that managed to
// smuggle a query string in is a bug we want loud, not quietly stripped.
function buildPortalUrl(pageKey) {
    if (typeof pageKey !== 'string') throw new Error('portal-fetch: page key must be a string');
    if (!Object.prototype.hasOwnProperty.call(PORTAL_PAGES, pageKey)) {
        throw new Error(`portal-fetch: "${pageKey}" is not an allowlisted page`);
    }
    const path = PORTAL_PAGES[pageKey];
    // Defensive re-validation of our OWN table, so a future careless edit to
    // PORTAL_PAGES (e.g. pasting a full "?task=..." link out of the portal)
    // fails closed instead of firing a mutating request.
    if (/[?#]/.test(path)) throw new Error('portal-fetch: allowlist entry must not contain a query string or fragment');
    if (!/^\/[A-Za-z0-9._-]+$/.test(path)) throw new Error('portal-fetch: allowlist entry must be a bare path');
    const url = new URL(path, PORTAL_ORIGIN);
    if (url.origin !== PORTAL_ORIGIN) throw new Error('portal-fetch: refusing off-origin request');
    if (url.search || url.hash) throw new Error('portal-fetch: refusing request carrying a query string or fragment');
    return url.href;
}

// ── windows-1252 decoding ───────────────────────────────────────────────
// Every reference-html/*.html page declares <meta charset=windows-1252>.
// response.text() would decode the bytes as UTF-8 and mojibake every
// non-ASCII byte — student names, adviser names and Present Address lines
// are exactly where those live. So we take the raw bytes and decode them
// with an explicit windows-1252 TextDecoder instead. Nothing else in this
// file is allowed to call response.text().
// windows-1252 is also the correct FALLBACK for a page that declares
// nothing: it is a superset of latin-1, so every byte decodes to something
// rather than to U+FFFD, which is what a wrong UTF-8 guess produces.
const PORTAL_CHARSET = 'windows-1252';

// Honour the page's OWN declaration when it makes one, rather than assuming
// every page will always say windows-1252 forever. The declaration lives in
// the first few hundred bytes and is pure ASCII, so it can be sniffed from a
// latin1 decode of the head before committing to a decoder.
function sniffCharset(buffer) {
    let head;
    try { head = new TextDecoder('windows-1252').decode(buffer.slice(0, 2048)); }
    catch (e) { return PORTAL_CHARSET; }
    const meta = head.match(/<meta[^>]+charset\s*=\s*["']?\s*([A-Za-z0-9_-]+)/i);
    const label = meta ? meta[1].toLowerCase() : '';
    if (!label) return PORTAL_CHARSET;
    // Only accept a label TextDecoder actually supports; anything else falls
    // back rather than throwing mid-fetch.
    try { new TextDecoder(label); return label; }
    catch (e) { return PORTAL_CHARSET; }
}

function decodePortalBytes(buffer) {
    return new TextDecoder(sniffCharset(buffer)).decode(buffer);
}

// ── Session-expiry detection on FETCHED html ────────────────────────────
// This portal does NOT redirect when a session dies — it serves an inline
// login form inside the authenticated page's own content area, with HTTP
// 200. A naive fetcher would therefore cache a perfectly "successful"
// response containing zero courses and report it as real data.
//
// These are the same two markers features/shared/ulab-dashboard-shell.js's
// sessionExpired() uses, applied to an HTML STRING (the service worker has
// no DOMParser — see below):
//   • the "Please login" banner text, OR
//   • the studentID + password input PAIR (the pair, never a lone password
//     field: the portal has a legitimate Change Password destination).
function looksLikeLoginPage(html) {
    if (!html) return false;
    if (/please\s*login/i.test(html)) return true;
    const hasStudentId = /<input[^>]*\bname\s*=\s*["']?studentID["']?/i.test(html);
    const hasPassword = /<input[^>]*\bname\s*=\s*["']?password["']?/i.test(html);
    return hasStudentId && hasPassword;
}

// ── DOMParser-in-MV3 ────────────────────────────────────────────────────
// DOMParser DOES NOT EXIST in an MV3 service worker. The options were:
//   (a) regex-scrape the HTML here (what the faculty companion does) —
//       would mean a SECOND, divergent implementation of every parser,
//       exactly the duplication this refactor exists to remove;
//   (b) chrome.offscreen — a new permission, a new document lifecycle, and
//       a third hop for every read;
//   (c) return the decoded HTML STRING and let the REQUESTING context parse
//       it. Content scripts and the side panel are both real documents and
//       both have DOMParser.
// (c) is what this implements: the service worker is a pure, dumb, safe
// TRANSPORT — allowlist, cookies, charset, session check — and the shared
// parsers in features/shared/ulab-portal-parsers.js run on the caller's
// side against `new DOMParser().parseFromString(html, 'text/html')`. That
// is also what makes one parser serve both the live page and a fetched one.

// ── In-flight de-duplication ────────────────────────────────────────────
// Real university server. Two features asking for Status.php at the same
// moment must produce ONE network request, not two. Keyed by page key;
// every concurrent caller awaits the same promise.
const inFlightPortalFetches = new Map();

async function fetchPortalPageUncached(pageKey) {
    const url = buildPortalUrl(pageKey); // throws on anything not allowlisted
    let response;
    try {
        response = await fetch(url, {
            method: 'GET',           // never anything else — see the invariant
            credentials: 'include',  // send the URMS session cookie
            redirect: 'follow',
            cache: 'no-store',
        });
    } catch (e) {
        return { ok: false, error: 'network', message: 'Could not reach the ULAB portal. Check your connection.' };
    }
    if (!response.ok) {
        return { ok: false, error: 'http', status: response.status, message: `The portal returned HTTP ${response.status}.` };
    }
    let html;
    try {
        html = decodePortalBytes(await response.arrayBuffer());
    } catch (e) {
        return { ok: false, error: 'decode', message: 'Could not read the portal response.' };
    }
    if (looksLikeLoginPage(html)) {
        // Deliberately no html in the payload: nothing downstream may cache
        // or parse a login page as if it were data.
        return { ok: false, error: 'session-expired', message: 'Your ULAB portal session has expired. Please log in again.' };
    }
    return { ok: true, html, url, fetchedAt: Date.now() };
}

function fetchPortalPage(pageKey) {
    const pending = inFlightPortalFetches.get(pageKey);
    if (pending) return pending;
    const promise = fetchPortalPageUncached(pageKey)
        .catch((error) => ({ ok: false, error: 'blocked', message: error && error.message ? error.message : 'Portal fetch refused.' }))
        .finally(() => { inFlightPortalFetches.delete(pageKey); });
    inFlightPortalFetches.set(pageKey, promise);
    return promise;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'ulab-portal-fetch') return;
    // NOTE: only `page` is read off the message. There is deliberately no
    // `url` / `path` / `query` field — see the invariant above.
    fetchPortalPage(message.page).then(sendResponse);
    return true; // async response
});
