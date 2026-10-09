(function () {
    const id = 'ulab-mms-companion-bar';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.textContent = `#${id}{position:fixed;top:12px;right:18px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:9px 13px;border:1px solid #99f6e4;border-radius:12px;background:#ffffff;color:#134e4a;box-shadow:0 4px 18px rgba(15,42,40,.16);font:600 12px system-ui,sans-serif}#${id} img{width:24px;height:24px;object-fit:contain}#${id} a{color:#0d9488;text-decoration:none}#${id} a:hover{text-decoration:underline}@media(max-width:600px){#${id}{right:8px;top:8px;padding:7px 9px}#${id} span{display:none}}`;
    document.head.appendChild(style);
    const bar = document.createElement('div');
    bar.id = id;
    bar.innerHTML = `<img src="${chrome.runtime.getURL('icons/ulab.svg')}" alt="ULAB"><span>ULAB Student Companion</span><a href="https://urms-online.ulab.edu.bd/index.php" target="_blank" rel="noopener">Open URMS</a>`;
    document.body.appendChild(bar);
})();
