// =====================================================
// Mobile UI Module (split from script.js)
// Loaded ONLY by index.html (mobile-first portal)
// =====================================================

// ══════════════════════════════════════
// MOBILE UI FUNCTIONS
// ══════════════════════════════════════

// Safety fallback for safeAddListener
if (typeof window.safeAddListener !== 'function') {
  window.safeAddListener = function(id, event, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, callback);
  };
}

function showMobileLoading(text) {
  const overlay = document.getElementById('mobile-loading');
  const textEl = document.getElementById('mobile-loading-text');
  if (overlay) overlay.classList.add('show');
  if (textEl) textEl.textContent = text || 'Memuat...';
}

function hideMobileLoading() {
  const overlay = document.getElementById('mobile-loading');
  if (overlay) overlay.classList.remove('show');
}

function updateMobileClock() {
  const clockEl = document.getElementById('mobile-header-clock');
  if (!clockEl) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  clockEl.textContent = h + ':' + m;
}

function updateMobileStatus(text, dotClass) {
  const dot = document.getElementById('mobile-status-dot');
  const userEl = document.getElementById('mobile-status-user');
  if (dot) dot.className = 'mobile-status-dot' + (dotClass ? ' ' + dotClass : '');
  if (text && userEl && userEl.classList.contains('mobile-status-user-placeholder')) userEl.textContent = text;
}

function updateMobileSyncBadge(ready) {
  const dot = document.getElementById('mobile-sync-dot');
  const text = document.getElementById('mobile-sync-text');
  if (dot) {
    dot.className = 'mobile-sync-dot mobile-sync-icon' + (ready ? '' : ' syncing');
  }
  if (text) {
    text.textContent = ready ? 'READY' : 'Sync...';
    text.style.color = ready ? '#10b981' : '#f59e0b';
  }
}

