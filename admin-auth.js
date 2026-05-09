// =====================================================
// Admin Auth Module (split from script.js)
// Loaded by index.html only
// =====================================================

// Touchscreen hotkey (5x taps) state
let adminTapCount = 0;
let adminTapTimer = null;

function bindAdminLogoTap() {
  const logo = document.querySelector('.centric-logo');
  if (!logo || logo._tapBound) return;
  logo._tapBound = true;
  logo.addEventListener('click', () => {
    adminTapCount++;
    if (adminTapTimer) clearTimeout(adminTapTimer);
    adminTapTimer = setTimeout(() => { adminTapCount = 0; }, 1000);
    if (adminTapCount >= 5) {
      adminTapCount = 0;
      if (typeof window.showAdminAuthModal === 'function') window.showAdminAuthModal();
    }
  });
}

function initAdminAuthModal() {
  let modal = null;

  function createAdminModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'index-admin-auth-modal';
    modal.className = 'mobile-confirm-overlay';
    modal.innerHTML = `
      <div class="mobile-confirm-card">
        <div style="font-size:2rem;margin-bottom:8px;">🔐</div>
        <h3 style="margin:0 0 6px;font-size:1rem;">Admin Proktor</h3>
        <p style="font-size:0.75rem;color:#6B7280;margin:0 0 12px;">Masukkan sandi proktor</p>
        <input type="password" id="index-admin-token-input" class="mobile-confirm-input" placeholder="Sandi proktor" autocomplete="off" />
        <div class="mobile-confirm-actions">
          <button class="btn-cancel" id="index-admin-cancel">Batal</button>
          <button class="btn-confirm" id="index-admin-submit">Verifikasi</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('index-admin-cancel').addEventListener('click', () => {
      modal.classList.remove('show');
    });

    document.getElementById('index-admin-submit').addEventListener('click', async function () {
      const pwd = document.getElementById('index-admin-token-input').value.trim();
      if (!pwd) return;
      this.textContent = '...';
      try {
        const res = await gasRun('validateAdmin', pwd);
        if (res.success && res.valid) {
          sessionStorage.setItem('admin_auth', '1');
          // Simpan sandi hanya untuk sesi ini (dipakai Edge Function admin CRUD)
          sessionStorage.setItem('admin_pwd', pwd);
          modal.classList.remove('show');
          window.location.href = 'admin.html';
        } else if (res.success && !res.valid) {
          if (typeof showCustomAlert === 'function') showCustomAlert('Akses Ditolak', 'Sandi Proktor tidak valid.', '🔐');
        } else {
          if (typeof showCustomAlert === 'function') showCustomAlert('Gagal', 'Gagal: ' + (res.message || 'Unknown error'), '❌');
        }
      } catch (e) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Network Error', 'Network Error: ' + e.message, '🌐');
      }
      this.textContent = 'Verifikasi';
    });

    document.getElementById('index-admin-token-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('index-admin-submit').click();
    });

    return modal;
  }

  window.showAdminAuthModal = function () {
    const m = createAdminModal();
    m.classList.add('show');
    setTimeout(() => {
      const input = document.getElementById('index-admin-token-input');
      if (input) input.focus();
    }, 300);
  };

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      window.showAdminAuthModal();
    }
  });
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initAdminAuthModal();
  bindAdminLogoTap();
});

