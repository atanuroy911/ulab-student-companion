// features/advising/catalogue-factory.js — shared builder for per-program
// course catalogues. Each program file under features/advising/catalogues/
// calls window.buildUlabCatalogue({ courses, degreeRequirements,
// classifyByPattern }) and gets back an object shaped exactly like the
// original (CSE-only) window.ULAB_CATALOGUE — same lookup/classification
// helpers, just built from that program's own course list.
(function () {
    function normalizeUnesco(code) {
        return (code || '').replace(/\s+/g, '').toUpperCase();
    }

    // Local course codes (e.g. "CSE1301") are the legacy identifier scheme —
    // UNESCO codes are the newer one. Normalized by stripping everything but
    // letters/digits, since legacy codes appear with inconsistent
    // spacing/hyphenation ("CSE 1301", "CSE-1301", "CSE1301").
    function normalizeLocalCode(code) {
        return (code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    }

    // Builds a catalogue object from a program's COURSES array and
    // DEGREE_REQUIREMENTS table. `classifyByPattern(unescoCode)` is a
    // program-specific heuristic fallback used for elective/minor courses
    // not individually listed in `courses` — see each program file for its
    // own pattern and caveats.
    function buildUlabCatalogue({ courses, degreeRequirements, classifyByPattern, semesterPlan }) {
        const byCode = {};
        const byUnesco = {};
        const byLocalCode = {};
        for (const c of courses) {
            byCode[c.code] = c;
            byUnesco[normalizeUnesco(c.unescoCode)] = c;
            byLocalCode[normalizeLocalCode(c.code)] = c;
            for (const old of (c.oldCodes || [])) {
                byUnesco[normalizeUnesco(old)] = c;
            }
        }

        function resolveCourse(rawCode) {
            return byUnesco[normalizeUnesco(rawCode)] || byLocalCode[normalizeLocalCode(rawCode)] || null;
        }

        // Lab/theory pairing — derived generically from UNESCO numbering
        // (every lab is numbered exactly one above its theory course) rather
        // than hand-listed, so it stays correct if `courses` changes.
        // Classification uses the catalogue's own `courseType` field (1-credit
        // Lab vs 3-credit Theory, as transcribed from the official catalogue)
        // rather than guessing from the title text — titles are inconsistent
        // ("Structured Programming LAB" vs "Physics I Lab" vs courses that
        // mention "lab" without being one), so name-matching produced wrong
        // pairings that credit/type-based classification doesn't.
        const labTheoryMap = {};
        for (const c of courses) {
            if (c.courseType !== 'Lab' || c.noTheoryPairing) continue;
            const m = c.unescoCode.match(/^(\d+-\d+-)(\d+)$/);
            if (!m) continue;
            const [, prefix, numStr] = m;
            const theoryUnesco = prefix + String(parseInt(numStr, 10) - 1).padStart(numStr.length, '0');
            const theoryCourse = byUnesco[normalizeUnesco(theoryUnesco)];
            if (theoryCourse && theoryCourse.courseType !== 'Lab') {
                labTheoryMap[normalizeUnesco(c.unescoCode)] = theoryCourse;
            }
        }

        return {
            courses,
            byCode,
            byUnesco,
            byLocalCode,
            normalizeUnesco,
            normalizeLocalCode,
            degreeRequirements,
            semesterPlan: semesterPlan || null,
            resolve: resolveCourse,
            theoryForLab(codeRaw) {
                const course = resolveCourse(codeRaw);
                if (!course) return null;
                return labTheoryMap[normalizeUnesco(course.unescoCode)] || null;
            },
            prereqUnescoFor(codeRaw) {
                const course = resolveCourse(codeRaw);
                if (!course) return [];
                return course.prereq.map(code => (byCode[code] ? byCode[code].unescoCode : code));
            },
            titleFor(codeRaw) {
                const course = resolveCourse(codeRaw);
                return course ? course.title : '';
            },
            categoryFor(codeRaw) {
                const course = resolveCourse(codeRaw);
                if (course) return course.category;
                return classifyByPattern ? classifyByPattern(normalizeUnesco(codeRaw)) : 'Unknown';
            },
            isLegacyCode(codeRaw) {
                const course = resolveCourse(codeRaw);
                return !!course && normalizeUnesco(codeRaw) !== normalizeUnesco(course.unescoCode);
            },
        };
    }

    window.buildUlabCatalogue = buildUlabCatalogue;
})();
