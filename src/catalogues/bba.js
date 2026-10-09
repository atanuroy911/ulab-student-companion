// features/advising/catalogues/bba.js — BBA (Bachelor of Business
// Administration) course catalogue & degree-requirement map.
//
// Course list transcribed from "Course-Catalogue-Undergraduate-Summer-2026.pdf"
// (Bachelor of Business Administration section). UNESCO codes were then
// cross-matched by course TITLE against "courses-scrapped-urms.txt" (a real
// export of URMS course codes, which lists both the UNESCO code and the old
// local code for each course actually offered). Where a confident title
// match was found, `unescoCode` holds the real UNESCO code and the local
// code is recorded in `oldCodes`; where no match was found in the scrape,
// `unescoCode` falls back to equalling the local `code` (unverified — flag
// if a student's row doesn't resolve). Matches were only accepted when the
// scraped title matched closely AND the UNESCO segment made sense for BBA
// (011 = BBA core, 051 = BBA/EMBA shared concentration pool) — ambiguous or
// grad-only (052/055) matches were left unmapped rather than guessed.
//
// Categories used: GED (GEF+UCC+GED-elective, matching the catalogue's own
// combined numbering), MajorCore, MajorElective, OptionalMinor, Internship.
// ESK is non-credit and not tracked in DEGREE_REQUIREMENTS (same convention
// as catalogues/cse.js).
(function () {
    const COURSES = [
        // ── GEF / UCC / ESK (no prerequisites) ──────────────────────────────
        { code: 'GEF1101', unescoCode: '0231-000-1101', title: 'Academic English I', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 101'] },
        { code: 'GEF1201', unescoCode: '0231-000-1201', title: 'Academic English II', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['ENG 102'] },
        { code: 'UCC1101', unescoCode: '0232-000-1101', title: 'Bangla Bhasha O Sahitya', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 101'] },
        { code: 'UCC1201', unescoCode: '0222-000-1201', title: 'History of the Emergence of Independent Bangladesh', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 103'] },
        { code: 'UCC1202', unescoCode: '0223-000-1202', title: 'Ethics', prereq: [], category: 'GED', courseType: 'Theory', oldCodes: ['GED 212'] },
        { code: 'ESK1110', unescoCode: '0031-000-1110', title: 'Study Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1111', unescoCode: '0031-000-1111', title: 'Healthy Life Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1112', unescoCode: '0031-000-1112', title: 'Social Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },
        { code: 'ESK1113', unescoCode: '0031-000-1113', title: 'Professional Skills', prereq: [], category: 'ESK', courseType: 'Theory', oldCodes: [] },

        // ── Major Core (20 courses / 60 credits) ────────────────────────────
        { code: 'BUS1101', unescoCode: '0410-011-1101', title: 'Introduction to Business', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 101'] },
        { code: 'BUS1201', unescoCode: '0488-011-1201', title: 'Business Mathematics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 103'] },
        { code: 'BUS1301', unescoCode: '0411-011-1301', title: 'Financial Accounting', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 207'] },
        { code: 'BUS1302', unescoCode: '0488-011-1302', title: 'Micro Economics', prereq: ['BUS1201'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 105'] },
        { code: 'BUS2101', unescoCode: '0488-011-2101', title: 'Macro Economics', prereq: ['BUS1302'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 201'] },
        { code: 'BUS2102', unescoCode: '0488-011-2102', title: 'Business Statistics', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 204'] },
        { code: 'BUS2103', unescoCode: '0413-011-2103', title: 'Principles of Management', prereq: ['BUS1101'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 203'] },
        { code: 'BUS2201', unescoCode: '0488-011-2201', title: 'Quantitative Analysis for Business', prereq: ['BUS2102'], category: 'MajorCore', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS2202', unescoCode: '0488-011-2202', title: 'Business Communication', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 205'] },
        { code: 'BUS2203', unescoCode: '0488-011-2203', title: 'Legal Environment of Business', prereq: ['BUS1101'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 208'] },
        // No 011-segment UNESCO row found for Marketing Management in the
        // scrape (only the 051-segment "MKT501" one below, used for the
        // concentration elective) — left unmapped rather than guessed.
        { code: 'BUS2301', unescoCode: 'BUS2301', title: 'Marketing Management', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 314'] },
        { code: 'BUS2302', unescoCode: '0413-051-525', title: 'Organizational Behavior', prereq: ['BUS2103'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 209'] },
        { code: 'BUS2303', unescoCode: '0412-051-501', title: 'Financial Management', prereq: ['BUS1301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['FIN501', 'BUS 302'] },
        { code: 'BUS3101', unescoCode: '0413-051-501', title: 'Human Resource Management', prereq: ['BUS2302'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['HRM501', 'BUS 301'] },
        { code: 'BUS3102', unescoCode: '0413-000-503', title: 'Entrepreneurship', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 305'] },
        { code: 'BUS3103', unescoCode: '0415-051-502', title: 'International Business', prereq: ['BUS2101', 'BUS1301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BGE502', 'BUS 306'] },
        { code: 'BUS3104', unescoCode: '0411-051-516', title: 'Managerial Accounting', prereq: ['BUS1301'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 403'] },
        { code: 'BUS3201', unescoCode: 'BUS3201', title: 'Research Methodology', prereq: ['BUS2201'], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 308'] },
        { code: 'BUS3202', unescoCode: '0416-051-501', title: 'Operations Management', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['SCM501'] },
        { code: 'BUS4999', unescoCode: 'BUS4999', title: 'Strategic Management', prereq: [], category: 'MajorCore', courseType: 'Theory', oldCodes: ['BUS 307'] },

        // ── Project / Internship ─────────────────────────────────────────
        { code: 'BUS4398', unescoCode: 'BUS4398', title: 'Project', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4399', unescoCode: 'BUS4399', title: 'Internship', prereq: [], category: 'Internship', courseType: 'Theory', oldCodes: [] },

        // ── Major Elective (Concentration) courses seen in real URMS data ───
        // Only the concentration courses that actually turned up as
        // registered local codes in the URMS scrape are individually listed;
        // the rest of each concentration's course pool (see the PDF) is
        // still covered by classifyByPattern() below.
        { code: 'BUS4131', unescoCode: '0412-051-604', title: 'Corporate Finance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['FIN604', 'BUS311'] },
        { code: 'BUS4132', unescoCode: '0412-051-602', title: 'Financial Markets and Institutions', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['FIN602', 'BUS421'] },
        { code: 'BUS4133', unescoCode: 'BUS4133', title: 'Security Analysis and Portfolio Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS422'] },
        { code: 'BUS4141', unescoCode: 'BUS4141', title: 'Bank Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS431'] },
        { code: 'BUS4142', unescoCode: 'BUS4142', title: 'Project Finance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS318'] },
        { code: 'BUS4111', unescoCode: 'BUS4111', title: 'Cost Accounting', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS401'] },
        { code: 'BUS4112', unescoCode: 'BUS4112', title: 'Accounting Information System', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS408'] },
        { code: 'BUS4113', unescoCode: 'BUS4113', title: 'Intermediate Accounting I', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4114', unescoCode: 'BUS4114', title: 'Intermediate Accounting II', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4121', unescoCode: 'BUS4121', title: 'Assurance and Auditing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS404'] },
        { code: 'BUS4151', unescoCode: 'BUS4151', title: 'Managerial Skills Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS316'] },
        { code: 'BUS4152', unescoCode: 'BUS4152', title: 'Industrial and Employee Relations', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS443'] },
        { code: 'BUS4154', unescoCode: '0413-051-602', title: 'Training and Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['HRM602'] },
        { code: 'BUS4162', unescoCode: 'BUS4162', title: 'Strategic Human Resource Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS475'] },
        { code: 'BUS4171', unescoCode: '0414-051-601', title: 'Consumer Behavior', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MKT601', 'BUS459'] },
        { code: 'BUS4172', unescoCode: 'BUS4172', title: 'Service Marketing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS457'] },
        { code: 'BUS4173', unescoCode: '0414-051-602', title: 'Integrated Marketing Communication', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MKT602'] },
        { code: 'BUS4183', unescoCode: '0414-051-604', title: 'Brand Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['BUS454'] },
        { code: 'BUS4184', unescoCode: '0414-051-603', title: 'Personal Selling & Sales Force Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['MKT603', 'BUS452'] },
        { code: 'SCM4501', unescoCode: '0416-051-604', title: 'Principles of Supply Chain Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['SCM604'] },
        { code: 'SCM4502', unescoCode: '0416-051-602', title: 'Logistics Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: ['SCM602'] },
        { code: 'SCM4503', unescoCode: '0416-051-605', title: 'Procurement Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'SCM4507', unescoCode: 'SCM4507', title: 'Global Supply Chain Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'SCM4510', unescoCode: 'SCM4510', title: 'Maritime Logistics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },

        // ── Remaining Major Elective (Concentration) courses, transcribed
        // from "Course-Catalogue-Undergraduate-Summer-2026.pdf"'s BBA
        // concentration tables (Accounting, Finance, HRM, Marketing, SCM,
        // Banking & Insurance, Economics, Management, Entrepreneurship,
        // MIS/e-Business) — the rest of the ~90-course pool the comment
        // above referred to that never turned up in the URMS scrape.
        // unescoCode falls back to the local code (unverified, same
        // convention already used above for un-scraped courses) since these
        // have no confirmed UNESCO mapping. SCM prerequisites are transcribed
        // as printed in the catalogue; everything else has none listed.
        // Accounting
        { code: 'BUS4122', unescoCode: 'BUS4122', title: 'Bank & Insurance Accounting', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4123', unescoCode: 'BUS4123', title: 'Taxation', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4124', unescoCode: 'BUS4124', title: 'International Financial Reporting Standards', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Finance
        { code: 'BUS4134', unescoCode: 'BUS4134', title: 'International Financial Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4143', unescoCode: 'BUS4143', title: 'Lease Finance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4144', unescoCode: 'BUS4144', title: 'Financial Derivatives', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4145', unescoCode: 'BUS4145', title: 'Venture Capital Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Human Resource Management
        { code: 'BUS4153', unescoCode: 'BUS4153', title: 'Human Resource Planning', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4161', unescoCode: 'BUS4161', title: 'Industrial Psychology', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4163', unescoCode: 'BUS4163', title: 'Change Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4164', unescoCode: 'BUS4164', title: 'Compensation Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Marketing
        { code: 'BUS4174', unescoCode: 'BUS4174', title: 'Digital Marketing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4181', unescoCode: 'BUS4181', title: 'Strategic Marketing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4182', unescoCode: 'BUS4182', title: 'Marketing Research', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4185', unescoCode: 'BUS4185', title: 'Supply Chain Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Supply Chain Management
        { code: 'SCM4504', unescoCode: 'SCM4504', title: 'Project Management', prereq: ['SCM4503'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'SCM4505', unescoCode: 'SCM4505', title: 'Sustainable SCM', prereq: ['SCM4501'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'SCM4506', unescoCode: 'SCM4506', title: 'Accounting and Financial SCM', prereq: ['SCM4501'], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'SCM4508', unescoCode: 'SCM4508', title: 'TQM and Process Improvement', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'SCM4509', unescoCode: 'SCM4509', title: 'Supply Chain Analytics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Banking and Insurance
        { code: 'BUS4191', unescoCode: 'BUS4191', title: 'Banking and Insurance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4192', unescoCode: 'BUS4192', title: 'Banking Law', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4193', unescoCode: 'BUS4193', title: 'Bank Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4194', unescoCode: 'BUS4194', title: 'Insurance and Risk Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4196', unescoCode: 'BUS4196', title: 'Financial Market and Institutions', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4197', unescoCode: 'BUS4197', title: "Banks' Product Marketing", prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4198', unescoCode: 'BUS4198', title: 'Electronic Banking', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4199', unescoCode: 'BUS4199', title: 'Merchant Banking', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4200', unescoCode: 'BUS4200', title: 'Bank & Insurance Accounting', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4201', unescoCode: 'BUS4201', title: 'Core Risk Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4202', unescoCode: 'BUS4202', title: 'Rural Banking', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Economics
        { code: 'BUS4211', unescoCode: 'BUS4211', title: 'International Trade Theory', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4212', unescoCode: 'BUS4212', title: 'Development Economics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4213', unescoCode: 'BUS4213', title: 'Bangladesh Economy', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4214', unescoCode: 'BUS4214', title: 'Environmental Economics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4221', unescoCode: 'BUS4221', title: 'Public Finance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4222', unescoCode: 'BUS4222', title: 'Econometrics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4223', unescoCode: 'BUS4223', title: 'International Finance', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4224', unescoCode: 'BUS4224', title: 'Mathematical Economics', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Management
        { code: 'BUS4230', unescoCode: 'BUS4230', title: 'Production and Operations Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4231', unescoCode: 'BUS4231', title: 'Leadership', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4232', unescoCode: 'BUS4232', title: 'Project Appraisal and Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4233', unescoCode: 'BUS4233', title: 'International Financial Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4234', unescoCode: 'BUS4234', title: 'Bank Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4235', unescoCode: 'BUS4235', title: 'Small Business Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4236', unescoCode: 'BUS4236', title: 'Industrial Relations', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4237', unescoCode: 'BUS4237', title: 'Insurance & Risk Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4238', unescoCode: 'BUS4238', title: 'Total Quality Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4239', unescoCode: 'BUS4239', title: 'Intercultural Aspects of Business', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4240', unescoCode: 'BUS4240', title: 'Management Thought', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Entrepreneurship
        { code: 'BUS4245', unescoCode: 'BUS4245', title: 'Venture Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4246', unescoCode: 'BUS4246', title: 'Total Quality Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4247', unescoCode: 'BUS4247', title: 'Small Business Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4248', unescoCode: 'BUS4248', title: 'Project Appraisal & Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4249', unescoCode: 'BUS4249', title: 'Business Plan Development', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4250', unescoCode: 'BUS4250', title: 'Leadership', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4251', unescoCode: 'BUS4251', title: 'Production Planning and Inventory Control', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4252', unescoCode: 'BUS4252', title: 'Cases in Entrepreneurship', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4253', unescoCode: 'BUS4253', title: 'Strategic Marketing', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        // Management Information System and e-Business
        { code: 'BUS4260', unescoCode: 'BUS4260', title: 'System Analysis and Design', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4261', unescoCode: 'BUS4261', title: 'Applied Database Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4262', unescoCode: 'BUS4262', title: 'Web Design and Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4263', unescoCode: 'BUS4263', title: 'Object Oriented Programming', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4264', unescoCode: 'BUS4264', title: 'Information Technology', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4265', unescoCode: 'BUS4265', title: 'Technology fundamentals of Electronic Commerce', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4266', unescoCode: 'BUS4266', title: 'Marketing on the Internet', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4267', unescoCode: 'BUS4267', title: 'Personal Selling & Sales Force Management', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },
        { code: 'BUS4268', unescoCode: 'BUS4268', title: 'Management of Online Business', prereq: [], category: 'MajorElective', courseType: 'Theory', oldCodes: [] },

        // ── ECO-prefixed courses seen in the Class Schedule (BBA Minor in
        // Economics pool — one schedule cell literally tags a section "for
        // BBA Minor") — titles from docs/courses-scrapped-urms.txt (real
        // URMS export), not individually in the catalogue PDF's own tables.
        // category: OptionalMinor, not MajorElective — these are Economics
        // department courses taken as a minor/elective, not part of BBA's
        // own 9-area concentration pool above, and OptionalMinor is what
        // classifyByPattern() below would already default an unlisted
        // non-BUS/SCM code to, so this only adds a title, not a category
        // change that would shift a student's degree-progress credit bucket.
        { code: 'ECO4601', unescoCode: 'ECO4601', title: 'Principles of Economics', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: [] },
        { code: 'ECO4602', unescoCode: 'ECO4602', title: 'Intermediate Economics', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: [] },
        { code: 'ECO4603', unescoCode: 'ECO4603', title: 'Money and Banking', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: [] },
        { code: 'ECO4604', unescoCode: 'ECO4604', title: 'International Trade', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: [] },
        { code: 'ECO4606', unescoCode: 'ECO4606', title: 'Development Economics', prereq: [], category: 'OptionalMinor', courseType: 'Theory', oldCodes: [] },
    ];

    // Degree requirements for BBA (120 credits total) — from the catalogue's
    // "Degree Requirements for Bachelor of Business Administration" table.
    const DEGREE_REQUIREMENTS = {
        labels: {
            GED: 'General Education (GEF/UCC/GED Elective)',
            MajorCore: 'Major Core Courses',
            MajorElective: 'Major Elective (Concentration) Courses',
            OptionalMinor: 'Minor/Optional',
            Internship: 'Project/Internship',
        },
        credits: {
            GED: 24,
            MajorCore: 60,
            MajorElective: 18,
            OptionalMinor: 15,
            Internship: 3,
        },
        total: 120,
    };

    // Best-effort category classifier for course codes NOT individually
    // listed above: the 6-of-9 concentration Major Elective courses (BUS
    // 41xx–42xx and SCM 45xx codes across Accounting, Finance, HRM,
    // Marketing, SCM, Banking & Insurance, Economics, Management,
    // Entrepreneurship, MIS/e-Business — ~90 courses total, not worth hand-
    // listing) and other-department Minor/Optional courses. Pattern-based on
    // the raw course-code prefix — heuristic, not authoritative (see file
    // header re: no UNESCO codes available for this program).
    function classifyByPattern(codeRaw) {
        const code = (codeRaw || '').toUpperCase();
        if (/^ESK/.test(code)) return 'ESK';
        if (/^(GEF|UCC|GED|HUM|SSC|NSC)/.test(code)) return 'GED';
        if (/^BUS4[12]\d\d$/.test(code)) return 'MajorElective';
        if (/^SCM4\d\d\d$/.test(code)) return 'MajorElective';
        return 'OptionalMinor';
    }

    // Standard semester plan for BBA (8 teaching semesters, ~15 cr each).
    // Derived from the prerequisite chain in this catalogue and the BBA
    // curriculum structure in \"Course-Catalogue-Undergraduate-Summer-2026.pdf\".
    const SEMESTER_PLAN = [
        {
            label: 'Semester 1',
            courses: ['GEF1101', 'UCC1101', 'ESK1110', 'BUS1101', 'BUS1201', 'BUS1301', 'BUS1302'],
        },
        {
            label: 'Semester 2',
            courses: ['GEF1201', 'ESK1111', 'BUS2101', 'BUS2102', 'BUS2103', 'BUS2202', 'BUS2203'],
        },
        {
            label: 'Semester 3',
            courses: ['UCC1201', 'ESK1112', 'BUS2201', 'BUS2301', 'BUS2302', 'BUS2303'],
        },
        {
            label: 'Semester 4',
            courses: ['UCC1202', 'ESK1113', 'BUS3101', 'BUS3102', 'BUS3103', 'BUS3104'],
        },
        {
            label: 'Semester 5',
            courses: ['BUS3201', 'BUS3202', 'BUS4999'],
            note: 'Start taking concentration electives (3 of 6 required courses).',
        },
        {
            label: 'Semester 6',
            note: 'Continue concentration electives (3 more of 6 required).',
            courses: [],
        },
        {
            label: 'Semester 7',
            note: 'Minor/optional courses (5 of 5 required).',
            courses: [],
        },
        {
            label: 'Semester 8 (Final)',
            courses: ['BUS4398', 'BUS4399'],
            note: 'Complete Project (BUS4398) or Internship (BUS4399).',
        },
    ];

    const catalogue = window.buildUlabCatalogue({ courses: COURSES, degreeRequirements: DEGREE_REQUIREMENTS, classifyByPattern, semesterPlan: SEMESTER_PLAN });

    window.ULAB_CATALOGUES = window.ULAB_CATALOGUES || {};
    window.ULAB_CATALOGUES.BBA = catalogue;
})();
