(function () {
    function mount(container) {
        container.innerHTML = '<div class="ulab-step-title">Marks Management</div><div class="ulab-step-subtitle">Open the ULAB Marks Management System. Your student marks page remains on the official MMS domain.</div><a class="ulab-primary-btn" href="https://mms.ulab.edu.bd/student/check-marks" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">Open My Marks</a>';
    }
    window.ULAB_FEATURES = window.ULAB_FEATURES || [];
    window.ULAB_FEATURES.push({ id: 'marks', icon: 'chart', title: 'Marks Management', subtitle: 'View marks on the official MMS portal', mount });
})();
