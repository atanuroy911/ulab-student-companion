# Changelog

All notable changes to the **ULAB Student Companion** browser extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1] - 2026-09-19

### Improved
- **Comprehensive Mobile & Responsive Layout Optimizations**:
  - **Single-Column Info Grids on Mobile**: `.bento-infogrid` automatically collapses into single-column key-value pairs on mobile viewports (`<= 680px`), eliminating cramped text wrapping.
  - **Responsive Stat Strips**: `.bento-statstrip` transforms into a 2x2 grid on mobile (`<= 680px`) and stacked single-column cards on small mobile screens (`<= 440px`).
  - **Touch Target Sizes**: Scaled interactive buttons, action links, and chips to `28px–36px` touch target height.
  - **Responsive App Header & Branding**: Adjusted `#ulab-app-header` mobile padding and header height (`56px`), hiding secondary sub-headings on narrow viewports (`<= 540px`) to prevent logo overlap.
  - **Home Dashboard Launcher Grid**: Responsive 2-column mobile launcher layout for `.home-grid` on screens `< 480px`.
  - **Mobile Table Scrolling**: Added smooth `-webkit-overflow-scrolling: touch` momentum scrolling and padding adjustments for all `.bento-tablewrap` containers.

---

## [1.1.0] - 2026-09-19

### Added
- **Simple & Advanced UI Modes**:
  - Global toggle in the sidebar footer allowing students to switch between **Simple** and **Advanced** modes.
  - **Simple Mode Features**:
    - **Preregistration**: Prominent red banner for completed registrations (*"Registration complete. No changes can be made."*), isolated Credit / Course Summary card, and simplified course listing (hides passed course records and extra metrics).
    - **Teacher & Course Evaluation**: Prominent red read-only alert for closed evaluation deadlines (*"Deadline is over. No changes can be made."*).
    - **Schedule**: Clean, focused timetable table view without unnecessary complexity.
    - **Billing**: Added a semester filter dropdown to easily filter dues and payments by term.
    - **Result**: Clean semester-wise GPA tables without extra trends.
  - **Advanced Mode Features**:
    - Full credit meters, interactive semester GPA trend charts, table/calendar view switchers, routine `.ics` downloads, and complete historical course records.
- **My Journey Integration**:
  - Automatically incorporates current courses registered on the Schedule page into the *My Journey* roadmap, indicating if student course progression differs from standard plan recommendations.

### Fixed
- **UI Mode Toggle Persistence & Fixes**:
  - Resolved asynchronous storage retrieval in `ulab-dashboard-shell.js` so student mode preference loads properly before page script execution.
  - Exported `isSimpleMode()` on `window.ULAB_SHELL` to fix content script crashes across non-home pages.
  - Added cross-tab storage change listener so open tabs automatically update when mode is toggled.
- **Sidebar Hamburger Menu**:
  - Restored clean hamburger menu button placement inside the dark navy sidebar header.
- **Payment Link & Overlay Fixes**:
  - Fixed payment modification links to point directly to the official URL (`https://urms-online.ulab.edu.bd/PaymentInfo.php`).
  - Fixed bKash iframe modal `z-index` layering to ensure payment prompts display above all header elements.

---

## [1.0.0] - 2026-09-19

### Added
- Initial Chrome Web Store release version.
- Complete Bento-style modern UI reskin for ULAB URMS portal:
  - Home dashboard quick links.
  - Preregistration planner with prerequisite checks and degree-progress tracking.
  - Class schedule viewer with routine export options.
  - Billing summary and ledger breakdowns.
  - Grade status & GPA trend calculator.
  - Student profile and evaluation screens.
- Embedded side panel & tool iframe suite (Self-Advising Check, Capstone Eligibility, Course Catalogue, Routine & ICS Export, Marks Management).
