$content = Get-Content -Path "index.html" -Raw

$styleStartStr = "  <style>`r`n    :root {"
$styleStart = $content.IndexOf($styleStartStr)
$styleEnd = $content.IndexOf("  </style>", $styleStart)

if ($styleStart -eq -1 -or $styleEnd -eq -1) {
    Write-Host "Could not find style block"
    exit 1
}

$styleBlock = $content.Substring($styleStart, $styleEnd - $styleStart + "  </style>".Length)

function Extract-Section($str, $startMarker, $endMarker) {
    $startIdx = $str.IndexOf($startMarker)
    if ($startIdx -eq -1) { return "" }
    
    if ([string]::IsNullOrEmpty($endMarker)) {
        $endIdx = $str.Length
    } else {
        $endIdx = $str.IndexOf($endMarker, $startIdx)
        if ($endIdx -eq -1) { $endIdx = $str.Length }
    }
    return $str.Substring($startIdx, $endIdx - $startIdx)
}

$profileToSearch = Extract-Section $styleBlock "    /* ══════ PROFILE SECTION ══════ */" "    /* ══════ MODALS ══════ */"
$modalsToSync = Extract-Section $styleBlock "    /* ══════ MODALS ══════ */" "    /* ══════ SYNC PAGE ══════ */"
$syncToModalsRefine = Extract-Section $styleBlock "    /* ══════ SYNC PAGE ══════ */" "    /* ══════ MODAL REFINEMENT ══════ */"
$modalsRefineToAuto = Extract-Section $styleBlock "    /* ══════ MODAL REFINEMENT ══════ */" "    /* ══════ AUTOCOMPLETE ══════ */"
$autoToMisc = Extract-Section $styleBlock "    /* ══════ AUTOCOMPLETE ══════ */" "    /* Misc Hide */"

$dashboardCss = $profileToSearch + $autoToMisc
$syncCss = $syncToModalsRefine
$modalsCss = $modalsToSync + $modalsRefineToAuto

Set-Content -Path "style-dashboard.css" -Value $dashboardCss -NoNewline
Set-Content -Path "style-sync.css" -Value $syncCss -NoNewline
Set-Content -Path "style-index-modals.css" -Value $modalsCss -NoNewline

$criticalEndIdx = $styleBlock.IndexOf("    /* ══════ PROFILE SECTION ══════ */")
$criticalCss = $styleBlock.Substring(0, $criticalEndIdx) + "`r`n    /* Misc Hide */`r`n    .view, .portal-layout, .login-layout { display: none; }`r`n`r`n  </style>"

$newContent = $content.Substring(0, $styleStart)
$newContent += "  <!-- CSS Dipisah untuk Optimasi -->`r`n"
$newContent += "  <link rel=" + [char]34 + "stylesheet" + [char]34 + " href=" + [char]34 + "style-dashboard.css" + [char]34 + " media=" + [char]34 + "print" + [char]34 + " onload=" + [char]34 + "this.media='all'" + [char]34 + ">`r`n"
$newContent += "  <link rel=" + [char]34 + "stylesheet" + [char]34 + " href=" + [char]34 + "style-sync.css" + [char]34 + " media=" + [char]34 + "print" + [char]34 + " onload=" + [char]34 + "this.media='all'" + [char]34 + ">`r`n"
$newContent += "  <link rel=" + [char]34 + "stylesheet" + [char]34 + " href=" + [char]34 + "style-index-modals.css" + [char]34 + " media=" + [char]34 + "print" + [char]34 + " onload=" + [char]34 + "this.media='all'" + [char]34 + ">`r`n"
$newContent += "  <noscript>`r`n"
$newContent += "    <link rel=" + [char]34 + "stylesheet" + [char]34 + " href=" + [char]34 + "style-dashboard.css" + [char]34 + ">`r`n"
$newContent += "    <link rel=" + [char]34 + "stylesheet" + [char]34 + " href=" + [char]34 + "style-sync.css" + [char]34 + ">`r`n"
$newContent += "    <link rel=" + [char]34 + "stylesheet" + [char]34 + " href=" + [char]34 + "style-index-modals.css" + [char]34 + ">`r`n"
$newContent += "  </noscript>`r`n`r`n"
$newContent += $criticalCss
$newContent += $content.Substring($styleEnd + "  </style>".Length)

$pwaScript = @"
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
"@

Set-Content -Path "pwa-inline.js" -Value $pwaScript

$newContent = $newContent.Replace("const DEFERRED = ['queue-system.min.js?v=3', 'pwa-core.min.js?v=4'];", "const DEFERRED = ['queue-system.min.js?v=3', 'pwa-core.min.js?v=4', 'pwa-inline.js'];")
$newContent = $newContent.Replace('onclick="window.triggerPwaInstall()"', '')
$newContent = $newContent.Replace('onkeydown="if(event.key===''Enter'') verifyPwaBypass()"', '')

Set-Content -Path "index.html" -Value $newContent -NoNewline
Write-Host "Done!"
