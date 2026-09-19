# Student registration flow & feature backlog

Domain knowledge supplied by the user (a real student user flow), plus the backlog that
depends on it. Recorded 2026-09-19. This drives correctness decisions across
Preregistration.php and schedule.php — read it before changing either.

## The real pre-registration flow

Each batch gets a specific time slot when the portal opens for pre-registration.

1. **Portal opens.** Student clicks courses on **Preregistration.php**. Each click flips that
   course's "Taken?" mark from ❌ to ✅ (a real server round-trip via
   `?task=changeTakenStatus`, which navigates the page).
   - Selecting too many credits makes the page display **"Maximum credit limit exceeded"**.
2. **Student clicks "Pre Advising Complete"** (`?task=changePreAdvStatus`). Its ❌ turns ✅,
   the page refreshes, and only then is the student allowed to pick course timings.
3. **Student moves to schedule.php** and uses **"Select"** to choose timings by section number
   (`?task=selectSection`).
   - Over-subscribed section → page shows **"Section Capacity exceeded"**.
   - Overlapping timings → page shows **"Conflicts found"** *and lists the conflicting courses*.
4. **Student clicks "Advising Complete"** (`?task=changeAdvStatus`). ❌ → ✅ and
   pre-registration ends.

### Consequences for the UI
- The flow is **strictly ordered**: course selection → pre-advising complete → timing selection
  → advising complete. The UI should reflect where the student currently is, not present all
  steps as equally available.
- **Once a step is complete, its action must not be clickable.** Per the user: the advising
  button should not be clickable once advising is done; it should be clickable when not done.
  We have only ever captured the *completed* state in `reference-html/`, so the safe
  implementation is: disabled when the page reports complete, enabled otherwise.
- **Once registration is complete, all action controls are disabled** — the legacy page says
  "Registration complete. No changes can be made."
- The three error states — *Maximum credit limit exceeded*, *Section Capacity exceeded*,
  *Conflicts found* (plus its list of conflicting courses) — are real states we have never
  captured in a reference file. They must be passed through and displayed, never swallowed,
  and the conflict list in particular must not be truncated to just the banner text.

## Backlog (from 2026-09-19 review)

Done:
- [x] Adviser email parsed as `...@ulab.edu.bdRegistration` — the TLD pattern was
      case-insensitive `[A-Za-z]{2,}` and swallowed the following capitalised word. Fixed in
      `ulab-dashboard-shell.js` (`scrapeStudentInfo`), so it's corrected on every page at once.
- [x] Co-curricular table filled with normal courses — the backwards text-walk matched the
      "See Co-curricular Courses" *jump link* sitting above the main table. Now anchored on the
      real `#ccc` heading using document order.

Pending:
- [ ] **Schedule view toggle** — bring back the previous calendar-style weekly view as an option
      alongside the current dense table; remember the choice.
- [ ] **Duplicate "Advising complete" control** — it renders twice (once as a pill in the header
      strip, once in the actions row). Show it once.
- [ ] **Disable completed-step actions** (see flow above) and disable everything once
      registration is complete.
- [ ] **Show already-passed courses on Preregistration** (read-only, non-interactive) so the
      student doesn't have to cross-reference the Result page while choosing courses.
- [ ] **Background portal fetch** — the extension should GET `profile.php` / `Status.php` itself
      instead of telling the student "open your Profile page once". NOTE: a first attempt at this
      failed on a session rate limit before writing any code.
      **Hard safety invariant** for whoever builds it: `changeTakenStatus`, `selectSection`,
      `changeAdvStatus` and `changePreAdvStatus` are *state-mutating GET links*. A fetcher that
      follows scraped hrefs would really register/unregister courses. Restrict to a hardcoded
      allowlist of bare page paths and reject any query string at one choke point. Pages are
      `windows-1252`, so decode via `ArrayBuffer` + `TextDecoder('windows-1252')`.
- [ ] **Self-Advising Check tool icons** — currently odd; use the pill-style icon+label tabs that
      `../ulab-faculty-companion`'s tools frame uses.
- [ ] **Class routine editor + export** — port from `../ulab-faculty-companion` into My Tools.
      Same as faculty's, minus consultation hours. Student can edit their routine and export it.
      Profile photo should be pulled automatically from `profile.php`
      (`/Photo/<studentID>.jpg`).
