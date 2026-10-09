// features/advising/self-advising.js — Self-advising analysis engine.
// Ported from ulab-faculty-companion's features/advising/advising.js: same
// prerequisite/retake/lab-without-theory/degree-progress rule logic, reused
// verbatim (it's catalogue-data-driven, not faculty-specific), consuming
// the exact same catalogues/*.js files copied into this project (see
// handoff.md — same format, verified byte-identical to the faculty copy).
//
// What's DIFFERENT from the faculty version, and why:
//   - No fetchAdvisingDetails()/extractAdvisingInfo() HTML-scraping step.
//     That faculty logic scrapes a *target* student's data out of the
//     StudentRegistration page (an adviser looking up someone else). A
//     self-advising student has no such page to search — they'd need their
//     OWN completed-course history and in-progress registration, and
//     neither is present in the only two pages handed off so far
//     (reference-html/login.html, reference-html/dashboard.html). Status.php
//     (results/transcript) and Preregistration.php are the likely sources
//     for that once their HTML is handed off — see the TODO below and in
//     features/advising/advising-feature.js.
//   - analyzeStudent() below is otherwise the same function, taking the
//     same { completedCourses, coursesToRegister, probation } shaped input
//     — so once real scraping exists, it plugs in without changing this
//     file.
(function () {
    function normCode(c) { return (c || '').replace(/\s+/g, '').toUpperCase(); }

    function canonicalCode(rawCode, cat) {
        const resolved = cat && cat.resolve(rawCode);
        return resolved ? cat.normalizeUnesco(resolved.unescoCode) : normCode(rawCode);
    }

    function semesterRank(semStr) {
        const m = (semStr || '').match(/(Spring|Summer|Fall)\s+(\d{4})/i);
        if (!m) return 0;
        const termRank = { spring: 1, summer: 2, fall: 3 }[m[1].toLowerCase()] || 0;
        return parseInt(m[2], 10) * 10 + termRank;
    }

    // Sums completed/in-progress credit hours per degree-requirement
    // category and compares against the catalogue's targets. Failed courses
    // don't count; blank-grade rows (in-progress) count separately.
    function computeDegreeProgress(cat, completedRows) {
        const requirements = cat.degreeRequirements;
        const earned = {};
        const inProgress = {};

        for (const row of completedRows) {
            const courseId = normCode(row.courseId || row.CourseID || row.CourseId || '');
            if (!courseId) continue;
            const category = cat.categoryFor(courseId);
            if (!(category in requirements.credits)) continue;
            const credit = parseFloat(row.credit != null ? row.credit : row.Credit) || 0;
            const grade = (row.grade != null ? row.grade : row.Grade || '').trim();

            if (/^F$/i.test(grade)) continue;

            if (grade) {
                earned[category] = (earned[category] || 0) + credit;
            } else {
                inProgress[category] = (inProgress[category] || 0) + credit;
            }
        }

        const progress = Object.keys(requirements.credits).map(category => {
            const earnedCredits = earned[category] || 0;
            const inProgressCredits = inProgress[category] || 0;
            const required = requirements.credits[category];
            const total = earnedCredits + inProgressCredits;
            return {
                category,
                label: requirements.labels[category],
                earnedCredits,
                inProgressCredits,
                required,
                shortBy: Math.max(0, required - total),
            };
        });

        return { progress };
    }

    function findTheoryDayConflicts(coursesToRegister, cat) {
        const byDay = {};
        for (const course of coursesToRegister || []) {
            const resolved = cat && cat.resolve(course.courseId);
            const isTheory = resolved ? resolved.courseType !== 'Lab' : !/\blab\b/i.test(course.title || '');
            if (!isTheory) continue;
            const meetings = Array.isArray(course.meetings) ? course.meetings : [];
            for (const meeting of meetings) {
                const day = String(meeting.day || '').toUpperCase();
                if (!day) continue;
                (byDay[day] = byDay[day] || []).push({ courseId: course.courseId, title: course.title || (cat && cat.titleFor(course.courseId)) || course.courseId });
            }
        }
        return Object.keys(byDay).filter(day => byDay[day].length >= 3).map(day => ({ day, courses: byDay[day] }));
    }

    // Analyzes ONE student's own record. `info` shape:
    //   {
    //     probation: string|null,               // e.g. "Student is in Probation number-2"
    //     completedCourses: [{ courseId, grade, semester, credit }],
    //     coursesToRegister: [{ courseId, title, section, schedule }],
    //   }
    // Same rule logic as the faculty companion's analyzeStudent(), just
    // reframed as first-person-copy-friendly output (the UI layer in
    // advising-feature.js supplies the actual first-person text).
    function analyzeSelf(info, cat) {
        const result = {
            probationTier: null,
            finalProbation: false,
            needsRetake: [],
            prereqIssues: [],
            labWithoutTheory: [],
            theoryDayConflicts: [],
            degreeProgress: null,
        };
        if (!cat) return result;

        result.degreeProgress = computeDegreeProgress(cat, info.completedCourses || []);

        if (info.probation) {
            const m = info.probation.match(/number[-\s]*([0-9]+)/i);
            result.probationTier = m ? parseInt(m[1], 10) : 'unspecified';
            result.finalProbation = result.probationTier === 3;
        }

        const byCourse = {};
        for (const row of (info.completedCourses || [])) {
            const rawId = row.courseId || row.CourseID || row.CourseId || '';
            if (!String(rawId).trim()) continue;
            const courseId = canonicalCode(rawId, cat);
            (byCourse[courseId] = byCourse[courseId] || []).push({
                semester: row.semester || row.Semester || '',
                grade: (row.grade != null ? row.grade : row.Grade || '').trim(),
                rank: semesterRank(row.semester || row.Semester),
            });
        }

        const registeringSet = new Set((info.coursesToRegister || []).map(c => canonicalCode(c.courseId, cat)));

        for (const courseId in byCourse) {
            const attempts = byCourse[courseId].slice().sort((a, b) => a.rank - b.rank);
            const hasFail = attempts.some(a => /^F$/i.test(a.grade));
            const hasPass = attempts.some(a => a.grade && !/^F$/i.test(a.grade));
            const hasInProgress = attempts.some(a => !a.grade);
            if (hasFail && !hasPass && !hasInProgress) {
                result.needsRetake.push({
                    courseId,
                    title: cat.titleFor(courseId) || courseId,
                    attempts: attempts.map(a => `${a.semester || '—'}: ${a.grade || '—'}`),
                    retakingNow: registeringSet.has(courseId),
                });
            }
        }

        for (const c of (info.coursesToRegister || [])) {
            const cid = canonicalCode(c.courseId, cat);
            const prereqs = cat.prereqUnescoFor(cid);
            if (!prereqs.length) continue;
            const missing = prereqs.filter(p => {
                const norm = canonicalCode(p, cat);
                const attempts = byCourse[norm];
                if (!attempts) return true;
                const hasPass = attempts.some(a => a.grade && !/^F$/i.test(a.grade));
                if (hasPass) return false;
                const inProgress = attempts.some(a => !a.grade);
                return !inProgress;
            });
            if (missing.length) {
                result.prereqIssues.push({
                    courseId: cid,
                    title: c.title || cat.titleFor(cid) || cid,
                    missing: missing.map(m => ({ courseId: m, title: cat.titleFor(m) || m })),
                });
            }
        }

        for (const c of (info.coursesToRegister || [])) {
            const cid = canonicalCode(c.courseId, cat);
            const theory = cat.theoryForLab(cid);
            if (!theory) continue;
            const theoryCode = canonicalCode(theory.unescoCode, cat);
            const takenBefore = !!byCourse[theoryCode];
            const takingNow = registeringSet.has(theoryCode);
            if (!takenBefore && !takingNow) {
                result.labWithoutTheory.push({
                    labCourseId: cid,
                    labTitle: c.title || cat.titleFor(cid) || cid,
                    theoryCourseId: theory.unescoCode,
                    theoryTitle: theory.title,
                });
            }
        }

        result.theoryDayConflicts = findTheoryDayConflicts(info.coursesToRegister, cat);

        return result;
    }

    // Parses a pasted completed-courses list, one course per line, of the
    // form "CourseId, Grade, Semester[, Credit]" (or tab-separated) — e.g.
    // "CSE1101, A, Fall 2024, 3". Best-effort: skips lines it can't parse.
    function parseCompletedCoursesText(text) {
        const rows = [];
        for (const raw of (text || '').split('\n')) {
            const line = raw.trim();
            if (!line) continue;
            const parts = line.split(/\t|,/).map(p => p.trim());
            if (parts.length < 2) continue;
            const [courseId, grade, semester, credit] = parts;
            rows.push({ courseId, grade: grade || '', semester: semester || '', credit: credit || '' });
        }
        return rows;
    }

    // Parses a pasted "courses I'm registering for this semester" list, one
    // per line: "CourseId, Title" (title optional).
    function parseRegisteringCoursesText(text) {
        const rows = [];
        for (const raw of (text || '').split('\n')) {
            const line = raw.trim();
            if (!line) continue;
            const parts = line.split(/\t|,/).map(p => p.trim()).filter(p => p !== '');
            if (!parts.length) continue;
            rows.push({ courseId: parts[0], title: parts[1] || '' });
        }
        return rows;
    }

    window.ULAB_SELF_ADVISING = {
        analyzeSelf,
        computeDegreeProgress,
        canonicalCode,
        normCode,
        parseCompletedCoursesText,
        parseRegisteringCoursesText,
        findTheoryDayConflicts,
    };
})();
