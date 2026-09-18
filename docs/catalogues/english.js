// features/advising/catalogues/english.js — BA in English and Humanities
// (DEH) course catalogue & degree-requirement map.
//
// Course list transcribed from "Course-Catalogue-Undergraduate-Summer-2026.pdf"
// (Bachelor of Arts in English and Humanities section). UNESCO codes were
// cross-matched by title against "courses-scrapped-urms.txt" (a real URMS
// export listing each course's UNESCO code and old local code) — see
// catalogues/bba.js header for the matching methodology. Only DEH-segment
// (0232-013) matches were accepted; grad-only (055) rows were left unmapped.
// Where no scrape match exists, `unescoCode` falls back to the local `code`.
//
// The catalogue's own "Major Core Courses" table is headed "21 courses / 63
// credits" but the table beneath it actually lists 30 course rows (its text
// explicitly says the list "shows both Core Courses and Electives" without
// a clean split) — rather than guess which 21 of the 30 are the true core,
// all 30 are transcribed here under category MajorCore. This only affects
// how a specific course is labeled if referenced outside the 5-course
// concentration-elective picks transcribed separately below; degree-
// progress credit totals are unaffected. No prerequisites are published for
// this program's courses, so `prereq` is empty throughout — Advising's
// prerequisite-gap check will simply find nothing to flag for English.
(function () {
    const COURSES = [
        // ── GEF / UCC / ESK (no prerequisites) ──────────────────────────────
        { code: 'ELL0099', unescoCode: 'ELL0099', title: 'Remedial English', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'GEF1101', unescoCode: '0231-000-1101', title: 'Academic English I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 101'] },
        { code: 'GEF1201', unescoCode: '0231-000-1201', title: 'Academic English II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 102'] },
        { code: 'UCC1101', unescoCode: '0232-000-1101', title: 'Bangla Bhasha O Sahitya', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 101'] },
        { code: 'UCC1201', unescoCode: '0222-000-1201', title: 'History of the Emergence of Independent Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 103'] },
        { code: 'UCC1202', unescoCode: '0223-000-1202', title: 'Ethics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 212'] },
        { code: 'ESK1110', unescoCode: '0031-000-1110', title: 'Study Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1111', unescoCode: '0031-000-1111', title: 'Healthy Life Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1112', unescoCode: '0031-000-1112', title: 'Social Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1113', unescoCode: '0031-000-1113', title: 'Professional Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },

        // ── Major Core (as listed in the catalogue's combined table) ────────
        { code: 'ENG1101', unescoCode: '0232-013-1101', title: 'Introduction to Literary Genres', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG106'] },
        { code: 'ENG1201', unescoCode: '0232-013-1201', title: 'Introduction to Poetry and Drama', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG116'] },
        { code: 'ENG1202', unescoCode: '0232-013-1202', title: 'Introduction to Fiction and Non-fiction', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG302'] },
        { code: 'ENG1203', unescoCode: '0232-013-1203', title: 'Pronunciation: Phonetics and Phonology', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG114'] },
        { code: 'ENG1301', unescoCode: '0232-013-1301', title: 'Introduction to Linguistics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG105'] },
        { code: 'ENG1303', unescoCode: 'ENG1303', title: 'Old and Middle English Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG2101', unescoCode: '0232-013-2101', title: 'Elizabethan and Jacobean Drama (Excluding Shakespeare)', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG2102', unescoCode: '0232-013-2102', title: 'Writing about Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG108'] },
        { code: 'ENG2103', unescoCode: '0232-013-2103', title: 'Morphology and Syntax', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG111'] },
        { code: 'ENG2107', unescoCode: 'ENG2107', title: '16th and 17th Century English Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG2108', unescoCode: 'ENG2108', title: 'Shakespeare', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG225'] },
        { code: 'ENG2201', unescoCode: '0232-013-2201', title: 'Sociolinguistics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG208'] },
        { code: 'ENG2202', unescoCode: '0232-013-2202', title: 'Restoration and Eighteenth Century Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG210'] },
        { code: 'ENG2203', unescoCode: '0232-013-2203', title: 'Literary Criticism (Sidney to Leavis)', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG204'] },
        { code: 'ENG2204', unescoCode: 'ENG2204', title: 'Romantic Poetry', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG223'] },
        { code: 'ENG2205', unescoCode: 'ENG2205', title: 'Semantics and Pragmatics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG411'] },
        { code: 'ENG2206', unescoCode: 'ENG2206', title: 'American Literature I', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG312'] },
        { code: 'ENG2301', unescoCode: 'ENG2301', title: 'Language Development and Acquisition', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3101', unescoCode: 'ENG3101', title: 'Victorian Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG402'] },
        { code: 'ENG3102', unescoCode: 'ENG3102', title: 'Psycholinguistics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG308'] },
        { code: 'ENG3103', unescoCode: 'ENG3103', title: 'Ancient Greek Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG332'] },
        { code: 'ENG3104', unescoCode: 'ENG3104', title: 'Modern British Drama', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3201', unescoCode: 'ENG3201', title: 'American Literature II', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3202', unescoCode: 'ENG3202', title: 'Modernism in Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3203', unescoCode: 'ENG3203', title: 'Theories of Language Acquisition', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3204', unescoCode: 'ENG3204', title: 'Critical Theory', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG335'] },
        { code: 'ENG3218', unescoCode: 'ENG3218', title: 'Stylistics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4101', unescoCode: 'ENG4101', title: 'Research Methodology', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG435'] },
        { code: 'ENG4103', unescoCode: 'ENG4103', title: 'Digital Humanities', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4218', unescoCode: 'ENG4218', title: 'Transnational Literature', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ENG410'] },

        // ── Elective (Concentration) courses — 5 of these / 15 credits ──────
        // i. Literature and Cultural Studies
        { code: 'ENG3108', unescoCode: 'ENG3108', title: 'Cinema and Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG422'] },
        { code: 'ENG3205', unescoCode: 'ENG3205', title: 'Postcolonial Theories and Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG404'] },
        { code: 'ENG3206', unescoCode: 'ENG3206', title: 'African Writings in English', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG434'] },
        { code: 'ENG3207', unescoCode: 'ENG3207', title: 'Culture and Representations', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3208', unescoCode: 'ENG3208', title: 'Epics of World Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3209', unescoCode: 'ENG3209', title: 'Studies in Popular Culture', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3210', unescoCode: 'ENG3210', title: 'Modern Continental Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3304', unescoCode: 'ENG3304', title: 'South Asian Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4104', unescoCode: 'ENG4104', title: 'Introduction to Cultural Studies', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4105', unescoCode: 'ENG4105', title: 'Ecocriticism', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4106', unescoCode: 'ENG4106', title: 'Contemporary Literatures in English', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4111', unescoCode: 'ENG4111', title: 'Eastern Classics in Translation', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG431'] },
        { code: 'ENG4201', unescoCode: 'ENG4201', title: 'Gender Theory and Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG406'] },
        { code: 'ENG4202', unescoCode: 'ENG4202', title: 'Bangladeshi Writing in English and in English Translation', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4203', unescoCode: 'ENG4203', title: 'World Literature in Translation - I (Non-European)', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG305'] },
        { code: 'ENG4204', unescoCode: 'ENG4204', title: 'World Literature in Translation - II (European)', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // ii. Applied Linguistics and TESOL
        { code: 'ENG3211', unescoCode: 'ENG3211', title: 'Critical Language Awareness', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3212', unescoCode: 'ENG3212', title: 'Methodology of Language Teaching', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG407'] },
        { code: 'ENG3213', unescoCode: 'ENG3213', title: 'English in the Workplace', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3215', unescoCode: 'ENG3215', title: 'Classroom Techniques', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3216', unescoCode: 'ENG3216', title: 'Teaching Reading and Writing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG3217', unescoCode: 'ENG3217', title: 'Teaching Listening and Speaking', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4107', unescoCode: 'ENG4107', title: 'Syllabus Design and Materials Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG344'] },
        { code: 'ENG4108', unescoCode: 'ENG4108', title: 'Critical Literacy and Technology', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4109', unescoCode: 'ENG4109', title: 'Teaching Language through Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4110', unescoCode: 'ENG4110', title: 'Historical Linguistics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4117', unescoCode: 'ENG4117', title: 'Teaching Young Learners', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4206', unescoCode: 'ENG4206', title: 'Teaching Practicum', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4207', unescoCode: 'ENG4207', title: 'Critical Pedagogy', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4209', unescoCode: 'ENG4209', title: 'Testing and Assessment', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // iii. Creative Writing
        { code: 'ENG4102', unescoCode: 'ENG4102', title: 'Introduction to Creative Writing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG310'] },
        { code: 'ENG4211', unescoCode: 'ENG4211', title: 'Creative Writing: Fiction', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4315', unescoCode: 'ENG4315', title: 'Creative Writing: Poetry', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4316', unescoCode: 'ENG4316', title: 'Creative Writing: Dialogue and Scriptwriting', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4317', unescoCode: 'ENG4317', title: 'Creative Writing: Non-fiction', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4318', unescoCode: 'ENG4318', title: 'Film Adaptations', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4319', unescoCode: 'ENG4319', title: 'Animation', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // iv. Translation Studies
        { code: 'ENG3390', unescoCode: 'ENG3390', title: 'Introduction to Translation Theory', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4205', unescoCode: 'ENG4205', title: 'Classics of Translation', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4291', unescoCode: 'ENG4291', title: 'Literary Translation: Bengali to English', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4292', unescoCode: 'ENG4292', title: 'Literary Translation: English to Bengali', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4293', unescoCode: 'ENG4293', title: 'Translating in a Professional Context', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4420', unescoCode: 'ENG4420', title: 'Translation Project', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Seen in real URMS data but not in the PDF's concentration lists
        // above — kept as additional electives rather than guessed into one
        // of the 4 named concentrations.
        { code: 'ENG4112', unescoCode: 'ENG4112', title: 'Postmodernism in Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG403'] },
        { code: 'ENG4118', unescoCode: 'ENG4118', title: 'Clinical and Forensic Linguistics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },

        // ── Minor in English courses offered to OTHER departments' students —
        // seen in real URMS data, included so their titles resolve if an
        // English-major student's record happens to reference them too. ────
        { code: 'ENG2820', unescoCode: 'ENG2820', title: 'English for Professional Purposes', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: ['ENG221'] },
        { code: 'ENG2822', unescoCode: 'ENG2822', title: 'English in Media', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: ['ENG222'] },

        // ── Dissertation/Internship/Project/Non-thesis (1 course / 3 credits) ─
        { code: 'ENG4297', unescoCode: 'ENG4297', title: 'Project', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: [] },
        { code: 'ENG4298', unescoCode: 'ENG4298', title: 'Internship', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: ['ENG498'] },
        { code: 'ENG4299', unescoCode: 'ENG4299', title: 'Dissertation', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: ['ENG499'] },
        { code: 'ENG4208', unescoCode: 'ENG4208', title: 'Advanced Composition and Stylistics', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: ['ENG413'] },

        // ── Legacy-only courses (docs/3. DEH Equivalence course list.xls
        // lists these with a Previous Code but no New/UNESCO Code — no
        // confirmed successor course was found, so they may be discontinued.
        // code/unescoCode use the old code as the only known identifier. ────
        { code: 'ENG115', unescoCode: 'ENG115', title: 'Introduction to Drama', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG115'] },
        { code: 'ENG313', unescoCode: 'ENG313', title: 'Modernism: Early 20c. Literature', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG313'] },
        { code: 'ENG322', unescoCode: 'ENG322', title: 'English in the Workplace', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG322'] },
        { code: 'ENG327', unescoCode: 'ENG327', title: 'Modern Poetry', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['ENG327'] },

        // ── University-wide "GED Elective" pool (Tier 1: Arts and
        // Humanities / Tier 2: Social Sciences / Tier 3: Natural Sciences),
        // transcribed from "Course-Catalogue-Undergraduate-Summer-2026.pdf"'s
        // general-education section (pp.5-10) rather than a program-specific
        // one — every program's students draw GED Electives from this same
        // shared pool, so it's placed here rather than duplicated across all
        // 5 catalogues. Only merged multi-program lookups (e.g. Generate My
        // Schedule) see every entry; a single-program Advising screen for a
        // BBA/CSE/EEE/MSJ student will still fall back to showing the course
        // code for one of these, same as before. Where a real UNESCO code
        // was seen for a course directly in this semester's Class Schedule
        // (many are MSJ-cross-listed under an old "MSJ11xxx" numbering,
        // recorded in oldCodes below), it's used; otherwise unescoCode falls
        // back to the course's own code (unverified — the catalogue PDF's
        // own elective table has no UNESCO column).
        // Tier 1: Arts and Humanities
        { code: 'HUM2101', unescoCode: 'HUM2101', title: 'Art of Self Defense', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2102', unescoCode: 'HUM2102', title: 'Foreign Language: German', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2103', unescoCode: 'HUM2103', title: 'Foreign Language: Chinese', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2104', unescoCode: 'HUM2104', title: 'Cultural Heritage of Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2105', unescoCode: 'HUM2105', title: 'Bangladesh Studies', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2106', unescoCode: '0232-000-2106', title: 'History of Bangla Literature', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2107', unescoCode: 'HUM2107', title: 'History of Pre-Modern South Asia', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2108', unescoCode: 'HUM2108', title: 'Introduction to Dance', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2109', unescoCode: '0215-000-2109', title: 'Introduction to Drama', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2110', unescoCode: 'HUM2110', title: 'Introduction to Music', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2111', unescoCode: '0223-000-2111', title: 'Introduction to Philosophy I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2112', unescoCode: '0211-000-2112', title: 'Introduction to Photography', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11374'] },
        { code: 'HUM2113', unescoCode: 'HUM2113', title: 'Introduction to the History of Linguistics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2114', unescoCode: '0731-000-2114', title: 'World Art and Architecture', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2115', unescoCode: '0314-000-2115', title: 'World Civilization', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2116', unescoCode: 'HUM2116', title: 'Current and Contemporary Art Forum', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2117', unescoCode: 'HUM2117', title: 'Foreign Language: France', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2118', unescoCode: 'HUM2118', title: 'Introduction to Bangla Language and Literature', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2201', unescoCode: '0213-000-2201', title: 'Film History', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11375'] },
        { code: 'HUM2202', unescoCode: 'HUM2202', title: 'Folklore Studies', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2203', unescoCode: 'HUM2203', title: 'History of Empire', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2204', unescoCode: 'HUM2204', title: 'History of Modern South Asia', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2205', unescoCode: 'HUM2205', title: 'Introduction to Performing Arts', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2206', unescoCode: 'HUM2206', title: 'Introduction to Philosophy II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2207', unescoCode: 'HUM2207', title: 'Islamic Art and Architecture', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2208', unescoCode: 'HUM2208', title: 'Literature and Human Rights', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2209', unescoCode: 'HUM2209', title: 'Literature of Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2210', unescoCode: '0223-000-2210', title: 'Logic', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2211', unescoCode: 'HUM2211', title: 'Modern Bangla Literature I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2212', unescoCode: 'HUM2212', title: 'Origin and Development of Bangla Language', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2213', unescoCode: 'HUM2213', title: 'Peoples, Culture and Language', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2214', unescoCode: '0232-000-2214', title: 'Qazi Nazrul Islam: Life and Works', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM2215', unescoCode: '0232-000-2215', title: 'Rabindranath Tagore: Life and Works', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3101', unescoCode: '0213-000-3101', title: 'Aesthetics of Film', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11376'] },
        { code: 'HUM3102', unescoCode: 'HUM3102', title: 'Bestseller Fiction', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3103', unescoCode: 'HUM3103', title: 'Capitalism and Lyric Poetry: Charles Baudelaire', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3104', unescoCode: 'HUM3104', title: 'Comparative Literature: Bangladesh and West Bengal', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3105', unescoCode: 'HUM3105', title: 'Eastern Philosophy and Religion', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3201', unescoCode: 'HUM3201', title: 'Education and Knowledge: South Asian Perspectives', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3202', unescoCode: 'HUM3202', title: 'Ethics from Aristotle to Alain Badiou', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3203', unescoCode: 'HUM3203', title: 'History, Memory and Amnesia', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3204', unescoCode: 'HUM3204', title: 'Imagining the Global Eighteenth Century Art', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3205', unescoCode: 'HUM3205', title: 'Introduction to Psychoanalysis: Freud and Lacan', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3206', unescoCode: 'HUM3206', title: 'South Asian Art and Architecture', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3207', unescoCode: 'HUM3207', title: 'Bangla for Print Media', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3208', unescoCode: 'HUM3208', title: 'Bangla for Electronic Media', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM3209', unescoCode: '0232-000-3209', title: 'Bangla for Electronic Media II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4101', unescoCode: 'HUM4101', title: 'Jacques Lacan: Ethics of Psychoanalysis', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4102', unescoCode: 'HUM4102', title: 'Modern Bangla Literature II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4103', unescoCode: 'HUM4103', title: 'Objectivity and its Loss', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4104', unescoCode: 'HUM4104', title: 'Origin and Development of Bangla Prose', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4105', unescoCode: 'HUM4105', title: 'Tragedy and Trauerspiel: Theater after Walter Benjamin', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4106', unescoCode: 'HUM4106', title: 'Writing History: Approaches and Methods', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4107', unescoCode: 'HUM4107', title: 'The Visual Culture of South Asian Women', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'HUM4108', unescoCode: '0211-000-4108', title: 'Introduction to Animation', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11456'] },
        // Tier 2: Social Sciences
        { code: 'SSC2141', unescoCode: 'SSC2141', title: 'Anthropology and Global Social Problems', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2142', unescoCode: 'SSC2142', title: 'Development Studies', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2143', unescoCode: 'SSC2143', title: 'Economic Development and Social Change', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2144', unescoCode: 'SSC2144', title: 'Environmental Policy and Law', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2145', unescoCode: 'SSC2145', title: 'Global Political Economy', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2146', unescoCode: 'SSC2146', title: 'Globalization', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2147', unescoCode: 'SSC2147', title: 'International Law', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2148', unescoCode: 'SSC2148', title: 'International Trade', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2149', unescoCode: '0314-000-2149', title: 'Introduction to Anthropology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2150', unescoCode: 'SSC2150', title: 'Introduction to Archaeology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2151', unescoCode: '0712-000-2151', title: 'Introduction to Climate Change', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2152', unescoCode: 'SSC2152', title: 'Introduction to Community Development', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2153', unescoCode: 'SSC2153', title: 'Introduction to Museology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2154', unescoCode: 'SSC2154', title: 'Introduction to Political Thought', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2155', unescoCode: '0312-000-2155', title: 'Introduction to Public Policy and Governance', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2156', unescoCode: 'SSC2156', title: 'Introduction to Sociology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2157', unescoCode: '0731-000-2157', title: 'Introduction to Sustainable Development', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2158', unescoCode: 'SSC2158', title: 'Principles of Economics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2160', unescoCode: 'SSC2160', title: 'Urbanization and Ancient Cities', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2241', unescoCode: 'SSC2241', title: 'Community Archaeology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2242', unescoCode: 'SSC2242', title: 'Development of Social and Political Theories', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2243', unescoCode: '0521-000-2243', title: 'Environment and Sustainability', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2244', unescoCode: 'SSC2244', title: 'Ethnoarchaeology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2245', unescoCode: 'SSC2245', title: 'Experiencing the Past', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2246', unescoCode: 'SSC2246', title: 'Health and Society', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2247', unescoCode: 'SSC2247', title: 'Human Dimensions in Environmental Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2249', unescoCode: 'SSC2249', title: 'International Human Rights and Justice', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2250', unescoCode: '0312-000-2250', title: 'International Relations', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2251', unescoCode: 'SSC2251', title: 'Introduction to Social Studies', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2252', unescoCode: '0310-000-2252', title: 'Living with Conflict', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2253', unescoCode: 'SSC2253', title: 'Movements of Indigenous Community', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2254', unescoCode: 'SSC2254', title: 'Natural Hazards and Disaster Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2255', unescoCode: 'SSC2255', title: 'Population Sciences and Demography', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2256', unescoCode: 'SSC2256', title: 'Principles of Cultural Anthropology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2257', unescoCode: 'SSC2257', title: 'Principles of Economics I (Micro)', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2258', unescoCode: 'SSC2258', title: 'Science, Perceptions and Reality', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2259', unescoCode: 'SSC2259', title: 'Social Impact Assessment', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2260', unescoCode: 'SSC2260', title: 'Who Owns the Past', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3141', unescoCode: 'SSC3141', title: 'Body, Society and Culture', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3142', unescoCode: 'SSC3142', title: 'Cultural Resource Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3143', unescoCode: 'SSC3143', title: 'Cultural Studies: Film, Media, Literature', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3144', unescoCode: 'SSC3144', title: 'Cyberspace and Crime', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3145', unescoCode: '0188-000-3145', title: 'Education, Society and Development', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3146', unescoCode: 'SSC3146', title: 'Environmental Impact Assessment', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3147', unescoCode: 'SSC3147', title: 'Environmental Information System', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3148', unescoCode: 'SSC3148', title: 'Gender and Society', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3149', unescoCode: 'SSC3149', title: 'Globalization and Social Conflict', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3150', unescoCode: 'SSC3150', title: 'Grassroots, Community and Development', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3151', unescoCode: 'SSC3151', title: 'History and Theory of International Relations', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3152', unescoCode: 'SSC3152', title: 'Mind, Emotions and Self', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3153', unescoCode: 'SSC3153', title: 'Political Ecology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3154', unescoCode: 'SSC3154', title: 'Power, Politics and State', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3155', unescoCode: 'SSC3155', title: 'Terrorism and Security', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3156', unescoCode: 'SSC3156', title: 'Underwater Archaeology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3157', unescoCode: 'SSC3157', title: 'Principles of Economics II (Macro)', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3241', unescoCode: 'SSC3241', title: 'Archaeological Ethics and Practice', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3242', unescoCode: 'SSC3242', title: 'Business Ethics and Leadership', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3243', unescoCode: 'SSC3243', title: 'Corporate Sustainability Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3244', unescoCode: 'SSC3244', title: 'Crime and Criminology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3245', unescoCode: '0413-000-3245', title: 'Entrepreneurship', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3246', unescoCode: 'SSC3246', title: 'Ethnic Identity and Nationalism', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3247', unescoCode: '0222-000-3247', title: 'Islam and Islamism: A South Asian Perspective', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3248', unescoCode: 'SSC3248', title: 'Marx and the Critique of Political Economy', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3249', unescoCode: 'SSC3249', title: 'Social Inequality and Diversity', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3250', unescoCode: 'SSC3250', title: 'World Geography', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3251', unescoCode: 'SSC3251', title: 'Classical Sociological Theory', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC3252', unescoCode: '0314-000-3252', title: 'Critical Thinking and Logic', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11301'] },
        { code: 'SSC3253', unescoCode: '0314-000-3253', title: 'Reading Media Texts', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11351'] },
        { code: 'SSC3254', unescoCode: '0314-000-3254', title: 'History of Bangladeshi Media', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11350'] },
        { code: 'SSC4141', unescoCode: 'SSC4141', title: 'Frantz Fanon and Colonial Psychiatry', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC4142', unescoCode: '0314-000-4142', title: 'Methods of Social Research', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC4143', unescoCode: 'SSC4143', title: 'Global Migration and Citizenship', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC4144', unescoCode: 'SSC4144', title: 'Religion', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC4145', unescoCode: 'SSC4145', title: 'Sexual Difference: Feminism and Psychoanalysis', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC4146', unescoCode: 'SSC4146', title: 'Women Studies', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC4147', unescoCode: '0314-000-4147', title: 'Development Communication', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11401'] },
        { code: 'SSC4148', unescoCode: '0223-000-4148', title: 'Ethics in Media and Communication', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['MSJ11402'] },
        // Tier 3: Natural Sciences
        { code: 'NSC2181', unescoCode: '0314-000-2181', title: 'Evolutionary Theory and Human Behavior', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2182', unescoCode: '0721-000-2182', title: 'Food and Nutrition', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2183', unescoCode: '0313-000-2183', title: 'Introduction to Psychology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2184', unescoCode: '0712-000-2184', title: 'Renewable Energy', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2185', unescoCode: '0811-000-2185', title: 'Sustainable Agriculture', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2248', unescoCode: '0417-000-2248', title: 'Industrial Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2281', unescoCode: '0222-000-2281', title: 'Archaeological Sciences', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2282', unescoCode: '0522-000-2282', title: 'Biodiversity and Nature Conservation', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2283', unescoCode: 'NSC2283', title: 'Environmental Science', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2284', unescoCode: 'NSC2284', title: 'History and Methods of Science', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2285', unescoCode: 'NSC2285', title: 'Human Biology: Anatomy and Physiology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3181', unescoCode: 'NSC3181', title: 'Archaeological Geophysics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3182', unescoCode: '0500-000-3182', title: 'Introduction to Science Studies', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3183', unescoCode: 'NSC3183', title: 'Philosophy of Science', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3184', unescoCode: 'NSC3184', title: 'Science of Climate Change', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3185', unescoCode: 'NSC3185', title: 'Technology and Development', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3281', unescoCode: 'NSC3281', title: 'Remote Sensing in Archaeology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3282', unescoCode: '0912-000-3282', title: 'Public Health and Epidemiology', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC3283', unescoCode: 'NSC3283', title: 'Introduction to Mind and Behavior', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC4181', unescoCode: '0511-000-4181', title: 'Genetics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC4182', unescoCode: '0541-000-4182', title: 'Mathematics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
    ];

    // Degree requirements for BA in English and Humanities (120 credits
    // total) — from the catalogue's "Degree Requirements for Bachelor of
    // Arts in English" table.
    const DEGREE_REQUIREMENTS = {
        labels: {
            GED: 'General Education (GEF/UCC/GED Elective)',
            MajorCore: 'Major Core Courses',
            MajorElective: 'Major Elective (Concentration) Courses',
            OptionalMinor: 'Minor/Optional',
            Internship: 'Dissertation/Internship/Project/Non-thesis',
        },
        credits: {
            GED: 24,
            MajorCore: 63,
            MajorElective: 15,
            OptionalMinor: 15,
            Internship: 3,
        },
        total: 120,
    };

    // Fallback classifier for course codes not individually listed above
    // (other-department Minor/Optional courses). Pattern-based on the raw
    // course-code prefix — heuristic, not authoritative (see file header).
    function classifyByPattern(codeRaw) {
        const code = (codeRaw || '').toUpperCase();
        if (/^ESK/.test(code)) return 'ESK';
        if (/^(GEF|UCC|GED|HUM|SSC|NSC|ELL)/.test(code)) return 'GED';
        return 'OptionalMinor';
    }

    const catalogue = window.buildUlabCatalogue({ courses: COURSES, degreeRequirements: DEGREE_REQUIREMENTS, classifyByPattern });

    window.ULAB_CATALOGUES = window.ULAB_CATALOGUES || {};
    window.ULAB_CATALOGUES.ENGLISH = catalogue;
})();
