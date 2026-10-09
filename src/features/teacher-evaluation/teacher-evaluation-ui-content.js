// features/teacher-evaluation/teacher-evaluation-ui-content.js — content
// script for TeacherEvaluation.php. Thin config wrapper around
// features/evaluation/evaluation-shared.js (loaded first — see
// manifest.json), which owns the actual scrape/hide/render logic shared
// with CourseEvaluation.php.
(function () {
    function init() {
        window.ULAB_EVAL.run({
            bodyClass: 'ulab-page-teacher-evaluation',
            storageKey: 'ulabTeacherEvaluation',
            pageTitle: 'Teacher Evaluation',
            mode: 'teacher',
            headerPatterns: [/Teacher\s*ID/i, /Teacher\s*Name/i, /Course\s*ID/i, /Evaluate/i],
            columns: ['teacherId', 'teacherName', 'courseId', 'courseName', 'section', 'evaluate'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
