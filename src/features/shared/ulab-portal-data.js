// features/shared/ulab-portal-data.js — the CLIENT half of the portal
// data-fetch layer. Loads in any context that has a DOM: a content script on
// a URMS page, or the extension-origin side panel.
//
// Exposes window.ULAB_PORTAL_DATA:
//
//   ensure(pageKey, { maxAgeMs, force })  -> Promise<Result>
//       Fresh cache  → returns it, no network.
//       Otherwise    → asks background.js for the page ONCE, parses it with
//                      the shared parsers, writes the EXISTING storage keys,
//                      returns the parsed data.
//   ensureAll(pageKeys, opts)             -> Promise<{ [key]: Result }>
//       Sequential on purpose (see "politeness" below).
//   storeFromDocument(pageKey, doc)       -> writes the cache from a live
//                                            page parse, so being ON a page
//                                            still costs zero requests.
//   read(pageKey)                         -> Promise<{data, stampedAt}> cache
//                                            only, never fetches.
//
//   Result = { ok: true, data, fromCache, fetchedAt }
//          | { ok: false, error: 'session-expired'|'network'|'http'
//                              |'decode'|'blocked'|'parse'|'unavailable',
//              message }
//
// CALLERS MUST HANDLE ok:false. In particular `session-expired` means the
// portal served its inline login form (HTTP 200, no redirect — this portal
// never redirects), so the honest UI is "please log in", NEVER an empty
// table rendered as if the student had no courses. Nothing is cached on any
// failure.
//
// SAFETY: callers pass a symbolic PAGE KEY, never a URL. The allowlist and
// the no-query-string rule live in background.js — see the invariant comment
// there about task=changeTakenStatus & friends, which are state-mutating GET
// links on these very pages.
(function () {
    if (window.ULAB_PORTAL_DATA) return; // idempotent

    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;

    // ── TTLs ────────────────────────────────────────────────────────────
    // This is a real university server, so nothing is prefetched and each
    // TTL is set by how fast that page's data can actually change:
    //
    //  • preregistration / schedule — 10 min. These are the ONLY pages the
    //    student mutates minute-to-minute, and only during the registration
    //    window (Select/Unselect, section changes). Anything longer risks
    //    showing a course as unregistered seconds after they registered it.
    //    Being ON either page re-parses the live DOM anyway, for free, so
    //    this TTL only governs the side panel's view of them.
    //  • billing — 2 h. Changes when a payment posts, which is a
    //    manual/bank-side event, never several times an hour.
    //  • status (grades) — 6 h. Results post once at the end of a term;
    //    6 h is already far tighter than the data's real rate of change,
    //    and it is the page the most features depend on.
    //  • evaluations — 6 h. A submission flips one row, and the student
    //    does that from the portal page itself (which re-parses live).
    //  • profile — 24 h. Name/ID/program are effectively static for years.
    //
    // Callers may override per call with { maxAgeMs }. A stale-but-present
    // cache is still returned if the refresh fails — see ensure().
    const DEFAULT_TTL = {
        preregistration: 10 * MINUTE,
        schedule: 10 * MINUTE,
        billing: 2 * HOUR,
        status: 6 * HOUR,
        teacherEvaluation: 6 * HOUR,
        courseEvaluation: 6 * HOUR,
        profile: 24 * HOUR,
    };

    const EVAL_CONFIG = {
        teacherEvaluation: {
            headerPatterns: [/Teacher\s*ID/i, /Teacher\s*Name/i, /Course\s*ID/i, /Evaluate/i],
            columns: ['teacherId', 'teacherName', 'courseId', 'courseName', 'section', 'evaluate'],
        },
        courseEvaluation: {
            headerPatterns: [/Course\s*ID/i, /Course\s*Name/i, /Section/i, /Evaluate/i],
            columns: ['courseId', 'courseName', 'section', 'evaluate'],
        },
    };

    // ── Page descriptors ────────────────────────────────────────────────
    // Every page maps to the EXISTING storage keys and the EXISTING
    // *ScrapedAt stamp the on-page content scripts already write, so a
    // fetched parse and a live parse are indistinguishable downstream and no
    // consumer needs to learn a new key.
    const PAGES = {
        status: {
            keys: ['ulabAcademicSummary', 'ulabSemesterGPA', 'ulabCompletedCourses', 'ulabInProgressCourses'],
            stampKey: 'ulabStatusScrapedAt',
            parse: (doc) => window.ULAB_PARSERS.parseStatus(doc),
            toStorage: (data) => ({
                ulabAcademicSummary: data.summary,
                ulabSemesterGPA: data.semesterGPA,
                ulabCompletedCourses: data.completed,
                ulabInProgressCourses: data.inProgress,
            }),
            fromStorage: (store) => ({
                summary: store.ulabAcademicSummary || null,
                semesterGPA: store.ulabSemesterGPA || [],
                completed: store.ulabCompletedCourses || [],
                inProgress: store.ulabInProgressCourses || [],
            }),
            // "Did the parse actually find anything?" — a structurally valid
            // but empty parse is not cached as truth.
            hasContent: (data) => !!(data && ((data.completed && data.completed.length) || (data.inProgress && data.inProgress.length))),
        },
        profile: {
            keys: ['ulabStudentProfile'],
            // profile has always carried its own `scrapedAt` INSIDE the
            // record rather than a sibling key (window.ULAB_SHELL's
            // refreshProfileCache() reads it that way) — keep that.
            stampKey: null,
            stampFromStore: (store) => (store.ulabStudentProfile && store.ulabStudentProfile.scrapedAt) || 0,
            parse: (doc) => window.ULAB_PARSERS.parseProfile(doc),
            toStorage: (data) => ({ ulabStudentProfile: data }),
            fromStorage: (store) => store.ulabStudentProfile || null,
            hasContent: (data) => !!(data && (data.studentId || data.studentName || data.programCode)),
        },
        preregistration: {
            keys: ['ulabPreregCourses', 'ulabPreregAdvisingExtras'],
            stampKey: 'ulabPreregScrapedAt',
            parse: (doc) => window.ULAB_PARSERS.parsePreregistration(doc),
            toStorage: (data) => ({ ulabPreregCourses: data.courses, ulabPreregAdvisingExtras: data.extras }),
            fromStorage: (store) => ({ courses: store.ulabPreregCourses || [], extras: store.ulabPreregAdvisingExtras || {} }),
            hasContent: (data) => !!(data && data.courses && data.courses.length),
        },
        schedule: {
            keys: ['ulabClassSchedule', 'ulabScheduleExtras'],
            stampKey: 'ulabScheduleScrapedAt',
            parse: (doc) => window.ULAB_PARSERS.parseSchedule(doc),
            toStorage: (data) => ({ ulabClassSchedule: data.courses, ulabScheduleExtras: data.extras }),
            fromStorage: (store) => ({ courses: store.ulabClassSchedule || [], extras: store.ulabScheduleExtras || {} }),
            hasContent: (data) => !!(data && data.courses && data.courses.length),
        },
        billing: {
            keys: ['ulabBillingSummary', 'ulabBillingDues', 'ulabBillingPayments'],
            stampKey: 'ulabBillingScrapedAt',
            parse: (doc) => window.ULAB_PARSERS.parseBilling(doc),
            toStorage: (data) => ({
                ulabBillingSummary: data.summary,
                ulabBillingDues: data.dues,
                ulabBillingPayments: data.payments,
            }),
            fromStorage: (store) => ({
                summary: store.ulabBillingSummary || null,
                dues: store.ulabBillingDues || [],
                payments: store.ulabBillingPayments || [],
                ledgerNotice: null, // notice text is page-render only, not cached
            }),
            hasContent: (data) => !!(data && ((data.dues && data.dues.length) || (data.payments && data.payments.length) || data.summary)),
        },
        teacherEvaluation: evaluationPage('ulabTeacherEvaluation', 'teacherEvaluation'),
        courseEvaluation: evaluationPage('ulabCourseEvaluation', 'courseEvaluation'),
    };

    function evaluationPage(storageKey, pageKey) {
        return {
            keys: [storageKey],
            stampKey: storageKey + 'ScrapedAt',
            parse: (doc) => window.ULAB_PARSERS.parseEvaluation(doc, EVAL_CONFIG[pageKey]),
            toStorage: (data) => ({ [storageKey]: data.rows }),
            fromStorage: (store) => ({ rows: store[storageKey] || [], deadlineBanner: null }),
            hasContent: (data) => !!(data && data.rows && data.rows.length),
        };
    }

    // ── storage promise wrappers ────────────────────────────────────────
    function storageGet(keys) {
        return new Promise((resolve) => {
            try { chrome.storage.local.get(keys, (result) => resolve(result || {})); }
            catch (e) { resolve({}); }
        });
    }

    function storageSet(values) {
        return new Promise((resolve) => {
            try { chrome.storage.local.set(values, () => resolve()); }
            catch (e) { resolve(); }
        });
    }

    function sendToBackground(message) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError || !response) {
                        resolve({ ok: false, error: 'unavailable', message: 'The extension background worker did not respond.' });
                        return;
                    }
                    resolve(response);
                });
            } catch (e) {
                resolve({ ok: false, error: 'unavailable', message: 'The extension background worker is not reachable.' });
            }
        });
    }

    function descriptor(pageKey) {
        const page = PAGES[pageKey];
        if (!page) throw new Error(`ULAB_PORTAL_DATA: unknown page key "${pageKey}"`);
        return page;
    }

    function stampOf(page, store) {
        if (page.stampFromStore) return page.stampFromStore(store) || 0;
        return store[page.stampKey] || 0;
    }

    function readKeys(page) {
        return page.stampKey ? page.keys.concat([page.stampKey]) : page.keys.slice();
    }

    // ── cache read ──────────────────────────────────────────────────────
    async function read(pageKey) {
        const page = descriptor(pageKey);
        const store = await storageGet(readKeys(page));
        return { data: page.fromStorage(store), stampedAt: stampOf(page, store) };
    }

    // ── cache write ─────────────────────────────────────────────────────
    async function write(pageKey, data) {
        const page = descriptor(pageKey);
        const values = page.toStorage(data);
        if (page.stampKey) values[page.stampKey] = Date.now();
        await storageSet(values);
    }

    // Called by the on-page content scripts: being ON a page must stay free
    // (parse the live DOM, never fetch) while still refreshing the cache the
    // side panel reads.
    function storeFromDocument(pageKey, doc) {
        const page = descriptor(pageKey);
        const data = page.parse(doc || document);
        write(pageKey, data);
        return data;
    }

    // ── in-flight de-duplication (this context) ─────────────────────────
    // background.js de-dupes across contexts; this de-dupes within one, so
    // two features in the same side panel calling ensure('status') in the
    // same tick share one promise and one parse.
    const inFlight = new Map();

    async function fetchAndParse(pageKey) {
        const page = descriptor(pageKey);
        const response = await sendToBackground({ type: 'ulab-portal-fetch', page: pageKey });
        if (!response.ok) return response; // session-expired / network / http / …

        let data;
        try {
            const doc = new DOMParser().parseFromString(response.html, 'text/html');
            data = page.parse(doc);
        } catch (e) {
            return { ok: false, error: 'parse', message: 'The portal page could not be read. Its layout may have changed.' };
        }
        if (!page.hasContent(data)) {
            return { ok: false, error: 'parse', message: 'Nothing readable was found on that portal page.' };
        }
        await write(pageKey, data);
        return { ok: true, data, fromCache: false, fetchedAt: response.fetchedAt || Date.now() };
    }

    async function ensure(pageKey, options) {
        const opts = options || {};
        const page = descriptor(pageKey);
        const maxAgeMs = typeof opts.maxAgeMs === 'number' ? opts.maxAgeMs : (DEFAULT_TTL[pageKey] || 6 * HOUR);

        const cached = await read(pageKey);
        const isFresh = cached.stampedAt && (Date.now() - cached.stampedAt) < maxAgeMs;
        if (!opts.force && isFresh && page.hasContent(cached.data)) {
            return { ok: true, data: cached.data, fromCache: true, fetchedAt: cached.stampedAt };
        }

        let promise = inFlight.get(pageKey);
        if (!promise) {
            promise = fetchAndParse(pageKey).finally(() => inFlight.delete(pageKey));
            inFlight.set(pageKey, promise);
        }
        const result = await promise;
        if (result.ok) return result;

        // Refresh failed. A stale cache is still better than nothing — EXCEPT
        // when the session died, where the caller must be told to log in
        // rather than shown data that may no longer be theirs to trust.
        if (result.error !== 'session-expired' && page.hasContent(cached.data)) {
            return { ok: true, data: cached.data, fromCache: true, stale: true, fetchedAt: cached.stampedAt, warning: result.message };
        }
        return result;
    }

    // Sequential, never parallel: we are one student's browser talking to a
    // shared university server, and a burst of seven requests for one panel
    // render is exactly the behaviour that gets an extension blocked.
    async function ensureAll(pageKeys, options) {
        const out = {};
        for (const key of pageKeys) {
            out[key] = await ensure(key, options); // eslint-disable-line no-await-in-loop
        }
        return out;
    }

    window.ULAB_PORTAL_DATA = { ensure, ensureAll, read, write, storeFromDocument, PAGES: Object.keys(PAGES), DEFAULT_TTL };
})();
