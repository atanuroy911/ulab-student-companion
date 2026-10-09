// features/status/status-ui-content.js — content script injected into the
// URMS student portal Result page (Status.php, "Result" in #menubar).
//
// This is the AUTHORITATIVE source for the current student's completed-
// course history — better than Preregistration.php's tick/x column, which
// only reflects "registered in this semester's plan", not "completed with a
// grade". Status.php's "Result of completed/registered courses" table has
// one row per course the student has EVER taken (all semesters), with:
//   Semester | Course (code) | Course Title | Type (CORE/GED/GED Elective.../
//   blank) | Credit | Result (letter grade, or "S" for satisfactory/
//   ungraded, or BLANK if still in-progress this semester) | Comments
// A non-blank Result (letter grade or "S") means completed/passed — that's
// exactly the "current student's completed courses" input the self-advising
// feature (prerequisite / retake / degree-progress checks against
// catalogues/*.js) needs. Rows with a blank Result are in-progress/
// not-yet-graded and are cached separately, not counted as completed.
//
// Also scrapes the header academic-summary stats (CGPA, total credit hours,
// course counts) and the Semester-wise GPA table, since they're free once
// we're parsing this page and useful for a future "My Progress" panel.
//
// PARSER LOCATION: the actual scrape now lives in
// features/shared/ulab-portal-parsers.js as parseStatus(doc), so the very
// same code serves this live page AND a copy of Status.php fetched in the
// background for the side panel (which has no portal DOM of its own). This
// file keeps the on-page path: parse the LIVE document — free, no request —
// and write the same cache keys as always.
(function () {
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
        window.ULAB_SHELL.mount('ulab-page-status', null, () => {
            try {
                // storeFromDocument() parses the live DOM and writes
                // ulabAcademicSummary / ulabSemesterGPA / ulabCompletedCourses
                // / ulabInProgressCourses + ulabStatusScrapedAt — the same
                // keys and stamp this file has always written.
                window.ULAB_PORTAL_DATA.storeFromDocument('status', document);
            } catch (e) {
                console.error('[Student Companion] failed to cache Status.php data', e);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
