// features/shared/ulab-portal-parsers.js — the PURE page parsers, shared by
// the live page and by background-fetched HTML.
//
// Why this file exists
// ───────────────────
// Every parser used to read the global `document`, which meant it could only
// ever run on the page it was injected into. The side panel is an
// extension-origin page with no portal DOM at all, so any side-panel feature
// that needed portal data had to give up and tell the student to "go open
// the Result page once" — the dead-end the user explicitly rejected.
//
// The parsers now take a `Document` argument (defaulting to the global
// `document`, so every on-page caller is unchanged) and are free of any
// rendering, storage or `location` dependency. That makes ONE parser serve
// two callers:
//   • the content script on the live page  → parse(document)   [free]
//   • any context holding fetched HTML     → parse(new DOMParser()
//                                              .parseFromString(html,
//                                               'text/html'))
//
// The service worker deliberately does NOT parse (no DOMParser in MV3) — it
// only transports the decoded HTML. See background.js.
//
// Nothing here touches chrome.* — these are plain functions, which is also
// what makes them `node --check`-able and safe to run in either context.
(function () {
    if (window.ULAB_PARSERS) return; // idempotent if injected twice

    // Used only to absolutise the profile photo's relative src. Kept as a
    // hardcoded constant — no value parsed off a page ever becomes a URL
    // these modules request (see background.js's safety invariant).
    const PORTAL_ORIGIN = 'https://urms-online.ulab.edu.bd';

    // ── generic helpers ─────────────────────────────────────────────────
    function d(doc) { return doc || document; }

    function contentCell(doc) {
        return d(doc).querySelector('td.content') || d(doc).body;
    }

    function contentText(doc) {
        const cell = contentCell(doc);
        return ((cell && cell.textContent) || '').replace(/\s+/g, ' ').trim();
    }

    function cellText(cell) {
        return cell ? (cell.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }

    // Tables on this portal carry no distinguishing id/class (see
    // handoff.md's brittle-markup warning) — they are located by header text.
    function findTableByHeaders(doc, requiredHeaderPatterns) {
        return Array.from(d(doc).querySelectorAll('table')).find((table) => {
            const headerRow = table.querySelector('tr');
            const headerText = headerRow ? headerRow.textContent || '' : '';
            return requiredHeaderPatterns.every((re) => re.test(headerText));
        }) || null;
    }

    function isTicked(img) {
        if (!img) return false;
        return (img.getAttribute('src') || '').toLowerCase().includes('tick');
    }

    // Preserves the portal's OWN control markup byte-for-byte so the render
    // layer can pass a real portal action through untouched. Note this is
    // markup CAPTURE only — nothing here ever follows the href (see the
    // safety invariant in background.js).
    function controlMarkup(cell) {
        const control = cell && cell.querySelector('a,button,input,select,img[onclick],[onclick]');
        return control ? control.cloneNode(true).outerHTML : '';
    }

    function parseMoney(s) {
        if (!s) return null;
        const n = parseFloat(String(s).replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? null : n;
    }

    // ── Status.php ──────────────────────────────────────────────────────
    function statusSummary(text) {
        const cgpa = text.match(/CGPA:\s*([\d.]+)/i);
        const totalCredit = text.match(/Total Credit Hours completed\s*:\s*([\d.]+)/i);
        const before = text.match(/Number of Courses Completed Before This semester\s*:\s*(\d+)/i);
        const thisSem = text.match(/Number of Courses Completed in This semester\s*:\s*(\d+)/i);
        const total = text.match(/Total Number of Courses Completed\s*:\s*(\d+)/i);
        return {
            cgpa: cgpa ? parseFloat(cgpa[1]) : null,
            totalCreditHours: totalCredit ? parseFloat(totalCredit[1]) : null,
            coursesCompletedBeforeThisSemester: before ? parseInt(before[1], 10) : null,
            coursesCompletedThisSemester: thisSem ? parseInt(thisSem[1], 10) : null,
            coursesCompletedTotal: total ? parseInt(total[1], 10) : null,
        };
    }

    function statusSemesterGPA(doc) {
        const table = findTableByHeaders(doc, [/Semester/i, /Credit Hours/i, /GPA/i, /CGPA/i]);
        if (!table) return [];
        return Array.from(table.querySelectorAll('tr')).slice(1).map((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 4) return null;
            return {
                semester: (cells[0].textContent || '').trim(),
                creditHours: parseFloat((cells[1].textContent || '').trim()) || null,
                gpa: parseFloat((cells[2].textContent || '').trim()) || null,
                cgpa: parseFloat((cells[3].textContent || '').trim()) || null,
            };
        }).filter(Boolean);
    }

    // Blank Result = still in-progress/ungraded this term. Anything else (a
    // letter grade, or "S" for satisfactory/non-graded courses) counts as
    // completed/passed.
    function statusResultTable(doc) {
        const table = findTableByHeaders(doc, [/Semester/i, /Course/i, /Course Title/i, /Credit/i, /Result/i]);
        if (!table) return { completed: [], inProgress: [] };
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        const completed = [];
        const inProgress = [];
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 6) continue;
            const semester = (cells[0].textContent || '').trim();
            const code = (cells[1].textContent || '').trim();
            if (!code) continue;
            const name = (cells[2].textContent || '').trim();
            const type = (cells[3].textContent || '').trim();
            const credits = parseFloat((cells[4].textContent || '').trim()) || null;
            const grade = (cells[5].textContent || '').trim();
            const comments = cells[6] ? (cells[6].textContent || '').trim() : '';
            const course = { semester, code, name, type, credits, grade, comments };
            if (grade) completed.push(course);
            else inProgress.push(course);
        }
        return { completed, inProgress };
    }

    function parseStatus(doc) {
        const text = contentText(doc);
        const results = statusResultTable(doc);
        return {
            summary: statusSummary(text),
            semesterGPA: statusSemesterGPA(doc),
            completed: results.completed,
            inProgress: results.inProgress,
        };
    }

    // ── profile.php ─────────────────────────────────────────────────────
    function parseProfile(doc) {
        const cell = contentCell(doc);
        const text = ((cell && cell.textContent) || '').replace(/\s+/g, ' ').trim();

        // Absolute, not the raw relative src: this record is also read by
        // the side panel, which is an extension-origin page where a
        // "Photo/123.jpg" would resolve against chrome-extension:// and 404.
        // PORTAL_ORIGIN is a constant here, never taken from page content.
        const photoImg = cell ? cell.querySelector("img[src*='/Photo/']") : null;
        const rawPhotoSrc = photoImg ? photoImg.getAttribute('src') : null;
        let photoUrl = null;
        if (rawPhotoSrc) {
            try { photoUrl = new URL(rawPhotoSrc, PORTAL_ORIGIN).href; }
            catch (e) { photoUrl = rawPhotoSrc; }
        }

        // "Label: value" text extraction, the same pattern used elsewhere on
        // this site (the profile table has no distinguishing id/class).
        const get = (label, stopLabelsPattern) => {
            const re = new RegExp(label + '\\s*:?\\s*([^]*?)(?=' + stopLabelsPattern + '|$)', 'i');
            const m = text.match(re);
            return m ? m[1].trim() : null;
        };

        // Present Address is the one MULTI-LINE field (Road/Sector/Thana
        // separated by <br/> — see reference-html/profile.html). textContent
        // flattens it into one run-on string, so read it off the DOM and turn
        // the <br>s back into newlines. `doc.createElement`, not
        // `document.createElement`: on a fetched document the scratch node
        // must belong to THAT document.
        function addressLines() {
            if (!cell) return null;
            const labelCell = Array.from(cell.querySelectorAll('td'))
                .find(td => /^\s*Present\s+Address\s*:?\s*$/i.test(td.textContent || ''));
            const valueCell = labelCell && labelCell.nextElementSibling;
            if (!valueCell) return null;
            const html = valueCell.innerHTML.replace(/<br\s*\/?>/gi, '\n');
            const tmp = d(doc).createElement('div');
            tmp.innerHTML = html;
            const lines = (tmp.textContent || '').split('\n').map(s => s.trim()).filter(Boolean);
            return lines.length ? lines.join('\n') : null;
        }

        const idMatch = text.match(/(\d{9})/); // student IDs on this site are 9 digits
        const profile = {
            studentId: idMatch ? idMatch[1] : null,
            studentName: null,
            programCode: null,
            phone: get('Tel/Mobile', 'Active Status'),
            ulabEmail: get('ULAB Mail', 'Payment Status'),
            personalEmail: get('Personal Mail', 'Registration Status'),
            presentAddress: addressLines() || get('Present Address', 'Tel/Mobile|$'),
            activeStatus: get('Active Status', 'ULAB Mail'),
            paymentStatus: get('Payment Status', 'Personal Mail'),
            registrationStatus: get('Registration Status', 'Present Address'),
            photoUrl,
            scrapedAt: Date.now(),
        };

        // Name + program code.
        //
        // STRUCTURE FIRST, text second. The profile block is
        //   <td><b>233014123</b></td> <td><h2>Mahdia Hossain</h2></td>
        //   <td><b>CSE</b></td> ... <td>Tel/Mobile</td>
        // with NO text nodes between those cells, so the flattened
        // textContent is literally "233014123Mahdia HossainCSE Tel/Mobile" —
        // no whitespace at all. A previous version required `\s+` between
        // those fields and therefore never matched, leaving programCode null,
        // which is what made Recommended Courses report "your programme could
        // not be read from the portal". Read the DOM instead: the <h2> is the
        // name, and the first following <b> that looks like a programme code
        // (2-6 uppercase letters, e.g. CSE / BBA / DEH) is the programme.
        const nameEl = cell && cell.querySelector('h2');
        if (nameEl) {
            const heading = (nameEl.textContent || '').replace(/\s+/g, ' ').trim();
            if (heading) profile.studentName = heading;

            for (const b of Array.from(cell.querySelectorAll('b'))) {
                const after = nameEl.compareDocumentPosition(b) & 4; // FOLLOWING
                if (!after) continue;
                const token = (b.textContent || '').trim();
                if (/^[A-Z]{2,6}$/.test(token)) { profile.programCode = token; break; }
            }
        }

        // Text fallback, for a page variant without the <h2>/<b> shape. The
        // separators are `\s*` precisely because they are usually absent.
        if (!profile.studentName || !profile.programCode) {
            const progMatch = text.match(/\d{9}\s*([A-Za-z .'-]+?)\s*([A-Z]{2,6})\s+Tel\/Mobile/);
            if (progMatch) {
                if (!profile.studentName) profile.studentName = progMatch[1].trim();
                if (!profile.programCode) profile.programCode = progMatch[2];
            }
        }

        return profile;
    }

    // ── Conflict list ("Conflicts found" + the conflicting courses) ──────
    // registration-flow.md records three real error states we have NEVER
    // captured in reference-html/: "Maximum credit limit exceeded",
    // "Section Capacity exceeded", and "Conflicts found" — the last of which
    // the portal renders *together with the list of conflicting courses*.
    // The banner regexes above only ever captured the sentence, so that list
    // was being silently dropped.
    //
    // This is deliberately DEFENSIVE and never fabricates: it returns [] when
    // it cannot find a list, which is exactly what happens on every sample we
    // do have (none of them is in a conflict state). It reads, in order:
    //   1. real list markup (<li>) inside or just after the banner's element,
    //   2. otherwise course-code-shaped tokens in the text that FOLLOWS the
    //      "Conflicts found" sentence within that same element.
    // Anything that matches neither shape yields nothing extra shown.
    const COURSE_CODE_RE = /^[A-Z]{2,4}\s?\d{3,4}[A-Z]?$/;

    function conflictCourses(cell) {
        if (!cell) return [];
        const out = [];
        const seen = new Set();
        const push = (value) => {
            const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
            if (!text || text.length > 120) return;
            const key = text.toUpperCase();
            if (seen.has(key)) return;
            seen.add(key);
            if (out.length < 30) out.push(text);
        };

        // Innermost element whose text mentions the banner — querySelectorAll
        // is in document order, so the LAST match is the deepest/narrowest
        // container rather than <body> or td.content.
        const hosts = Array.from(cell.querySelectorAll('*'))
            .filter(el => /conflicts?\s+found/i.test(el.textContent || ''));
        const host = hosts.length ? hosts[hosts.length - 1] : null;
        if (!host) return [];

        // 1. Explicit list markup, in the banner's element or the few
        //    elements immediately after it (a <ul>/<table> sibling).
        const scopes = [host];
        let sibling = host.nextElementSibling;
        for (let hops = 0; sibling && hops < 3; hops++, sibling = sibling.nextElementSibling) scopes.push(sibling);
        scopes.forEach((scope) => {
            scope.querySelectorAll('li').forEach(li => push(li.textContent));
        });
        if (out.length) return out;

        // 2. Fall back to course-code tokens AFTER the banner sentence, so
        //    the sentence's own words can never be mistaken for a course.
        const hostText = (host.textContent || '').replace(/\s+/g, ' ').trim();
        const match = hostText.match(/conflicts?\s+found[^:.]*[:.]?/i);
        const tail = match ? hostText.slice(match.index + match[0].length) : '';
        tail.split(/[,;\n•|]+/).forEach((token) => {
            const value = token.replace(/\s+/g, ' ').trim();
            if (COURSE_CODE_RE.test(value.toUpperCase())) push(value);
        });
        return out;
    }

    // ── Preregistration.php ─────────────────────────────────────────────
    function findCourseTables(doc) {
        return Array.from(d(doc).querySelectorAll('table')).filter((table) => {
            const headerText = (table.querySelector('tr') || {}).textContent || '';
            return /Course\s*ID/i.test(headerText) && /Taken\?/i.test(headerText);
        });
    }

    function scrapeCourseTable(table, tableLabel) {
        const rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
        const courses = [];
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) continue; // guards against stray/empty rows
            const code = (cells[0].textContent || '').trim();
            if (!code) continue;
            const name = (cells[1].textContent || '').trim();
            const credits = parseFloat((cells[2].textContent || '').trim()) || null;
            const mandatoryText = (cells[3].textContent || '').trim();
            const mandatory = /^y(es)?$/i.test(mandatoryText);
            const registeredThisPlan = isTicked(cells[4].querySelector('img'));
            courses.push({ code, name, credits, mandatory, registeredThisPlan, table: tableLabel, actionMarkup: controlMarkup(cells[4]) });
        }
        return courses;
    }

    function preregCourses(doc) {
        const tables = findCourseTables(doc);
        let all = [];
        // The page carries a jump LINK ("See Co-curricular Courses",
        // <a href='#ccc'>) ABOVE the main plan table and the real
        // co-curricular heading (<p id="ccc">) below it. Anchoring on the
        // #ccc heading + document order is what keeps the main plan from
        // being mislabelled co-curricular.
        const anchor = d(doc).getElementById('ccc');
        tables.forEach((table) => {
            let label = 'main';
            if (anchor) {
                if (anchor.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) label = 'co-curricular';
            } else {
                let node = table.previousElementSibling;
                for (let hops = 0; node && hops < 6; hops++, node = node.previousElementSibling) {
                    if (/co-curricular\s+courses\s*:/i.test(node.textContent || '')) { label = 'co-curricular'; break; }
                }
            }
            all = all.concat(scrapeCourseTable(table, label));
        });
        return all;
    }

    function preregExtras(doc) {
        const cell = contentCell(doc);
        const text = ((cell && cell.textContent) || '').replace(/\s+/g, ' ').trim();

        const registrationBanner = text.match(/Registration complete\.[^.]*\./i);
        const preRow = cell && Array.from(cell.querySelectorAll('tr')).find(row => /Pre-advising Complete/i.test(row.textContent || ''));
        const preAdvisingComplete = isTicked(preRow && preRow.querySelector('img'));
        const maxCredit = text.match(/Maximum credit limit\s*:\s*([\d.]+)/i);
        const totalTaken = text.match(/Total taken courses\s*:\s*(\d+)/i);
        const totalUsedCredit = text.match(/Total used credit\s*:\s*([\d.]+)/i);
        const probation = text.match(/(?:Student\s+is\s+in\s+)?Probation\s*(?:number[-\s]*)?[0-9]+/i);
        const limitNotice = text.match(/maximum\s+credit\s+limit\s+exceeded[^.]*\.?/i);
        const conflictNotice = text.match(/conflicts?\s+found[^.]*\.?/i);

        const links = cell ? Array.from(cell.querySelectorAll('a')) : [];
        const retakeLink = links.find(a => /retake courses/i.test(a.textContent || ''));
        const coCurricularLink = links.find(a => /co-curricular courses/i.test(a.textContent || ''));
        const actionMarkup = (cell ? Array.from(cell.querySelectorAll('[onclick]')) : [])
            .filter(element => /changeAdvFunction|changePreAdvFunction/i.test(element.getAttribute('onclick') || ''))
            .map(element => element.cloneNode(true).outerHTML);

        return {
            registrationBanner: registrationBanner ? registrationBanner[0] : null,
            preAdvisingComplete,
            maxCredit: maxCredit ? parseFloat(maxCredit[1]) : null,
            totalTaken: totalTaken ? parseInt(totalTaken[1], 10) : null,
            totalUsedCredit: totalUsedCredit ? parseFloat(totalUsedCredit[1]) : null,
            probation: probation ? probation[0] : null,
            limitNotice: limitNotice ? limitNotice[0] : null,
            conflictNotice: conflictNotice ? conflictNotice[0] : null,
            // [] whenever the page is not in a conflict state, or is but
            // renders no list we recognise — never invented.
            conflictCourses: conflictNotice ? conflictCourses(cell) : [],
            retakeHref: retakeLink ? retakeLink.getAttribute('href') : null,
            coCurricularHref: coCurricularLink ? coCurricularLink.getAttribute('href') : null,
            actionMarkup,
        };
    }

    function parsePreregistration(doc) {
        return { courses: preregCourses(doc), extras: preregExtras(doc) };
    }

    // ── schedule.php ────────────────────────────────────────────────────
    function findScheduleTable(doc) {
        return Array.from(d(doc).querySelectorAll('table')).find((table) => {
            const headerText = (table.querySelector('tr') || {}).textContent || '';
            return /Course\s*ID/i.test(headerText) && /Course\s*Name/i.test(headerText)
                && /Day/i.test(headerText) && /Time/i.test(headerText) && /Room/i.test(headerText);
        }) || null;
    }

    // Returns [{ courseId, courseName, section, meetings: [{day,time,room}] }]
    // The table has one row per class MEETING: a course's id/name/section
    // cells are rowspan'd, so only its FIRST row has 6+ cells.
    function scheduleCourses(doc) {
        const table = findScheduleTable(doc);
        if (!table) return [];
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        const courses = [];
        let current = null;
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (!cells.length) continue;
            if (cells.length >= 6) {
                current = {
                    courseId: cellText(cells[0]),
                    courseName: cellText(cells[1]),
                    section: cellText(cells[2]),
                    meetings: [{ day: cellText(cells[3]), time: cellText(cells[4]), room: cellText(cells[5]) }],
                    classLinkMarkup: controlMarkup(cells[6]),
                    sectionMarkup: controlMarkup(cells[7]),
                    classLinkLabel: cellText(cells[6]),
                    sectionLabel: cellText(cells[7]),
                };
                if (current.courseId) courses.push(current);
                else current = null;
            } else if (cells.length >= 3 && current) {
                current.meetings.push({ day: cellText(cells[0]), time: cellText(cells[1]), room: cellText(cells[2]) });
            }
        }
        return courses;
    }

    function scheduleExtras(doc) {
        const cell = contentCell(doc);
        const text = ((cell && cell.textContent) || '').replace(/\s+/g, ' ').trim();
        const registrationBanner = text.match(/Registration complete\.[^.]*\./i);
        const advisingRow = cell && Array.from(cell.querySelectorAll('tr')).find(row => /Advising Complete/i.test(row.textContent || ''));
        const advisingComplete = isTicked(advisingRow && advisingRow.querySelector('img'));
        const capacityNotice = text.match(/section\s+capacity\s+exceeded[^.]*\.?/i);
        const conflictNotice = text.match(/conflicts?\s+found[^.]*\.?/i);
        const selectionNotice = text.match(/select(?:ed)?\s+(?:a\s+)?(?:course|section)[^.]*\.?/i);
        const actionMarkup = (cell ? Array.from(cell.querySelectorAll('[onclick]')) : [])
            .filter(element => /changeAdvFunction|callAdvFunction/i.test(element.getAttribute('onclick') || ''))
            .map(element => element.cloneNode(true).outerHTML);
        return {
            registrationBanner: registrationBanner ? registrationBanner[0] : null,
            // schedule.php shows "Advising Complete"; there is no
            // *pre*-advising flag here — that one is Preregistration.php only.
            advisingComplete,
            capacityNotice: capacityNotice ? capacityNotice[0] : null,
            conflictNotice: conflictNotice ? conflictNotice[0] : null,
            // See conflictCourses() — [] unless the portal really rendered a
            // recognisable list of conflicting courses alongside the banner.
            conflictCourses: conflictNotice ? conflictCourses(cell) : [],
            selectionNotice: selectionNotice ? selectionNotice[0] : null,
            actionMarkup,
        };
    }

    function parseSchedule(doc) {
        return { courses: scheduleCourses(doc), extras: scheduleExtras(doc) };
    }

    // ── Billing.php ─────────────────────────────────────────────────────
    function billingLedgerNotice(text) {
        const match = text.match(/Please\s+check\s+your\s+ledger\s+for\s+any\s+discrepancies\s+before\s+making\s+your\s+final\s+payment\.?/i);
        return match ? match[0] : null;
    }

    function billingSummary(text) {
        const outstanding = text.match(/Total\s*Outstanding:\s*Tk\.?\s*([\d,]+\.?\d*)/i);
        const payable = text.match(/Total Payable:\s*Tk\.?\s*([\d,]+\.?\d*)/i);
        const paid = text.match(/Total Paid:\s*Tk\.?\s*([\d,]+\.?\d*)/i);
        return {
            totalOutstanding: outstanding ? parseMoney(outstanding[1]) : null,
            totalPayable: payable ? parseMoney(payable[1]) : null,
            totalPaid: paid ? parseMoney(paid[1]) : null,
        };
    }

    // Dues columns: Date / Head / Amount / Discount / Due VAT / VAT Adjusted
    // / Payable.
    function billingDues(doc) {
        const table = findTableByHeaders(doc, [/Date/i, /Head/i, /Amount/i, /Payable/i]);
        if (!table) return [];
        return Array.from(table.querySelectorAll('tr')).slice(1).map((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return null;
            return {
                date: (cells[0].textContent || '').trim(),
                head: (cells[1].textContent || '').trim(),
                amount: parseMoney(cells[2].textContent),
                discount: parseMoney(cells[3].textContent),
                dueVat: parseMoney(cells[4].textContent),
                vatAdjusted: parseMoney(cells[5].textContent),
                payable: parseMoney(cells[6].textContent),
            };
        }).filter(r => r && r.date);
    }

    // Payments columns: Date / MR No. / Amount / Cheque No. / Comments.
    function billingPayments(doc) {
        const table = findTableByHeaders(doc, [/Date/i, /MR No\./i, /Amount/i, /Cheque No\./i]);
        if (!table) return [];
        return Array.from(table.querySelectorAll('tr')).slice(1).map((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 5) return null;
            return {
                date: (cells[0].textContent || '').trim(),
                mrNo: (cells[1].textContent || '').trim(),
                amount: parseMoney(cells[2].textContent),
                chequeNo: (cells[3].textContent || '').trim(),
                comments: (cells[4].textContent || '').trim(),
            };
        }).filter(r => r && r.date);
    }

    function parseBilling(doc) {
        const text = contentText(doc);
        return {
            summary: billingSummary(text),
            dues: billingDues(doc),
            payments: billingPayments(doc),
            ledgerNotice: billingLedgerNotice(text),
        };
    }

    // ── TeacherEvaluation.php / CourseEvaluation.php ────────────────────
    // config: { headerPatterns: RegExp[], columns: string[] }
    function evaluationRows(doc, config) {
        const table = findTableByHeaders(doc, config.headerPatterns);
        if (!table) return [];
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        const out = [];
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length < config.columns.length) continue;
            const record = {};
            config.columns.forEach((key, i) => {
                record[key] = (cells[i].textContent || '').trim();
            });
            if (record.courseId || record.teacherId) out.push(record);
        }
        return out;
    }

    function evaluationDeadlineBanner(doc) {
        const cell = d(doc).querySelector('td.content');
        if (!cell) return null;
        const errEl = cell.querySelector('.error, .info');
        if (errEl && errEl.textContent.trim()) return errEl.textContent.trim();
        const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        const m = text.match(/Deadline is over\.[^.]*\./i);
        return m ? m[0] : null;
    }

    function parseEvaluation(doc, config) {
        return { rows: evaluationRows(doc, config), deadlineBanner: evaluationDeadlineBanner(doc) };
    }

    window.ULAB_PARSERS = {
        // page parsers — each takes an optional Document (default: the live
        // `document`) and returns plain data, never touching storage or DOM
        // output.
        parseStatus,
        parseProfile,
        parsePreregistration,
        parseSchedule,
        parseBilling,
        parseEvaluation,
        // sub-parsers a render layer still calls directly on the live page
        findCourseTables,
        findScheduleTable,
        conflictCourses,
        // small shared helpers
        findTableByHeaders,
        controlMarkup,
        isTicked,
        contentText,
    };
})();
