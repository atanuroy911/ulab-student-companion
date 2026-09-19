# Changelog

All notable changes to the **ULAB Student Companion** browser extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