function renderMobileSchedule() {
  const list = document.getElementById('mobile-schedule-list');
  const countEl = document.getElementById('schedule-count');
  if (!list) return;

  let schedules = State.schedules || [];
  
  // FIX MULTI-USER: Jika schedules kosong, load dari cache DAN filter berdasarkan kelas user
  if (schedules.length === 0) {
    try {
      const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
      if (cachedJadwal) {
        const jadwals = JSON.parse(cachedJadwal);
        let allSchedules = Object.keys(jadwals).map(id => ({ id, ...jadwals[id] }));
        
        // ✅ FILTER: Hanya tampilkan jadwal sesuai kelas user (jika sudah login)
        if (State.user && State.user.kelas) {
          schedules = allSchedules.filter(s => {
            // Gunakan nama field yang sama dengan loadSchedules() di script.js
            const kelasTarget = s.target_kelas || s.kelas_target || s.kelas || '';
            
            // Support "SEMUA", "ALL", atau kosong = tampilkan ke semua kelas
            if (!kelasTarget || kelasTarget.toUpperCase() === 'SEMUA' || kelasTarget.toUpperCase() === 'ALL') {
              return true;
            }
            
            // Support multiple kelas: "10A,10B,10C"
            const kelasList = String(kelasTarget).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
            const userKelas = State.user.kelas.toLowerCase();
            
            // Match jika ada kelas yang cocok (partial match untuk fleksibilitas)
            return kelasList.some(k => userKelas.includes(k) || k.includes(userKelas));
          }).map(s => {
            // ✅ FIX MULTI-USER: Strip status dari cache lokal
            // Status SELESAI dari user lain tidak boleh ikut terbawa.
            // Hitung status berdasarkan waktu saja — server fetch akan update nanti.
            const nowMs = Date.now();
            let safeStatus = 'BELUM_MULAI';
            if (s.aktif === false) safeStatus = 'NONAKTIF';
            else if (s.force_aktif) safeStatus = 'AKTIF';
            else if (nowMs < s.mulai) safeStatus = 'BELUM_MULAI';
            else if (nowMs > s.selesai) safeStatus = 'TUTUP';
            else safeStatus = 'AKTIF';
            return { ...s, status: safeStatus, _lastRenderedStatus: safeStatus };
          });
          console.log(`[RenderSchedule] Filtered ${allSchedules.length} → ${schedules.length} schedules for kelas ${State.user.kelas}`);
        } else {
          // Jika belum login, tampilkan semua (untuk preview)
          schedules = allSchedules;
          console.log(`[RenderSchedule] No user logged in, showing all ${schedules.length} schedules`);
        }
        
        State.schedules = schedules;
      }
    } catch (e) {
      console.warn('[RenderSchedule] Failed to load cached schedules:', e);
    }
  }

  if (countEl) countEl.textContent = schedules.length;

  if (schedules.length === 0) {
    list.innerHTML = `
      <div class="mobile-empty">
        <div class="mobile-empty-illustration">
          <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h4>Belum ada jadwal</h4>
        <p>Jadwal ujian akan muncul di sini setelah disinkronkan oleh pengawas.</p>
      </div>`;
    return;
  }

  const nowMs = new Date().getTime();
  const isLoggedIn = !!State.user;
  let html = '';

  schedules.forEach(sch => {
    let status = 'waiting';
    let badgeText = 'Belum Mulai';
    let btnText = 'Belum Waktunya';
    let btnClass = 'waiting';
    let btnDisabled = true;
    let action = '';

    const isSubmitted = isLoggedIn && State.user.id && localStorage.getItem(`CBT_SUBMITTED_${sch.id}_${State.user.id}`) === '1';
    const isCurrentUserData = State._schedulesForUserId === (State.user && State.user.id);
    const isServerDone = isCurrentUserData && (sch.status === 'SELESAI' || sch._lastRenderedStatus === 'SELESAI');

    if (!isLoggedIn) {
      // Jika belum login, paksa status jadi 'Login Dulu' untuk semua jadwal
      status = 'locked'; badgeText = 'Login Dulu'; btnText = '🔒 Login Dulu'; btnClass = 'waiting'; btnDisabled = true;
    } else if (nowMs < sch.mulai) {
      // Ujian belum dimulai
      status = 'waiting'; badgeText = 'Belum Mulai'; btnText = 'Belum Waktunya'; btnClass = 'waiting'; btnDisabled = true;
    } else if (isSubmitted || isServerDone) {
      // Sudah mengerjakan — cek ini SEBELUM cek waktu habis
      status = 'done'; badgeText = '✅ Sudah Dikerjakan'; btnText = 'Sudah Dikerjakan'; btnClass = 'closed'; btnDisabled = true;
    } else if (nowMs >= sch.selesai || sch.status === 'TUTUP') {
      // Ujian sudah berakhir, siswa BELUM mengerjakan
      status = 'expired'; badgeText = '⏰ Ujian Sudah Selesai'; btnText = 'Ujian Sudah Selesai'; btnClass = 'closed'; btnDisabled = true;
    } else {
      // Ujian aktif dan user sudah login — cek status sinkronisasi soal
      const ver = getScheduleVersion(sch);
      const CACHE_KEY = `SOAL_${sch.id}_v${ver}`;
      const isSynced = localStorage.getItem(CACHE_KEY) !== null;
      if (!isSynced) {
        status = 'sync'; badgeText = 'Belum Sinkron'; btnText = '🔄 Sinkronisasi'; btnClass = 'sync'; btnDisabled = false; action = 'sync';
      } else {
        // Cache ready - tambahkan indicator untuk H-1 sync
        const cacheDate = localStorage.getItem(`${CACHE_KEY}_date`);
        const isH1Sync = cacheDate && (Date.now() - parseInt(cacheDate)) > 3600000; // >1 jam = H-1 sync
        status = 'active'; 
        badgeText = isH1Sync ? '✅ Cache Ready' : 'Aktif'; 
        btnText = '▶ Mulai Ujian'; 
        btnClass = 'active'; 
        btnDisabled = false; 
        action = 'start';
      }
    }

    const startObj = new Date(sch.mulai);
    const endObj = new Date(sch.selesai);
    const pad = (n) => n.toString().padStart(2, '0');
    const timeStr = pad(startObj.getHours()) + ':' + pad(startObj.getMinutes()) + ' - ' + pad(endObj.getHours()) + ':' + pad(endObj.getMinutes());

    const illustrationIcon = 
      status === 'active'   ? 'fas fa-check-double' :
      status === 'locked'   ? 'fas fa-lock' :
      status === 'waiting'  ? 'fas fa-clock' :
      status === 'done'     ? 'fas fa-check-circle' :
      status === 'expired'  ? 'fas fa-calendar-times' :
      status === 'sync'     ? 'fas fa-sync-alt' :
                              'fas fa-info-circle';

    const illustrationBg = 
      status === 'active'   ? 'blue-bg' :
      status === 'locked'   ? 'red-bg' :
      status === 'waiting'  ? 'yellow-bg' :
      status === 'done'     ? 'green-bg' :
      status === 'expired'  ? 'grey-bg' :
                              'grey-bg';

    const illustrationColor = 
      status === 'active'   ? '#3B82F6' :
      status === 'locked'   ? '#EF4444' :
      status === 'waiting'  ? '#D97706' :
      status === 'done'     ? '#10B981' :
      status === 'expired'  ? '#94A3B8' :
                              '#94A3B8';

    const watermarkSvg = 
      status === 'active'
        ? '<svg class="schedule-watermark" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      : status === 'locked'
        ? '<svg class="schedule-watermark" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>'
      : status === 'done'
        ? '<svg class="schedule-watermark" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      : status === 'expired'
        ? '<svg class="schedule-watermark" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5"><path d="M6 18L18 6M6 6l12 12"/></svg>'
      : '<svg class="schedule-watermark" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    // "Lihat Nilai" hanya muncul jika siswa benar-benar sudah submit
    const showLihatNilai = isSubmitted || isServerDone;

    html += `
      <div class="mobile-schedule-card ${status}">
        <div class="mobile-schedule-illustration ${illustrationBg}">
          ${watermarkSvg}
          <i class="${illustrationIcon}" style="color:${illustrationColor}"></i>
        </div>
        <div class="mobile-schedule-details">
          <span class="mobile-schedule-badge ${status}">${badgeText}</span>
          <div class="mobile-schedule-name">${sch.nama || 'Ujian'}</div>
          <div class="mobile-schedule-time"><i class="far fa-clock"></i> ${timeStr}</div>
        </div>
        ${showLihatNilai ? `<button class="mobile-schedule-btn view-result" data-action="view-result" data-exam-id="${sch.id}"><i class="fas fa-eye"></i> Lihat Nilai</button>` : ''}
        <button class="mobile-schedule-btn ${btnClass}" ${btnDisabled ? 'disabled' : ''} data-exam-id="${sch.id}" data-action="${action}">${btnText}</button>
      </div>`;
  });

  list.innerHTML = html;

  list.querySelectorAll('.mobile-schedule-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const examId = btn.dataset.examId;

      if (action === 'view-result') {
        if (!State.user) return;
        window.showLoading('Mengambil nilai...');
        try {
          const res = await window.gasRun('getStudentResult', examId, State.user.id);
          if (res.success) {
            localStorage.setItem('CBT_LAST_RESULT', JSON.stringify(res.result));
            window.location.href = 'result.html';
          } else {
            window.showCustomAlert('Info', res.message || 'Gagal mengambil nilai.', 'ℹ️');
          }
        } catch (e) {
          window.showCustomAlert('Error', 'Gagal memuat nilai: ' + e.message, '❌');
        } finally {
          window.hideLoading();
        }
        return;
      }
      
      const schedules = State.schedules || [];
      const sch = schedules.find(s => s.id === examId);
      if (!sch) return;
      if (action === 'sync') syncSingleExam(sch);
      else if (action === 'start') handleMobileScheduleTap(sch);
    });
  });
}

