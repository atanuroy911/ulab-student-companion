// features/advising/catalogues/cse.js — CSE course catalogue & prerequisite map.
//
// Transcribed from "UD Course Catalogue -UNESCO CODE (CSE)_updated (1).pdf"
// using `pdftotext -table`, which keeps the prerequisite column aligned to
// its row far more reliably than plain `-layout` mode (an earlier version of
// this file, built from `-layout` output, had several prerequisites shifted
// onto the wrong course — CSE3120, CSE3201/3202, CSE3203, CSE3200,
// CSE3205/3206, CSE3301, and the Capstone chain were all wrong; fixed here).
//
// Only Math & Statistics, Basic Science, Other Engineering, and Major Core
// declare prerequisites in the catalogue — GED/ESK/GEF/UCC and concentration
// electives have none, but are still listed below (with empty prereq) so
// their titles resolve when shown against a student's course history.
//
// Every course also carries a `category`: GED, ESK, Mathematics,
// BasicScience, OtherEngineering, MajorCore, MajorElective, OptionalMinor.
// Only the first seven of those (not ESK — confirmed not part of the CSE
// degree requirement, despite appearing in the catalogue's course listing)
// are tracked in DEGREE_REQUIREMENTS below, against the "Degree Requirements
// for Bachelor of Science in CSE" table. Major Elective (8 concentration
// groups, ~70 courses) and Optional/Minor (any other department's course)
// are NOT individually
// enumerated here — those are classified by UNESCO-code pattern instead via
// categoryFor(), since the exact list varies and isn't fixed by this
// catalogue. Treat that classification as heuristic, not authoritative.
//
// unescoCode is normalised (no spaces) since that's the format URMS returns
// in student course-history tables.
(function () {
    const COURSES = [
        // ── Pre-Uni / GEF / ESK / UCC / GED (no prerequisites) ──────────────
        { code: 'ELL0099', unescoCode: '0231-000-0099', title: 'Remedial English', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'GEF1101', unescoCode: '0231-000-1101', title: 'Academic English I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 101'] },
        { code: 'GEF1201', unescoCode: '0231-000-1201', title: 'Academic English II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 102'] },
        { code: 'ESK1110', unescoCode: '0031-000-1110', title: 'Study Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1111', unescoCode: '0031-000-1111', title: 'Healthy Life Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1112', unescoCode: '0031-000-1112', title: 'Social Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1113', unescoCode: '0031-000-1113', title: 'Professional Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'UCC1101', unescoCode: '0232-000-1101', title: 'Bangla Bhasha O Sahitya', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 101'] },
        { code: 'UCC1201', unescoCode: '0222-000-1201', title: 'History of the Emergence of Independent Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 103'] },
        { code: 'GED2159', unescoCode: '0223-000-2159', title: 'Professional Ethics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'SSC2243', unescoCode: '0521-000-2243', title: 'Environment and Sustainability', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'NSC2248', unescoCode: '0417-000-2248', title: 'Industrial Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },

        // ── Math & Statistics ────────────────────────────────────────────
        { code: 'MAT1103', unescoCode: '0541-014-1103', title: 'Calculus and Differential Equations', prereq: [], category: 'Mathematics', courseType: 'Theory', oldCodes: [] },
        { code: 'MAT1203', unescoCode: '0541-014-1203', title: 'Coordinate Geometry, Vector Analysis and Complex Variables', prereq: ['MAT1103'], category: 'Mathematics', courseType: 'Theory', oldCodes: [] },
        { code: 'MAT2103', unescoCode: '0541-014-2103', title: 'Linear Algebra and Numerical Analysis', prereq: ['MAT1203'], category: 'Mathematics', courseType: 'Theory', oldCodes: [] },
        { code: 'STA2101', unescoCode: '0542-014-2101', title: 'Probability and Statistics', prereq: [], category: 'Mathematics', courseType: 'Theory', oldCodes: ['STA 206'] },

        // ── Basic Science ────────────────────────────────────────────────
        { code: 'PHY1101', unescoCode: '0533-014-1101', title: 'Physics I', prereq: [], category: 'BasicScience', courseType: 'Theory', oldCodes: ['PHY 101'] },
        { code: 'PHY1102', unescoCode: '0533-014-1102', title: 'Physics I Lab', prereq: [], category: 'BasicScience', courseType: 'Lab', oldCodes: ['PHY 102'] },
        { code: 'PHY1301', unescoCode: '0533-014-1301', title: 'Physics II', prereq: ['PHY1101'], category: 'BasicScience', courseType: 'Theory', oldCodes: [] },

        // ── Other Engineering ────────────────────────────────────────────
        { code: 'EEE1101', unescoCode: '0713-016-1101', title: 'Electrical Circuit 1', prereq: [], category: 'OtherEngineering', courseType: 'Theory', oldCodes: ['EEE 101'] },
        { code: 'EEE1102', unescoCode: '0713-016-1102', title: 'Electrical Circuit 1 Lab', prereq: [], category: 'OtherEngineering', courseType: 'Lab', oldCodes: ['EEE 102'] },
        { code: 'EEE1301', unescoCode: '0714-016-1301', title: 'Electronic Device and Circuits 1', prereq: ['EEE1101', 'EEE1102'], category: 'OtherEngineering', courseType: 'Theory', oldCodes: ['EEE 201', 'ETE 202'] },
        { code: 'EEE1302', unescoCode: '0714-016-1302', title: 'Electronic Device and Circuits 1 Lab', prereq: ['EEE1101', 'EEE1102'], category: 'OtherEngineering', courseType: 'Lab', oldCodes: ['EEE 202', 'ETE 203'] },

        // ── Major Core ───────────────────────────────────────────────────
        { code: 'CSE1101', unescoCode: '0613-014-1101', title: 'Introduction to Programming', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        // Despite the UNESCO numbering looking like a standard lab/theory
        // pair with CSE1101, this lab does not actually require CSE1101 as
        // a co-requisite in practice — confirmed by faculty — so it's opted
        // out of the auto-derived lab-without-theory check (see
        // catalogue-factory.js's noTheoryPairing handling).
        { code: 'CSE1102', unescoCode: '0613-014-1102', title: 'Introduction to Programming Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: [], noTheoryPairing: true },
        { code: 'CSE1201', unescoCode: '0613-014-1201', title: 'Structured Programming', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 103'] },
        { code: 'CSE1202', unescoCode: '0613-014-1202', title: 'Structured Programming LAB', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE 104'] },
        { code: 'CSE1203', unescoCode: '0613-014-1203', title: 'Discrete Mathematics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 103', 'CSE 205'] },
        { code: 'CSE1301', unescoCode: '0613-014-1301', title: 'Data Structures', prereq: ['CSE1201', 'CSE1202'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 207'] },
        { code: 'CSE1302', unescoCode: '0613-014-1302', title: 'Data Structures LAB', prereq: ['CSE1201', 'CSE1202'], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE 208'] },
        { code: 'CSE2101', unescoCode: '0613-014-2101', title: 'Digital Logic Design', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['ETE 204'] },
        { code: 'CSE2102', unescoCode: '0613-014-2102', title: 'Digital Logic Design Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['ETE 205'] },
        { code: 'CSE2103', unescoCode: '0613-014-2103', title: 'Object Oriented Programming', prereq: ['CSE1301', 'CSE1302'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 412'] },
        { code: 'CSE2104', unescoCode: '0613-014-2104', title: 'Object Oriented Programming LAB', prereq: ['CSE1301', 'CSE1302'], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE 413'] },
        { code: 'CSE2201', unescoCode: '0613-014-2201', title: 'Algorithms', prereq: ['CSE1301', 'CSE1302', 'CSE1203'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 305'] },
        { code: 'CSE2202', unescoCode: '0613-014-2202', title: 'Algorithms LAB', prereq: ['CSE1301', 'CSE1302', 'CSE1203'], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE 306'] },
        { code: 'CSE2203', unescoCode: '0613-014-2203', title: 'Computer Organization and Architecture', prereq: ['CSE2101', 'CSE2102'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 203'] },
        { code: 'CSE2200', unescoCode: '0613-014-2200', title: 'Design Project-I', prereq: ['CSE2103', 'CSE2104'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE2301', unescoCode: '0612-014-2301', title: 'Database Management System', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 303'] },
        { code: 'CSE2302', unescoCode: '0612-014-2302', title: 'Database Management System Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE304'] },
        { code: 'CSE2303', unescoCode: '0613-014-2303', title: 'Automata and Theory of Computation', prereq: ['CSE2201', 'CSE2202'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 417'] },
        { code: 'CSE2305', unescoCode: '0613-014-2305', title: 'Operating Systems', prereq: ['CSE2203'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 204'] },
        { code: 'CSE2306', unescoCode: '0613-014-2306', title: 'Operating Systems Lab', prereq: ['CSE2203'], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE212'] },
        { code: 'CSE3101', unescoCode: '0613-014-3101', title: 'Microprocessor and Microcontroller', prereq: ['CSE2203'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 307'] },
        { code: 'CSE3102', unescoCode: '0613-014-3102', title: 'Microprocessor and Microcontroller Lab', prereq: ['CSE2203'], category: 'MajorCore', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE3103', unescoCode: '0613-014-3103', title: 'System Analysis and Design', prereq: ['CSE2103', 'CSE2104', 'CSE2200'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 401'] },
        { code: 'CSE3104', unescoCode: '0613-014-3104', title: 'System Analysis and Design Lab', prereq: ['CSE2103', 'CSE2104', 'CSE2200'], category: 'MajorCore', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE3120', unescoCode: '0613-014-3120', title: 'Web Programming', prereq: ['CSE2301', 'CSE2302'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 480'] },
        { code: 'CSE3201', unescoCode: '0619-014-3201', title: 'Artificial Intelligence & Machine Learning', prereq: ['CSE2201', 'CSE2202', 'STA2101', 'MAT2103'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 410'] },
        { code: 'CSE3202', unescoCode: '0619-014-3202', title: 'Artificial Intelligence & Machine Learning Lab', prereq: ['CSE2201', 'CSE2202', 'STA2101', 'MAT2103'], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE 483'] },
        { code: 'CSE3203', unescoCode: '0613-014-3203', title: 'Software Engineering', prereq: ['CSE3103', 'CSE3104'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 404'] },
        { code: 'CSE3200', unescoCode: '0613-014-3200', title: 'Design Project-II', prereq: ['CSE2301', 'CSE2302', 'CSE3103', 'CSE3104', 'CSE2200'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 482'] },
        { code: 'CSE3205', unescoCode: '0612-014-3205', title: 'Computer Networks', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 309'] },
        { code: 'CSE3206', unescoCode: '0612-014-3206', title: 'Computer Networks Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['CSE 310'] },
        { code: 'CSE3301', unescoCode: '0612-014-3301', title: 'Cyber Security', prereq: ['CSE2305', 'CSE2306', 'CSE3205', 'CSE3206'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['CSE 433'] },

        // ── Capstone / Internship ────────────────────────────────────────
        { code: 'CSE4098A', unescoCode: '0613-014-4098A', title: 'Capstone Project 1', prereq: ['CSE3103', 'CSE3203', 'CSE2200', 'CSE3200'], minCreditsCompleted: 105, category: 'MajorCore', oldCodes: [] },
        { code: 'CSE4098B', unescoCode: '0613-014-4098B', title: 'Capstone Project 2', prereq: ['CSE4098A'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4098C', unescoCode: '0613-014-4098C', title: 'Capstone Project 3', prereq: ['CSE4098B'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4099A', unescoCode: '0613-014-4099A', title: 'Internship', prereq: ['CSE4098C'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4099B', unescoCode: '0613-014-4099B', title: 'Thesis', prereq: ['CSE4098C'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },

        // ── Major Elective: all 7 concentration groups from the official
        // catalogue's elective table (transcribed via `pdftotext -table` on
        // "UD Course Catalogue -UNESCO CODE (CSE)_updated (1).pdf", pp.47-50
        // — that mode keeps columns aligned where plain -layout garbles this
        // section across a page break). Individually named here (as opposed
        // to the generic classifyByPattern() fallback below) so titleFor()
        // resolves them — this whole block was previously missing entirely,
        // which is why e.g. CSE4419/CSE4459 showed no title while CSE4417/
        // CSE4418 (added earlier, piecemeal) did. "Topics of Current
        // Interest in ..." entries have no UNESCO code in the catalogue, so
        // their own course code is used as unescoCode too (same convention
        // as the no-UNESCO legacy electives below).
        // Computational Theory Group
        { code: 'CSE4401', unescoCode: '0613-014-4101', title: 'Computer Graphics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4402', unescoCode: '0613-014-4402', title: 'Computer Graphics Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4403', unescoCode: '0613-014-4403', title: 'Advanced Algorithm', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4405', unescoCode: '0613-014-4205', title: 'Compiler Design', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4406', unescoCode: '0613-014-4206', title: 'Compiler Design Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4407', unescoCode: '0613-014-4207', title: 'Basic Graph Theory', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4409', unescoCode: '0613-014-4209', title: 'Mathematical Analysis for Computer Science', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4411', unescoCode: '0613-014-4211', title: 'Computational Geometry', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4413', unescoCode: 'CSE4413', title: 'Topics of Current Interest in Computational Theory', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Network and Communications Group
        { code: 'CSE4415', unescoCode: '0612-014-4115', title: 'Data Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4416', unescoCode: '0612-014-4116', title: 'Data Communication Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4417', unescoCode: '0613-014-4417', title: 'Internet of Things', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4418', unescoCode: '0613-014-4418', title: 'Internet of Things Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4419', unescoCode: '0612-014-4219', title: 'Network Security', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4420', unescoCode: '0612-014-4220', title: 'Network Security Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4421', unescoCode: '0612-014-4221', title: 'Wireless and Cellular Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4423', unescoCode: '0688-014-4223', title: 'Digital Signal Processing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4425', unescoCode: '0612-014-4225', title: 'Advanced Network Services and Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4427', unescoCode: 'CSE4427', title: 'Topics of Current Interest in Network and Communications', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Security Group
        { code: 'CSE4429', unescoCode: '0613-014-4129', title: 'Software Security', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4430', unescoCode: '0613-014-4130', title: 'Software Security Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4431', unescoCode: '0688-014-4131', title: 'Blockchain', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4433', unescoCode: '0612-014-4233', title: 'Cryptography', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4435', unescoCode: '0688-014-4235', title: 'ICT Law, Policy and Ethics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4437', unescoCode: '0688-014-4237', title: 'Digital Forensics and Incident Response', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4439', unescoCode: 'CSE4439', title: 'Topics of Current Interest in Security', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Computer Systems Group
        { code: 'CSE4441', unescoCode: '0613-014-4141', title: 'Real-time Embedded Systems', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4442', unescoCode: '0613-014-4142', title: 'Real-time Embedded Systems Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4443', unescoCode: '0612-014-4143', title: 'Distributed Systems', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4445', unescoCode: '0613-014-4145', title: 'Simulation and Modeling', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4446', unescoCode: '0613-014-4146', title: 'Simulation and Modeling Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4447', unescoCode: '0688-014-4247', title: 'Introduction to Robotics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4449', unescoCode: '0612-014-4249', title: 'Cloud Computing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4451', unescoCode: '0612-014-4251', title: 'Advanced Database Management Systems', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4453', unescoCode: 'CSE4453', title: 'Topics of Current Interest in Computer Systems', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Data Science Group
        { code: 'CSE4455', unescoCode: '0619-014-3355', title: 'Data Mining', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4457', unescoCode: '0619-014-4157', title: 'Data Science', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4458', unescoCode: '0619-014-4158', title: 'Data Science Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4459', unescoCode: '0619-014-4159', title: 'Big Data Analytics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4460', unescoCode: '0619-014-4160', title: 'Big Data Analytics Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4461', unescoCode: '0613-014-4261', title: 'Digital Image Processing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4462', unescoCode: '0613-014-4262', title: 'Digital Image Processing Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4463', unescoCode: '0688-014-4263', title: 'Introduction to Bioinformatics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4465', unescoCode: '0619-014-4265', title: 'Natural Language Processing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4467', unescoCode: 'CSE4467', title: 'Topics of Current Interest in Data Science', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Software Engineering Group
        { code: 'CSE4469', unescoCode: '0613-014-4169', title: 'Software Requirements Specification and Analysis', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4471', unescoCode: '0613-014-4171', title: 'Design Patterns', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4473', unescoCode: '0613-014-4173', title: 'Software Testing and Quality Assurance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4474', unescoCode: '0613-014-4174', title: 'Software Testing and Quality Assurance Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4475', unescoCode: '0613-014-4275', title: 'Mobile Application Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4477', unescoCode: '0613-014-4277', title: 'Advanced Programming', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4478', unescoCode: '0613-014-4278', title: 'Advanced Programming Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4479', unescoCode: '0613-014-4279', title: 'Human Computer Interaction', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4481', unescoCode: 'CSE4481', title: 'Topics of Current Interest in Software Engineering', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Information and Communication Technology Group
        { code: 'CSE4483', unescoCode: '0688-014-4183', title: 'Enterprise Systems: Concepts and Practice', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4484', unescoCode: '0688-014-4184', title: 'Enterprise Systems: Concepts and Practice Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'CSE4485', unescoCode: '0688-014-4185', title: 'Electronic Business', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4487', unescoCode: '0613-014-4287', title: 'UI: Concepts and Design', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4489', unescoCode: '0688-014-4289', title: 'IT Audit: Concepts and Practice', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4491', unescoCode: '0688-014-4291', title: 'ICT for Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE4493', unescoCode: 'CSE4493', title: 'Topics of Current Interest in Information and Communication Technology', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },

        // ── Legacy-only concentration electives (docs/4. CSE equivalence
        // course List.xlsx lists these with a Previous Code but no New/UNESCO
        // Code — no confirmed successor course was found, so they may be
        // discontinued. code/unescoCode use the old code as the only known
        // identifier; flag if a student's history resolves to one of these. ──
        { code: 'CSE201', unescoCode: 'CSE201', title: 'Object Oriented Programming - I', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 201'] },
        { code: 'CSE202', unescoCode: 'CSE202', title: 'Object Oriented Programming - I Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['CSE 202'] },
        { code: 'CSE415', unescoCode: 'CSE415', title: 'Visual Programming', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 415'] },
        { code: 'CSE416', unescoCode: 'CSE416', title: '.NET Programming using C#', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 416'] },
        { code: 'CSE418', unescoCode: 'CSE418', title: 'Routers and Routing Basics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 418'] },
        { code: 'CSE421', unescoCode: 'CSE421', title: 'WAN Technology', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 421'] },
        { code: 'CSE422', unescoCode: 'CSE422', title: 'Systems Programming', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 422'] },
        { code: 'CSE423', unescoCode: 'CSE423', title: 'Advanced Computer Architecture', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 423'] },
        { code: 'CSE424', unescoCode: 'CSE424', title: 'Parallel Programming', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 424'] },
        { code: 'CSE425', unescoCode: 'CSE425', title: 'Peripherals and Interfacing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 425'] },
        { code: 'CSE426', unescoCode: 'CSE426', title: 'Advanced Computer Networking', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 426'] },
        { code: 'CSE430', unescoCode: 'CSE430', title: 'Neural Networks and Pattern Recognition', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 430'] },
        { code: 'CSE431', unescoCode: 'CSE431', title: 'Computational Geometry', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 431'] },
        { code: 'CSE432', unescoCode: 'CSE432', title: 'Introduction to Quantum Computer', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 432'] },
        { code: 'CSE434', unescoCode: 'CSE434', title: 'Pattern Recognition', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 434'] },
        { code: 'CSE447', unescoCode: 'CSE447', title: 'VLSI Design', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 447'] },
    ];

    // Degree requirements for BSc in CSE (140 credits total) — from the
    // catalogue's "Degree Requirements" table. ESK (Essential Skills) is
    // NOT part of the CSE degree requirement — it's not tracked here, even
    // though ESK courses are still categorized below (for title lookups if a
    // student happens to have one on their record).
    const DEGREE_REQUIREMENTS = {
        labels: {
            GED: 'General Education (GED)',
            MajorCore: 'Major Core Courses',
            MajorElective: 'Major Elective Courses',
            OtherEngineering: 'Other Engineering',
            OptionalMinor: 'Optional/Minor',
            BasicScience: 'Basic Science',
            Mathematics: 'Mathematics',
        },
        credits: {
            GED: 24,
            MajorCore: 67,
            MajorElective: 13,
            OtherEngineering: 8,
            OptionalMinor: 9,
            BasicScience: 7,
            Mathematics: 12,
        },
        total: 140,
    };

    // Best-effort category classifier for UNESCO codes NOT individually
    // listed above (concentration electives and other-department Optional/
    // Minor courses) — pattern-based on UNESCO code segments, not exact.
    //
    // Verified against the catalogue's 8 concentration groups (Computational
    // Theory, Network & Communications, Security, Systems, Data Science,
    // Software Engineering, Hardware, ICT — 4 theory + 1 lab / 13 credits
    // each, matching DEGREE_REQUIREMENTS.credits.MajorElective below): almost
    // every elective's UNESCO code is <prefix>-4<rest> (e.g. 0613-014-4103).
    // One known exception: CSE4455 "Data Mining" is 0619-014-3355 — it will
    // be misclassified as OptionalMinor by this pattern rather than
    // MajorElective. Not worth hand-listing ~70 elective courses just to fix
    // one code; flagged here so it isn't a silent surprise.
    function classifyByPattern(unescoCode) {
        const m = unescoCode.match(/^(\d{4})-(\d{3})-(.+)$/);
        if (!m) return 'Unknown';
        const [, seg1, seg2, seg3] = m;
        if (seg1 === '0031') return 'ESK';
        if (seg2 === '000') return 'GED';
        if (['0613', '0612', '0619', '0688'].includes(seg1) && /^4/.test(seg3)) return 'MajorElective';
        return 'OptionalMinor';
    }

    // Standard semester plan for BSc CSE (10 teaching semesters, ~15 cr each).
    // Derived from the prerequisite dependency graph in this catalogue and the
    // standard curriculum order in \"UD Course Catalogue -UNESCO CODE (CSE)_updated (1).pdf\".
    // ESK (Essential Skills) courses are non-credit but appear on transcripts —
    // they're included here so they show up in the typical plan display.
    const SEMESTER_PLAN = [
        {
            label: 'Semester 1',
            courses: ['GEF1101', 'UCC1101', 'ESK1110', 'CSE1101', 'CSE1102', 'CSE1201', 'CSE1202', 'CSE1203', 'MAT1103', 'PHY1101', 'PHY1102'],
        },
        {
            label: 'Semester 2',
            courses: ['GEF1201', 'ESK1111', 'CSE1301', 'CSE1302', 'CSE2101', 'CSE2102', 'MAT1203', 'EEE1101', 'EEE1102'],
        },
        {
            label: 'Semester 3',
            courses: ['UCC1201', 'ESK1112', 'CSE2103', 'CSE2104', 'CSE2203', 'STA2101', 'PHY1301'],
        },
        {
            label: 'Semester 4',
            courses: ['ESK1113', 'CSE2201', 'CSE2202', 'CSE2200', 'CSE2301', 'CSE2302', 'MAT2103', 'EEE1301', 'EEE1302'],
        },
        {
            label: 'Semester 5',
            courses: ['GED2159', 'CSE2303', 'CSE2305', 'CSE2306', 'CSE3101', 'CSE3102', 'CSE3120'],
        },
        {
            label: 'Semester 6',
            courses: ['SSC2243', 'CSE3103', 'CSE3104', 'CSE3205', 'CSE3206', 'CSE3201', 'CSE3202'],
        },
        {
            label: 'Semester 7',
            courses: ['NSC2248', 'CSE3200', 'CSE3203', 'CSE3301'],
        },
        {
            label: 'Semester 8 (Electives + Capstone I)',
            courses: ['CSE4098A'],
            note: 'Take 4 elective theory + 1 elective lab (13 cr) from your chosen concentration group.',
        },
        {
            label: 'Semester 9 (Capstone II + Electives)',
            courses: ['CSE4098B'],
            note: 'Continue or complete concentration electives.',
        },
        {
            label: 'Semester 10 (Capstone III + Internship/Thesis)',
            courses: ['CSE4098C', 'CSE4099A'],
            note: 'Complete CSE4098C, then take CSE4099A (Internship) or CSE4099B (Thesis).',
        },
    ];

    const catalogue = window.buildUlabCatalogue({ courses: COURSES, degreeRequirements: DEGREE_REQUIREMENTS, classifyByPattern, semesterPlan: SEMESTER_PLAN });

    window.ULAB_CATALOGUES = window.ULAB_CATALOGUES || {};
    window.ULAB_CATALOGUES.CSE = catalogue;
    // Backward compatibility: Capstone Eligibility and (pre-multi-program)
    // callers read window.ULAB_CATALOGUE directly and only ever meant CSE.
    window.ULAB_CATALOGUE = catalogue;
})();
