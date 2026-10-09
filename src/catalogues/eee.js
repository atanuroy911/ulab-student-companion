// features/advising/catalogues/eee.js — BSc in Electrical and Electronic
// Engineering (EEE) course catalogue & degree-requirement map.
//
// Course list transcribed from "Course-Catalogue-Undergraduate-Summer-2026.pdf"
// (Bachelor of Science in Electrical and Electronic Engineering section).
// UNESCO codes cross-matched by title against "courses-scrapped-urms.txt" (a
// real URMS export) — see catalogues/bba.js header for the methodology.
// EEE's UNESCO segment is 016 (013 for CSE-shared courses like Python).
// EEE3313 "Electromagnetic Fields and Waves" was found only in the scrape
// (missing from the PDF's course list, but referenced there as a
// prerequisite of Microwave Engineering) and has been added below so that
// prerequisite resolves instead of dangling.
//
// Note: the catalogue's top-level "Degree Requirements" summary table lists
// Major Core Courses as "17 courses / 66 credits", but the detailed
// "Program Core Courses" table beneath it (17 theory + 15 lab) sums to 70
// credits — a discrepancy in the source PDF itself, not introduced here.
// DEGREE_REQUIREMENTS.credits.MajorCore below uses the summary table's 66,
// since that's what the official "Degree Requirements" total (140) is built
// from; the course list itself (with real per-course credits) is
// transcribed as printed.
(function () {
    const COURSES = [
        // ── GEF / UCC / ESK (no prerequisites) ──────────────────────────────
        { code: 'GEF1101', unescoCode: '0231-000-1101', title: 'Academic English I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 101'] },
        { code: 'GEF1201', unescoCode: '0231-000-1201', title: 'Academic English II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 102'] },
        { code: 'UCC1101', unescoCode: '0232-000-1101', title: 'Bangla Bhasha O Sahitya', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 101'] },
        { code: 'UCC1201', unescoCode: '0222-000-1201', title: 'History of the Emergence of Independent Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 103'] },
        { code: 'GED2159', unescoCode: '0223-000-2159', title: 'Professional Ethics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'GED2243', unescoCode: '0521-000-2243', title: 'Environment and Sustainability', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'GED2248', unescoCode: '0417-000-2248', title: 'Industrial Management', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1110', unescoCode: '0031-000-1110', title: 'Study Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1111', unescoCode: '0031-000-1111', title: 'Healthy Life Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1112', unescoCode: '0031-000-1112', title: 'Social Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1113', unescoCode: '0031-000-1113', title: 'Professional Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },

        // ── Basic Science: Physics and Chemistry (11 credits) ───────────────
        { code: 'PHY1101', unescoCode: '0533-014-1101', title: 'Physics', prereq: [], category: 'BasicScience', courseType: 'Theory', oldCodes: ['PHY 101'] },
        { code: 'PHY1102', unescoCode: '0533-014-1102', title: 'Physics Lab', prereq: [], category: 'BasicScience', courseType: 'Lab', oldCodes: ['PHY 102'] },
        { code: 'PHY3101', unescoCode: '0533-014-1301', title: 'Physics II', prereq: ['PHY1101', 'MAT1201'], category: 'BasicScience', courseType: 'Theory', oldCodes: [] },
        { code: 'CHEM1301', unescoCode: '0531-016-1301', title: 'Chemistry', prereq: [], category: 'BasicScience', courseType: 'Theory', oldCodes: ['CHEM 101'] },
        { code: 'CHEM1302', unescoCode: '0531-016-1302', title: 'Chemistry Lab', prereq: [], category: 'BasicScience', courseType: 'Lab', oldCodes: ['CHEM 102'] },

        // ── Mathematics and Statistics (12 credits) ──────────────────────────
        { code: 'MAT1103', unescoCode: '0541-014-1103', title: 'Calculus and Differential Equations', prereq: [], category: 'Mathematics', courseType: 'Theory', oldCodes: [] },
        { code: 'MAT1203', unescoCode: '0541-014-1203', title: 'Coordinate Geometry and Complex Variables', prereq: ['MAT1103'], category: 'Mathematics', courseType: 'Theory', oldCodes: [] },
        { code: 'MAT2103', unescoCode: '0541-014-2103', title: 'Linear Algebra and Numerical Analysis', prereq: ['MAT1203'], category: 'Mathematics', courseType: 'Theory', oldCodes: [] },
        { code: 'STA2101', unescoCode: '0542-014-2101', title: 'Probability and Statistics', prereq: ['MAT1201'], category: 'Mathematics', courseType: 'Theory', oldCodes: ['STA 206'] },
        { code: 'MAT1201', unescoCode: 'MAT1201', title: 'Co-ordinate Geometry and Linear Algebra', prereq: [], category: 'Mathematics', courseType: 'Theory', oldCodes: ['MAT 102'] },

        // ── Program Core Courses (17 theory + 15 lab) ────────────────────────
        { code: 'EEE1101', unescoCode: '0713-016-1101', title: 'Electrical Circuits I', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 101'] },
        { code: 'EEE1102', unescoCode: '0713-016-1102', title: 'Electrical Circuits I Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 102'] },
        { code: 'EEE1203', unescoCode: 'EEE1203', title: 'Electrical Circuits II', prereq: ['EEE1101'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 103'] },
        { code: 'EEE1204', unescoCode: 'EEE1204', title: 'Electrical Circuits II Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 104'] },
        { code: 'CSE2105', unescoCode: '0613-016-2105', title: 'Introduction to Python Programming', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'CSE2106', unescoCode: '0613-016-2106', title: 'Introduction to Python Programming Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: [] },
        { code: 'EEE1301', unescoCode: '0714-016-1301', title: 'Electronic Circuits I', prereq: ['EEE1101'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 201', 'ETE 202'] },
        { code: 'EEE1302', unescoCode: '0714-016-1302', title: 'Electronic Circuits I Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 202', 'ETE 203'] },
        { code: 'EEE2103', unescoCode: '0714-016-2103', title: 'Electronic Circuits II', prereq: ['EEE1301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 203'] },
        { code: 'EEE2104', unescoCode: '0714-016-2104', title: 'Electronic Circuits II Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 204'] },
        { code: 'EEE2205', unescoCode: '0715-016-2205', title: 'Electrical Machines I', prereq: ['EEE1203'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 205'] },
        { code: 'EEE2309', unescoCode: 'EEE2309', title: 'Electrical Machines II', prereq: ['EEE2205'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 209'] },
        { code: 'EEE2310', unescoCode: 'EEE2310', title: 'Electrical Machines Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 210'] },
        { code: 'EEE2313', unescoCode: 'EEE2313', title: 'Signals and Systems', prereq: ['MAT2103'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE3313', unescoCode: 'EEE3313', title: 'Electromagnetic Fields and Waves', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 313'] },
        // NOT adding MAT2101 here: it appears in this semester's Class
        // Schedule and in the EEE term-plan table (titled "Linear Algebra"
        // there), but courses-scrapped-urms.txt has the same code titled
        // "Differential Equations and Numerical Analysis" — a different
        // subject — and this file already carries MAT2103 "Linear Algebra
        // and Numerical Analysis" (prereq'd by EEE2313/EEE2216/EEE4485
        // above), which may or may not be the same course under an older
        // number. Three disagreeing signals; guessing a category here would
        // risk miscounting a real student's Mathematics-requirement credit
        // in Advising. Left unresolved — flag for confirmation against the
        // department directly before adding.
        { code: 'EEE2216', unescoCode: 'EEE2216', title: 'Numerical Techniques Simulation Lab', prereq: ['MAT2103'], category: 'MajorCore', courseType: 'Lab', oldCodes: [] },
        { code: 'ME2201', unescoCode: '0715-016-2201', title: 'Introductory Mechanical Engineering', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE2301', unescoCode: 'EEE2301', title: 'Digital Electronics', prereq: ['EEE1301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 301'] },
        { code: 'EEE2302', unescoCode: 'EEE2302', title: 'Digital Electronics Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 302'] },
        { code: 'EEE3103', unescoCode: 'EEE3103', title: 'Digital Signal Processing', prereq: ['EEE2313'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 303'] },
        { code: 'EEE3104', unescoCode: 'EEE3104', title: 'Digital Signal Processing Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 304'] },
        { code: 'EEE3105', unescoCode: 'EEE3105', title: 'Electrical Properties of Materials', prereq: ['PHY1101', 'CHEM1301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 305'] },
        { code: 'EEE3209', unescoCode: 'EEE3209', title: 'Applied Machine Learning', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE3210', unescoCode: 'EEE3210', title: 'Applied Machine Learning Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: [] },
        { code: 'EEE3109', unescoCode: 'EEE3109', title: 'Communication Systems', prereq: ['EEE2313'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 309'] },
        { code: 'EEE3110', unescoCode: 'EEE3110', title: 'Communication Systems Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 310'] },
        { code: 'EEE3207', unescoCode: 'EEE3207', title: 'Power System I', prereq: ['EEE1203'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 307'] },
        { code: 'EEE3208', unescoCode: 'EEE3208', title: 'Power System I Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 308'] },
        { code: 'EEE3311', unescoCode: 'EEE3311', title: 'Microprocessors and Embedded Systems', prereq: ['CSE2105', 'EEE2301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 311'] },
        { code: 'EEE3312', unescoCode: 'EEE3312', title: 'Microprocessors and Embedded Systems Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 312'] },
        { code: 'EEE3316', unescoCode: 'EEE3316', title: 'Electrical Service Design Lab', prereq: ['EEE1203'], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 316'] },
        { code: 'EEE4103', unescoCode: 'EEE4103', title: 'Control System I', prereq: ['EEE2313'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['EEE 403'] },
        { code: 'EEE4104', unescoCode: 'EEE4104', title: 'Control System I Lab', prereq: [], category: 'MajorCore', courseType: 'Lab', oldCodes: ['EEE 404'] },

        // ── Final Year Capstone Project (4 credits, 3 terms) ─────────────────
        { code: 'EEE4196A', unescoCode: 'EEE4196A', title: 'Final Year Capstone Project Part A', prereq: [], category: 'Capstone', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4196B', unescoCode: 'EEE4196B', title: 'Final Year Capstone Project Part B', prereq: ['EEE4196A'], category: 'Capstone', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4196C', unescoCode: 'EEE4196C', title: 'Final Year Capstone Project Part C', prereq: ['EEE4196B'], category: 'Capstone', courseType: 'Theory', oldCodes: [] },

        // ── EEE Concentration Group electives (4 theory + 2 lab / 14 credits) ─
        // Electronics Group
        { code: 'EEE4401', unescoCode: 'EEE4401', title: 'Solid State Devices', prereq: ['EEE1301'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 401'] },
        { code: 'EEE4421', unescoCode: 'EEE4421', title: 'Analog Integrated Circuits', prereq: ['EEE2103'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 421'] },
        { code: 'EEE4423', unescoCode: 'EEE4423', title: 'Processing and Fabrication Technology', prereq: ['EEE3105'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 423'] },
        { code: 'EEE4425', unescoCode: 'EEE4425', title: 'VLSI I', prereq: ['EEE2301'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 425'] },
        { code: 'EEE4426', unescoCode: 'EEE4426', title: 'VLSI I Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 426'] },
        { code: 'EEE4427', unescoCode: 'EEE4427', title: 'VLSI II', prereq: ['EEE4425'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 427'] },
        { code: 'EEE4428', unescoCode: 'EEE4428', title: 'VLSI II Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 428'] },
        { code: 'EEE4429', unescoCode: 'EEE4429', title: 'Compound Semiconductor and Hetero-Junction Devices', prereq: ['EEE3105'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 429'] },
        { code: 'EEE4430', unescoCode: 'EEE4430', title: 'Optoelectronics', prereq: ['EEE3105'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 430'] },
        { code: 'EEE4431', unescoCode: 'EEE4431', title: 'Biomedical Instrumentation', prereq: ['EEE3103'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 431'] },
        { code: 'EEE4432', unescoCode: 'EEE4432', title: 'Biomedical Instrumentation Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 432'] },
        { code: 'EEE4433', unescoCode: 'EEE4433', title: 'Power Electronics', prereq: ['EEE2103'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 433'] },
        { code: 'EEE4434', unescoCode: 'EEE4434', title: 'Power Electronics Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 434'] },
        { code: 'EEE4435', unescoCode: 'EEE4435', title: 'Semiconductor Physics', prereq: ['EEE3105'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 435'] },
        { code: 'EEE4437', unescoCode: 'EEE4437', title: 'Introduction to Nanotechnology', prereq: ['EEE3105'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Communication and Signal Processing Group
        { code: 'EEE4441', unescoCode: 'EEE4441', title: 'Random Signals and Processes', prereq: ['STA2101', 'EEE2313'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 441'] },
        { code: 'CSE3209', unescoCode: 'CSE3209', title: 'Data Communication and Computer Networks', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 309'] },
        { code: 'CSE3210', unescoCode: 'CSE3210', title: 'Data Communication and Computer Networks Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['CSE 310'] },
        { code: 'EEE4443', unescoCode: 'EEE4443', title: 'Information and Coding Theory', prereq: ['EEE3109'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 443'] },
        { code: 'EEE4445', unescoCode: 'EEE4445', title: 'Microwave Engineering', prereq: ['EEE3313'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 445'] },
        { code: 'EEE4446', unescoCode: 'EEE4446', title: 'Microwave Engineering Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 446'] },
        { code: 'EEE4447', unescoCode: 'EEE4447', title: 'Digital Communication', prereq: ['EEE3109'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 447'] },
        { code: 'EEE4448', unescoCode: 'EEE4448', title: 'Digital Communication Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 448'] },
        { code: 'EEE4449', unescoCode: 'EEE4449', title: 'Optical Fiber Communication', prereq: ['EEE3109'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 449'] },
        { code: 'EEE4450', unescoCode: 'EEE4450', title: 'Optical Fiber Communication Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 450'] },
        { code: 'EEE4451', unescoCode: 'EEE4451', title: 'Wireless and Cellular Communication', prereq: ['EEE3109'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 451'] },
        { code: 'EEE4452', unescoCode: 'EEE4452', title: 'Wireless and Cellular Communication Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'EEE4453', unescoCode: 'EEE4453', title: 'Satellite Communication', prereq: ['EEE3109'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 453'] },
        { code: 'EEE4455', unescoCode: 'EEE4455', title: 'Digital Image Processing', prereq: ['EEE3103'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Power Group
        { code: 'EEE4461', unescoCode: 'EEE4461', title: 'Power System II', prereq: ['EEE3207'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 461'] },
        { code: 'EEE4463', unescoCode: 'EEE4463', title: 'Electrical Machines III', prereq: ['EEE2309'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 463'] },
        { code: 'EEE4465', unescoCode: 'EEE4465', title: 'Power Plant Engineering', prereq: ['EEE3207'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 465'] },
        { code: 'EEE4467', unescoCode: 'EEE4467', title: 'Power System Protection', prereq: ['EEE3207'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 467'] },
        { code: 'EEE4468', unescoCode: 'EEE4468', title: 'Power System Protection Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 468'] },
        { code: 'EEE4469', unescoCode: 'EEE4469', title: 'Power System Reliability', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 469'] },
        { code: 'EEE4471', unescoCode: 'EEE4471', title: 'Power System Operation and Control', prereq: ['EEE3207'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 471'] },
        { code: 'EEE4473', unescoCode: 'EEE4473', title: 'High Voltage Engineering', prereq: ['EEE3207'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 473'] },
        { code: 'EEE4474', unescoCode: 'EEE4474', title: 'High Voltage Engineering Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 474'] },
        { code: 'EEE4475', unescoCode: 'EEE4475', title: 'Control System II', prereq: ['EEE4103'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 475'] },
        { code: 'EEE4476', unescoCode: 'EEE4476', title: 'Control System II Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 476'] },
        { code: 'EEE4477', unescoCode: 'EEE4477', title: 'Renewable Energy Technology', prereq: ['EEE1301', 'EEE2309'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 477'] },
        { code: 'EEE4478', unescoCode: 'EEE4478', title: 'Basic Mechanical Engineering', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Computer Group
        { code: 'EEE4479', unescoCode: 'EEE4479', title: 'Data Structure and Algorithm', prereq: ['CSE1201'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4480', unescoCode: 'EEE4480', title: 'Data Structure and Algorithm Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'EEE4481', unescoCode: 'EEE4481', title: 'Artificial Intelligence', prereq: ['EEE4479'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4483', unescoCode: 'EEE4483', title: 'Internet of Things', prereq: ['EEE3311'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4484', unescoCode: 'EEE4484', title: 'Internet of Things Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: [] },
        { code: 'EEE4485', unescoCode: 'EEE4485', title: 'Numerical Methods', prereq: ['MAT2103'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 485'] },
        { code: 'EEE4486', unescoCode: 'EEE4486', title: 'Numerical Methods Lab', prereq: [], category: 'MajorElective', courseType: 'Lab', oldCodes: ['EEE 486'] },
        { code: 'EEE4487', unescoCode: 'EEE4487', title: 'Computer Architecture', prereq: ['EEE3311'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 487'] },
        { code: 'EEE4489', unescoCode: 'EEE4489', title: 'Cloud Computing', prereq: ['CSE1201'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4491', unescoCode: 'EEE4491', title: 'Multimedia Communication', prereq: ['EEE3207'], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 491'] },
        { code: 'EEE4492', unescoCode: 'EEE4492', title: 'Network Programming', prereq: ['CSE3109'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4493', unescoCode: 'EEE4493', title: 'Neural Networks and Applications', prereq: ['EEE3103'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4495', unescoCode: 'EEE4495', title: 'Object Oriented Programming', prereq: ['CSE1201'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'EEE4490', unescoCode: 'EEE4490', title: 'Big Data Analytics', prereq: ['CSE1201'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Thesis / Internship (equivalent to a 3-credit elective, no lab)
        { code: 'EEE4497', unescoCode: 'EEE4497', title: 'Thesis', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 497'] },
        { code: 'EEE4499', unescoCode: 'EEE4499', title: 'Internship', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['EEE 499'] },
        // CSE1201 is a cross-listed prerequisite for several Computer Group
        // electives above — not an EEE-owned course, included only so those
        // prerequisites resolve to a title instead of a bare code.
        { code: 'CSE1201', unescoCode: '0613-014-1201', title: 'Structured Programming', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['CSE 103'] },
    ];

    // Degree requirements for BSc in EEE (140 credits total) — from the
    // catalogue's "Degree Requirements for Bachelor of Science in EEE" table.
    const DEGREE_REQUIREMENTS = {
        labels: {
            GED: 'General Education (GED)',
            MajorCore: 'Major Core Courses',
            BasicScience: 'Basic Science',
            Mathematics: 'Mathematics and Statistics',
            MajorElective: 'Major Concentration',
            OptionalMinor: 'Optional/Minor',
            Capstone: 'Final Year Capstone Project',
        },
        credits: {
            GED: 24,
            MajorCore: 66,
            BasicScience: 11,
            Mathematics: 12,
            MajorElective: 14,
            OptionalMinor: 9,
            Capstone: 4,
        },
        total: 140,
    };

    // Fallback classifier for course codes not individually listed above
    // (other-department Optional/Minor courses). Pattern-based on the raw
    // course-code prefix — heuristic, not authoritative (see file header).
    function classifyByPattern(codeRaw) {
        const code = (codeRaw || '').toUpperCase();
        if (/^ESK/.test(code)) return 'ESK';
        if (/^(GEF|UCC|GED|HUM|SSC|NSC)/.test(code)) return 'GED';
        return 'OptionalMinor';
    }

    // Standard semester plan for BSc EEE (10 teaching semesters).
    // Derived from the prerequisite dependency graph in this catalogue and the
    // standard curriculum in \"Course-Catalogue-Undergraduate-Summer-2026.pdf\".
    const SEMESTER_PLAN = [
        {
            label: 'Semester 1',
            courses: ['GEF1101', 'UCC1101', 'ESK1110', 'EEE1101', 'EEE1102', 'MAT1103', 'PHY1101', 'PHY1102', 'CHEM1301', 'CHEM1302'],
        },
        {
            label: 'Semester 2',
            courses: ['GEF1201', 'ESK1111', 'EEE1203', 'EEE1204', 'EEE1301', 'EEE1302', 'MAT1203', 'MAT1201'],
        },
        {
            label: 'Semester 3',
            courses: ['UCC1201', 'ESK1112', 'EEE2103', 'EEE2104', 'EEE2205', 'CSE2105', 'CSE2106', 'ME2201'],
        },
        {
            label: 'Semester 4',
            courses: ['ESK1113', 'EEE2301', 'EEE2302', 'EEE2309', 'EEE2310', 'MAT2103', 'STA2101'],
        },
        {
            label: 'Semester 5',
            courses: ['GED2159', 'EEE2313', 'EEE2216', 'EEE3313', 'EEE3105', 'EEE3207', 'EEE3208'],
        },
        {
            label: 'Semester 6',
            courses: ['GED2243', 'EEE3103', 'EEE3104', 'EEE3109', 'EEE3110', 'EEE3311', 'EEE3312', 'EEE3316'],
        },
        {
            label: 'Semester 7',
            courses: ['GED2248', 'PHY3101', 'EEE3209', 'EEE3210', 'EEE4103', 'EEE4104'],
        },
        {
            label: 'Semester 8 (Electives + Capstone I)',
            courses: ['EEE4196A'],
            note: 'Take concentration electives (4 theory + 2 lab / 14 cr) from your chosen group.',
        },
        {
            label: 'Semester 9 (Capstone II + Electives)',
            courses: ['EEE4196B'],
            note: 'Continue or complete concentration electives and optional/minor courses.',
        },
        {
            label: 'Semester 10 (Capstone III)',
            courses: ['EEE4196C'],
            note: 'Complete Final Year Capstone Project Part C.',
        },
    ];

    const catalogue = window.buildUlabCatalogue({ courses: COURSES, degreeRequirements: DEGREE_REQUIREMENTS, classifyByPattern, semesterPlan: SEMESTER_PLAN });

    window.ULAB_CATALOGUES = window.ULAB_CATALOGUES || {};
    window.ULAB_CATALOGUES.EEE = catalogue;
})();
