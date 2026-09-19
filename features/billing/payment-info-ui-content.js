// Modern replacement for PaymentInfo.php. The real form stays in the DOM so
// the hosted checkout POST and server-side payment flow remain unchanged.
(function () {
    const VIEW_ID = 'ulab-payment-info-view';
    const STYLE_ID = 'ulab-payment-info-css';

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function money(value) {
        const number = Number(value);
        return Number.isFinite(number) ? `Tk. ${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${VIEW_ID} { display:none; padding:24px 0 48px; text-align:left; }
            body.ulab-page-payment-info.ulab-shell-mounted #${VIEW_ID} { display:block; }
            #${VIEW_ID} .payment-layout { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr); gap:18px; align-items:start; }
            #${VIEW_ID} .payment-kicker { color:var(--bento-accent); font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
            #${VIEW_ID} h1 { margin:5px 0 7px; font-size:28px; line-height:1.12; color:var(--bento-fg); }
            #${VIEW_ID} .payment-lead { max-width:560px; margin:0; color:var(--bento-fg-muted); font-size:13px; }
            #${VIEW_ID} .payment-form-card { margin-top:22px; }
            #${VIEW_ID} .payment-form-card label { display:block; margin-bottom:7px; color:var(--bento-fg); font-size:12px; font-weight:800; }
            #${VIEW_ID} .payment-input-wrap { display:flex; align-items:center; gap:8px; max-width:410px; }
            #${VIEW_ID} .payment-currency { color:var(--bento-fg-muted); font-size:13px; font-weight:700; }
            #${VIEW_ID} .payment-input { flex:1; min-width:0; font:700 20px var(--bento-font-ui); color:var(--bento-fg); background:var(--bento-card-alt); border:1px solid var(--bento-border); border-radius:var(--bento-radius-xs); padding:12px 14px; }
            #${VIEW_ID} .payment-input:focus { outline:none; border-color:var(--bento-primary); box-shadow:0 0 0 3px rgba(13,148,136,.15); }
            #${VIEW_ID} .payment-hint { margin:8px 0 0; font-size:11px; color:var(--bento-fg-subtle); }
            #${VIEW_ID} .payment-summary { position:sticky; top:88px; }
            #${VIEW_ID} .payment-summary h2 { margin:0 0 14px; font-size:14px; color:var(--bento-fg); }
            #${VIEW_ID} .payment-summary-row { display:flex; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid var(--bento-border-soft); font-size:12px; }
            #${VIEW_ID} .payment-summary-row:last-child { border-bottom:0; padding-bottom:0; }
            #${VIEW_ID} .payment-summary-row span { color:var(--bento-fg-muted); }
            #${VIEW_ID} .payment-summary-row strong { color:var(--bento-fg); }
            #${VIEW_ID} .payment-security { margin-top:12px; font-size:11px; line-height:1.5; color:var(--bento-fg-muted); }
            #${VIEW_ID} .payment-submit { margin-top:18px; }
            @media (max-width:720px) { #${VIEW_ID} .payment-layout { grid-template-columns:1fr; } #${VIEW_ID} .payment-summary { position:static; } #${VIEW_ID} h1 { font-size:24px; } }
        `;
        document.head.appendChild(style);
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

    function init() {
        const form = document.querySelector('form[action*="HostedCheckoutReturnToMerchant"]');
        const input = document.getElementById('paymentAmount') || document.querySelector('input[name="order.amount"]');
        if (!form || !input || !window.ULAB_SHELL) {
            window.ULAB_SHELL && window.ULAB_SHELL.uncloak();
            return;
        }

        window.ULAB_SHELL.mount('ulab-page-payment-info', null, (info) => {
            const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
            injectStyle();
            const view = mountView(contentCell);
            chrome.storage.local.get(['ulabBillingSummary'], (result) => {
                const summary = result.ulabBillingSummary || {};
                view.innerHTML = `
                    <div class="payment-kicker">Secure checkout</div>
                    <h1>Make a payment</h1>
                    <p class="payment-lead">Choose the amount you want to pay toward your ULAB account. You will review the details before being sent to the hosted payment page.</p>
                    ${window.ULAB_SHELL.renderHeaderCard(info, {})}
                    <div class="payment-layout">
                        <div class="bento-card payment-form-card">
                            <form id="ulab-modern-payment-form">
                                <label for="ulab-modern-payment-amount">Payment amount</label>
                                <div class="payment-input-wrap"><span class="payment-currency">Tk.</span><input id="ulab-modern-payment-amount" class="payment-input" inputmode="decimal" autocomplete="off" placeholder="0.00" required></div>
                                <p class="payment-hint">Enter a positive amount. You can use decimals.</p>
                                <button class="bento-btn bento-btn-accent payment-submit" type="submit">Check and proceed to payment</button>
                            </form>
                        </div>
                        <aside class="bento-card payment-summary"><h2>Account snapshot</h2>
                            <div class="payment-summary-row"><span>Total payable</span><strong>${money(summary.totalPayable)}</strong></div>
                            <div class="payment-summary-row"><span>Total paid</span><strong>${money(summary.totalPaid)}</strong></div>
                            <div class="payment-summary-row"><span>Outstanding</span><strong style="color:var(--bento-destructive);">${money(summary.totalOutstanding)}</strong></div>
                            <p class="payment-security">Your payment is handled by ULAB's hosted checkout. Confirm the amount carefully before continuing.</p>
                        </aside>
                    </div>`;

                const modernInput = view.querySelector('#ulab-modern-payment-amount');
                view.querySelector('#ulab-modern-payment-form').addEventListener('submit', (event) => {
                    event.preventDefault();
                    const amount = Number(modernInput.value);
                    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999) {
                        alert('Please enter a valid payment amount greater than 0.');
                        modernInput.focus();
                        return;
                    }
                    // Use the native setter so no portal change-event validator fires on the
                    // hidden input, and bypass the portal's onsubmit handler (which shows the
                    // "give number > 0" error) by calling the form's submit method directly
                    // via the prototype (skips onsubmit but still performs the POST).
                    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
                    if (nativeSetter && nativeSetter.set) nativeSetter.set.call(input, amount.toFixed(2));
                    else input.value = amount.toFixed(2);
                    if (window.confirm(`Are you sure you want to proceed with payment of Tk. ${amount.toFixed(2)}?`)) HTMLFormElement.prototype.submit.call(form);
                });
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();