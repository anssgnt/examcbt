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
    
    const bannerCloseBtn = document.querySelector('button[data-close-banner]');
    if (bannerCloseBtn) {
        bannerCloseBtn.removeAttribute('onclick');
        bannerCloseBtn.addEventListener('click', () => {
            const banner = document.getElementById('pwa-install-banner');
            if (banner) banner.style.display = 'none';
        });
    }
});
