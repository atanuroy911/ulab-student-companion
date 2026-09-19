// features/course-evaluation/course-evaluation-ui-content.js — content
// script for CourseEvaluation.php. Thin config wrapper around
// features/evaluation/evaluation-shared.js (loaded first — see
// manifest.json), which owns the actual scrape/hide/render logic shared
// with TeacherEvaluation.php.
(function () {
    function init() {
        window.ULAB_EVAL.run({
            bodyClass: 'ulab-page-course-evaluation',
            storageKey: 'ulabCourseEvaluation',
            pageTitle: 'Course Evaluation',
            mode: 'course',
            headerPatterns: [/Course\s*ID/i, /Course\s*Name/i, /Section/i, /Evaluate/i],
            columns: ['courseId', 'courseName', 'section', 'evaluate'],
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