async function handleMobileScheduleTap(sch) {
  const ver = getScheduleVersion(sch);
  const CACHE_KEY = `SOAL_${sch.id}_v${ver}`;
  const isSynced = localStorage.getItem(CACHE_KEY) !== null;

  if (!isSynced) {
    showCustomAlert('Belum Sinkron', 'Sinkronisasi data ujian terlebih dahulu.', '⚠️');
    return;
  }
  if (!State.user) {
    showCustomAlert('Pilih Nama', 'Silakan pilih nama Anda terlebih dahulu di atas.', '⚠️');
    return;
  }
  State.pendingExam = sch;
  showMobileTokenModal();
}

async function syncSingleExam(sch) {
  if (!State.user) {
    showCustomAlert('Login Dulu', 'Silakan login terlebih dahulu.', '⚠️');
    return;
  }

  const ver = getScheduleVersion(sch);
  const CACHE_KEY = `SOAL_${sch.id}_v${ver}`;

  const syncBtn = document.querySelector(`.mobile-schedule-btn[data-exam-id="${sch.id}"][data-action="sync"]`);
  const originalText = syncBtn ? syncBtn.innerHTML : '🔄 Sinkronisasi';
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span class="btn-spinner"></span>';
  }

  // JITTER: Delay random untuk spread load saat sync soal (H-1)
  // Tidak perlu antrian karena sync soal dilakukan H-1, bukan hari H
  const jitter = Math.floor(Math.random() * 120000);
  const jitterSec = Math.ceil(jitter / 1000);
  console.log(`[SyncExam] Applying jitter: ${jitter}ms (${jitterSec}s) - Free tier optimization`);
  
  if (syncBtn) {
    syncBtn.innerHTML = `⏳ Antri ${jitterSec}s`;
  }
  
  let remaining = jitterSec;
  const countdownInterval = setInterval(() => {
    remaining--;
    if (remaining > 0 && syncBtn) {
      syncBtn.innerHTML = `⏳ Antri ${remaining}s`;
    }
  }, 1000);
  
  await new Promise(resolve => setTimeout(resolve, jitter));
  clearInterval(countdownInterval);
  
  if (syncBtn) {
    syncBtn.innerHTML = '<span class="btn-spinner"></span> Downloading...';
  }

  try {
    const examData = await getExamDataOptimized(sch.id, null, true, true);
    if (examData && examData.questions) {
      if (examData.questions.some(q => q.image)) await cacheAllImages(examData.questions);
      if (examData.tokenHash) localStorage.setItem(`CBT_TOKEN_HASH_${sch.id}`, examData.tokenHash);

      // Simpan timestamp untuk indicator H-1 sync
      const ver = getScheduleVersion(sch);
      const CACHE_KEY = `SOAL_${sch.id}_v${ver}`;
      localStorage.setItem(`${CACHE_KEY}_date`, Date.now().toString());

      showCustomAlert('Berhasil', `Soal "${sch.nama}" berhasil disinkronkan.\n\n✅ Cache tersimpan! Besok tinggal login dan masukkan token.`, '✅');

      try {
        if (window.dbConnectFast) await window.dbConnectFast();
        await db.ref(`/status_sync/${sch.id}/${State.user.id}`).set(true);
      } catch (e) {
        console.warn("Gagal lapor status sync:", e);
      }

      renderMobileSchedule();
    } else {
      showCustomAlert('Gagal', examData?.message || 'Gagal mengunduh soal.', '❌');
      if (syncBtn) { syncBtn.disabled = false; syncBtn.innerHTML = originalText; }
    }
  } catch (e) {
    showCustomAlert('Error', 'Gagal sync: ' + e.message, '❌');
    if (syncBtn) { syncBtn.disabled = false; syncBtn.innerHTML = originalText; }
  }
}

