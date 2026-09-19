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
        const clone = cell.cloneNode(true);
        clone.querySelectorAll('script, style').forEach(el => el.remove());
        const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
        const amountMatch = text.match(/Amount\s*:\s*([\d,]+(?:\.\d+)?)[^\d]*(?:BDT|Tk)/i)
            || text.match(/([\d,]+(?:\.\d+)?)\s*(?:BDT|Tk)/i);
        const wordsMatch = text.match(/IN WORD\s*:?\s*([A-Za-z\s,]+?)(?=\s*Var|\s*function|\s*\$|\s*Summary|\s*City|\s*Amount|\s*Tk|\d|$)/i);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
        const cityLink = Array.from(cell.querySelectorAll('a')).find(link => /CityCreateOrder/i.test(link.href || ''));
        const cancelLink = Array.from(cell.querySelectorAll('a')).find(link => /PaymentInfo/i.test(link.href || '') || /Cancel/i.test(link.textContent || ''));
        const bkashButton = cell.querySelector('#bKash_button');
        const cityImage = cityLink && cityLink.querySelector('img');
        const bkashImage = bkashButton && bkashButton.querySelector('img');
        return {
            amount,
            words: wordsMatch ? wordsMatch[1].trim() : '',
            cityHref: cityLink ? cityLink.href : '#',
            cancelHref: (cancelLink && cancelLink.href && /PaymentInfo/i.test(cancelLink.href)) ? cancelLink.href : 'https://urms-online.ulab.edu.bd/PaymentInfo.php',
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

            /* Lower shell header z-index when bKash modal is present so bKash overlay dominates */
            body.ulab-bkash-active #ulab-app-header,
            body:has(#app) #ulab-app-header,
            body:has(.app[data-v-app]) #ulab-app-header,
            body:has([data-v-eb2367ff]) #ulab-app-header {
                z-index: 100 !important;
            }

            /* bKash Merchant Modal Overlay */
            #app.app, div[data-v-app], #app {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 2147483647 !important;
                background: rgba(11, 25, 87, 0.8) !important;
                backdrop-filter: blur(8px) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 20px !important;
                box-sizing: border-box !important;
                overflow-y: auto !important;
            }
            #app .container {
                background: #ffffff !important;
                border-radius: 20px !important;
                box-shadow: 0 24px 72px rgba(11, 25, 87, 0.35), 0 0 0 1px rgba(11, 25, 87, 0.08) !important;
                width: 100% !important;
                max-width: 420px !important;
                padding: 28px 24px 20px !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                font-family: var(--bento-font-ui, system-ui, -apple-system, sans-serif) !important;
                animation: ulabBkashPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                position: relative !important;
                z-index: 2147483647 !important;
            }
            @keyframes ulabBkashPop {
                from { opacity: 0; transform: scale(0.94) translateY(12px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            #app .header { display: flex !important; justify-content: center !important; align-items: center !important; padding-bottom: 12px !important; }
            #app .header__logo { height: 48px !important; width: auto !important; }
            #app .hr { display: block !important; height: 1px !important; background: #e2e8f0 !important; margin: 12px 0 16px !important; }
            #app .merchant { display: flex !important; align-items: center !important; gap: 14px !important; padding: 14px 16px !important; background: #f8fafc !important; border-radius: 12px !important; margin-bottom: 18px !important; border: 1px solid #e2e8f0 !important; }
            #app .merchant__logo { width: 42px !important; height: 42px !important; object-fit: contain !important; border-radius: 8px !important; }
            #app .merchant__details { flex: 1 !important; }
            #app .merchant__details__name { margin: 0 !important; font-size: 15px !important; font-weight: 700 !important; color: #0b1957 !important; }
            #app .merchant__details__invoice { margin: 2px 0 0 !important; font-size: 11px !important; color: #64748b !important; }
            #app .merchant__amount { font-size: 18px !important; font-weight: 800 !important; color: #e2136e !important; }
            #app .form, #app .card { background: linear-gradient(135deg, #e2136e, #d10056) !important; padding: 20px 18px !important; border-radius: 14px !important; color: #ffffff !important; text-align: center !important; box-shadow: 0 8px 24px rgba(226, 19, 110, 0.25) !important; margin-bottom: 18px !important; }
            #app .form__label { display: block !important; font-size: 13px !important; font-weight: 700 !important; margin-bottom: 12px !important; color: #ffffff !important; letter-spacing: 0.02em !important; }
            #app input.form-input, #app input#WALLET, #app input[type="text"], #app input[type="password"] { width: 100% !important; box-sizing: border-box !important; padding: 12px 14px !important; font-size: 18px !important; font-weight: 700 !important; text-align: center !important; letter-spacing: 0.08em !important; border-radius: 10px !important; border: 2px solid rgba(255, 255, 255, 0.4) !important; background: #ffffff !important; color: #0b1957 !important; outline: none !important; transition: all 0.2s ease !important; }
            #app input:focus { border-color: #ffffff !important; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3) !important; }
            #app .form__info { margin-top: 12px !important; font-size: 11px !important; color: rgba(255, 255, 255, 0.9) !important; }
            #app .form__info a { color: #ffffff !important; text-decoration: underline !important; }
            #app .btn-group { display: flex !important; gap: 12px !important; margin-bottom: 16px !important; }
            #app .btn { flex: 1 !important; padding: 12px 18px !important; font-size: 14px !important; font-weight: 700 !important; border-radius: 10px !important; cursor: pointer !important; border: none !important; transition: all 0.2s ease !important; }
            #app .btn-group__btn-close { background: #f1f5f9 !important; color: #475569 !important; border: 1px solid #cbd5e1 !important; }
            #app .btn-group__btn-close:hover { background: #e2e8f0 !important; color: #0f172a !important; }
            #app .btn-group__btn-confirm { background: #e2136e !important; color: #ffffff !important; box-shadow: 0 4px 14px rgba(226, 19, 110, 0.3) !important; }
            #app .btn-group__btn-confirm:hover:not(:disabled) { background: #c80d5e !important; transform: translateY(-1px) !important; }
            #app .btn-group__btn-confirm:disabled { opacity: 0.55 !important; cursor: not-allowed !important; }
            #app .footer { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 6px !important; padding-top: 12px !important; border-top: 1px solid #f1f5f9 !important; font-size: 11px !important; color: #94a3b8 !important; }
            #app .footer__helpline { display: flex !important; align-items: center !important; gap: 6px !important; color: #e2136e !important; text-decoration: none !important; font-weight: 700 !important; }
            #app .footer__helpline-number { color: #e2136e !important; text-decoration: none !important; }
        `;
        document.head.appendChild(style);
    }

    function observeBkashModal() {
        function checkAndLift() {
            const hasBkashModal = document.getElementById('app') ||
                                  document.querySelector('.app[data-v-app]') ||
                                  document.querySelector('[data-v-eb2367ff]') ||
                                  document.querySelector('#bKash_modal');
            if (hasBkashModal) {
                document.body.classList.add('ulab-bkash-active');
            } else {
                document.body.classList.remove('ulab-bkash-active');
            }

            // Find bKash button or modal/app elements
            const targets = [
                document.getElementById('bKash_button'),
                document.getElementById('app'),
                document.querySelector('.app[data-v-app]'),
                document.querySelector('[data-v-eb2367ff]'),
                document.querySelector('#bKash_modal'),
                document.querySelector('iframe[src*="bkash"]')
            ].filter(Boolean);

            for (const el of targets) {
                // If element is inside a hidden legacy wrapper, move it to document.body
                let ancestor = el.parentElement;
                let insideHidden = false;
                while (ancestor && ancestor !== document.body) {
                    if (ancestor.classList.contains('ulab-legacy-content-wrap') || getComputedStyle(ancestor).display === 'none') {
                        insideHidden = true;
                        break;
                    }
                    ancestor = ancestor.parentElement;
                }
                if (insideHidden || (el.parentElement && el.parentElement !== document.body && (el.id === 'app' || el.classList.contains('app')))) {
                    document.body.appendChild(el);
                }
            }
        }
        checkAndLift();
        const observer = new MutationObserver(() => {
            checkAndLift();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        if (document.documentElement) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
        // Short polling safety loop while user is on payment confirmation page
        setInterval(checkAndLift, 250);
    }

    function init() {
        if (!window.ULAB_SHELL) return;
        observeBkashModal();
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
            view.querySelector('#ulab-confirm-bkash').addEventListener('click', (e) => {
                e.preventDefault();
                const btn = document.getElementById('bKash_button') || document.querySelector('[id*="bKash"]') || document.querySelector('[src*="bKash"]');
                if (btn) {
                    if (btn.parentElement && btn.parentElement !== document.body) {
                        document.body.appendChild(btn);
                    }
                    try { btn.click(); } catch(err) {}
                }
                const script = document.createElement('script');
                script.textContent = `
                    (function() {
                        var b = document.getElementById('bKash_button') || document.querySelector('[id*="bKash"]');
                        if (b && b.parentElement && b.parentElement !== document.body) {
                            document.body.appendChild(b);
                        }
                        if (typeof ClickPayButton === 'function') {
                            ClickPayButton();
                        } else if (b) {
                            if (window.jQuery) { window.jQuery(b).trigger('click'); }
                            else { b.click(); }
                        } else if (window.bKash && typeof window.bKash.create === 'function') {
                            window.bKash.create().click();
                        } else {
                            alert('bKash checkout is not ready on this page.');
                        }
                    })();
                `;
                (document.head || document.documentElement).appendChild(script);
                script.remove();
            });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();