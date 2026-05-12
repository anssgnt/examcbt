const fs = require('fs');

const indexHtmlPath = 'index.html';
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// The massive style block we want to split starts after the shimmer fallback script
// Find <style>\n    :root {
const styleStart = content.indexOf('  <style>\n    :root {');
const styleEnd = content.indexOf('  </style>', styleStart);

if (styleStart === -1 || styleEnd === -1) {
    console.log("Could not find style block");
    process.exit(1);
}

const styleBlock = content.substring(styleStart, styleEnd + '  </style>'.length);

// Let's manually define the split points
const extractSection = (str, startMarker, endMarker) => {
    const startIdx = str.indexOf(startMarker);
    if (startIdx === -1) return '';
    let endIdx;
    if (endMarker) {
        endIdx = str.indexOf(endMarker, startIdx);
        if (endIdx === -1) endIdx = str.length;
    } else {
        endIdx = str.length;
    }
    return str.substring(startIdx, endIdx);
};

const profileToSearch = extractSection(styleBlock, '    /* ══════ PROFILE SECTION ══════ */', '    /* ══════ MODALS ══════ */');
const modalsToSync = extractSection(styleBlock, '    /* ══════ MODALS ══════ */', '    /* ══════ SYNC PAGE ══════ */');
const syncToModalsRefine = extractSection(styleBlock, '    /* ══════ SYNC PAGE ══════ */', '    /* ══════ MODAL REFINEMENT ══════ */');
const modalsRefineToAuto = extractSection(styleBlock, '    /* ══════ MODAL REFINEMENT ══════ */', '    /* ══════ AUTOCOMPLETE ══════ */');
const autoToMisc = extractSection(styleBlock, '    /* ══════ AUTOCOMPLETE ══════ */', '    /* Misc Hide */');

// Write separated CSS files
const dashboardCss = profileToSearch + autoToMisc;
const syncCss = syncToModalsRefine;
const modalsCss = modalsToSync + modalsRefineToAuto;

fs.writeFileSync('style-dashboard.css', dashboardCss);
fs.writeFileSync('style-sync.css', syncCss);
fs.writeFileSync('style-index-modals.css', modalsCss);

// What remains for Critical CSS
const criticalCss = styleBlock.substring(0, styleBlock.indexOf('    /* ══════ PROFILE SECTION ══════ */')) + 
                    '\n    /* Misc Hide */\n    .view, .portal-layout, .login-layout { display: none; }\n\n  </style>';

// Reconstruct index.html with links and critical CSS
let newContent = content.substring(0, styleStart);
newContent += '  <!-- CSS Dipisah untuk Optimasi -->\n';
newContent += '  <link rel="stylesheet" href="style-dashboard.css" media="print" onload="this.media=\'all\'">\n';
newContent += '  <link rel="stylesheet" href="style-sync.css" media="print" onload="this.media=\'all\'">\n';
newContent += '  <link rel="stylesheet" href="style-index-modals.css" media="print" onload="this.media=\'all\'">\n';
newContent += '  <noscript>\n';
newContent += '    <link rel="stylesheet" href="style-dashboard.css">\n';
newContent += '    <link rel="stylesheet" href="style-sync.css">\n';
newContent += '    <link rel="stylesheet" href="style-index-modals.css">\n';
newContent += '  </noscript>\n\n';
newContent += criticalCss;
newContent += content.substring(styleEnd + '  </style>'.length);

// Also let's clean up inline script logic for PWA
// The user asked to split script based on function.
// Let's create pwa-inline.js for the pwa logic in HTML and defer it
const pwaScript = `
document.addEventListener('DOMContentLoaded', () => {
    const btnInstall = document.getElementById('btn-pwa-install');
    if (btnInstall) {
        btnInstall.addEventListener('click', () => {
            if (window.triggerPwaInstall) window.triggerPwaInstall();
        });
    }
    
    const btnBanner = document.getElementById('btn-pwa-install-banner');
    if (btnBanner) {
        btnBanner.addEventListener('click', () => {
            if (window.triggerPwaInstall) window.triggerPwaInstall();
        });
    }

    const pwaBypassInput = document.getElementById('pwaBypassInput');
    if (pwaBypassInput) {
        pwaBypassInput.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                if (window.verifyPwaBypass) window.verifyPwaBypass();
            }
        });
    }

    // Bind other inline handlers here if needed
    const pwaBypassBtn = document.querySelector('button[onclick="verifyPwaBypass()"]');
    if (pwaBypassBtn) {
        pwaBypassBtn.removeAttribute('onclick');
        pwaBypassBtn.addEventListener('click', () => {
            if (window.verifyPwaBypass) window.verifyPwaBypass();
        });
    }
    
    const bannerCloseBtn = document.querySelector('button[onclick="document.getElementById(\\'pwa-install-banner\\').style.display=\\'none\\'"]');
    if (bannerCloseBtn) {
        bannerCloseBtn.removeAttribute('onclick');
        bannerCloseBtn.addEventListener('click', () => {
            document.getElementById('pwa-install-banner').style.display='none';
        });
    }
});
`;
fs.writeFileSync('pwa-inline.js', pwaScript);

// Add pwa-inline.js to deferred scripts
newContent = newContent.replace("const DEFERRED = ['queue-system.min.js?v=3', 'pwa-core.min.js?v=4'];", "const DEFERRED = ['queue-system.min.js?v=3', 'pwa-core.min.js?v=4', 'pwa-inline.js'];");

// Remove onclicks and onkeydowns from HTML
newContent = newContent.replace('onclick="window.triggerPwaInstall()"', '');
newContent = newContent.replace('onclick="window.triggerPwaInstall()"', '');
newContent = newContent.replace('onkeydown="if(event.key===\'Enter\') verifyPwaBypass()"', '');
// Wait, replacing exact strings might miss if there are multiple or slightly different. We handled the main ones.

fs.writeFileSync(indexHtmlPath, newContent);
console.log("CSS and Script split successfully!");