function showMobileTokenModal() {
  const overlay = document.getElementById('mobile-token-overlay');
  if (overlay) overlay.classList.add('show');
  const input = document.getElementById('examTokenInput');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
}

function hideMobileTokenModal() {
  const overlay = document.getElementById('mobile-token-overlay');
  if (overlay) overlay.classList.remove('show');
}

safeAddListener('btnCancelToken', 'click', hideMobileTokenModal);

safeAddListener('btnSubmitToken', 'click', async () => {
  const token = document.getElementById('examTokenInput').value.trim().toUpperCase();
  if (!token) return showCustomAlert('Token Kosong', 'Masukkan token ujian terlebih dahulu.', '⚠️');
  if (!State.pendingExam) return showCustomAlert('Error', 'Ujian tidak ditemukan. Silakan pilih ujian dari jadwal.', '⚠️');

  hideMobileTokenModal();
  showLoading('Memverifikasi Token...');
  try {
    await loadDashboard(State.pendingExam.id, token);
  } catch (e) {
    hideLoading();
    console.error('[TokenSubmit] Error:', e);
    showCustomAlert('Gagal Masuk Ujian', 'Error: ' + e.message, '❌');
  }
});

function showMobileConfirm(user) {
  const overlay = document.getElementById('mobile-confirm-overlay');
  const nameEl = document.getElementById('mobile-confirm-name');
  const classEl = document.getElementById('mobile-confirm-class');
  if (overlay) overlay.classList.add('show');
  if (nameEl) nameEl.textContent = user.name;
  if (classEl) classEl.textContent = 'Kelas: ' + user.kelas;
}

