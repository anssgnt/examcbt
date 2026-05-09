// =====================================================
// PWA Module (split from script.js)
// Loaded by index.html only
// =====================================================

// --- PWA Installation Logic ---
let deferredPrompt;

// Definisi di top-level agar selalu tersedia saat tombol diklik
window.triggerPwaInstall = async function() {
  if (!deferredPrompt) {
    // Browser tidak support atau sudah installed
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Cara Install', 'Gunakan menu browser:\n• Chrome Android: Menu ⋮ → "Tambahkan ke layar utama"\n• Safari iOS: Tombol Bagikan → "Tambah ke Layar Utama"\n• Chrome Desktop: Ikon ⊕ di address bar', '📱');
    }
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    deferredPrompt = null;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
    const btnInstall = document.getElementById('btn-pwa-install');
    if (btnInstall) btnInstall.style.display = 'none';
  }
};

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Tampilkan tombol install di blocker overlay
  const btnInstall = document.getElementById('btn-pwa-install');
  if (btnInstall) btnInstall.style.display = 'block';

  // Tampilkan banner install di bawah (hanya jika PWA blocker tidak aktif)
  const blocker = document.getElementById('pwa-blocker-overlay');
  const blockerActive = blocker && blocker.style.display !== 'none';
  if (!blockerActive) {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'flex';
  }
});

// Jika sudah installed, sembunyikan semua UI install
window.addEventListener('appinstalled', () => {
  const banner = document.getElementById('pwa-install-banner');
  const overlay = document.getElementById('pwa-blocker-overlay');
  if (banner) banner.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
});

// --- Bypass PWA Blocker (supports 2 UI modes) ---
window.verifyPwaBypass = async function () {
  if (window.State && State.security && State.security.pwa === false) return;

  // Mode A: input box (if exists)
  const input = document.getElementById('pwaBypassInput');
  const errEl = document.getElementById('pwaBypassError');
  if (input && errEl) {
    const code = input.value.trim().toUpperCase();
    if (!code) { errEl.textContent = 'Masukkan kode bypass terlebih dahulu.'; errEl.style.display = 'block'; return; }
    try {
      // Baca bypassCode dari State.security (sudah di-load saat init)
      // Fallback ke db query jika State.security belum ada
      let validCode = (window.State && State.security) ? State.security.bypassCode : null;
      if (!validCode) {
        const snap = await db.ref('/config/security').once('value');
        const sec = snap.val() || {};
        validCode = sec.bypassCode || null;
      }
      if (validCode && code === String(validCode).toUpperCase()) {
        sessionStorage.setItem('pwa_bypass_granted', '1');
        errEl.style.display = 'none';
        const overlay = document.getElementById('pwa-blocker-overlay');
        if (overlay) overlay.classList.remove('active');
      } else {
        errEl.textContent = 'Kode bypass tidak valid. Hubungi pengawas.';
        errEl.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      errEl.textContent = 'Gagal verifikasi, periksa koneksi internet.';
      errEl.style.display = 'block';
      console.error(e);
    }
    return;
  }

  // Mode B: prompt fallback
  const code = prompt('Masukkan kode bypass PWA:');
  if (!code) return;
  try {
    let validCode = (window.State && State.security) ? State.security.bypassCode : null;
    if (!validCode) {
      const snap = await db.ref('/config/security').once('value');
      const sec = snap.val() || {};
      validCode = sec.bypassCode || null;
    }
    if (validCode && code.toUpperCase() === String(validCode).toUpperCase()) {
      sessionStorage.setItem('pwa_bypass_granted', '1');
      const overlay = document.getElementById('pwa-blocker-overlay');
      if (overlay) overlay.classList.remove('active');
      if (typeof showCustomAlert === 'function') showCustomAlert('Berhasil', 'Akses PWA diizinkan.', '✅');
    } else {
      if (typeof showCustomAlert === 'function') showCustomAlert('Gagal', 'Kode bypass tidak valid.', '❌');
    }
  } catch (e) {
    if (typeof showCustomAlert === 'function') showCustomAlert('Error', 'Gagal verifikasi kode.', '❌');
  }
};

