// features/login/login-ui-content.js — content script injected on
// urms-online.ulab.edu.bd's login page. This is a *different*, much older
// site than the faculty URMS (urms-awp.ulab.edu.bd): plain 2005-era table
// HTML, windows-1252 encoded, no Bootstrap/ASP.NET markup, no ids on most
// elements, and — critically — login and the logged-in Home page can both
// live at the same URL depending on session state (manifest.json matches
// both "/" and "/index.php*" for this reason). So this script must check
// defensively for the actual login form before doing anything, and must be
// a no-op if it isn't present (e.g. the user is already logged in and this
// is the Home page instead — features/home/home-ui-content.js handles that
// case).
//
// Same pattern as the faculty companion's login-ui-content.js: draws a
// modern split-screen layout OVER the stock table-based form without ever
// touching the real <form>/<input> elements (name="studentID",
// name="password", POST to /index.php, no CSRF token observed in the
// reference HTML — see reference-html/login.html). The modern layer uses
// its own inputs that mirror values into the real ones and submits the real
// form on click, so the original markup — and its POST behavior — never
// changes.
(function () {
    const STYLE_ID = 'ulab-modern-login-css';
    const SHELL_ID = 'ulab-login-shell';
    const TOGGLE_ID = 'ulab-modern-login-toggle';
    const CLOAK_ID = 'ulab-cloak-style';
    const STORAGE_KEY = 'ulabModernUI';

    // Runs at document_start so we can hide the page instantly and reveal it
    // only once we've decided whether to show the stock form or the modern
    // shell — avoids an old-UI-then-swap flash.
    function cloak() {
        const s = document.createElement('style');
        s.id = CLOAK_ID;
        s.textContent = 'html.ulab-cloak { visibility: hidden !important; }';
        (document.head || document.documentElement).appendChild(s);
        document.documentElement.classList.add('ulab-cloak');
        setTimeout(uncloak, 1500); // safety net
    }
    function uncloak() {
        document.documentElement.classList.remove('ulab-cloak');
    }

    const ICONS = {
        user: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        lock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        eye: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
        eyeOff: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    };

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            body.ulab-modern-login { background: #f4f6fb; }
            /* The real page is a single <table class="main"> with no
               header/footer wrapper elements to hide separately (unlike the
               faculty ASP.NET layout) — just push the whole stock table
               off-screen instead of listing individual selectors. */
            body.ulab-modern-login table.main {
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
            }
            body.ulab-modern-login #${SHELL_ID} { display: grid; }

            #${SHELL_ID} {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 100000;
                grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                background: #fff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
            }

            #${SHELL_ID} .ulab-visual {
                position: relative;
                overflow: hidden;
                background: linear-gradient(160deg, #0D9488 0%, #0F766E 55%, #134E4A 100%);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 3rem 3.25rem;
                color: #fff;
            }
            #${SHELL_ID} .ulab-blob {
                position: absolute; border-radius: 50%; filter: blur(60px);
                opacity: .35; pointer-events: none;
            }
            #${SHELL_ID} .ulab-blob.b1 { width: 320px; height: 320px; background: #2DD4BF; top: -80px; right: -100px; }
            #${SHELL_ID} .ulab-blob.b2 { width: 260px; height: 260px; background: #EA580C; bottom: -60px; left: -60px; opacity: .3; }
            #${SHELL_ID} .ulab-grid-pattern {
                position: absolute; inset: 0;
                background-image: radial-gradient(rgba(255,255,255,.16) 1px, transparent 1px);
                background-size: 26px 26px;
                mask-image: linear-gradient(180deg, rgba(0,0,0,.7), transparent 75%);
            }
            #${SHELL_ID} .ulab-visual-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
            #${SHELL_ID} .ulab-visual-top span { font-weight: 700; font-size: 1.05rem; letter-spacing: .01em; }

            #${SHELL_ID} .ulab-visual-mid { position: relative; z-index: 1; max-width: 420px; }
            #${SHELL_ID} .ulab-visual-mid h1 {
                font-size: 2.15rem; line-height: 1.2; font-weight: 700; letter-spacing: -.02em; margin: 0 0 .85rem;
                color: #fff !important;
                -webkit-text-fill-color: #fff;
            }
            #${SHELL_ID} .ulab-visual-mid p { font-size: .98rem; line-height: 1.55; color: rgba(255,255,255,.85); margin: 0; }

            #${SHELL_ID} .ulab-visual-features { position: relative; z-index: 1; display: flex; flex-direction: column; gap: .7rem; margin-top: 1.6rem; }
            #${SHELL_ID} .ulab-visual-features div { display: flex; align-items: center; gap: 10px; font-size: .88rem; color: rgba(255,255,255,.92); }
            #${SHELL_ID} .ulab-visual-features div::before {
                content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; flex-shrink: 0;
            }

            #${SHELL_ID} .ulab-visual-bottom { position: relative; z-index: 1; font-size: .78rem; color: rgba(255,255,255,.65); }

            #${SHELL_ID} .ulab-formside {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2.5rem;
                background: #fafbfd;
            }
            #${SHELL_ID} .ulab-formbox {
                width: 100%; max-width: 400px;
                background: #fff;
                border: 1px solid #eef1f6;
                border-radius: 14px;
                box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 12px 32px -8px rgba(16,24,40,.1);
                padding: 2.25rem 2.25rem 2rem;
            }
            #${SHELL_ID} .ulab-formbox h2 {
                font-size: 1.6rem; font-weight: 700; color: #101828; margin: 0 0 .35rem; letter-spacing: -.01em;
            }
            #${SHELL_ID} .ulab-formbox .ulab-sub { color: #667085; font-size: .92rem; margin: 0 0 1.75rem; }

            #${SHELL_ID} .ulab-field { margin-bottom: 1.15rem; }
            #${SHELL_ID} .ulab-field label {
                display: block; font-size: .8rem; font-weight: 600; color: #344054; margin-bottom: .4rem;
            }
            #${SHELL_ID} .ulab-input-wrap { position: relative; display: flex; align-items: center; }
            #${SHELL_ID} .ulab-input-wrap .ulab-icon {
                position: absolute; left: 13px; color: #98a2b3; display: flex; pointer-events: none;
            }
            #${SHELL_ID} .ulab-input-wrap input {
                width: 100%; box-sizing: border-box;
                padding: .72rem .95rem .72rem 2.5rem;
                border: none;
                border-bottom: 2px solid #d0d5dd;
                border-radius: 4px 4px 0 0;
                font-size: .95rem;
                background: #eef2fb;
                color: #101828;
                transition: border-color .15s ease, background .15s ease;
            }
            #${SHELL_ID} .ulab-input-wrap input::placeholder { color: #98a2b3; }
            #${SHELL_ID} .ulab-input-wrap input:focus {
                outline: none;
                border-bottom-color: #0D9488;
                background: #e7edf9;
            }
            #${SHELL_ID} .ulab-input-wrap.password input { padding-right: 2.6rem; }
            #${SHELL_ID} .ulab-eye-btn {
                position: absolute; right: 12px; background: none; border: none; padding: 4px;
                color: #98a2b3; cursor: pointer; display: flex; border-radius: 50%;
            }
            #${SHELL_ID} .ulab-eye-btn:hover { color: #0D9488; background: #f2f5fb; }

            #${SHELL_ID} .ulab-submit {
                width: 100%; border: none; border-radius: 4px; padding: .8rem 1rem;
                background: #0D9488; margin-top: .3rem;
                color: #fff; font-size: .9rem; font-weight: 600;
                text-transform: uppercase; letter-spacing: .03em;
                display: flex; align-items: center; justify-content: center; gap: 8px;
                box-shadow: 0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12);
                cursor: pointer;
                transition: box-shadow .15s ease, background .15s ease;
            }
            #${SHELL_ID} .ulab-submit:hover {
                background: #0F766E;
                box-shadow: 0 3px 3px -2px rgba(0,0,0,.2), 0 3px 4px 0 rgba(0,0,0,.14), 0 1px 8px 0 rgba(0,0,0,.12);
            }

            #${SHELL_ID} .ulab-formbox .ulab-footnote {
                text-align: center; margin-top: 1.8rem; font-size: .78rem; color: #98a2b3;
            }
            #${SHELL_ID} .ulab-forgot { text-align: center; margin-top: .9rem; }
            #${SHELL_ID} .ulab-forgot a { font-size: .82rem; color: #0D9488; text-decoration: none; }
            #${SHELL_ID} .ulab-forgot a:hover { text-decoration: underline; }

            @media (max-width: 991.98px) {
                #${SHELL_ID} { grid-template-columns: 1fr; overflow-y: auto; }
                #${SHELL_ID} .ulab-visual { display: none; }
                #${SHELL_ID} .ulab-formside { padding: 1.5rem; align-items: flex-start; min-height: 100%; padding-top: 3rem; }
                #${SHELL_ID} .ulab-formbox { max-width: 420px; }
            }
            @media (max-width: 575.98px) {
                #${SHELL_ID} .ulab-formside { padding: 1.25rem 1rem; padding-top: 2rem; }
                #${SHELL_ID} .ulab-formbox { max-width: 100%; }
                #${SHELL_ID} .ulab-formbox h2 { font-size: 1.35rem; }
                #${TOGGLE_ID} { right: 10px; bottom: 10px; padding: 5px 10px 5px 8px; font-size: 10.5px; }
            }

            /* Floating "modern UI" toggle */
            #${TOGGLE_ID} {
                position: fixed; right: 16px; bottom: 16px; z-index: 999999;
                display: flex; align-items: center; gap: 8px;
                background: #fff; border: 1px solid #e4e7ec; border-radius: 4px;
                padding: 6px 12px 6px 10px;
                font: 500 11.5px/1 -apple-system, "Segoe UI", sans-serif;
                color: #667085;
                box-shadow: 0 1px 3px 0 rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14);
                opacity: .5; transition: opacity .2s ease, box-shadow .2s ease;
                cursor: pointer; user-select: none;
            }
            #${TOGGLE_ID}:hover { opacity: 1; box-shadow: 0 3px 3px -2px rgba(0,0,0,.2), 0 3px 4px 0 rgba(0,0,0,.14), 0 1px 8px 0 rgba(0,0,0,.12); }
            #${TOGGLE_ID} .ulab-switch {
                position: relative; width: 30px; height: 17px; border-radius: 999px; background: #d0d5dd;
                transition: background .2s ease; flex-shrink: 0;
            }
            #${TOGGLE_ID} .ulab-switch::after {
                content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px;
                border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3);
                transition: transform .2s ease;
            }
            #${TOGGLE_ID}.on .ulab-switch { background: #0D9488; }
            #${TOGGLE_ID}.on .ulab-switch::after { transform: translateX(13px); }
        `;
        document.head.appendChild(style);
    }

    // Finds the real login form by its INPUT NAMES (studentID / password),
    // per reference-html/login.html — this site has no ids/classes worth
    // relying on. Returns null (and does nothing else) if this isn't
    // actually the login page (e.g. it's the logged-in Home page reusing
    // the same URL).
    function findRealLoginParts() {
        const userInput = document.querySelector('input[name="studentID"]');
        const passInput = document.querySelector('input[name="password"]');
        const form = userInput ? userInput.closest('form') : null;
        const submitBtn = form ? form.querySelector('input[type="submit"]') : null;
        if (!userInput || !passInput || !form || !submitBtn) return null;
        return { userInput, passInput, form, submitBtn };
    }

    // Forgot Password page (reference-html/forgot-password.html): same
    // index.php URL family as login/home, but only a studentID field plus a
    // hidden forgotPassword=1 input — no password field, so
    // findRealLoginParts() correctly returns null for it. Detect it
    // separately rather than folding it into that function's contract.
    function findForgotPasswordParts() {
        const userInput = document.querySelector('input[name="studentID"]');
        const marker = document.querySelector('input[name="forgotPassword"]');
        const form = userInput ? userInput.closest('form') : null;
        const submitBtn = form ? form.querySelector('input[type="submit"]') : null;
        if (!userInput || !marker || !form || !submitBtn) return null;
        return { userInput, form, submitBtn };
    }

    function buildForgotPasswordShell(parts) {
        const { userInput, submitBtn } = parts;

        const shell = document.createElement('div');
        shell.id = SHELL_ID;

        const visual = document.createElement('div');
        visual.className = 'ulab-visual';
        visual.innerHTML = `
            <div class="ulab-grid-pattern"></div>
            <div class="ulab-blob b1"></div>
            <div class="ulab-blob b2"></div>
            <div class="ulab-visual-top"><span>ULAB URMS</span></div>
            <div class="ulab-visual-mid">
                <h1>Reset your password</h1>
                <p>Enter your Student ID and we'll send a password reset link to your registered email.</p>
            </div>
            <div class="ulab-visual-bottom">&copy; 2026 - ValuePLUS Computer Systems Ltd.</div>
        `;

        const formside = document.createElement('div');
        formside.className = 'ulab-formside';
        const formbox = document.createElement('div');
        formbox.className = 'ulab-formbox';
        formbox.innerHTML = `<h2>Forgot password</h2><p class="ulab-sub">We'll email you a reset link.</p>`;

        const doSubmit = () => submitBtn.click();

        const { field: userField } = buildField(userInput, 'Student ID', ICONS.user, {
            placeholder: 'Enter your student ID',
            onEnter: doSubmit
        });
        formbox.appendChild(userField);

        const submitEl = document.createElement('button');
        submitEl.type = 'button';
        submitEl.className = 'ulab-submit';
        submitEl.innerHTML = `<span>Send reset link</span>${ICONS.arrow}`;
        submitEl.addEventListener('click', doSubmit);
        formbox.appendChild(submitEl);

        const backLink = document.createElement('div');
        backLink.className = 'ulab-forgot';
        const a = document.createElement('a');
        a.href = 'index.php';
        a.textContent = 'Back to sign in';
        backLink.appendChild(a);
        formbox.appendChild(backLink);

        const footnote = document.createElement('div');
        footnote.className = 'ulab-footnote';
        footnote.textContent = 'ULAB Student Web Portal';
        formbox.appendChild(footnote);

        formside.appendChild(formbox);
        shell.appendChild(visual);
        shell.appendChild(formside);
        return shell;
    }

    function buildField(realInput, labelText, iconSvg, opts) {
        opts = opts || {};
        const mirrorId = 'ulab-mirror-' + (realInput.name || 'field');

        const field = document.createElement('div');
        field.className = 'ulab-field';

        const label = document.createElement('label');
        label.setAttribute('for', mirrorId);
        label.textContent = labelText;
        field.appendChild(label);

        const wrap = document.createElement('div');
        wrap.className = 'ulab-input-wrap' + (opts.password ? ' password' : '');
        const icon = document.createElement('span');
        icon.className = 'ulab-icon';
        icon.innerHTML = iconSvg;
        wrap.appendChild(icon);

        const mirrorInput = document.createElement('input');
        mirrorInput.id = mirrorId;
        mirrorInput.type = opts.password ? 'password' : 'text';
        mirrorInput.autocomplete = opts.password ? 'current-password' : 'username';
        mirrorInput.placeholder = opts.placeholder || '';
        mirrorInput.value = realInput.value || '';
        mirrorInput.addEventListener('input', () => { realInput.value = mirrorInput.value; });
        wrap.appendChild(mirrorInput);

        if (opts.password) {
            const eyeBtn = document.createElement('button');
            eyeBtn.type = 'button';
            eyeBtn.className = 'ulab-eye-btn';
            eyeBtn.innerHTML = ICONS.eye;
            eyeBtn.setAttribute('aria-label', 'Show password');
            eyeBtn.addEventListener('click', () => {
                const showing = mirrorInput.type === 'text';
                mirrorInput.type = showing ? 'password' : 'text';
                eyeBtn.innerHTML = showing ? ICONS.eye : ICONS.eyeOff;
            });
            wrap.appendChild(eyeBtn);
        }
        field.appendChild(wrap);

        if (opts.onEnter) {
            mirrorInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); opts.onEnter(); }
            });
        }

        return { field, mirrorInput };
    }

    function buildShell(parts) {
        const { userInput, passInput, submitBtn } = parts;

        const shell = document.createElement('div');
        shell.id = SHELL_ID;

        const visual = document.createElement('div');
        visual.className = 'ulab-visual';
        visual.innerHTML = `
            <div class="ulab-grid-pattern"></div>
            <div class="ulab-blob b1"></div>
            <div class="ulab-blob b2"></div>
            <div class="ulab-visual-top"><span>ULAB URMS</span></div>
            <div class="ulab-visual-mid">
                <h1>Welcome back</h1>
                <p>Sign in to check your schedule, billing, results, and everything else on the student portal.</p>
                <div class="ulab-visual-features">
                    <div>Your courses, schedule &amp; results in one place</div>
                    <div>Self-advising checks, built for students</div>
                    <div>Built for the ULAB academic community</div>
                </div>
            </div>
            <div class="ulab-visual-bottom">&copy; 2026 - ValuePLUS Computer Systems Ltd.</div>
        `;

        const formside = document.createElement('div');
        formside.className = 'ulab-formside';
        const formbox = document.createElement('div');
        formbox.className = 'ulab-formbox';
        formbox.innerHTML = `<h2>Sign in</h2><p class="ulab-sub">Enter your Student ID and password.</p>`;

        const doSubmit = () => submitBtn.click();

        const { field: userField } = buildField(userInput, 'Student ID', ICONS.user, {
            placeholder: 'Enter your student ID'
        });
        formbox.appendChild(userField);

        const { field: passField } = buildField(passInput, 'Password', ICONS.lock, {
            password: true,
            placeholder: 'Enter your password',
            onEnter: doSubmit
        });
        formbox.appendChild(passField);

        const submitEl = document.createElement('button');
        submitEl.type = 'button';
        submitEl.className = 'ulab-submit';
        submitEl.innerHTML = `<span>Log in</span>${ICONS.arrow}`;
        submitEl.addEventListener('click', doSubmit);
        formbox.appendChild(submitEl);

        const forgotLink = document.querySelector('a[href*="forgotPassword"]');
        if (forgotLink) {
            const forgot = document.createElement('div');
            forgot.className = 'ulab-forgot';
            const a = document.createElement('a');
            a.href = forgotLink.getAttribute('href');
            a.textContent = 'Forgot your password?';
            forgot.appendChild(a);
            formbox.appendChild(forgot);
        }

        const footnote = document.createElement('div');
        footnote.className = 'ulab-footnote';
        footnote.textContent = 'ULAB Student Web Portal';
        formbox.appendChild(footnote);

        formside.appendChild(formbox);
        shell.appendChild(visual);
        shell.appendChild(formside);
        return shell;
    }

    function injectToggle(isOn) {
        if (document.getElementById(TOGGLE_ID)) return;
        const toggle = document.createElement('div');
        toggle.id = TOGGLE_ID;
        toggle.className = isOn ? 'on' : '';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', String(isOn));
        toggle.setAttribute('title', 'Toggle modern login UI');
        toggle.innerHTML = `<span class="ulab-switch"></span><span>Modern UI</span>`;
        toggle.addEventListener('click', () => {
            const next = !document.body.classList.contains('ulab-modern-login');
            applyState(next);
            chrome.storage.local.set({ [STORAGE_KEY]: next });
        });
        document.body.appendChild(toggle);
    }

    function applyState(isOn) {
        document.body.classList.toggle('ulab-modern-login', isOn);
        const toggle = document.getElementById(TOGGLE_ID);
        if (toggle) {
            toggle.classList.toggle('on', isOn);
            toggle.setAttribute('aria-checked', String(isOn));
        }
    }

    function init() {
        const parts = findRealLoginParts();
        const forgotParts = parts ? null : findForgotPasswordParts();
        if (!parts && !forgotParts) {
            // Neither login nor forgot-password — most likely the logged-in
            // Home page, which reuses the same URL on this site. Bail out
            // entirely, no cloak left behind.
            uncloak();
            return;
        }

        injectStyles();
        const shell = parts ? buildShell(parts) : buildForgotPasswordShell(forgotParts);
        document.body.appendChild(shell);

        chrome.storage.local.get([STORAGE_KEY], (result) => {
            const isOn = result[STORAGE_KEY] !== false; // default on
            applyState(isOn);
            injectToggle(isOn);
            uncloak();
        });
    }

    cloak();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