function hideMobileConfirm() {
  const overlay = document.getElementById('mobile-confirm-overlay');
  if (overlay) overlay.classList.remove('show');
}

function toggleFloatResultBtn() {
  const btn = document.getElementById('float-result-btn');
  if (!btn) return;
  if (localStorage.getItem('CBT_LAST_RESULT')) btn.classList.add('show');
  else btn.classList.remove('show');
}

// Sync badge tap -> sync all data
safeAddListener('mobile-sync-badge', 'click', () => {
  if (typeof syncAllDataForPortal === 'function') syncAllDataForPortal(true);
});
safeAddListener('mobile-sync-badge-filter', 'click', () => {
  if (typeof syncAllDataForPortal === 'function') syncAllDataForPortal(true);
});

// Helpers used by inline onclick in index.html
window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
};

window.scrollToTop = function () {
  const content = document.querySelector('.mobile-content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
};

// Menu handlers
safeAddListener('menu-panduan', 'click', () => {
  const el = document.getElementById('mobile-modal-panduan');
  if (el) el.classList.add('show');
});
safeAddListener('menu-tatib', 'click', () => {
  const el = document.getElementById('mobile-modal-tatib');
  if (el) el.classList.add('show');
});
safeAddListener('menu-bantuan', 'click', () => {
  const el = document.getElementById('mobile-modal-bantuan');
  if (el) el.classList.add('show');
});

// Floating result button
safeAddListener('float-result-btn', 'click', () => {
  const resultData = localStorage.getItem('CBT_LAST_RESULT');
  if (resultData) window.location.href = 'result.html';
  else if (typeof showCustomAlert === 'function') showCustomAlert('Info', 'Belum ada hasil ujian yang tersimpan.', 'ℹ️');
});

// Logout siswa (mobile profile)
safeAddListener('nav-logout', 'click', () => {
  console.log('[Logout] Starting logout process...');
  // Clear State Globally & Stop Timers
  try { if (window._mobileScheduleTimer) clearInterval(window._mobileScheduleTimer); } catch (_) {}
  try { if (window.scheduleTimer) clearInterval(window.scheduleTimer); } catch (_) {}

  if (window.State) {
    const userId = State.user ? State.user.id : null;
    
    // ✅ FIX MULTI-USER: Hapus SEMUA cache milik user ini
    if (userId) {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          
          // Hapus semua key yang mengandung userId
          if (key.includes(`_${userId}`) || 
              key.startsWith(`CBT_${userId}_`) ||
              key === `CBT_CACHE_JADWAL_${userId}` ||
              key === `CBT_CACHE_JADWAL_TIME_${userId}`) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => {
          localStorage.removeItem(k);
          console.log(`[Logout] Cleared: ${k}`);
        });
      } catch (e) { console.warn('[Logout] Gagal hapus cache spesifik user:', e); }
    }
    
    window.State.user = null;
    window.State.schedules = [];
    window.State.pendingExam = null;
    window.State.answers = {};
    window.State.examActive = false;
    // ✅ FIX MULTI-USER: Clear flag kepemilikan data jadwal
    window.State._schedulesForUserId = null;
  }

  // Clear session and result data
  try { 
    localStorage.removeItem('CBT_LOGGED_USER'); 
    localStorage.removeItem('CBT_LAST_RESULT'); 
    localStorage.removeItem('CBT_EXAM_SESSION');
  } catch (_) {}
  try { sessionStorage.clear(); } catch (_) {}

  // Reset input
  const input = document.getElementById('userName');
  if (input) input.value = '';
  const autoList = document.getElementById('autocomplete-list');
  if (autoList) {
    autoList.innerHTML = '';
    autoList.classList.remove('show');
  }

  // Reset profile box content
  const profileName = document.getElementById('mobile-profile-name');
  const profileClass = document.getElementById('mobile-profile-class');
  if (profileName) profileName.textContent = '-';
  if (profileClass) profileClass.textContent = '-';

  // Reset status bar identity
  const statusUser = document.getElementById('mobile-status-user');
  if (statusUser) {
    statusUser.className = 'mobile-status-user-placeholder';
    statusUser.textContent = 'Belum login';
  }

  // Hide user bar and reset UI
  try { hideMobileUserBar(); } catch (_) {}
  
  // ✅ FIX MULTI-USER: Clear schedules SEBELUM render
  if (window.State) {
    State.schedules = [];
    State.user = null;
  }
  
  // Render dengan state kosong
  try { renderMobileSchedule(); } catch (_) {}
  
  try { updateMobileStatus('', ''); } catch (_) {}
  try { toggleFloatResultBtn(); } catch (_) {}

  // Reset all panels to initial state
  const menuGrid = document.getElementById('mobile-menu-grid');
  if (menuGrid) menuGrid.style.display = '';
  const searchSection = document.querySelector('.mobile-search-section');
  if (searchSection) searchSection.style.display = '';
  const scheduleSection = document.querySelector('.mobile-schedule');
  if (scheduleSection) scheduleSection.style.display = '';
  const profileSection = document.getElementById('mobile-profile-section');
  if (profileSection) {
    profileSection.classList.remove('active');
    profileSection.style.display = '';
  }
  const statusBar = document.querySelector('.mobile-status-bar');
  if (statusBar) statusBar.style.display = '';
  const syncPage = document.getElementById('mobile-sync-page');
  if (syncPage) syncPage.style.display = 'none';

  console.log('[Logout] ✅ Logout complete - Cache cleared for user');
  
  // Reload untuk memastikan memori benar-benar bersih
  window.location.reload(); 
});

