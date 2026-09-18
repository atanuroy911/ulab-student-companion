// features/advising/catalogues/bangla.js — Department of Bangla Language and
// Literature (বাংলা ভাষা ও সাহিত্য বিভাগ) course catalogue & degree-
// requirement map.
//
// This program was originally excluded from multi-program support because
// "Course-Catalogue-Undergraduate-Summer-2026.pdf"'s Bangla department
// section prints every course code in Bangla numerals (e.g. "বিএএল ১১০১"),
// which can't be reliably transcribed into the Latin/ASCII course codes
// URMS actually uses. "courses-scrapped-urms.txt" (a real URMS export)
// resolved this — it lists the department's real local codes with the
// "BLL" prefix (e.g. BLL2101) alongside their English titles, and in a few
// cases their UNESCO code (segment 017). Only the courses that actually
// appear in that scrape are transcribed below; the PDF's full 29-course
// core list could not be completely cross-referenced this way, so this
// catalogue is intentionally partial — treat it as more incomplete than
// the other 4 programs, not just "best-effort like the rest."
//
// Categories: GED (GEF+UCC+GED-elective, same combined convention as the
// other catalogues), MajorCore (Bangla department core courses),
// OptionalMinor, Internship (research/thesis component).
(function () {
    const COURSES = [
        // ── GEF / UCC / ESK / GED (no prerequisites) ─────────────────────────
        { code: 'GEF1101', unescoCode: '0231-000-1101', title: 'Academic English I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 101'] },
        { code: 'GEF1201', unescoCode: '0231-000-1201', title: 'Academic English II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 102'] },
        { code: 'UCC1101', unescoCode: '0232-000-1101', title: 'Bangla Bhasha O Sahitya', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 101'] },
        { code: 'UCC1201', unescoCode: '0222-000-1201', title: 'History of the Emergence of Independent Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 103'] },
        { code: 'UCC1202', unescoCode: '0223-000-1202', title: 'Ethics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 212'] },
        { code: 'ESK1110', unescoCode: '0031-000-1110', title: 'Study Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1111', unescoCode: '0031-000-1111', title: 'Healthy Life Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1112', unescoCode: '0031-000-1112', title: 'Social Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1113', unescoCode: '0031-000-1113', title: 'Professional Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },

        // ── Bangla Department core courses (as found in the URMS scrape) ────
        { code: 'BLL2101', unescoCode: '0200-017-2101', title: 'Kobita: Charja to Chondi', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL2102', unescoCode: '0031-017-2102', title: 'Presentation & Application of Bangla Writing', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL2201', unescoCode: '0200-017-2201', title: 'Bangla Novel: Colonial Period', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BBS2201'] },
        { code: 'BLL2202', unescoCode: '0200-017-2202', title: 'Bangla Short Story: Colonial to Post Liberation', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL2301', unescoCode: 'BLL2301', title: 'Bangla Drama: From Medieval to Modern', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL2302', unescoCode: 'BLL2302', title: 'Bangla Non Fiction: Origin and Development', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL2303', unescoCode: 'BLL2303', title: 'Ethnic Language & Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3101', unescoCode: 'BLL3101', title: 'Vernacular and Folk Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3102', unescoCode: 'BLL3102', title: 'Bangla Poem: Colonial and Liberation Period', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3103', unescoCode: 'BLL3103', title: 'Epic: Primary & Secondary', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3201', unescoCode: 'BLL3201', title: 'Bangla Novel: Post Partition', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3202', unescoCode: 'BLL3202', title: 'Applied Linguistics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3301', unescoCode: 'BLL3301', title: 'Bangladesher Shahitto', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3302', unescoCode: 'BLL3302', title: 'Literary Criticism', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL3303', unescoCode: 'BLL3303', title: 'World Literature: Latin America, Europe and Africa', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL4101', unescoCode: 'BLL4101', title: 'Short Story: Around the World', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL4102', unescoCode: 'BLL4102', title: 'World Drama', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL4103', unescoCode: 'BLL4103', title: 'Professional Bangla', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL4201', unescoCode: 'BLL4201', title: 'Woman in Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL4202', unescoCode: 'BLL4202', title: 'Diaspora Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BLL4203', unescoCode: 'BLL4203', title: 'Manuscript Studies', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },

        // ── Minor course offered to other departments' students, but also
        // seen as a real registered code in the scrape ──────────────────────
        { code: 'BLL1202', unescoCode: '0288-017-1202', title: 'Literature in Film', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: [] },
    ];

    // Degree requirements for BA in Bangla Language and Literature (130
    // credits total) — from the catalogue's own requirements table. The
    // table's own row-by-row credit sum doesn't quite add up to its stated
    // total (a discrepancy in the source PDF, same as seen in the EEE and
    // CSE sections) — the research/fieldwork component's credit value here
    // was adjusted down to reconcile with the stated 130-credit total rather
    // than the printed (evidently miskeyed) per-row figure.
    const DEGREE_REQUIREMENTS = {
        labels: {
            GED: 'General Education (GEF/UCC/GED Elective)',
            MajorCore: 'Required (Bangla Department) Courses',
            OptionalMinor: 'Minor/Optional',
            Internship: 'Research Methodology and Fieldwork',
        },
        credits: {
            GED: 24,
            MajorCore: 87,
            OptionalMinor: 15,
            Internship: 4,
        },
        total: 130,
    };

    // Fallback classifier for course codes not individually listed above —
    // pattern-based on the raw course-code prefix, heuristic not
    // authoritative (see file header re: this catalogue's incompleteness).
    function classifyByPattern(codeRaw) {
        const code = (codeRaw || '').toUpperCase();
        if (/^ESK/.test(code)) return 'ESK';
        if (/^(GEF|UCC|GED|HUM|SSC|NSC)/.test(code)) return 'GED';
        if (/^BLL/.test(code)) return 'MajorCore';
        return 'OptionalMinor';
    }

    const catalogue = window.buildUlabCatalogue({ courses: COURSES, degreeRequirements: DEGREE_REQUIREMENTS, classifyByPattern });

    window.ULAB_CATALOGUES = window.ULAB_CATALOGUES || {};
    window.ULAB_CATALOGUES.BANGLA = catalogue;
})();
