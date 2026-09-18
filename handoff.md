# ULAB Student Companion — handoff

## What this is

A sibling project to `ulab-faculty-companion` (same author, same machine, at
`../ulab-faculty-companion` relative to this folder — read it before starting, it's the
reference implementation). That extension is a Chrome side-panel tool for **faculty** built on
top of the faculty URMS site (`urms-awp.ulab.edu.bd`). This project is the **student-facing**
counterpart, built the same way, on top of the *student* portal:

**Target site: `https://urms-online.ulab.edu.bd/`**

This is a *different* URMS deployment than the faculty one — different login form, different
page structure, likely different DOM/table markup for schedule, billing, and preregistration
pages even though conceptually they show the same data. Do not assume faculty-side selectors
carry over. `reference-html/login.html` and `reference-html/dashboard.html` are real saved pages
from this student portal — start there for selectors/structure, but expect to need to inspect
more live pages (schedule.php, Preregistration.php, Billing.php, Status.php, profile.php) since
only login + home were handed off.

## Architecture — copy the faculty-companion pattern

Same MV3 Chrome extension shape as `ulab-faculty-companion`:

```
manifest.json              MV3 manifest — side_panel + host_permissions for urms-online.ulab.edu.bd
background.js               service worker: opens the side panel
sidebar/                     side panel shell (feature rail + router)
features/
  common/                     shared wizard/UI styling
  <feature>/                   one self-contained module per feature
docs/
  index.html                  full documentation
  privacy-policy.html
```

Each feature registers itself onto `window.ULAB_FEATURES` with `id`, `icon`, `title`,
`subtitle`, `mount(container)` — see `ulab-faculty-companion/docs/index.html#architecture` for
the exact pattern and copy it verbatim. No build step: plain HTML/CSS/JS, loaded directly by the
manifest, same as the faculty extension. Everything runs client-side against the logged-in
student's own `urms-online.ulab.edu.bd` session cookies — no third-party server, matching the
faculty extension's privacy posture (carry the same "nothing leaves your browser" promise into
this project's privacy policy).

## Course data already copied into `docs/`

Pulled straight from `ulab-faculty-companion/docs/` and `ulab-faculty-companion/features/advising/catalogues/`
since the course catalogue / prerequisite / equivalence data is the same university-wide data,
independent of which portal (faculty vs student) consumes it:

- `docs/catalogues/*.js` — hand-transcribed prerequisite + lab/theory-pairing + UNESCO-code data,
  one file per program (CSE, BBA, English, MSJ, EEE, Bangla) + `registry.js`. This is the exact
  same format `features/advising/advising.js` in the faculty extension consumes — reuse these
  files directly for this project's course-recommendation feature rather than re-transcribing.
- `docs/courses-scrapped-urms.txt` — tab-separated course code / name / credit export scraped
  from a real URMS course list, used to cross-match UNESCO codes.
- Course catalogue PDFs, per-program course allocation spreadsheets (Fall 2026), and
  cross-department equivalence spreadsheets (BBA/MSJ/DEH/CSE/EEE).

Treat this data as best-effort (it was hand-transcribed / cross-matched, not pulled live) — same
caveat as the faculty project. If URMS student portal exposes a live, scrapeable course list or
degree-progress page, prefer scraping fresh data over trusting these static files blindly.

## Reference HTML

`reference-html/login.html` and `reference-html/dashboard.html` — real saved output from
`urms-online.ulab.edu.bd`, given as the ground truth for what the *current* (legacy, table-based,
circa-2005-style) UI looks like. Key observations already extracted:

- Login: `POST /index.php` with `studentID` + `password` fields, no CSRF token visible in the
  snippet — check the live page for one before automating login-adjacent flows.
- Dashboard nav (`#menubar`): Home, Teacher Evaluation, Course Evaluation, Preregistration,
  Schedule, Billing, Result (`Status.php`), Profile, Logout (`index.php?logout=1`).
- Dashboard header shows semester code + label (e.g. `263` → `Fall 2026`), student ID + name,
  adviser name + email — all scrapeable straight out of a `<p>` via regex/DOM walk, no special
  markup.
- Site is windows-1252 encoded, table-layout HTML from a legacy PHP system (same
  ValuePLUS/vpcsbd.com vendor as the faculty portal) — expect brittle, non-semantic markup
  throughout; build scrapers defensively (text-content matching over relying on class names,
  since class names here are generic like `.content`, `.top_menu`).

**A second reference will be supplied separately**: the user says "I will give you the HTML in
the other agent" for a UI revamp — i.e. expect a follow-up drop of more page HTML (or new/updated
design mockups) mid-project. Don't treat the two pages here as the complete set of pages to
support.

## Planned features (shared system, student-facing angle)

1. **Google Calendar sync** — pull the student's class schedule from `schedule.php` (structure
   TBD, not yet handed off — inspect the live page) and let them export/sync it to Google
   Calendar. Compare with faculty companion's `features/time/` (Free Time Finder) for the
   schedule-scraping approach already proven against the faculty portal's schedule data — the
   parsing technique likely transfers even though the DOM differs.
2. **UI revamp** — the legacy table-based UI above is what students currently see baked into
   URMS. The side-panel extension shell should present a modern UI on top, same as
   `ulab-faculty-companion/sidebar/` does. Wait for the HTML the user will hand off in the other
   agent before designing this — don't invent one from scratch first.
3. **Recommended courses / self-advising** — mirror `ulab-faculty-companion`'s Student Advising
   feature (`features/advising/`) but from the student's own point of view: warn the student
   themselves about prerequisite violations, labs registered without theory, probation-relevant
   retakes, and degree-progress gaps, using the same `docs/catalogues/*.js` data already copied
   in here. This is a read-only, self-serve version of what faculty currently run on a student's
   behalf — reuse `advising.js`'s rule logic, rewrite the UI/copy for a first-person student
   audience instead of an adviser audience.

## Things to check before building

- Confirm `urms-online.ulab.edu.bd` is reachable and get real DOM samples for
  `schedule.php`, `Preregistration.php`, `Billing.php`, `Status.php`, `profile.php` — only
  login + home were provided.
- Confirm session/cookie mechanics (is it the same PHPSESSID-style cookie the faculty portal
  uses, same-origin fetches from the side panel work the same way?).
- Check whether `urms-online.ulab.edu.bd` and `urms-awp.ulab.edu.bd` are the same backend with
  different themes (likely, given identical "ValuePLUS Computer Systems Ltd." footer branding)
  or genuinely separate deployments — this affects whether course-code formats, semester codes,
  etc. are guaranteed consistent between the two data copies in `docs/`.
