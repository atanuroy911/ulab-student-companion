// Modern replacement for HostedCheckoutReturnToMerchant_NVP.php. Payment
// providers remain owned by the original page scripts and anchors.
(function () {
    const VIEW_ID = 'ulab-payment-confirmation-view';
    const STYLE_ID = 'ulab-payment-confirmation-css';

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function getPaymentDetails() {
        const cell = document.querySelector('td.content') || document.body;
        const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        const amountMatch = text.match(/Amount\s*:\s*([\d,]+(?:\.\d+)?)[^\d]*(?:BDT|Tk)/i);
        const wordsMatch = text.match(/IN WORD:\s*([^<]+?)(?=\s*Summary|\s*City|$)/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
        const cityLink = Array.from(cell.querySelectorAll('a')).find(link => /CityCreateOrder/i.test(link.href || ''));
        const cancelLink = Array.from(cell.querySelectorAll('a')).find(link => /PaymentInfo/i.test(link.href || ''));
        const bkashButton = cell.querySelector('#bKash_button');
        const cityImage = cityLink && cityLink.querySelector('img');
        const bkashImage = bkashButton && bkashButton.querySelector('img');
        return {
            amount,
            words: wordsMatch ? wordsMatch[1].trim() : '',
            cityHref: cityLink ? cityLink.href : '#',
            cancelHref: cancelLink ? cancelLink.href : '/PaymentInfo.php',
            bkashButton,
            cityImage: cityImage ? cityImage.src : new URL('images/City-Bank-Logo.jpg', location.href).href,
            bkashImage: bkashImage ? bkashImage.src : new URL('images/bKashPayment.png', location.href).href,
        };
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${VIEW_ID} { display:none; padding:24px 0 48px; text-align:left; }
            body.ulab-page-payment-confirmation.ulab-shell-mounted #${VIEW_ID} { display:block; }
            #${VIEW_ID} .confirmation-kicker { color:var(--bento-primary); font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
            #${VIEW_ID} h1 { margin:5px 0 7px; font-size:28px; line-height:1.12; color:var(--bento-fg); }
            #${VIEW_ID} .confirmation-lead { max-width:620px; margin:0; color:var(--bento-fg-muted); font-size:13px; }
            #${VIEW_ID} .confirmation-layout { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr); gap:18px; margin-top:22px; align-items:start; }
            #${VIEW_ID} .confirmation-amount { text-align:center; padding:30px 24px; background:linear-gradient(135deg,var(--bento-card),rgba(13,148,136,.1)); }
            #${VIEW_ID} .confirmation-amount-label { color:var(--bento-fg-muted); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
            #${VIEW_ID} .confirmation-amount-value { margin:8px 0 2px; color:var(--bento-primary); font-size:38px; font-weight:800; letter-spacing:-.02em; }
            #${VIEW_ID} .confirmation-amount-words { color:var(--bento-fg-muted); font-size:12px; text-transform:capitalize; }
            #${VIEW_ID} .payment-methods h2 { margin:0 0 12px; color:var(--bento-fg); font-size:15px; }
            #${VIEW_ID} .payment-method { display:flex; align-items:center; gap:14px; width:100%; margin-top:10px; padding:14px; color:var(--bento-fg); text-decoration:none; background:var(--bento-card); border:1px solid var(--bento-border-soft); border-radius:var(--bento-radius-md); box-shadow:var(--bento-shadow-sm); cursor:pointer; text-align:left; }
            #${VIEW_ID} .payment-method:hover { border-color:var(--bento-primary); box-shadow:var(--bento-shadow-md); transform:translateY(-1px); }
            #${VIEW_ID} .payment-method img { width:64px; height:42px; object-fit:contain; flex-shrink:0; }
            #${VIEW_ID} .payment-method strong, #${VIEW_ID} .payment-method small { display:block; }
            #${VIEW_ID} .payment-method strong { font-size:13px; }
            #${VIEW_ID} .payment-method small { margin-top:3px; color:var(--bento-fg-muted); font-size:11px; }
            #${VIEW_ID} .confirmation-note { margin-top:14px; font-size:11px; line-height:1.5; color:var(--bento-fg-muted); }
            #${VIEW_ID} .confirmation-cancel { display:inline-block; margin-top:16px; color:var(--bento-fg-muted); font-size:12px; text-decoration:none; }
            #${VIEW_ID} .confirmation-cancel:hover { color:var(--bento-primary); }
            @media (max-width:720px) { #${VIEW_ID} .confirmation-layout { grid-template-columns:1fr; } #${VIEW_ID} h1 { font-size:24px; } }
        `;
        document.head.appendChild(style);
    }

    function init() {
        if (!window.ULAB_SHELL) return;
        window.ULAB_SHELL.mount('ulab-page-payment-confirmation', null, (info) => {
            const details = getPaymentDetails();
            const contentCell = window.ULAB_SHELL.wrapLegacyContent() || document.querySelector('td.content') || document.body;
            injectStyle();
            let view = document.getElementById(VIEW_ID);
            if (!view) {
                view = document.createElement('div');
                view.id = VIEW_ID;
                view.className = 'bento-root';
                contentCell.appendChild(view);
            }
            const amount = details.amount == null ? '—' : details.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            view.innerHTML = `
                <div class="confirmation-kicker">Payment ready</div>
                <h1>Choose how to pay</h1>
                <p class="confirmation-lead">Your payment amount is ready. Select a payment method below to continue to the provider's secure checkout.</p>
                ${window.ULAB_SHELL.renderHeaderCard(info, {})}
                <div class="confirmation-layout">
                    <div class="bento-card confirmation-amount"><div class="confirmation-amount-label">Amount to pay</div><div class="confirmation-amount-value">Tk. ${esc(amount)}</div><div class="confirmation-amount-words">${esc(details.words || 'Amount confirmed in Bangladeshi taka')}</div></div>
                    <div class="bento-card payment-methods"><h2>Payment method</h2>
                        <a class="payment-method" href="${esc(details.cityHref)}"><img src="${esc(details.cityImage)}" alt="City Bank payment"><span><strong>Card / bank gateway</strong><small>Continue with the City Bank hosted checkout</small></span></a>
                        <button class="payment-method" type="button" id="ulab-confirm-bkash"><img src="${esc(details.bkashImage)}" alt="bKash payment"><span><strong>bKash</strong><small>Open bKash checkout for this amount</small></span></button>
                        <p class="confirmation-note">Do not close the checkout window until the provider confirms your transaction.</p>
                        <a class="confirmation-cancel" href="${esc(details.cancelHref)}">Cancel and change amount</a>
                    </div>
                </div>`;
            view.querySelector('#ulab-confirm-bkash').addEventListener('click', () => {
                if (details.bkashButton) details.bkashButton.click();
                else alert('bKash checkout is not available on this page.');
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();