// Logo tap -> admin auth
document.addEventListener('click', (e) => {
  const logoTap = e.target.closest('#mobile-logo');
  if (!logoTap) return;
  e.preventDefault();
  e.stopPropagation();
  if (typeof showAdminAuthModal === 'function') showAdminAuthModal();
});

function showMobileUserBar(user) {
  const userEl = document.getElementById('mobile-status-user');
  if (userEl && user) {
    userEl.className = 'mobile-status-user';
    userEl.textContent = user.name;
    // Update dot status login jadi hijau
    const dot = document.getElementById('mobile-status-dot');
    if (dot) dot.className = 'mobile-status-dot ready';
  }
  const profile = document.getElementById('mobile-profile-section');
  if (profile) {
    profile.classList.add('active');
    const nameEl = document.getElementById('mobile-profile-name');
    const classEl = document.getElementById('mobile-profile-class');
    if (nameEl) nameEl.textContent = user.name || '';
    if (classEl) classEl.textContent = 'Kelas ' + (user.kelas || '');
  }
  const menuGrid = document.getElementById('mobile-menu-grid');
  if (menuGrid) menuGrid.style.display = 'none';
  // Status bar sekarang bagian dari header card, jangan disembunyikan
  const searchSection = document.querySelector('.mobile-search-section');
  if (searchSection) searchSection.style.display = 'none';
}

