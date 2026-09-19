# 🎓 ULAB Student Companion

> A modern browser extension that transforms the University of Liberal Arts Bangladesh (ULAB) URMS & MMS portals into a sleek, responsive, feature-packed academic workspace.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25%20local-success.svg)

---

## 🌟 Overview

**ULAB Student Companion** replaces the legacy table-based UI of ULAB's student portal (**URMS**) and Marks Management System (**MMS**) with a modern **Bento Grid UI**, responsive sidebar navigation, dark mode, and powerful self-advising tools designed specifically for ULAB undergraduate students.

---

## ✨ Features

### 🎨 Modern Bento UI & Dark Mode
- **Clean Responsive Layout**: Upgrades dated 2000s table layouts into structured, accessible Bento cards.
- **Dark Mode Support**: Toggle sleek dark mode anytime from the sidebar.
- **Custom Font Scaling**: Scale text size dynamically (85% to 125%) to fit your viewing preference.
- **Collapsible Sidebar**: Easy navigation between all URMS pages and integrated companion tools.

### 🤖 Smart Self-Advising & Prerequisite Check
- **Department Catalogues**: Built-in rules for **CSE**, **BBA**, **MSJ**, **English**, **EEE**, and **Bangla** degree plans.
- **Real-Time Preregistration Audit**: Instantly checks prerequisites, retake options, completed credits, and waiver statuses during course selection.
- **Course Catalogue Lookup**: Search and filter courses by code, title, prerequisites, and credit load.

### 🎓 Capstone & Thesis Eligibility
- Verifies completed credit thresholds and mandatory major prerequisites to determine thesis/capstone eligibility prior to advising.

### 📅 Routine & Calendar Export
- Weekly class schedule grid with time-slot visualization and room details.
- One-click export to **Google Calendar** and standard **`.ics`** calendar files.

### 📊 Marks Management System (MMS) Enhancement
- Integrates directly with `mms.ulab.edu.bd` to format continuous assessment mark breakdown tables.
- Calculates weighted component totals and grade projections.

### 💳 Payment & Billing Improvements
- Restyled payment confirmation supporting **City Bank** gateway and **bKash** merchant checkout.
- Overlay z-index fixes ensure payment prompts display cleanly above all navigation headers.

### 🛡️ Privacy First
- **Zero Remote Servers**: All student records are parsed locally in the browser.
- **No Analytics / Tracking**: Your student data never leaves your device.

---

## 💻 Installation

### Method 1: Chrome Web Store (Recommended)
1. Visit the **ULAB Student Companion** on the Chrome Web Store.
2. Click **Add to Chrome**.

### Method 2: Developer Mode (Manual Installation)
1. Clone or download this repository:
   ```bash
   git clone https://github.com/atanuroy911/ulab-student-companion.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right toggle.
4. Click **Load unpacked**.
5. Select the `ulab-student-companion` root folder.

---

## 📂 Project Structure

```
ulab-student-companion/
├── manifest.json              # Extension Manifest V3 configuration
├── background.js              # Service worker & side panel handler
├── catalogues/                # Departmental degree requirements & prerequisite trees
│   ├── cse.js
│   ├── bba.js
│   ├── english.js
│   ├── msj.js
│   ├── eee.js
│   ├── bangla.js
│   └── registry.js
├── features/                  # Modular feature content scripts
│   ├── advising/              # Advising & prerequisite engine
│   ├── billing/               # Payment & invoice formatting
│   ├── common/                # Shared CSS design tokens (bento-ui.css)
│   ├── evaluation/            # Teacher & course evaluation UI
│   ├── home/                  # URMS home page dashboard
│   ├── login/                 # Portal login page reskin
│   ├── marks/                 # MMS marks integration
│   ├── preregistration/       # Self-advising overlay for Preregistration.php
│   ├── profile/               # Student profile view
│   ├── schedule/              # Class routine & calendar exporter
│   ├── shared/                # Dashboard shell & portal parsers
│   ├── status/                # Results & CGPA breakdown
│   └── teacher-evaluation/    # Teacher evaluation module
├── sidebar/                   # Extension side panel view & scripts
├── docs/                      # Extension landing page & privacy policy
└── icons/                     # Extension branding assets
```

---

## 📄 Privacy Policy

ULAB Student Companion operates entirely within your browser. It does not collect, store, or transmit any personal identification information, academic records, credentials, or browsing history to external servers.

For full privacy documentation, read our [Privacy Policy](docs/privacy-policy.html).

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). Not officially affiliated with or endorsed by the University of Liberal Arts Bangladesh (ULAB).
