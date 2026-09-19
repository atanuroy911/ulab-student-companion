// features/billing/billing-ui-content.js — content script injected into the
// URMS student portal Billing page (Billing.php). New for the UI-revamp
// phase (see reference-html/billing.html for the legacy structure this
// replaces): scrapes the Dues table, Payments table, and the Total
// Outstanding/Payable/Paid summary, caches them, and renders a Bento-styled
// view grouped by semester (ui-feedback.md points 7 & 8).
//
// SELECTOR CAVEAT: built against reference-html/billing.html only (no live
// site access in this pass) — table structure identified by header text per
// the same brittle-markup precaution used on every other page in this repo,
// but if URMS renders anything materially different in practice, treat the
// header-text matchers below as the first thing to re-verify.
(function () {
    const VIEW_ID = 'ulab-billing-view';
    const STYLE_ID = 'ulab-billing-view-css';

    // PARSER LOCATION: the Billing.php scrape (summary totals, Dues table,
    // Payments table, ledger notice) now lives in
    // features/shared/ulab-portal-parsers.js as parseBilling(doc), so the
    // same code reads both this live page and a background-fetched copy of
    // Billing.php for the side panel. This page parses its own LIVE document
    // (free, no request) and writes the unchanged ulabBillingSummary /
    // ulabBillingDues / ulabBillingPayments / ulabBillingScrapedAt keys.
    function scrapeAndPersist() {
        try {
            return window.ULAB_PORTAL_DATA.storeFromDocument('billing', document);
        } catch (e) {
            console.error('[Student Companion] failed to cache Billing.php data', e);
            try { return window.ULAB_PARSERS.parseBilling(document); }
            catch (e2) { return { summary: null, dues: [], payments: [], ledgerNotice: null }; }
        }
    }

    // ── Semester grouping for Dues ──────────────────────────────────────
    // JUDGEMENT CALL: Billing.php's Dues rows only carry a raw DD-MM-YYYY
    // date, no semester code — unlike Status.php, which gives us explicit
    // semester codes per row. Reliably mapping an arbitrary date to a
    // semester code needs the institution's semester start/end calendar,
    // which isn't scraped or bundled anywhere in this extension, so
    // fabricating a code-boundary table here would be guessing, not
    // deriving. Per the task's own instruction ("if you can't reliably
    // infer semester from date alone, group by year+rough term instead and
    // say so") we group by calendar-year + a coarse 3-term bucket instead:
    //   Jan–Apr  -> "Spring"   May–Aug -> "Summer"   Sep–Dec -> "Fall"
    // This mirrors ULAB's known Spring/Summer/Fall naming (visible in the
    // sample semester labels like "Fall 2026") without pretending to know
    // exact semester boundaries/codes.
    function parseBillingDate(value) {
        const text = String(value || '').trim();
        let match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        let day;
        let month;
        let year;
        if (match) {
            day = Number(match[1]);
            month = Number(match[2]);
            year = Number(match[3]);
        } else {
            match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (!match) return null;
            year = Number(match[1]);
            month = Number(match[2]);
            day = Number(match[3]);
        }
        const date = new Date(year, month - 1, day);
        if (!Number.isFinite(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        return { day, month, year, date };
    }

    function roughTermBucket(dateStr) {
        const parsed = parseBillingDate(dateStr);
        if (!parsed) return 'Unknown';
        const month = parsed.month;
        const year = parsed.year;
        let term = 'Spring';
        if (month >= 5 && month <= 8) term = 'Summer';
        else if (month >= 9) term = 'Fall';
        return `${term} ${year}`;
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function fmtMoney(n) {
        return n == null ? '—' : `Tk. ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function paymentHref() {
        const input = Array.from(document.querySelectorAll('input')).find(el => /make payment/i.test(el.value || ''));
        const onclick = input && input.getAttribute('onclick');
        const match = onclick && onclick.match(/location\.href\s*=\s*['"]([^'"]+)/i);
        return match ? match[1] : 'PaymentInfo.php';
    }

    function paymentMonths(payments) {
        const months = new Map();
        for (const payment of payments) {
            const parsed = parseBillingDate(payment.date);
            const key = parsed ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}` : 'Unknown';
            months.set(key, (months.get(key) || 0) + (payment.amount || 0));
        }
        return [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8).reverse();
    }

    function paymentMonthKey(dateStr) {
        const parsed = parseBillingDate(dateStr);
        return parsed ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}` : 'Unknown';
    }

    function paymentMonthLabel(key) {
        if (key === 'Unknown') return 'Other dates';
        const [year, month] = key.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        return Number.isFinite(date.getTime()) && Number(month) >= 1 && Number(month) <= 12
            ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : 'Other dates';
    }

    function paymentGroups(payments) {
        const groups = new Map();
        payments.forEach(payment => {
            const key = paymentMonthKey(payment.date);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(payment);
        });
        return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    }

    // Compact cash-flow strip: same last-8-months data the old 150px bar
    // chart showed, at roughly a third the height. Kept rather than dropped
    // because it is the only place the payment *rhythm* is visible.
    function renderPaymentInsight(payments) {
        const months = paymentMonths(payments);
        if (!months.length) return '';
        const max = Math.max(...months.map(([, amount]) => amount), 1);
        return `
            <h2 class="bento-sectitle">Payments by month</h2>
            <div class="billing-spark" aria-label="Payments by month">${months.map(([month, amount]) => `
                <div class="billing-spark-col" title="${esc(paymentMonthLabel(month))}: ${esc(fmtMoney(amount))}">
                    <b>${esc(fmtMoney(amount).replace('Tk. ', ''))}</b>
                    <i style="height:${Math.max(6, Math.round(amount / max * 100))}%"></i>
                    <small>${esc(paymentMonthLabel(month))}</small>
                </div>`).join('')}</div>`;
    }

    // Sorts "Term YYYY" buckets newest-first using a Spring<Summer<Fall
    // ordering within a year (matches ULAB's academic-year term order).
    function sortTermBucketsDesc(buckets) {
        const order = { Spring: 0, Summer: 1, Fall: 2 };
        return [...buckets].sort((a, b) => {
            const [ta, ya] = a.split(' ');
            const [tb, yb] = b.split(' ');
            if (ya !== yb) return (parseInt(yb, 10) || 0) - (parseInt(ya, 10) || 0);
            return (order[tb] ?? -1) - (order[ta] ?? -1);
        });
    }

    // Dues as ONE dense table, grouped by the coarse term bucket documented
    // above via sub-header rows. Every legacy column is present and in the
    // legacy order — Date | Head | Amount | Discount | Due VAT | VAT
    // Adjusted | Payable — including the two VAT columns, which the previous
    // card layout had demoted into a small run-on details line.
    function renderDuesSections(dues) {
        if (!dues.length) return '<div class="bento-empty">No dues found.</div>';
        const groups = new Map();
        for (const d of dues) {
            const key = roughTermBucket(d.date);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(d);
        }
        const buckets = sortTermBucketsDesc(Array.from(groups.keys()).filter(k => k !== 'Unknown'));
        if (groups.has('Unknown')) buckets.push('Unknown');

        const defaultBucket = buckets[0] || 'all';

        const body = buckets.map((key) => {
            const rows = groups.get(key);
            const subtotal = rows.reduce((sum, r) => sum + (r.payable || 0), 0);
            const isHidden = (key !== defaultBucket);
            return `
                <tr class="is-group ${isHidden ? 'bento-hidden' : ''}" data-dues-semester="${esc(key)}"><td colspan="7">${esc(key)} <span class="c-muted">— ${rows.length} item${rows.length === 1 ? '' : 's'}</span></td></tr>
                ${rows.map(r => `
                    <tr class="${isHidden ? 'bento-hidden' : ''}" data-dues-semester="${esc(key)}">
                        <td class="c-nowrap">${esc(r.date)}</td>
                        <td>${esc(r.head)}</td>
                        <td class="c-right">${esc(fmtMoney(r.amount))}</td>
                        <td class="c-right">${esc(fmtMoney(r.discount))}</td>
                        <td class="c-right">${esc(fmtMoney(r.dueVat))}</td>
                        <td class="c-right">${esc(fmtMoney(r.vatAdjusted))}</td>
                        <td class="c-right">${esc(fmtMoney(r.payable))}</td>
                    </tr>`).join('')}
                <tr class="is-total ${isHidden ? 'bento-hidden' : ''}" data-dues-semester="${esc(key)}"><td colspan="6" class="c-right">${esc(key)} payable</td><td class="c-right">${esc(fmtMoney(subtotal))}</td></tr>`;
        }).join('');

        return `
            <div class="bento-toolbar" style="margin-bottom: 8px;">
                <label class="bento-field" for="ulab-dues-semester">Semester
                    <select id="ulab-dues-semester">
                        ${buckets.map(b => `<option value="${esc(b)}" ${b === defaultBucket ? 'selected' : ''}>${esc(b)}</option>`).join('')}
                        <option value="all">All Semesters</option>
                    </select>
                </label>
            </div>
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>Date</th><th>Head</th><th>Amount</th><th>Discount</th><th>Due VAT</th><th>VAT Adjusted</th><th>Payable</th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    // Payments as one dense table, still grouped by month (sub-header rows),
    // carrying every legacy column: Date | MR No. | Amount | Cheque No. |
    // Comments. Search / year filter / CSV export are preserved.
    function renderPayments(payments) {
        if (!payments.length) return '<div class="bento-empty">No payments recorded.</div>';
        const groups = paymentGroups(payments);
        const years = [...new Set(groups.map(([key]) => key.split('-')[0]).filter(year => year !== 'Unknown'))].sort().reverse();
        const body = groups.map(([key, rows]) => {
            const groupSem = rows.length ? roughTermBucket(rows[0].date) : 'Unknown';
            return `
            <tr class="is-group" data-group-month="${esc(key)}" data-payment-semester="${esc(groupSem)}"><td colspan="6">${esc(paymentMonthLabel(key))} <span class="c-muted">— ${rows.length} payment${rows.length === 1 ? '' : 's'} · ${esc(fmtMoney(rows.reduce((sum, row) => sum + (row.amount || 0), 0)))}</span></td></tr>
            ${rows.slice().reverse().map(p => {
                const pSem = roughTermBucket(p.date);
                return `
                <tr data-payment-month="${esc(key)}" data-payment-semester="${esc(pSem)}" data-payment-search="${esc(`${p.date} ${p.mrNo} ${p.chequeNo} ${p.comments}`.toLowerCase())}">
                    <td class="c-nowrap">${esc(p.date)}</td>
                    <td class="c-code">${esc(p.mrNo || '—')}</td>
                    <td class="c-right">${esc(fmtMoney(p.amount))}</td>
                    <td class="c-nowrap">${esc(p.chequeNo || '—')}</td>
                    <td class="c-sub">${esc(p.comments || '—')}</td>
                    <td class="c-center"><button type="button" class="bento-chip" data-receipt-mr="${esc(p.mrNo || '')}" data-receipt-date="${esc(p.date || '')}" title="Print this receipt">Receipt</button></td>
                </tr>`;
            }).join('')}`;
        }).join('');

        return `
            <div class="bento-toolbar">
                <label class="bento-search" for="ulab-payment-search">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                    <input id="ulab-payment-search" type="search" placeholder="MR number, date, cheque, comment..." autocomplete="off">
                </label>
                <label class="bento-field" for="ulab-payment-year">Year
                    <select id="ulab-payment-year"><option value="all">All</option>${years.map(year => `<option value="${esc(year)}">${esc(year)}</option>`).join('')}</select>
                </label>
                <button class="bento-chip" id="ulab-export-payments" type="button">Export CSV</button>
                <button class="bento-chip" id="ulab-export-statement" type="button">Export statement (PDF)</button>
            </div>
            <p class="bento-count" id="ulab-payment-filter-status">${payments.length} payments across ${groups.length} months</p>
            <div class="bento-tablewrap">
                <table class="bento-compact">
                    <thead><tr><th>Date</th><th>MR No.</th><th>Amount</th><th>Cheque No.</th><th>Comments</th><th></th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>`;
    }

    const PRINT_CSS = `
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font: 11px/1.45 "Segoe UI", system-ui, sans-serif; color: #12211f; margin: 0; }
  header { border-bottom: 2px solid #0D9488; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: #4B7A76; font-size: 11px; }
  .badge { display:inline-block; margin-top:6px; padding:2px 7px; border:1px solid #D97706; color:#92400e;
           border-radius:999px; font-size:9.5px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
  .summary { display:flex; flex-wrap:wrap; gap:18px; margin:0 0 16px; padding:9px 12px;
             background:#F0FDFA; border:1px solid #99F6E4; border-radius:6px; }
  .summary div { font-size:10.5px; color:#4B7A76; }
  .summary b { display:block; font-size:14px; color:#134E4A; }
  h2 { font-size:12px; margin:14px 0 5px; padding-bottom:3px; border-bottom:1px solid #cfe9e5; }
  table { width:100%; border-collapse:collapse; page-break-inside:auto; }
  th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.05em;
       color:#4B7A76; border-bottom:1px solid #cfe9e5; padding:4px 6px; }
  td { padding:3.5px 6px; border-bottom:1px solid #edf5f4; }
  tr { page-break-inside:avoid; }
  .r { text-align:right; } .b { font-weight:700; }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  footer { margin-top:16px; padding-top:8px; border-top:1px solid #cfe9e5; color:#6B8E8B; font-size:9.5px; }`;

    function printHeader(info, title) {
        const bits = [info.studentId ? `ID ${esc(info.studentId)}` : '', info.semesterLabel ? esc(info.semesterLabel) : ''].filter(Boolean).join(' &middot; ');
        return `<header>
            <h1>${esc(title)}</h1>
            <div class="sub">${esc(info.studentName || '')}${bits ? ' &middot; ' + bits : ''}</div>
            <div class="badge">Unofficial &middot; student-generated</div>
        </header>`;
    }

    function printFooter() {
        return `<footer>Generated ${esc(new Date().toLocaleString())} by ULAB Student Companion from this
            student's own URMS billing page. <b>This is not an official receipt or statement</b> and carries no
            authority from the university's accounts office — request official documents from ULAB for any
            formal purpose.</footer>`;
    }

    function statementHtml(summary, dues, payments, info) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Billing statement — ${esc(info.studentName || 'ULAB student')}</title>
<style>${PRINT_CSS}</style></head><body>
${printHeader(info, 'Billing Statement')}
<div class="summary">
  <div>Total Outstanding <b>${esc(fmtMoney(summary.totalOutstanding))}</b></div>
  <div>Total Payable <b>${esc(fmtMoney(summary.totalPayable))}</b></div>
  <div>Total Paid <b>${esc(fmtMoney(summary.totalPaid))}</b></div>
</div>
<h2>Dues</h2>
<table>
  <thead><tr><th>Date</th><th>Head</th><th class="r">Amount</th><th class="r">Discount</th><th class="r">Due VAT</th><th class="r">VAT Adj.</th><th class="r">Payable</th></tr></thead>
  <tbody>${(dues || []).map(d => `<tr>
      <td class="mono">${esc(d.date || '')}</td><td>${esc(d.head || '')}</td>
      <td class="r">${esc(fmtMoney(d.amount))}</td><td class="r">${esc(fmtMoney(d.discount))}</td>
      <td class="r">${esc(fmtMoney(d.dueVat))}</td><td class="r">${esc(fmtMoney(d.vatAdjusted))}</td>
      <td class="r b">${esc(fmtMoney(d.payable))}</td></tr>`).join('')}</tbody>
</table>
<h2>Payments</h2>
<table>
  <thead><tr><th>Date</th><th>MR No.</th><th class="r">Amount</th><th>Cheque No.</th><th>Comments</th></tr></thead>
  <tbody>${(payments || []).map(p => `<tr>
      <td class="mono">${esc(p.date || '')}</td><td class="mono">${esc(p.mrNo || '')}</td>
      <td class="r b">${esc(fmtMoney(p.amount))}</td><td>${esc(p.chequeNo || '')}</td>
      <td>${esc(p.comments || '')}</td></tr>`).join('')}</tbody>
</table>
${printFooter()}</body></html>`;
    }

    function receiptHtml(payment, info) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${esc(payment.mrNo || '')}</title>
<style>${PRINT_CSS}
  .rec { margin-top:8px; border:1px solid #99F6E4; border-radius:6px; padding:14px 16px; max-width:420px; }
  .rec .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #edf5f4; }
  .rec .row:last-child { border-bottom:0; }
  .rec .row span { color:#4B7A76; font-size:10.5px; }
  .amt { font-size:20px; font-weight:700; color:#134E4A; }
</style></head><body>
${printHeader(info, 'Money Receipt')}
<div class="rec">
  <div class="row"><span>Receipt (MR) No.</span><b class="mono">${esc(payment.mrNo || '—')}</b></div>
  <div class="row"><span>Date</span><b class="mono">${esc(payment.date || '—')}</b></div>
  <div class="row"><span>Cheque No.</span><b>${esc(payment.chequeNo || '—')}</b></div>
  <div class="row"><span>Comments</span><b>${esc(payment.comments || '—')}</b></div>
  <div class="row"><span>Amount paid</span><span class="amt">${esc(fmtMoney(payment.amount))}</span></div>
</div>
${printFooter()}</body></html>`;
    }

    function wirePaymentHistory(view, payments, summary, dues, info) {
        const duesSemSelect = view.querySelector('#ulab-dues-semester');
        if (duesSemSelect) {
            const applySemesterFilter = () => {
                const selected = duesSemSelect.value;
                const duesRows = view.querySelectorAll('tr[data-dues-semester]');
                duesRows.forEach(row => {
                    if (selected === 'all' || row.dataset.duesSemester === selected) {
                        row.classList.remove('bento-hidden');
                    } else {
                        row.classList.add('bento-hidden');
                    }
                });
                const paymentRows = view.querySelectorAll('tr[data-payment-semester]');
                paymentRows.forEach(row => {
                    if (selected === 'all' || row.dataset.paymentSemester === selected) {
                        row.classList.remove('bento-hidden-sem');
                    } else {
                        row.classList.add('bento-hidden-sem');
                    }
                });
            };
            duesSemSelect.addEventListener('change', applySemesterFilter);
            applySemesterFilter();
        }

        const search = view.querySelector('#ulab-payment-search');
        const year = view.querySelector('#ulab-payment-year');
        const status = view.querySelector('#ulab-payment-filter-status');
        if (!search || !year || !status) return;
        const groupRows = Array.from(view.querySelectorAll('tr[data-group-month]'));
        const rows = Array.from(view.querySelectorAll('tr[data-payment-search]'));
        const applyFilter = () => {
            const query = search.value.trim().toLowerCase();
            const selectedYear = year.value;
            let visible = 0;
            const perMonth = new Map();
            rows.forEach((row) => {
                const month = row.dataset.paymentMonth || '';
                const yearMatch = selectedYear === 'all' || month.startsWith(selectedYear);
                const matches = yearMatch && (!query || (row.dataset.paymentSearch || '').includes(query));
                row.classList.toggle('bento-hidden', !matches);
                if (matches) { visible++; perMonth.set(month, (perMonth.get(month) || 0) + 1); }
            });
            groupRows.forEach((groupRow) => {
                groupRow.classList.toggle('bento-hidden', !perMonth.get(groupRow.dataset.groupMonth));
            });
            status.textContent = `${visible} payment${visible === 1 ? '' : 's'} shown`;
        };
        search.addEventListener('input', applyFilter);
        year.addEventListener('change', applyFilter);
        view.querySelector('#ulab-export-payments').addEventListener('click', () => {
            const header = 'Date,Receipt,Amount,Cheque,Comments';
            const csv = payments.map(payment => [payment.date, payment.mrNo, payment.amount, payment.chequeNo, payment.comments].map(value => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([`${header}\n${csv}`], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'ulab-payment-history.csv';
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });

        const print = (html, frameId) => {
            if (window.ULAB_SHELL && window.ULAB_SHELL.printDocument) {
                window.ULAB_SHELL.printDocument(html, frameId);
            }
        };

        const statementBtn = view.querySelector('#ulab-export-statement');
        if (statementBtn) {
            statementBtn.addEventListener('click', () => {
                print(statementHtml(summary || {}, dues || [], payments, info || {}), 'ulab-billing-print-frame');
            });
        }

        view.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-receipt-mr]');
            if (!btn || !view.contains(btn)) return;
            const mr = btn.dataset.receiptMr;
            const date = btn.dataset.receiptDate;
            const payment = payments.find(p => (mr && String(p.mrNo) === mr))
                || payments.find(p => String(p.date) === date);
            if (payment) print(receiptHtml(payment, info || {}), 'ulab-receipt-print-frame');
        });
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${VIEW_ID} { display: none; padding: 10px 0 28px; text-align: left; font-family: var(--bento-font-ui); color: var(--bento-fg); }
            body.ulab-page-billing.ulab-shell-mounted #${VIEW_ID} { display: block; }
            body.ulab-page-billing.ulab-shell-mounted .ulab-legacy-billing-table { display: none !important; }
            .bento-hidden-sem { display: none !important; }
            #${VIEW_ID} .billing-spark { display:flex; align-items:flex-end; gap:8px; height:64px; padding:0 2px; overflow-x:auto; border-bottom:1px solid var(--bento-border-soft); }
            #${VIEW_ID} .billing-spark-col { display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:2px; min-width:58px; height:100%; }
            #${VIEW_ID} .billing-spark-col i { display:block; width:22px; min-height:4px; border-radius:3px 3px 0 0; background:var(--bento-primary); }
            #${VIEW_ID} .billing-spark-col b, #${VIEW_ID} .billing-spark-col small { font-size:9.5px; font-weight:600; color:var(--bento-fg-subtle); white-space:nowrap; }
            #${VIEW_ID} .billing-spark-col b { color:var(--bento-fg-muted); font-weight:800; }
        `;
        document.head.appendChild(style);
    }

    function hideLegacyTables() {
        for (const table of Array.from(document.querySelectorAll('table'))) {
            const headerText = (table.querySelector('tr') || {}).textContent || '';
            const isDues = /Date/i.test(headerText) && /Head/i.test(headerText) && /Payable/i.test(headerText);
            const isPayments = /Date/i.test(headerText) && /MR No\./i.test(headerText);
            if (isDues || isPayments) table.classList.add('ulab-legacy-billing-table');
        }
    }

    function mountView(container) {
        let view = document.getElementById(VIEW_ID);
        if (!view) {
            view = document.createElement('div');
            view.id = VIEW_ID;
            view.className = 'bento-root';
            container.appendChild(view);
        }
        return view;
    }

    function render(summary, dues, payments, info, ledgerNotice) {
        const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
        injectStyle();
        hideLegacyTables();
        const view = mountView(contentCell);
        const payHref = paymentHref();
        const isSimple = window.ULAB_SHELL && window.ULAB_SHELL.isSimpleMode();

        const warningMsg = ledgerNotice || "Please check your ledger for any discrepancies before making your final payment.";
        const prominentWarningHtml = `
            <div style="color: #DC2626; font-size: 1.15rem; font-weight: 700; padding: 14px 18px; background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 12px; margin: 16px 0; display: flex; align-items: center; gap: 10px; box-shadow: 0 2px 8px rgba(220,38,38,0.1);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
                <span>${esc(warningMsg)}</span>
            </div>`;

        const headerCardHtml = window.ULAB_SHELL.renderHeaderCard(info, {
            title: 'Billing',
            stats: [
                { label: 'Total Outstanding', value: fmtMoney(summary.totalOutstanding), cls: summary.totalOutstanding ? 'destructive' : '' },
                { label: 'Total Payable', value: fmtMoney(summary.totalPayable) },
                { label: 'Total Paid', value: fmtMoney(summary.totalPaid), cls: 'success' },
            ],
            meter: (summary.totalPaid != null && summary.totalPayable != null)
                ? { label: 'Paid of payable', value: summary.totalPaid, max: summary.totalPayable, note: 'Figures as reported by the portal at page load.' }
                : null,
            links: [{ label: 'Make a payment', href: payHref }],
        });

        view.innerHTML = `
            ${headerCardHtml}
            ${prominentWarningHtml}
            ${isSimple ? '' : renderPaymentInsight(payments)}
            <h2 class="bento-sectitle">Dues & History by Semester</h2>
            ${renderDuesSections(dues)}
            <h2 class="bento-sectitle">Payment History</h2>
            ${renderPayments(payments)}
            <p class="bento-footnote">Dues & History are grouped by calendar year + a coarse Spring / Summer / Fall bucket read off each row's date.</p>
        `;
        wirePaymentHistory(view, payments, summary, dues, info);
    }

    function init() {
        // GUARD against this project's known silent-blank-page bug class:
        // these files now depend on the two shared modules
        // (features/shared/ulab-portal-parsers.js and ulab-portal-data.js).
        // If a manifest bundle is missing them, throwing inside mount()'s
        // onMount would be swallowed by its try/catch and blank the whole
        // page. Bail BEFORE mount() instead: the shell's cloak self-clears
        // after 1.5s, so the student gets the untouched legacy page and we
        // get a loud console error, never a blank one.
        if (!window.ULAB_PARSERS || !window.ULAB_PORTAL_DATA) {
            console.error('[Student Companion] shared portal modules are not loaded — skipping the modern view for this page. Add features/shared/ulab-portal-parsers.js and features/shared/ulab-portal-data.js to the content_scripts entry for this page.');
            return;
        }
        window.ULAB_SHELL.mount('ulab-page-billing', null, (info) => {
            const parsed = scrapeAndPersist();
            render(parsed.summary, parsed.dues, parsed.payments, info, parsed.ledgerNotice);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
