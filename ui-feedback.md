# Student UX feedback — collected 2026-09-18

Raw feedback from students on the current legacy URMS student portal UI, collected before the
UI-revamp phase. This is the "second reference" handoff.md mentioned would arrive separately —
design direction from real user complaints rather than mockups. Constraint restated by the user:
**no server access — everything must be achievable client-side (scraping + re-rendering the
logged-in student's own session), and if something genuinely can't be done client-side, don't
attempt it.**

## Not fixable client-side (legacy site/server issues — out of scope)

1. **Logout doesn't stick on back-navigation (esp. mobile)** — classic bfcache issue; the site
   doesn't send `Cache-Control: no-store` on authenticated pages. We don't control response
   headers. Partial mitigation only: our injected content scripts could re-check login state on
   `pageshow`/`visibilitychange` and force a reload if the page looks cached-stale, but can't
   guarantee it fully — flag as best-effort, not a fix.
2. **Registration sometimes silently fails to save** — server-side persistence bug. Nothing we
   can do beyond maybe reading back the saved state after submission and warning the student if
   what's displayed doesn't match what they just submitted (defensive UI, not a fix).
3. **Advising process is slow** — server/process bottleneck, not fixable by an extension. The
   *mitigation* is feature 11 below (self-advising) — if students catch prereq/degree-progress
   problems themselves before an advising session, less back-and-forth is needed with faculty.

## Fixable client-side (real feature backlog)

4. **Overall UI feels messy, lifeless, boxy, too many sharp edges** — general design language:
   rounded corners, modern spacing/type, less table-chrome. Standard UI-revamp scope.
5. **Course history list** — need a dropdown-by-semester view of courses taken, ideally with
   faculty name + GC (Google Classroom) code for the *current* semester's courses. Source:
   Status.php's "Result of completed/registered courses" table gives semester+course+grade;
   faculty/GC code isn't on any scraped page yet — check schedule.php or dashboard for a
   faculty-name field, otherwise this part may need to stay a TODO until that data surfaces
   somewhere scrapeable.
6. **Preregistration page** — redesign course selection as a more organized, less tedious flow.
   Compare with faculty companion's advising wizard UI pattern.
7. **Billing page** — dues currently flat-listed (date/head/amount); group by semester with a
   clear per-semester charge breakdown instead of one long undifferentiated list.
8. **Payment history** — same complaint, needs more context/structure than date+amount+MR#.
9. **Result page** — group results by semester (collapsible sections) instead of one flat table
   spanning the whole degree.
10. **Comments column in Result table** — always empty in the sample data, drop it or repurpose.
11. **Self-advising / recommended courses** — the big one, mirrors handoff.md's planned feature 3:
    port `ulab-faculty-companion/features/advising/advising.js`'s rule engine (prereq violations,
    lab-without-theory, retakes, degree-progress gaps) to run against the *current* student's own
    completed-course data (sourced from Status.php per the completed-courses-source decision
    already made) using the catalogue data in `catalogues/*.js`, and surface course
    recommendations toward degree completion — explicitly framed by the student as reducing how
    often they need to go to a faculty adviser in person.

## Design takeaway

Points 5, 7, 9 all point at the same underlying pattern: **group by semester with
collapsible/dropdown sections** instead of the legacy site's flat unbroken tables. Apply that
pattern consistently across Course History, Billing, and Result — it's the single biggest
readability win being asked for across three separate complaints.