function hideMobileUserBar() {
  const userEl = document.getElementById('mobile-status-user');
  if (userEl) {
    userEl.className = 'mobile-status-user-placeholder';
    userEl.textContent = 'Belum login';
    // Reset dot status login
    const dot = document.getElementById('mobile-status-dot');
    if (dot) dot.className = 'mobile-status-dot';
  }
  const profile = document.getElementById('mobile-profile-section');
  if (profile) profile.classList.remove('active');
  const menuGrid = document.getElementById('mobile-menu-grid');
  if (menuGrid) menuGrid.style.display = '';
  // Status bar sekarang bagian dari header card, tidak perlu show/hide
  const searchSection = document.querySelector('.mobile-search-section');
  if (searchSection) searchSection.style.display = '';
}

// Expose to global (called by script.js guarded calls)
window.showMobileLoading = showMobileLoading;
window.hideMobileLoading = hideMobileLoading;
window.updateMobileClock = updateMobileClock;
window.updateMobileStatus = updateMobileStatus;
window.updateMobileSyncBadge = updateMobileSyncBadge;
window.renderMobileSchedule = renderMobileSchedule;
window.showMobileTokenModal = showMobileTokenModal;
window.hideMobileTokenModal = hideMobileTokenModal;
window.showMobileConfirm = showMobileConfirm;
window.hideMobileConfirm = hideMobileConfirm;
window.toggleFloatResultBtn = toggleFloatResultBtn;
window.showMobileUserBar = showMobileUserBar;
window.hideMobileUserBar = hideMobileUserBar;

// ── Auto-restore login session setelah refresh ──────────────────
// Dijalankan di sini karena mobile-core.js load SETELAH script.js,
// sehingga showMobileUserBar sudah pasti terdefinisi saat kode ini jalan.
(function restoreLoginSession() {
  // Delay kecil untuk memastikan semua fungsi sudah ready
  setTimeout(() => {
    try {
      const savedData = localStorage.getItem('CBT_LOGGED_USER');
      if (!savedData) {
        console.log('[RestoreSession] No saved session found');
        renderMobileSchedule();
        return;
      }
      
      let user;
      try {
        const parsed = JSON.parse(savedData);
        user = parsed.user || parsed;
      } catch (e) {
        console.error('[RestoreSession] Failed to parse session data:', e);
        localStorage.removeItem('CBT_LOGGED_USER');
        renderMobileSchedule();
        return;
      }
      
      if (!user || !user.id || !user.name) {
        console.warn('[RestoreSession] Invalid user data in session');
        localStorage.removeItem('CBT_LOGGED_USER');
        renderMobileSchedule();
        return;
      }

      console.log('[RestoreSession] Restoring session for:', user.name);

      // ✅ FIX MULTI-USER: Bersihkan state sebelum restore
      if (window.State) {
        window.State.schedules = [];
        window.State._schedulesForUserId = null;
      }

      // Restore State
      if (window.State) window.State.user = user;

      // Restore UI
      showMobileUserBar(user);

      const userNameInput = document.getElementById('userName');
      if (userNameInput) userNameInput.value = user.name || '';

      // ✅ FIX MULTI-USER: Force-refresh jadwal dari Supabase
      // Jangan ambil cache lokal — cache bisa punya status dari user lain
      // Hapus cache jadwal user ini agar loadSchedules() fetch ulang dari server
      try {
        localStorage.removeItem(`CBT_CACHE_JADWAL_${user.id}`);
        localStorage.removeItem(`CBT_CACHE_JADWAL_TIME_${user.id}`);
        console.log(`[RestoreSession] Cleared cached schedules for user ${user.id}`);
      } catch (e) { console.warn('[RestoreSession] Gagal clear cache jadwal:', e); }

      // Fetch jadwal terbaru dari server
      if (typeof loadSchedules === 'function') {
        loadSchedules();
      } else {
        renderMobileSchedule();
      }
      
      console.log('[RestoreSession] ✅ Session restored successfully');
    } catch (e) {
      console.error('[RestoreSession] Unexpected error:', e);
      try { localStorage.removeItem('CBT_LOGGED_USER'); } catch (_) {}
      try { renderMobileSchedule(); } catch (_) {}
    }
  }, 150);
})();
