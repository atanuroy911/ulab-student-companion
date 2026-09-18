// features/advising/catalogues/registry.js — display metadata for the
// program picker shown in Student Advising / Course Catalogue. Loaded after
// all catalogues/*.js files, which have already populated
// window.ULAB_CATALOGUES[id].
(function () {
    window.ULAB_PROGRAMS = [
        { id: 'CSE', name: 'BSc in Computer Science & Engineering', short: 'CSE', icon: '💻' },
        { id: 'BBA', name: 'Bachelor of Business Administration', short: 'BBA', icon: '📊' },
        { id: 'ENGLISH', name: 'BA in English and Humanities', short: 'DEH', icon: '📚' },
        { id: 'MSJ', name: 'BSS in Media Studies & Journalism', short: 'MSJ', icon: '🎬' },
        { id: 'EEE', name: 'BSc in Electrical & Electronic Engineering', short: 'EEE', icon: '🔌' },
        { id: 'BANGLA', name: 'BA in Bangla Language and Literature', short: 'Bangla', icon: '📜' },
    ];
})();
