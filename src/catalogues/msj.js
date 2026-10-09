// features/advising/catalogues/msj.js — BSS in Media Studies & Journalism
// (MSJ) course catalogue & degree-requirement map.
//
// Course list transcribed from "Course-Catalogue-Undergraduate-Summer-2026.pdf"
// (Bachelor of Social Science in Media Studies & Journalism section). UNESCO
// codes cross-matched by title against "courses-scrapped-urms.txt" (a real
// URMS export) — see catalogues/bba.js header for the methodology. MSJ's
// UNESCO segment is 012; a handful of courses also appear there under an
// older "MSJ11xxx" local numbering, recorded in `oldCodes`. No prerequisites
// are published for MSJ courses, so `prereq` is empty throughout.
//
// GED elective tiers (HUM/SSC/NSC, 4 courses/12 credits each) are grouped
// into one GEDElective category rather than individually listed, same as
// how catalogues/cse.js treats CSE's GED electives — the actual offered set
// varies term to term and isn't fixed by this catalogue.
(function () {
    const COURSES = [
        // ── GEF / UCC / ESK (no prerequisites) ──────────────────────────────
        { code: 'GEF1101', unescoCode: '0231-000-1101', title: 'Academic English I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 101'] },
        { code: 'GEF1201', unescoCode: '0231-000-1201', title: 'Academic English II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 102'] },
        { code: 'GEF1202', unescoCode: '0231-000-1202', title: 'Advanced English Writing Skills', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'GEF1203', unescoCode: '0231-000-1203', title: 'Advanced Bangla Writing Skills', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'GEF2101', unescoCode: '0542-000-2101', title: 'Introduction to Data and Statistics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GEF2101'] },
        { code: 'UCC1101', unescoCode: '0232-000-1101', title: 'Bangla Bhasha O Sahitya', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 101'] },
        { code: 'UCC1201', unescoCode: '0222-000-1201', title: 'History of the Emergence of Independent Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 103'] },
        { code: 'UCC1202', unescoCode: '0223-000-1202', title: 'Ethics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 212'] },
        { code: 'ESK1110', unescoCode: '0031-000-1110', title: 'Study Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1111', unescoCode: '0031-000-1111', title: 'Healthy Life Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1112', unescoCode: '0031-000-1112', title: 'Social Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1113', unescoCode: '0031-000-1113', title: 'Professional Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },

        // ── Communication Foundation Courses (7 courses / 21 credits) ───────
        { code: 'MSJ1101', unescoCode: '0321-012-1101', title: 'Communication Concepts, Models, and Theories', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ1201', unescoCode: '0321-012-1201', title: 'Communication Research', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ2101', unescoCode: '0321-012-2101', title: 'Communication and Technology', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: ['MSJ11203'] },
        { code: 'MSJ2201', unescoCode: 'MSJ2201', title: 'Mass Communication', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: ['MSJ11211'] },
        { code: 'MSJ2102', unescoCode: '0211-012-2102', title: 'Multimedia Communication 1', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ2202', unescoCode: 'MSJ2202', title: 'Multimedia Communication 2', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ4101', unescoCode: 'MSJ4101', title: 'Media and the Law', prereq: [], category: 'CommFoundation', courseType: 'Theory', oldCodes: ['MSJ11411'] },

        // ── Major 1: Digital Journalism (9 courses / 27 credits) ────────────
        { code: 'MSJ2251', unescoCode: 'MSJ2251', title: 'Journalism and Society', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ2252', unescoCode: 'MSJ2252', title: 'Digital Audience', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3151', unescoCode: 'MSJ3151', title: 'News Sourcing and Gathering', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11321'] },
        { code: 'MSJ3152', unescoCode: 'MSJ3152', title: 'Online Journalism', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3251', unescoCode: 'MSJ3251', title: 'Mobile Journalism', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3252', unescoCode: 'MSJ3252', title: 'News Editing and Translation', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11322'] },
        { code: 'MSJ3253', unescoCode: 'MSJ3253', title: 'Data Journalism', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ3253'] },
        { code: 'MSJ4151', unescoCode: 'MSJ4151', title: 'Investigative Journalism-I', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ4152', unescoCode: 'MSJ4152', title: 'Investigative Journalism-II', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },

        // ── Major 2: Digital Film and TV Production (9 courses / 27 credits) ─
        { code: 'MSJ2231', unescoCode: 'MSJ2231', title: 'Visual Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11231'] },
        { code: 'MSJ2232', unescoCode: 'MSJ2232', title: 'Cinema Studies', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11331'] },
        { code: 'MSJ3131', unescoCode: 'MSJ3131', title: 'Media Presentation and Performance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11332'] },
        { code: 'MSJ3132', unescoCode: 'MSJ3132', title: 'Writing for Film and Television', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3231', unescoCode: 'MSJ3231', title: 'Digital Cinematography', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11334'] },
        { code: 'MSJ3232', unescoCode: 'MSJ3232', title: 'Digital Postproduction', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11335'] },
        { code: 'MSJ3233', unescoCode: 'MSJ3233', title: 'TV Infotainment Production', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11336'] },
        { code: 'MSJ4131', unescoCode: 'MSJ4131', title: 'Documentary Production', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11431'] },
        { code: 'MSJ4132', unescoCode: 'MSJ4132', title: 'Fictional Narrative Production', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11432'] },

        // ── Major 3: Public Relations (9 courses / 27 credits) ──────────────
        { code: 'MSJ2241', unescoCode: 'MSJ2241', title: 'Interpersonal and Intercultural Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11241'] },
        { code: 'MSJ2242', unescoCode: 'MSJ2242', title: 'Strategic Public Relations', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11341'] },
        { code: 'MSJ3141', unescoCode: 'MSJ3141', title: 'Public Relations Research', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11342'] },
        { code: 'MSJ3142', unescoCode: 'MSJ3142', title: 'Media Relations', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11343'] },
        { code: 'MSJ3241', unescoCode: 'MSJ3241', title: 'Organizational Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11344'] },
        { code: 'MSJ3242', unescoCode: 'MSJ3242', title: 'Created Private Media', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11345'] },
        { code: 'MSJ3243', unescoCode: 'MSJ3243', title: 'Speech Writing and Public Speaking', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11346'] },
        { code: 'MSJ4141', unescoCode: 'MSJ4141', title: 'Advertising', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11441'] },
        { code: 'MSJ4142', unescoCode: 'MSJ4142', title: 'Public Relations Campaign', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MSJ11442'] },

        // ── Major 4: Communication for Development (9 courses / 27 credits) ─
        { code: 'MSJ2261', unescoCode: 'MSJ2261', title: 'Communication Theories and Applications to C4D', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ2262', unescoCode: 'MSJ2262', title: 'C4D Planning and Process', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3161', unescoCode: 'MSJ3161', title: 'Participatory Research', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3162', unescoCode: 'MSJ3162', title: 'Communication Approaches for C4D', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3261', unescoCode: 'MSJ3261', title: 'ICT for Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3262', unescoCode: 'MSJ3262', title: 'Health Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ3263', unescoCode: 'MSJ3263', title: 'Emergency Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ4161', unescoCode: 'MSJ4161', title: 'Entertainment Education Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'MSJ4162', unescoCode: 'MSJ4162', title: 'Environmental Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },

        // ── Internship and Portfolio (2 courses / 10 credits) ───────────────
        { code: 'MSJ4298', unescoCode: 'MSJ4298', title: 'Internship', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: ['MSJ11498'] },
        { code: 'MSJ4299', unescoCode: 'MSJ4299', title: 'Portfolio', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: ['MSJ11499'] },
    ];

    // Degree requirements for BSS in Media Studies and Journalism (133
    // credits total) — from the catalogue's own "Degree Requirements" table.
    const DEGREE_REQUIREMENTS = {
        labels: {
            GED: 'GEF/UCC Courses',
            GEDElective: 'HUM/SSC/NSC Elective Courses',
            CommFoundation: 'Communication Foundation Courses',
            MajorElective: 'Major Study Concentration',
            OptionalMinor: 'Minor Study Concentration',
            Internship: 'Internship and Portfolio',
        },
        credits: {
            GED: 24,
            GEDElective: 36,
            CommFoundation: 21,
            MajorElective: 27,
            OptionalMinor: 15,
            Internship: 10,
        },
        total: 133,
    };

    // Fallback classifier for course codes not individually listed above:
    // the HUM/SSC/NSC elective tiers (offerings vary term to term) and
    // other-department Minor courses. Pattern-based on the raw course-code
    // prefix — heuristic, not authoritative (see file header).
    function classifyByPattern(codeRaw) {
        const code = (codeRaw || '').toUpperCase();
        if (/^ESK/.test(code)) return 'ESK';
        if (/^(GEF|UCC|GED)/.test(code)) return 'GED';
        if (/^(HUM|SSC|NSC)/.test(code)) return 'GEDElective';
        if (/^MSJ/.test(code)) return 'MajorElective';
        return 'OptionalMinor';
    }

    // Standard semester plan for BSS in Media Studies & Journalism (8 semesters).
    // Derived from the curriculum structure in
    // \"Course-Catalogue-Undergraduate-Summer-2026.pdf\" (MSJ section).
    // MSJ has 4 major streams (Digital Journalism, Film & TV, PR, C4D) — only
    // the Communication Foundation and GED courses are fixed; the 9 major
    // courses depend on which stream the student chooses.
    const SEMESTER_PLAN = [
        {
            label: 'Semester 1',
            courses: ['GEF1101', 'UCC1101', 'ESK1110', 'MSJ1101', 'GEF1202', 'GEF1203'],
        },
        {
            label: 'Semester 2',
            courses: ['GEF1201', 'UCC1201', 'ESK1111', 'MSJ1201', 'GEF2101'],
        },
        {
            label: 'Semester 3',
            courses: ['UCC1202', 'ESK1112', 'MSJ2101', 'MSJ2102', 'MSJ2201'],
        },
        {
            label: 'Semester 4',
            courses: ['ESK1113', 'MSJ2202', 'MSJ4101'],
            note: 'Start taking your major stream courses (3 of 9 required).',
        },
        {
            label: 'Semester 5',
            note: 'Continue major stream courses (3 more) + HUM/SSC/NSC electives.',
            courses: [],
        },
        {
            label: 'Semester 6',
            note: 'Complete major stream courses (final 3) + HUM/SSC/NSC electives.',
            courses: [],
        },
        {
            label: 'Semester 7',
            note: 'Optional/minor courses (5 of 5 required).',
            courses: [],
        },
        {
            label: 'Semester 8 (Final)',
            courses: ['MSJ4298', 'MSJ4299'],
            note: 'Complete Internship (MSJ4298) and Portfolio (MSJ4299).',
        },
    ];

    const catalogue = window.buildUlabCatalogue({ courses: COURSES, degreeRequirements: DEGREE_REQUIREMENTS, classifyByPattern, semesterPlan: SEMESTER_PLAN });

    window.ULAB_CATALOGUES = window.ULAB_CATALOGUES || {};
    window.ULAB_CATALOGUES.MSJ = catalogue;
})();
