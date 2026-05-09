// Admin page guard
(function() {
  // Safety fallback for safeAddListener
  if (typeof window.safeAddListener !== 'function') {
    window.safeAddListener = function(id, event, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, callback);
    };
  }

  const cp = window.location.pathname.split('/').pop() || 'index.html';
  if (cp !== 'admin.html') return;

  window.adminState = window.adminState || { peserta: [], hasil: [], radar: [], monitor: null, monitorPage: {}, tempLogoBase64: null };

  window.showAdminAuthModal = function () {
    const loginView = document.getElementById('admin-login-view');
    if (loginView) loginView.style.display = 'flex';
  };

  window.hideAdminAuthModal = function () {
    const loginView = document.getElementById('admin-login-view');
    if (loginView) loginView.style.display = 'none';
  };

  function showAdminDashboard() {
    const dashView = document.getElementById('admin-dash-view');
    if (dashView) dashView.style.display = 'flex';
    hideAdminAuthModal();
  }

  function hideAdminDashboard() {
    const dashView = document.getElementById('admin-dash-view');
    if (dashView) dashView.style.display = 'none';
  }

  function showAdminLogin() {
    hideAdminDashboard();
    showAdminAuthModal();
  }

  function autoAdminAuth() {
    if (sessionStorage.getItem('admin_auth') === '1') {
      loadAdminDashboard();
      return true;
    }
    return false;
  }

  safeAddListener('btnSubmitAdmin', 'click', async function () {
    const pwd = document.getElementById('adminTokenInput').value.trim();
    if (!pwd) return;
    const btn = document.getElementById('btnSubmitAdmin');
    if (btn) btn.textContent = '...';
    try {
      const res = await gasRun('validateAdmin', pwd);
      if (res.success && res.valid) {
        sessionStorage.setItem('admin_auth', '1');
        // Simpan sandi hanya untuk sesi ini (dipakai Edge Function admin CRUD)
        sessionStorage.setItem('admin_pwd', pwd);
        loadAdminDashboard();
      } else if (res.success && !res.valid) {
        showCustomAlert('Akses Ditolak', 'Sandi Proktor tidak valid. Coba lagi.', '🔐');
      } else {
        showCustomAlert('Gagal', 'Gagal: ' + (res.message || 'Unknown error'), '❌');
      }
    } catch (e) {
      console.error("Admin Auth Error:", e);
      showCustomAlert('Network Error', 'Network Error: ' + e.message, '🌐');
    }
    if (btn) btn.textContent = 'Verifikasi';
  });

  window.logoutAdmin = function() {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('admin_pwd');
    hideAdminDashboard();
    const tokenInput = document.getElementById('adminTokenInput');
    if (tokenInput) tokenInput.value = '';
    window.location.href = 'index.html';
  };

  window.loadAdminDashboard = async function () {
    showLoading('Memuat Intelijen Proktor...');
    // Safety: force hide loading after 10s no matter what
    const safetyTimer = setTimeout(() => hideLoading(), 10000);
    try {
      const skipPeserta = !!(window.adminState && window.adminState.peserta && window.adminState.peserta.length > 0);
      const res = await gasRun('getAdminMonitoringData', skipPeserta);
      if (!skipPeserta) window.adminState.peserta = res.peserta || [];
      else res.peserta = window.adminState.peserta;
      if (res.success) {
        showAdminDashboard();
        // Load hasil data for stats
        const resLap = await gasRun('getAdminLaporanLengkap');
        if (resLap.success) {
          res.hasil = resLap.hasil || [];
          res.pelanggaran = resLap.pelanggaran || [];
          window.adminState.hasil = res.hasil;
          window.adminState.radar = res.pelanggaran;
        }
        // Load sync status detail
        try {
          const syncSnap = await db.ref('/status_sync').once('value');
          res.syncStatus = syncSnap.val() || {};
        } catch(e) { 
          console.warn("Gagal muat status sync detail:", e);
          res.syncStatus = {};
        }
        
        // Render stats cards + summary
        updateAdminSummary(res);
        // Render monitoring list + token list
        renderAdminDashboard(res);
        // Load sync status
        loadAdminSyncStatus();
      } else {
        showCustomAlert('Gagal Memuat', 'Gagal memuat monitoring: ' + res.message, '❌');
        hideAdminDashboard();
        showAdminAuthModal();
      }
    } catch (e) {
      console.error('Dashboard error:', e);
      showCustomAlert('Koneksi Gagal', 'Koneksi ke server gagal: ' + e.message, '🌐');
      hideAdminDashboard();
      showAdminAuthModal();
    } finally {
      clearTimeout(safetyTimer);
      if (window._loadingSafetyTimer) { clearTimeout(window._loadingSafetyTimer); window._loadingSafetyTimer = null; }
      // PASTIKAN loading selalu hilang - dengan paksa
      hideLoading();
      // Paksa sembunyikan overlay jika masih ada
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.style.setProperty('display', 'none', 'important');
        overlay.style.visibility = 'hidden';
        overlay.style.opacity = '0';
      }
      // Pastikan juga mobile-loading tersembunyi
      const mobileOverlay = document.getElementById('mobile-loading');
      if (mobileOverlay) {
        mobileOverlay.classList.remove('show');
        mobileOverlay.style.setProperty('display', 'none', 'important');
      }
    }
  };

  // Tab switching
  document.querySelectorAll('.admin-sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.dataset.tab) return;
      document.querySelectorAll('.admin-sidebar-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).style.display = 'flex';
      const title = document.getElementById('admin-page-title');
      if (title) title.innerText = btn.innerText;
      if (btn.dataset.tab === 'tab-dashboard') loadAdminDashboard();
      else if (btn.dataset.tab === 'tab-monitoring') renderMonitoringTab();
      else if (btn.dataset.tab === 'tab-jadwal') loadAdminJadwal();
      else if (btn.dataset.tab === 'tab-siswa') loadAdminSiswa();
      else if (btn.dataset.tab === 'tab-soal') loadAdminSoal();
      else if (btn.dataset.tab === 'tab-settings') loadAdminSettings();
      else if (btn.dataset.tab === 'tab-hasil') loadAdminHasil(true);
    });
  });

  // AbsenMode checkbox listener
  const chkAbsen = document.getElementById('chkAbsenMode');
  if (chkAbsen) {
    chkAbsen.addEventListener('change', () => {
      renderMonitoringTab();
    });
  }

  window.renderMonitoringTab = function() {
    if (!window.adminState || !window.adminState.monitor) {
      loadAdminDashboard();
      return;
    }
    renderAdminDashboard(window.adminState.monitor);
  };

  window.forceRefreshAdminTab = function () {
    const activeTabBtn = document.querySelector('.admin-sidebar-btn.active');
    if (!activeTabBtn || !activeTabBtn.dataset.tab) {
      loadAdminDashboard();
      return;
    }
    const tab = activeTabBtn.dataset.tab;
    if (tab === 'tab-dashboard') loadAdminDashboard();
    else if (tab === 'tab-monitoring') renderMonitoringTab();
    else if (tab === 'tab-jadwal') loadAdminJadwal();
    else if (tab === 'tab-siswa') loadAdminSiswa();
    else if (tab === 'tab-soal') loadAdminSoal();
    else if (tab === 'tab-settings') loadAdminSettings();
    else if (tab === 'tab-hasil') loadAdminHasil(true);
    else loadAdminDashboard();
  };

  // Init: check auto auth first
  setTimeout(() => {
    if (!autoAdminAuth()) {
      showAdminAuthModal();
      const input = document.getElementById('adminTokenInput');
      if (input) { input.value = ''; input.focus(); }
    }
  }, 100);

})();

// =====================================================
// Admin Utility Functions
// =====================================================

function loadXLSXLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof XLSX !== 'undefined') return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat library XLSX'));
    document.head.appendChild(script);
  });
}

window.loadAdminSyncStatus = async function () {
  const countEl = document.getElementById('admin-sync-count');
  if (!countEl) return;
  try {
    countEl.textContent = 'Memuat data...';
    // Gunakan db.ref directly karena sudah dipatch secara otomatis
    const snap = await db.ref('/status_sync').once('value');
    const data = snap.val() || {};
    const uniqueStudents = new Set();
    for (let examId in data) {
      for (let studentId in data[examId]) { uniqueStudents.add(studentId); }
    }
    const syncCount = uniqueStudents.size;
    const totalSiswa = (window.adminState && window.adminState.peserta) ? window.adminState.peserta.length : 0;
    if (totalSiswa > 0) {
      const pct = Math.min(100, Math.round((syncCount / totalSiswa) * 100));
      countEl.textContent = `${syncCount} / ${totalSiswa} Siswa Siap (${pct}%)`;
    } else { countEl.textContent = `${syncCount} Siswa Siap`; }
  } catch (e) {
    console.error("Sync Status Error:", e);
    countEl.textContent = 'Gagal memuat.';
  }
};

window.updateAdminSummary = function(data) {
  if (!data) return;
  const activeExamId = data.activeExams[0]?.id;
  window.adminState.activeExamId = activeExamId;
  let totalPeserta = (data.peserta || []).length;
  let selesaiCount = 0, totalSkor = 0, skorCount = 0;
  const pelanggaranSet = new Set();
  const selesaiSet = new Set();
  data.activeExams.forEach(ex => {
    const completed = data.completions[ex.id] || [];
    selesaiCount += completed.length;
    completed.forEach(uid => selesaiSet.add(uid));
  });
  (data.hasil || []).forEach(h => {
    if (activeExamId && h.examId !== activeExamId) return;
    if (typeof h.skor === 'number') { totalSkor += h.skor; skorCount++; }
    if (h.userId && selesaiSet.has(h.userId)) pelanggaranSet.add(h.userId);
  });
  (data.pelanggaran || []).forEach(p => { if (p.userId) pelanggaranSet.add(p.userId); });

  const pctSelesai = totalPeserta > 0 ? Math.round((selesaiCount / totalPeserta) * 100) : 0;
  const avgSkor = skorCount > 0 ? Math.round(totalSkor / skorCount) : '-';

  const elTotal = document.getElementById('sum-total-peserta');
  const elPct = document.getElementById('sum-persen-selesai');
  const elAvg = document.getElementById('sum-rata-nilai');
  const elPel = document.getElementById('sum-pelanggaran-aktif');
  if (elTotal) elTotal.textContent = totalPeserta;
  if (elPct) elPct.textContent = `${pctSelesai}%`;
  if (elAvg) elAvg.textContent = avgSkor;
  if (elPel) elPel.textContent = pelanggaranSet.size;

  // Populate kelas dropdown for targeted broadcast
  const bcKelas = document.getElementById('bc-kelas');
  if (bcKelas) {
    const kelasList = [...new Set((data.peserta || []).map(p => p.kelas))].sort();
    bcKelas.innerHTML = '<option value="all">Semua Kelas</option>' + kelasList.map(k => `<option value="${k}">${k}</option>`).join('');
  }
};

window.sendTargetedBroadcast = async function() {
  const examId = window.adminState.activeExamId || (window.adminState.monitor && window.adminState.monitor.activeExams[0]?.id);
  if (!examId) return showCustomAlert('Pilih Ujian', 'Tidak ada ujian aktif untuk dibroadcast.', '⚠️');
  const pesan = document.getElementById('bc-pesan')?.value?.trim();
  const kelas = document.getElementById('bc-kelas')?.value || 'all';
  const status = document.getElementById('bc-status')?.value || 'all';
  if (!pesan) return showCustomAlert('Pesan Kosong', 'Ketik pesan terlebih dahulu.', '⚠️');
  
  showLoading('Menyiarkan...');
  try {
    await gasRun('sendBroadcastAdmin', examId, pesan, kelas, status);
    showCustomAlert('Berhasil', `Pesan disiarkan ke target: Kelas=${kelas}, Status=${status}`, '📢');
    if (document.getElementById('bc-pesan')) document.getElementById('bc-pesan').value = '';
  } catch(e) { showCustomAlert('Gagal', 'Koneksi bermasalah.', '🌐'); }
  hideLoading();
};
window.sendBroadcast = window.sendTargetedBroadcast;

window.resetSiswaLogin = async function(userId, examId, userName) {
  if (!confirm(`Reset sesi ${userName} di ujian ini? Siswa akan diminta login ulang dan sinkronisasi soal baru.`)) return;
  showLoading('Reset sesi...');
  try {
    await gasRun('resetStudentSession', examId, userId);
    showCustomAlert('Reset Berhasil', `Sesi ${userName} telah dihapus. Siswa bisa login ulang.`, '✅');
    loadAdminDashboard();
  } catch(e) { showCustomAlert('Gagal', e.message, '❌'); }
  hideLoading();
};

window.remedialSiswa = async function(userId, examId, userName) {
  if (!confirm(`Remedial ${userName}?\n\nHasil ujian siswa ini akan dihapus dan bisa mengerjakan ulang ujian ini.`)) return;
  showLoading('Proses Remedial...');
  try {
    await gasRun('remedialStudent', examId, userId);
    if (window.adminState && window.adminState.monitor) {
      const exId = examId;
      if (window.adminState.monitor.completions && window.adminState.monitor.completions[exId]) {
        window.adminState.monitor.completions[exId] = window.adminState.monitor.completions[exId].filter(uid => uid !== userId);
      }
      if (window.adminState.monitor.onlines && window.adminState.monitor.onlines[exId]) {
        delete window.adminState.monitor.onlines[exId][userId];
      }
      renderAdminDashboard(window.adminState.monitor);
    }
    showCustomAlert('Remedial Berhasil', `${userName} bisa mengerjakan ulang ujian ini.`, '📝');
  } catch(e) { showCustomAlert('Gagal', e.message, '❌'); }
  hideLoading();
};

function renderPaginationControls(containerId, total, perPage, current, callbackName, idParam) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="${callbackName}(${current - 1}${idParam ? ',\'' + idParam + '\'' : ''})" ${current === 1 ? 'disabled' : ''}>&laquo;</button>`;
  let start = Math.max(1, current - 2);
  let end = Math.min(totalPages, current + 2);
  if (start > 1) html += `<button class="page-btn" onclick="${callbackName}(1${idParam ? ',\'' + idParam + '\'' : ''})">1</button>${start > 2 ? '<span style="color:var(--text-muted)">...</span>' : ''}`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${callbackName}(${i}${idParam ? ',\'' + idParam + '\'' : ''})">${i}</button>`;
  }
  if (end < totalPages) html += `${end < totalPages - 1 ? '<span style="color:var(--text-muted)">...</span>' : ''}<button class="page-btn" onclick="${callbackName}(${totalPages}${idParam ? ',\'' + idParam + '\'' : ''})">${totalPages}</button>`;
  html += `<button class="page-btn" onclick="${callbackName}(${current + 1}${idParam ? ',\'' + idParam + '\'' : ''})" ${current === totalPages ? 'disabled' : ''}>&raquo;</button>`;
  container.innerHTML = html;
}

function renderAdminDashboard(data = window.adminState.monitor) {
  window.adminState.monitor = data;
  if (!data) return;
  
  // 1. Render Token List on Dashboard tab
  const tl = document.getElementById('admin-token-list');
  if (tl) {
    if (data.activeExams.length > 0) {
      tl.innerHTML = data.activeExams.map(x => {
        const completed = (data.completions && data.completions[x.id]) || [];
        const onlines = (data.onlines && data.onlines[x.id]) || {};
        const onlineCount = Object.keys(onlines).length;
        const totalP = data.peserta ? data.peserta.length : 0;
        const pctDone = totalP > 0 ? Math.round((completed.length / totalP) * 100) : 0;
        return `
          <div style="background:#FEF9C3;border-radius:10px;padding:12px 16px;border:1px solid #FDE68A;">
            <div style="font-size:0.75rem;font-weight:600;color:#92400E;margin-bottom:4px;">${x.nama}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="color:#DC2626;font-family:var(--mono);font-size:1.3rem;font-weight:700;letter-spacing:3px;">${x.token || '---'}</div>
              <div style="font-size:0.7rem;color:#6B7280;">
                <span style="color:#10B981;">● ${onlineCount} online</span> · 
                <span>${completed.length}/${totalP} selesai</span> · 
                <span>${pctDone}%</span>
              </div>
            </div>
          </div>`;
      }).join('');
    } else {
      tl.innerHTML = '<div style="text-align:center;padding:32px 20px;color:#9CA3AF;"><p style="margin:0;font-size:0.85rem;">Tidak ada ujian aktif</p></div>';
    }
  }
  
  // Populate monitoring kelas filter
  const monKelas = document.getElementById('mon-filter-kelas');
  if (monKelas && data.peserta) {
    const currentVal = monKelas.value;
    const kelasList = [...new Set(data.peserta.map(p => p.kelas))].sort();
    monKelas.innerHTML = '<option value="all">Semua Kelas</option>' + kelasList.map(k => `<option value="${k}">${k}</option>`).join('');
    if (currentVal && (currentVal === 'all' || kelasList.includes(currentVal))) monKelas.value = currentVal;
  }

  // 2. Render Monitoring List
  const ml = document.getElementById('admin-monitoring-list');
  if (!ml) return;

  if (data.activeExams.length === 0) {
    ml.innerHTML = '<div style="text-align:center;padding:48px 20px;"><div style="width:64px;height:64px;background:#F1F5F9;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;"><svg width="32" height="32" fill="none" stroke="#94A3B8" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div><h4 style="color:#64748B;margin:0;">Tidak ada ujian aktif</h4><p class="text-muted" style="font-size:0.85rem;margin-top:4px;">Buat jadwal ujian baru untuk memulai monitoring.</p></div>';
    return;
  }

  const absenMode = document.getElementById('chkAbsenMode') ? document.getElementById('chkAbsenMode').checked : false;

  ml.innerHTML = data.activeExams.map(ex => {
    let selesai = 0, mengerjakan = 0, blmSelesai = 0;
    const completedSet = new Set(data.completions[ex.id] || []);
    const rRaw = data.peserta.map(p => {
      let d = 'BELUM';
      let badgeClass = 'status-belum';
      let actionBtn = '';
      let progressPct = 0;
      const onData = (data.onlines && data.onlines[ex.id]) ? data.onlines[ex.id][p.id] : null;
      const isOnline = !!onData;
      const namaEsc = p.nama.replace(/'/g, "\\'");

      const syncData = (data.syncStatus && data.syncStatus[ex.id]) ? data.syncStatus[ex.id][p.id] : false;
      const isSynced = !!syncData;

      if (completedSet.has(p.id)) {
        d = 'SELESAI'; badgeClass = 'status-selesai'; selesai++;
        actionBtn = `<button class="remedial-btn" onclick="remedialSiswa('${p.id}','${ex.id}','${namaEsc}')" title="Remedial">📝</button>`;
      } else if (isOnline) {
        d = 'MENGERJAKAN'; badgeClass = 'status-online'; mengerjakan++;
        actionBtn = `<button class="reset-btn" onclick="resetSiswaLogin('${p.id}','${ex.id}','${namaEsc}')" title="Reset Sesi">🔄</button>`;
        if (onData.progress !== undefined && onData.total !== undefined && onData.total > 0) {
          progressPct = Math.round((onData.progress / onData.total) * 100);
        }
      } else { blmSelesai++; }
      return { nama: p.nama, kelas: p.kelas, status: d, badgeClass, progressPct, actionBtn, stat: d, id: p.id, isSynced };
    });

    // Apply Filters
    const query = (document.getElementById('mon-search')?.value || '').toLowerCase();
    const fKelas = document.getElementById('mon-filter-kelas')?.value || 'all';
    const fStatus = document.getElementById('mon-filter-status')?.value || 'all';

    const filterRows = rRaw.filter(x => {
      // 1. Mode Absensi (hanya yang belum mulai/login)
      if (absenMode && x.stat !== 'BELUM') return false;
      // 2. Search Name
      if (query && !x.nama.toLowerCase().includes(query)) return false;
      // 3. Filter Kelas
      if (fKelas !== 'all' && x.kelas !== fKelas) return false;
      // 4. Filter Status (Termasuk Sync)
      if (fStatus === 'SYNCED') {
        if (!x.isSynced) return false;
      } else if (fStatus === 'NOT_SYNCED') {
        if (x.isSynced) return false;
      } else if (fStatus !== 'all' && x.stat !== fStatus) {
        return false;
      }
      
      return true;
    });
    const page = window.adminState.monitorPage[ex.id] || 1;
    const perPage = 20;
    const slicedRows = filterRows.slice((page - 1) * perPage, page * perPage);
    const totalP = data.peserta.length;
    const pctSelesai = totalP > 0 ? Math.round((selesai / totalP) * 100) : 0;
    const pctAktif = totalP > 0 ? Math.round((mengerjakan / totalP) * 100) : 0;

    const rowsHtml = slicedRows.map(r => `
      <div class="monitor-row">
        <div class="monitor-name" title="${r.nama}">
          <span class="monitor-avatar">${r.nama.charAt(0).toUpperCase()}</span>
          <span class="monitor-name-text">${r.nama}</span>
          ${r.isSynced ? `<span class="sync-indicator synced" title="Sudah Sinkron Soal"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg></span>` : `<span class="sync-indicator" title="Belum Sinkron Soal"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"><circle cx="12" cy="12" r="10"/></svg></span>`}
        </div>
        <div class="monitor-kelas">${r.kelas}</div>
        <div class="monitor-status-col">
          <span class="monitor-badge ${r.badgeClass}">${r.status}</span>
          ${r.progressPct > 0 ? `<div class="monitor-progress-bar"><div class="monitor-progress-fill" style="width:${r.progressPct}%"></div></div><span class="monitor-progress-text">${r.progressPct}%</span>` : ''}
        </div>
        <div class="monitor-action">${r.actionBtn}</div>
      </div>
    `).join('');

    // Per-exam stats
    const examSelesaiPct = pctSelesai;
    const examAktifCount = mengerjakan;

    return `
      <div class="exam-card">
        <div class="exam-card-header">
          <div class="exam-title">
            <span class="exam-icon">📋</span>
            <div>
              <div class="exam-name">${ex.nama}</div>
              <div class="exam-subtitle">${totalP} peserta terdaftar</div>
            </div>
          </div>
          <div class="exam-actions">
            <button class="exam-btn exam-btn-blue" onclick="promptBroadcast('${ex.id}')">📢 Broadcast</button>
            <button class="exam-btn exam-btn-red" onclick="forceSelesaiSemua('${ex.id}')">⚡ Selesaikan Semua</button>
          </div>
        </div>
        <div class="exam-stats-row">
          <div class="exam-stat"><div class="exam-stat-value">${totalP}</div><div class="exam-stat-label">Total</div></div>
          <div class="exam-stat exam-stat-green"><div class="exam-stat-value">${selesai}</div><div class="exam-stat-label">Selesai</div><div class="exam-stat-pct">${pctSelesai}%</div></div>
          <div class="exam-stat exam-stat-blue"><div class="exam-stat-value">${mengerjakan}</div><div class="exam-stat-label">Aktif</div><div class="exam-stat-pct">${pctAktif}%</div></div>
          <div class="exam-stat exam-stat-gray"><div class="exam-stat-value">${blmSelesai}</div><div class="exam-stat-label">Belum</div></div>
        </div>
        <div class="exam-table">
          <div class="exam-table-head">
            <div class="exam-th">Nama Peserta</div>
            <div class="exam-th">Kelas</div>
            <div class="exam-th">Progress</div>
            <div class="exam-th exam-th-action">Aksi</div>
          </div>
          <div class="exam-table-body">
            ${rowsHtml || '<div class="monitor-empty"><svg width="40" height="40" fill="none" stroke="#CBD5E1" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.95l-3.533-3.533a4.5 4.5 0 00-3.212-1.342h-.577a4.5 4.5 0 00-3.212 1.342L8.42 19.13a9.337 9.337 0 004.121.95c.893.17 1.8.276 2.7.307"/></svg><p>Semua siswa sudah masuk ke ruang ujian</p></div>'}
          </div>
        </div>
        <div id="admin-monitor-pg-${ex.id}" class="pagination-controls"></div>
      </div>
    `;
  }).join('');

  data.activeExams.forEach(ex => {
    const absenMode2 = document.getElementById('chkAbsenMode') ? document.getElementById('chkAbsenMode').checked : false;
    const completedSet = new Set(data.completions[ex.id] || []);
    let rawTotal = 0;
    data.peserta.forEach(p => {
      const hasSelesai = completedSet.has(p.id);
      const hasMengerjakan = (data.onlines && data.onlines[ex.id] && (p.id in data.onlines[ex.id]));
      const stat = hasSelesai ? 'SELESAI' : (hasMengerjakan ? 'MENGERJAKAN' : 'BELUM');
      if (!absenMode2 || stat === 'BELUM') rawTotal++;
    });
    renderPaginationControls(`admin-monitor-pg-${ex.id}`, rawTotal, 20, window.adminState.monitorPage[ex.id] || 1, 'changeMonitorPage', ex.id);
  });
}

function changeMonitorPage(page, examId) {
  window.adminState.monitorPage[examId] = page;
  renderAdminDashboard(window.adminState.monitor);
}

window.forceRefreshAdminTab = function () {
  const activeTabBtn = document.querySelector('.admin-sidebar-btn.active');
  if (!activeTabBtn || !activeTabBtn.dataset.tab) {
    loadAdminDashboard();
    return;
  }
  const tab = activeTabBtn.dataset.tab;
  if (tab === 'tab-dashboard') loadAdminDashboard();
  else if (tab === 'tab-monitoring') renderMonitoringTab();
  else if (tab === 'tab-jadwal') loadAdminJadwal();
  else if (tab === 'tab-siswa') loadAdminSiswa();
  else if (tab === 'tab-soal') loadAdminSoal();
  else if (tab === 'tab-settings') loadAdminSettings();
  else if (tab === 'tab-hasil') loadAdminHasil(true);
  else loadAdminDashboard();
};

async function loadAdminSiswa() {
  const tbody = document.getElementById('admin-siswa-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Memuat...</td></tr>';
  
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const snap = await db.ref('/peserta').once('value');
    const data = snap.val() || {};
    let html = '';
    for (let id in data) {
      html += `<tr><td><strong>${id}</strong></td><td>${data[id].nama}</td><td>${data[id].kelas}</td><td><button class="btn btn-outline" onclick="editSiswa('${id}')">📝</button> <button class="btn btn-outline" style="color:var(--danger)" onclick="deleteSiswa('${id}')">🗑️</button></td></tr>`;
    }
    tbody.innerHTML = html || '<tr><td colspan="4" class="text-center">Belum ada data siswa.</td></tr>';
  } catch (e) {
    console.error(e);
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }
}

async function loadAdminSoal() {
  const tbody = document.getElementById('admin-soal-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Memuat...</td></tr>';
  
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const snap = await db.ref('/soal').once('value');
    const data = snap.val() || {};
    let html = '';
    for (let bankId in data) {
      html += `<tr><td><strong>${bankId}</strong> <br><small>${Object.keys(data[bankId]).length} soal</small></td><td><button class="btn btn-outline" onclick="previewSoal('${bankId}')">👁️</button> <button class="btn btn-primary" onclick="openSoalEditorPage('${bankId}')">📝</button> <button class="btn btn-outline" style="color:var(--danger)" onclick="deleteBankSoal('${bankId}')">🗑️</button></td></tr>`;
    }
    tbody.innerHTML = html || '<tr><td colspan="2" class="text-center">Belum ada bank soal.</td></tr>';
  } catch (e) {
    console.error(e);
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }
}

async function loadAdminJadwal() {
  const tbody = document.getElementById('admin-jadwal-tbody');
  if (!tbody) return;
  
  showLoading('Memuat Jadwal...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const snap = await db.ref('/jadwal').once('value');
    const data = snap.val() || {};
    
    let html = '';
    for (let id in data) {
      const j = data[id];
      const isAktif = j.aktif !== false;
      const isForce = j.force_aktif;
      const color = isAktif ? '#059669' : '#DC2626';
      html += `
          <tr>
            <td>
              <div style="font-weight:700;">${j.nama}</div>
              <div style="font-size:0.7rem; color:var(--text-muted);">${id} | Bank: ${j.nama_soal}</div>
            </td>
            <td>
              <div style="font-size:0.75rem;">${j.mulai ? new Date(j.mulai).toLocaleString('id-ID') : '-'}</div>
              <div style="font-size:0.75rem;">${j.selesai ? new Date(j.selesai).toLocaleString('id-ID') : '-'}</div>
            </td>
            <td>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="status-dot" style="background:${color};"></span>
                  <span style="font-size:0.75rem; font-weight:700; color:${color};">${isAktif ? 'AKTIF' : 'NONAKTIF'}</span>
                </div>
                <code style="font-size:0.8rem; font-weight:bold; color:var(--primary);">${j.token || '-'}</code>
                ${isForce ? '<span style="font-size:0.6rem; background:#FEE2E2; color:#B91C1C; padding:1px 4px; border-radius:4px; width:fit-content; font-weight:bold;">OVERRIDE</span>' : ''}
              </div>
            </td>
            <td>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.7rem;" onclick="openJadwalModal('${id}')">⚙️ Edit</button>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.7rem;" onclick="openAnalisisModal('${id}', this.dataset.nama)" data-nama="${j.nama}">📊 Analisis</button>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.7rem; color:#2563EB" onclick="openPrintModal('${id}', this.dataset.nama)" data-nama="${j.nama}">🖨️ Cetak</button>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:0.7rem; color:var(--danger); border-color:#FECACA;" onclick="deleteJadwal('${id}')">🗑️</button>
              </div>
            </td>
          </tr>`;
    }
    tbody.innerHTML = html || '<tr><td colspan="5" class="text-center">Belum ada jadwal.</td></tr>';
  } catch (e) { 
    console.error(e); 
    showCustomAlert('Gagal', 'Gagal memuat jadwal dari Firebase.', '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
}

window.openJadwalModal = async function (editId = null) {
  const overlay = document.getElementById('jadwal-overlay');
  const modal = document.getElementById('jadwal-modal');
  if (!overlay || !modal) return;

  // Helper for datetime-local format
  const toLocalISO = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  overlay.classList.add('active');
  modal.style.display = 'flex';
  
  showLoading('Menyiapkan Form...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    
    // Load bank soal options
    const sSnap = await db.ref('/soal').once('value');
    const sData = sSnap.val() || {};
    const select = document.getElementById('jSoal');
    if (select) {
      select.innerHTML = '<option value="">-- Pilih Bank Soal --</option>' + 
        Object.keys(sData).map(k => `<option value="${k}">${k} (${Object.keys(sData[k]).length} soal)</option>`).join('');
    }

    if (editId) {
      document.getElementById('jadwal-modal-title').innerText = 'Edit Jadwal: ' + editId;
      const snap = await db.ref('/jadwal/' + editId).once('value');
      const data = snap.val() || {};
      document.getElementById('jId').value = editId;
      document.getElementById('jId').readOnly = true;
      document.getElementById('jNama').value = data.nama || '';
      document.getElementById('jSoal').value = data.nama_soal || '';
      document.getElementById('jDurasi').value = data.durasi || 60;
      document.getElementById('jMinSelesai').value = data.min_selesai || 0;
      document.getElementById('jMulai').value = toLocalISO(data.mulai);
      document.getElementById('jSelesai').value = toLocalISO(data.selesai);
      document.getElementById('jKelas').value = data.target_kelas || data.kelas || '';
      document.getElementById('jShuffleSoal').checked = data.shuffle_soal !== false;
      document.getElementById('jShuffleOpsi').checked = data.shuffle_opsi !== false;
      document.getElementById('jAktif').checked = data.aktif !== false;
      document.getElementById('jToken').value = data.token || Math.random().toString(36).substring(2, 8).toUpperCase();
    } else {
      document.getElementById('jadwal-modal-title').innerText = 'Buat Jadwal Baru';
      document.getElementById('jId').value = 'EXAM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      document.getElementById('jId').readOnly = false;
      document.getElementById('jNama').value = '';
      document.getElementById('jSoal').value = '';
      document.getElementById('jDurasi').value = '60';
      document.getElementById('jMinSelesai').value = '0';
      document.getElementById('jMulai').value = '';
      document.getElementById('jSelesai').value = '';
      document.getElementById('jKelas').value = '';
      document.getElementById('jShuffleSoal').checked = true;
      document.getElementById('jShuffleOpsi').checked = true;
      document.getElementById('jAktif').checked = true;
      document.getElementById('jToken').value = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  } catch (e) { 
    console.error(e);
    showCustomAlert('Gagal', 'Gagal memuat data: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }

  setTimeout(() => {
    overlay.style.opacity = '1';
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
};

window.closeJadwalModal = function () {
  const overlay = document.getElementById('jadwal-overlay');
  const modal = document.getElementById('jadwal-modal');
  if (!overlay || !modal) return;

  overlay.classList.remove('active');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    overlay.style.display = 'none';
    modal.style.display = 'none';
  }, 300);
};

window.saveJadwal = async function () {
  const id = document.getElementById('jId').value.trim();
  const nama = document.getElementById('jNama').value.trim();
  const soal = document.getElementById('jSoal').value;
  const durasi = document.getElementById('jDurasi').value;
  const minS = document.getElementById('jMinSelesai').value;
  const mulaiStr = document.getElementById('jMulai').value;
  const selesaiStr = document.getElementById('jSelesai').value;
  const kelas = document.getElementById('jKelas').value.trim();
  
  if (!id || !nama || !soal || !mulaiStr || !selesaiStr) {
    return showCustomAlert('Data Tidak Lengkap', 'Harap isi semua field utama.', '📝');
  }

  const mulaiMs = new Date(mulaiStr).getTime();
  const selesaiMs = new Date(selesaiStr).getTime();

  if (isNaN(mulaiMs) || isNaN(selesaiMs)) {
    return showCustomAlert('Format Salah', 'Format tanggal tidak valid.', '📅');
  }

  if (mulaiMs >= selesaiMs) {
    return showCustomAlert('Waktu Tidak Valid', 'Waktu mulai harus sebelum waktu selesai.', '⏰');
  }

  showLoading('Menyimpan Jadwal...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    
    // Cek apakah ini baru atau edit
    const existingSnap = await db.ref('/jadwal/' + id).once('value');
    const existingData = existingSnap.val();
    
    const payload = {
      nama: nama,
      nama_soal: soal,
      durasi: parseInt(durasi) || 60,
      min_selesai: parseInt(minS) || 0,
      mulai: mulaiMs,
      selesai: selesaiMs,
      target_kelas: kelas,
      kelas: kelas, // Keep both for safety
      shuffle_soal: document.getElementById('jShuffleSoal').checked,
      shuffle_opsi: document.getElementById('jShuffleOpsi').checked,
      aktif: document.getElementById('jAktif').checked,
      token: document.getElementById('jToken').value.trim().toUpperCase() || Math.random().toString(36).substring(2, 8).toUpperCase(),
      force_aktif: existingData ? (existingData.force_aktif || false) : false
    };

    await db.ref('/jadwal/' + id).set(payload);
    showCustomAlert('Berhasil', 'Jadwal berhasil disimpan.', '✅');
    closeJadwalModal();
    loadAdminJadwal();
  } catch (e) {
    showCustomAlert('Gagal', 'Gagal menyimpan: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

async function loadAdminHasil(resetPage = false) {
  console.log('📋 loadAdminHasil called with resetPage:', resetPage);
  const tbHasil = document.getElementById('admin-hasil-tbody');
  const tbRadar = document.getElementById('admin-radar-tbody');

  if (resetPage) {
    if (tbHasil) tbHasil.innerHTML = '<tr><td colspan="5" class="text-center">Memuat...</td></tr>';
    if (tbRadar) tbRadar.innerHTML = '<tr><td colspan="5" class="text-center">Memuat...</td></tr>';

    const res = await gasRun('getAdminLaporanLengkap');
    if (res.success) {
      window.adminState.hasil = res.hasil || [];
      window.adminState.radar = res.pelanggaran || [];
      console.log('✅ Violations loaded:', window.adminState.radar.length, 'items');
    }
  }
  renderAdminHasilPage(1);
  renderAdminRadarPage(1);
}

// ✅ Hitung ulang nilai semua siswa yang masih 0 dari kunci jawaban di Supabase
window.reGradeAllHasil = async function() {
  const btn = document.getElementById('btn-regrade-all');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Menghitung...';
  }

  try {
    showLoading('Mengambil data hasil...');

    // Ambil semua hasil dari Supabase
    const supH = await fetchSupabase('hasil', { order: 'timestamp.desc', limit: 1000 });
    if (!supH.success) throw new Error('Gagal ambil data hasil');

    // Ambil semua jadwal untuk mapping exam_id → nama_soal
    const supJ = await fetchSupabase('jadwal_ujian');
    const jadwalMap = {};
    if (supJ.success) supJ.data.forEach(j => { jadwalMap[j.id] = j; });

    // Kelompokkan siswa yang perlu di-regrade berdasarkan bank soal
    const bankGroups = {}; // bankId → [{h, answers}]
    for (const h of supH.data) {
      if (h.skor !== 0 && h.skor !== null && h.skor !== undefined) continue; // skip yang sudah punya nilai
      const jadwal = jadwalMap[h.exam_id];
      if (!jadwal || !jadwal.nama_soal) continue;
      const bankId = jadwal.nama_soal;
      if (!bankGroups[bankId]) bankGroups[bankId] = [];
      bankGroups[bankId].push(h);
    }

    const bankIds = Object.keys(bankGroups);
    if (bankIds.length === 0) {
      hideLoading();
      showCustomAlert('Info', 'Tidak ada nilai yang perlu dihitung ulang.', 'ℹ️');
      if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
      return;
    }

    showLoading(`Menghitung ulang nilai untuk ${bankIds.length} bank soal...`);

    let totalUpdated = 0;

    for (const bankId of bankIds) {
      // Ambil kunci dan soal untuk bank ini
      const [supK, supS] = await Promise.all([
        fetchSupabase('kunci', { bank_id: 'eq.' + bankId }),
        fetchSupabase('soal', { bank_id: 'eq.' + bankId })
      ]);
      if (!supK.success || !supS.success) continue;

      const keysById = {};
      supK.data.forEach(k => { keysById[String(k.id)] = k.kunci; });
      const bobotById = {};
      supS.data.forEach(q => { bobotById[String(q.id)] = parseFloat(q.bobot) || 1; });
      const typeById = {};
      supS.data.forEach(q => { typeById[String(q.id)] = q.tipe || 'PG'; });

      for (const h of bankGroups[bankId]) {
        // Ambil jawaban dari kolom detail
        const detailRaw = h.detail || h.jawaban;
        if (!detailRaw) continue;
        let detail;
        try { detail = typeof detailRaw === 'string' ? JSON.parse(detailRaw) : detailRaw; } catch(_) { continue; }
        if (!detail || typeof detail !== 'object') continue;

        // Ekstrak jawaban siswa dari detail
        const answers = {};
        Object.keys(detail).forEach(qId => {
          const v = detail[qId];
          answers[qId] = (v && typeof v === 'object' && 'answer' in v) ? v.answer : v;
        });

        // Hitung ulang skor
        let totalPoints = 0, maxPoints = 0;
        const newDetail = {};
        Object.keys(keysById).forEach(qId => {
          const bobot = bobotById[qId] || 1;
          const qType = typeById[qId] || 'PG';
          const correctAns = keysById[qId];
          const userAns = answers[qId];
          maxPoints += bobot;
          let isCorrect = false;
          if (userAns !== undefined && userAns !== null && userAns !== '-') {
            if (qType === 'PG' || qType === 'BS') {
              isCorrect = String(userAns).trim().toUpperCase() === String(correctAns || '').trim().toUpperCase();
            } else if (qType === 'KOMPLEKS') {
              if (Array.isArray(userAns)) {
                const cArr = String(correctAns || '').split(',').map(s => s.trim().toUpperCase()).sort();
                const uArr = userAns.map(s => String(s).trim().toUpperCase()).sort();
                isCorrect = JSON.stringify(cArr) === JSON.stringify(uArr);
              }
            } else if (qType === 'ISIAN') {
              isCorrect = String(userAns).trim().toLowerCase() === String(correctAns || '').trim().toLowerCase();
            } else if (qType === 'JODOH') {
              const cPairs = {};
              String(correctAns || '').split(';').forEach(p => {
                const pt = p.split('=');
                if (pt.length === 2) cPairs[pt[0].trim()] = pt[1].trim();
              });
              if (typeof userAns === 'object' && !Array.isArray(userAns)) {
                let allMatch = true;
                const kList = Object.keys(cPairs);
                if (kList.length === 0) allMatch = false;
                for (const k of kList) { if (userAns[k] !== cPairs[k]) { allMatch = false; break; } }
                isCorrect = allMatch;
              }
            }
          }
          if (isCorrect) totalPoints += bobot;
          newDetail[qId] = { answer: userAns !== undefined ? userAns : '-', correct: isCorrect };
        });

        const newSkor = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

        // Update di Supabase
        await insertSupabase('hasil', {
          id: h.id,
          skor: newSkor,
          detail: JSON.stringify(newDetail)
        });
        totalUpdated++;
      }
    }

    hideLoading();
    showCustomAlert('Berhasil', `${totalUpdated} nilai berhasil dihitung ulang.`, '✅');

    // Reload tabel hasil
    await loadAdminHasil(true);

  } catch (e) {
    hideLoading();
    showCustomAlert('Gagal', 'Error: ' + e.message, '❌');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
  }
};

function renderAdminRadarPage(page) {
  const perPage = 20;
  const tbRadar = document.getElementById('admin-radar-tbody');
  if (!tbRadar) return;

  const data = window.adminState.radar || [];
  console.log('🔍 Rendering violations page', page, '- Total:', data.length, 'Data:', data);
  const sliced = data.slice((page - 1) * perPage, page * perPage);

  if (sliced.length === 0) {
    tbRadar.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada log pelanggaran.</td></tr>';
  } else {
    tbRadar.innerHTML = sliced.map(p => `
      <tr style="background-color:#FEF2F2;">
        <td>${p.waktu}</td>
        <td><strong style="color:#B91C1C;">⚠️ ${p.nama || '-'}</strong></td>
        <td>${p.kelas || '-'}</td>
        <td>${p.ujian || '-'}</td>
        <td><span class="badge" style="background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA;font-weight:bold;">${p.tipe || 'Pelanggaran'}</span></td>
      </tr>
    `).join('');
  }
  renderPaginationControls('admin-radar-pagination', data.length, perPage, page, 'renderAdminRadarPage');
}

function renderAdminHasilPage(page) {
  const perPage = 20;
  const tbHasil = document.getElementById('admin-hasil-tbody');
  const data = window.adminState.hasil || [];
  const search = document.getElementById('admin-hasil-search')?.value?.toLowerCase() || '';
  const filtered = data.filter(h => h.nama.toLowerCase().includes(search) || h.ujian.toLowerCase().includes(search));
  const sliced = filtered.slice((page - 1) * perPage, page * perPage);
  tbHasil.innerHTML = sliced.map(h => {
    const skor = h.skor ?? 0;
    const skorDisplay = skor === 0 ? '<span style="color:#ef4444;font-weight:bold;">0 ⚠️</span>' : `<strong>${skor}</strong>`;
    const statusClass = skor === 0 ? 'style="background-color:#fee2e2;"' : '';
    const reGradeBtn = skor === 0 ? `<button class="btn btn-outline" style="padding:4px 8px;font-size:0.7rem;color:#f59e0b;border-color:#fcd34d;margin-right:4px;" onclick="reGradeStudent('${h.examId || h.ujian || ''}','${h.userId || ''}','${(h.nama || '').replace(/'/g, "\\'")}')">🔄 Re-grade</button>` : '';
    return `<tr ${statusClass}>
    <td>${h.waktu || '-'}</td>
    <td>${h.nama || '-'}</td>
    <td>${h.ujian || '-'}</td>
    <td>${skorDisplay}</td>
    <td>
      ${reGradeBtn}
      <button class="btn btn-outline" style="padding:4px 8px;font-size:0.7rem;color:var(--danger);border-color:#FECACA;" onclick="deleteHasilRecord('${h.examId || h.ujian || ''}','${h.userId || ''}','${(h.nama || '').replace(/'/g, "\\'")}')">🗑️ Hapus</button>
    </td>
  </tr>`;
  }).join('');
  renderPaginationControls('admin-hasil-pagination', filtered.length, perPage, page, 'renderAdminHasilPage');
}

window.loadAdminSettings = async function () {
  showLoading('Memuat Pengaturan...');
  try {
    // 1. Pastikan Auth Siap sebelum query Firebase
    if (window.authPromise) {
      console.log("Admin: Menunggu Auth...");
      await window.authPromise;
    }

    // Cek status auth secara eksplisit
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      console.error("Admin: User belum terautentikasi! Pastikan 'Anonymous Auth' aktif di Firebase Console.");
      showCustomAlert('Auth Gagal', 'Sesi Firebase belum siap. Silakan refresh halaman.', '🔐');
      return;
    }
    console.log("Admin: Auth OK (UID:", currentUser.uid, ")");

    // 2. Diagnosa Koneksi (Gunakan dbConnectFast agar admin tidak kena jitter 1.5 detik)
    console.log("Admin: Memulai koneksi database...");
    if (window.dbConnectFast) await window.dbConnectFast();

    try {
      console.log("Admin: Mengambil data security...");
      const snap = await db.ref('/config/security').once('value');

      const sec = snap.val() || {};
      console.log("Admin: Data Security diterima:", sec);

      // Fungsi pembantu untuk mengambil nilai tanpa peduli huruf besar/kecil
      const getVal = (obj, key, fallback) => {
        if (!obj) return fallback;
        if (obj[key] !== undefined) return obj[key];
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
        return foundKey ? obj[foundKey] : fallback;
      };

      const isTrue = (v) => v === true || v === "true" || v === 1 || v === "1";

      // Bind ke UI dengan proteksi case-insensitive
      safeSetChecked('cfgPWA', isTrue(getVal(sec, 'pwa', false)));
      safeSetChecked('cfgFullscreen', isTrue(getVal(sec, 'fullscreen', false)));
      safeSetChecked('cfgAntiCheat', isTrue(getVal(sec, 'anticheat', false)));

      // Default TRUE jika tidak ada data (undefined)
      const showExam = getVal(sec, 'showExamStatus', undefined);
      safeSetChecked('cfgShowExamStatus', showExam !== false && showExam !== "false" && showExam !== 0 && showExam !== "0");

      const showSys = getVal(sec, 'showSystemInfo', undefined);
      safeSetChecked('cfgShowSystemInfo', showSys !== false && showSys !== "false" && showSys !== 0 && showSys !== "0");

      const showBadge = getVal(sec, 'showSyncBadge', undefined);
      safeSetChecked('cfgShowSyncBadge', showBadge !== false && showBadge !== "false" && showBadge !== 0 && showBadge !== "0");

      safeSetValue('cfgMinTime', getVal(sec, 'minTime', 0));
      safeSetValue('cfgBypassCode', getVal(sec, 'bypassCode', ''));

      // 3. Load Identity
      console.log("Admin: Mengambil data identity...");
      const idenSnap = await db.ref('/config/identity').once('value');
      const iden = idenSnap.val() || {};
      console.log("Admin: Data Identity diterima:", iden);

      safeSetValue('cfgSchoolName', getVal(iden, 'name', 'NAMA SEKOLAH'));
      safeSetValue('cfgSchoolSub', getVal(iden, 'sub', 'Computer Based Portal v.2'));

      const preview = document.getElementById('cfgLogoPreview');
      if (preview) {
        const logo = getVal(iden, 'logo', null);
        preview.innerHTML = logo ? `<img src="${logo}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<span class="text-muted" style="font-size:0.7rem;">No Logo</span>';
        window.adminState.tempLogoBase64 = logo;
      }

      console.log("Admin: Pengaturan berhasil dimuat dari Firebase ✅");

    } catch (dbErr) {
      console.error("Admin DB Query Error:", dbErr);
      if (dbErr.message.toLowerCase().includes('permission_denied') || dbErr.message.toLowerCase().includes('permission denied')) {
        showCustomAlert('Akses Ditolak', 'Firebase menolak akses (Permission Denied). Cek Rules di Firebase Console.', '🚫');
      } else {
        throw dbErr;
      }
    }
  } catch (e) {
    console.error("Admin Load General Error:", e);
    showCustomAlert('Gagal Memuat', 'Kesalahan sistem: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

safeAddListener('cfgLogoInput', 'change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) {
    showCustomAlert('File Terlalu Besar', 'Ukuran file melebihi 1MB.', '📁');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    const base64 = event.target.result;
    window.adminState.tempLogoBase64 = base64;
    const preview = document.getElementById('cfgLogoPreview');
    if (preview) preview.innerHTML = `<img src="${base64}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
  };
  reader.readAsDataURL(file);
});

window.saveAdminSettings = async function () {
  showLoading('Menyimpan...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();

    const sec = {
      pwa: document.getElementById('cfgPWA') ? document.getElementById('cfgPWA').checked : false,
      fullscreen: document.getElementById('cfgFullscreen') ? document.getElementById('cfgFullscreen').checked : false,
      anticheat: document.getElementById('cfgAntiCheat') ? document.getElementById('cfgAntiCheat').checked : false,
      showExamStatus: document.getElementById('cfgShowExamStatus') ? document.getElementById('cfgShowExamStatus').checked : true,
      showSystemInfo: document.getElementById('cfgShowSystemInfo') ? document.getElementById('cfgShowSystemInfo').checked : true,
      showSyncBadge: document.getElementById('cfgShowSyncBadge') ? document.getElementById('cfgShowSyncBadge').checked : true,
      minTime: parseInt(safeGetValue('cfgMinTime')) || 0,
      bypassCode: safeGetValue('cfgBypassCode').trim().toUpperCase() || null
    };
    await db.ref('/config/security').set(sec);

    const iden = {
      name: safeGetValue('cfgSchoolName').trim(),
      sub: safeGetValue('cfgSchoolSub').trim(),
      logo: window.adminState.tempLogoBase64
    };
    await db.ref('/config/identity').set(iden);

    hideLoading();
    showCustomAlert('Berhasil Disimpan', 'Pengaturan berhasil disimpan!', '✅');
  } catch (e) {
    console.error(e);
    hideLoading();
    showCustomAlert('Gagal Menyimpan', 'Gagal: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }
};

window.resetFirebaseConfig = function () {
  if (confirm("Reset konfigurasi Firebase ke bawaan sistem?")) {
    localStorage.removeItem('CBT_FB_CONFIG');
    window.location.reload();
  }
};

window.toggleAbsenMode = function () {
  loadAdminDashboard();
};

window.promptBroadcast = async function (examId) {
  const msg = prompt("Ketik pesan broadcast untuk siswa:");
  if (msg && msg.trim() !== '') {
    showLoading('Menyiarkan...');
    try {
      const res = await gasRun('sendBroadcastAdmin', examId, msg.trim());
      if (res.success) showCustomAlert('Berhasil', 'Pesan disiarkan!', '📢');
      else showCustomAlert('Gagal', 'Gagal menyiarkan pesan.', '❌');
    } catch (ex) { showCustomAlert('Gagal', 'Koneksi bermasalah.', '🌐'); }
    hideLoading();
  }
};

window.previewSoal = function (examId) {
  showAdminPreview(examId);
};

window.openSoalEditorPage = function (bankId) {
  window.open('soal-editor.html?bank=' + bankId, '_blank');
};

window.deleteJadwal = async function (id) {
  if (confirm(`Hapus jadwal "${id}"? Data hasil pengerjaan terkait jadwal ini mungkin akan tetap ada di database.`)) {
    showLoading('Menghapus Jadwal...');
    try {
      if (window.dbConnectFast) await window.dbConnectFast();
      await db.ref('/jadwal/' + id).remove();
      showCustomAlert('Berhasil', 'Jadwal berhasil dihapus.', '✅');
      loadAdminJadwal();
    } catch (e) {
      showCustomAlert('Gagal', 'Gagal menghapus: ' + e.message, '❌');
    } finally {
      if (window.dbDisconnect) window.dbDisconnect();
      hideLoading();
    }
  }
};

window.deleteBankSoal = async function (bankId) {
  if (confirm(`PERINGATAN: Hapus bank soal "${bankId}"? SELURUH butir soal di dalamnya akan terhapus secara permanen!`)) {
    showLoading('Menghapus Bank Soal...');
    try {
      if (window.dbConnectFast) await window.dbConnectFast();
      await db.ref('/soal/' + bankId).remove();
      // Hapus juga kunci jawaban
      await db.ref('/kunci/' + bankId).remove();
      showCustomAlert('Berhasil', 'Bank soal berhasil dihapus.', '✅');
      loadAdminSoal();
    } catch (e) {
      showCustomAlert('Gagal', 'Gagal menghapus: ' + e.message, '❌');
    } finally {
      if (window.dbDisconnect) window.dbDisconnect();
      hideLoading();
    }
  }
};

window.deleteSiswa = async function (id) {
  if (confirm(`Hapus data siswa dengan ID "${id}"?`)) {
    showLoading('Menghapus Siswa...');
    try {
      if (window.dbConnectFast) await window.dbConnectFast();
      await db.ref('/peserta/' + id).remove();
      showCustomAlert('Berhasil', 'Siswa berhasil dihapus.', '✅');
      loadAdminSiswa();
    } catch (e) {
      showCustomAlert('Gagal', 'Gagal menghapus: ' + e.message, '❌');
    } finally {
      if (window.dbDisconnect) window.dbDisconnect();
      hideLoading();
    }
  }
};

window.deleteHasilRecord = async function (examId, userId, nama = '') {
  if (!examId || !userId) {
    showCustomAlert('Gagal', 'Data hasil tidak valid.', '❌');
    return;
  }
  const label = nama ? ` milik ${nama}` : '';
  if (!confirm(`Hapus hasil ujian${label}?`)) return;
  showLoading('Menghapus Hasil...');
  try {
    const resultId = `${examId}_${userId}`;
    let ok = false;
    if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.enabled && typeof window.deleteSupabase === 'function') {
      const r = await window.deleteSupabase('hasil', { id: 'eq.' + resultId });
      ok = !!r.success;
    } else {
      if (window.dbConnectFast) await window.dbConnectFast();
      await db.ref(`/hasil/${examId}/${userId}`).remove();
      ok = true;
    }
    if (!ok) throw new Error('Delete ditolak server');
    showCustomAlert('Berhasil', 'Hasil ujian berhasil dihapus.', '✅');
    await loadAdminHasil(true);
  } catch (e) {
    showCustomAlert('Gagal', 'Gagal menghapus hasil: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

window.reGradeStudent = async function (examId, userId, nama = '') {
  if (!examId || !userId) {
    showCustomAlert('Gagal', 'Data hasil tidak valid.', '❌');
    return;
  }
  const label = nama ? ` milik ${nama}` : '';
  if (!confirm(`Re-grade hasil ujian${label}? Skor akan dihitung ulang dari jawaban.`)) return;
  showLoading('Re-grading...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const resultId = `${examId}_${userId}`;
    const snap = await db.ref(`/hasil/${resultId}`).once('value');
    const hasil = snap.val();
    if (!hasil) throw new Error('Hasil tidak ditemukan');
    
    const detail = typeof hasil.detail === 'string' ? JSON.parse(hasil.detail) : hasil.detail || {};
    const entries = Object.values(detail).filter(e => e && typeof e === 'object');
    const correctCount = entries.filter(e => e.correct === true).length;
    const totalCount = entries.length;
    
    if (totalCount === 0) throw new Error('Tidak ada jawaban untuk di-grade');
    
    const newSkor = Math.round((correctCount / totalCount) * 100);
    await db.ref(`/hasil/${resultId}/skor`).set(newSkor);
    
    showCustomAlert('Berhasil', `Skor diperbarui: ${newSkor}% (${correctCount}/${totalCount} benar)`, '✅');
    await loadAdminHasil(true);
  } catch (e) {
    showCustomAlert('Gagal', 'Gagal re-grade: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

let _editSiswaId = null;

window.openSiswaModal = function (id = null) {
  _editSiswaId = id;
  const overlay = document.getElementById('siswa-overlay');
  const modal = document.getElementById('siswa-modal');
  if (!overlay || !modal) return;

  overlay.classList.add('active');
  modal.style.display = 'flex';
  
  if (id) {
    document.getElementById('siswa-modal-title').innerText = 'Edit Siswa';
    showLoading('Memuat data siswa...');
    db.ref('/peserta/' + id).once('value').then(snap => {
      const data = snap.val();
      if (data) {
        document.getElementById('siswaIdInput').value = id;
        document.getElementById('siswaIdInput').readOnly = true;
        document.getElementById('siswaNamaInput').value = data.nama || '';
        document.getElementById('siswaKelasInput').value = data.kelas || '';
      }
      hideLoading();
    }).catch(e => {
      hideLoading();
      showCustomAlert('Gagal', 'Gagal memuat data siswa.', '❌');
    });
  } else {
    document.getElementById('siswa-modal-title').innerText = 'Tambah Siswa';
    document.getElementById('siswaIdInput').value = '';
    document.getElementById('siswaIdInput').readOnly = false;
    document.getElementById('siswaNamaInput').value = '';
    document.getElementById('siswaKelasInput').value = '';
  }
  
  setTimeout(() => {
    overlay.style.opacity = '1';
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
};

window.closeSiswaModal = function () {
  const overlay = document.getElementById('siswa-overlay');
  const modal = document.getElementById('siswa-modal');
  if (!overlay || !modal) return;

  overlay.classList.remove('active');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    overlay.style.display = 'none';
    modal.style.display = 'none';
  }, 300);
};

window.editSiswa = function (id) {
  openSiswaModal(id);
};

window.saveSiswa = async function () {
  const idInput = document.getElementById('siswaIdInput');
  const namaInput = document.getElementById('siswaNamaInput');
  const kelasInput = document.getElementById('siswaKelasInput');
  
  if (!idInput || !namaInput || !kelasInput) return;

  const id = idInput.value.trim();
  const nama = namaInput.value.trim();
  const kelas = kelasInput.value.trim();
  
  if (!id || !nama || !kelas) {
    return showCustomAlert('Data Tidak Lengkap', 'Harap isi semua field.', '📝');
  }
  
  showLoading('Menyimpan Data Siswa...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const payload = {
      nama: nama,
      kelas: kelas
    };
    await db.ref('/peserta/' + id).set(payload);
    showCustomAlert('Berhasil', 'Data siswa berhasil disimpan.', '✅');
    closeSiswaModal();
    loadAdminSiswa();
  } catch (e) {
    showCustomAlert('Gagal', 'Gagal menyimpan: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

window.broadcastKelas = function (examId) {
  const kelasList = window.adminState.peserta ? [...new Set(window.adminState.peserta.map(p => p.kelas))].sort() : [];
  const pilihan = prompt('Kirim pesan ke kelas mana? (kosongkan untuk semua)\nKelas tersedia: ' + kelasList.join(', '));
  if (pilihan === null) return;
  const msg = prompt('Ketik pesan broadcast:');
  if (!msg || !msg.trim()) return;
  sendBroadcastTargeted(examId, msg.trim(), pilihan.trim());
};

async function sendBroadcastTargeted(examId, msg, kelasTarget) {
  showLoading('Menyiarkan...');
  try {
    await gasRun('sendBroadcastAdmin', examId, msg, kelasTarget || 'all');
    showCustomAlert('Berhasil', `Pesan disiarkan ke target: ${kelasTarget || 'Semua Kelas'}`, '📢');
  } catch(e) { showCustomAlert('Gagal', e.message, '❌'); }
  hideLoading();
}

window.forceSelesaiSemua = async function (examId) {
  if (!confirm('Paksa SELESAI semua siswa yang sedang mengerjakan ujian ini?')) return;
  showLoading('Memproses...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const [snapOnline, snapPeserta, snapJadwal] = await Promise.all([
      db.ref(`/online_status/${examId}`).once('value'),
      db.ref('/peserta').once('value'),
      db.ref(`/jadwal/${examId}`).once('value')
    ]);
    const onlines = snapOnline.val() || {};
    const pesertaData = snapPeserta.val() || {};
    const jadwalData = snapJadwal.val() || {};
    const ids = Object.keys(onlines);
    if (ids.length === 0) {
      showCustomAlert('Info', 'Tidak ada siswa yang sedang mengerjakan.', 'ℹ️');
      return;
    }

    const updates = {};
    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    const ujianNama = jadwalData.nama || examId;
    ids.forEach(id => {
      const p = pesertaData[id] || {};
      const namaSiswa = p.nama || id;
      const kelasSiswa = p.kelas || '-';
      const resultPath = `/hasil/${examId}_${id}`;
      updates[resultPath] = {
        userId: id,
        nama: namaSiswa,
        kelas: kelasSiswa,
        examId: examId,
        namaUjian: ujianNama,
        waktu: 'Force Submit',
        skor: 0,
        detail: '{"forced":true}',
        timestamp: timestamp
      };
      updates[`/online_status/${examId}/${id}`] = null;
    });

    await db.ref().update(updates);
    showCustomAlert('Berhasil', `${ids.length} siswa berhasil diselesaikan.`, '✅');
    loadAdminDashboard();
  } catch (e) {
    showCustomAlert('Gagal', e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

window.hapusSemuaHasil = async function () {
  const code = prompt('Ketik "HAPUS" untuk menghapus seluruh Data Hasil & Log Pelanggaran:');
  if (code !== 'HAPUS') return;

  showLoading('Membersihkan Database...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    await db.ref('/hasil').remove();
    await db.ref('/pelanggaran').remove();
    await db.ref('/online_status').remove();
    
    showCustomAlert('Berhasil', 'Database Hasil & Log berhasil dibersihkan.', '✅');
    loadAdminHasil(true);
  } catch (e) {
    showCustomAlert('Gagal', e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

// import/analytics modules moved to admin-import.js and admin-analytics.js

// Auto-refresh for monitoring dashboard
let _adminRefreshInterval = null;
let _adminRefreshActive = false;

// Default lebih longgar untuk mengurangi query monitoring saat ramai
window.startAdminAutoRefresh = function(intervalMs = 30000) {
  if (_adminRefreshInterval) clearInterval(_adminRefreshInterval);
  _adminRefreshActive = true;
  _adminRefreshInterval = setInterval(() => {
    if (_adminRefreshActive && window.adminState) {
      const activeTab = document.querySelector('.admin-sidebar-btn.active');
      const tabId = activeTab ? activeTab.dataset.tab : '';
      const isDashTab = tabId === 'tab-dashboard';
      const isMonTab = tabId === 'tab-monitoring';
      if (isDashTab || isMonTab) {
        _silentRefreshDashboard();
      }
    }
  }, intervalMs);
};

window.stopAdminAutoRefresh = function() {
  _adminRefreshActive = false;
  if (_adminRefreshInterval) {
    clearInterval(_adminRefreshInterval);
    _adminRefreshInterval = null;
  }
};

async function _silentRefreshDashboard() {
  try {
    const skipPeserta = true;
    const res = await gasRun('getAdminMonitoringData', skipPeserta);
    if (res.success) {
      res.peserta = window.adminState.peserta || [];
      const resLap = await gasRun('getAdminLaporanLengkap');
      if (resLap.success) {
        res.hasil = resLap.hasil || [];
        res.pelanggaran = resLap.pelanggaran || [];
        window.adminState.hasil = res.hasil;
        window.adminState.radar = res.pelanggaran;
      }
      
      // Update sync status during auto-refresh
      try {
        const syncSnap = await db.ref('/status_sync').once('value');
        res.syncStatus = syncSnap.val() || {};
      } catch(e) { res.syncStatus = {}; }

      updateAdminSummary(res);
      renderAdminDashboard(res);
      // Update last refresh time
      const lastRefreshEl = document.getElementById('admin-last-refresh');
      if (lastRefreshEl) {
        const now = new Date();
        lastRefreshEl.textContent = `Diperbarui: ${now.toLocaleTimeString('id-ID')}`;
      }
    }
  } catch (e) {
    console.warn('Auto-refresh failed:', e.message);
  }
}

// Start auto-refresh when dashboard loads
const _origLoadAdminDashboard = window.loadAdminDashboard;
window.loadAdminDashboard = async function() {
  await _origLoadAdminDashboard();
  window.startAdminAutoRefresh(30000);
};

// Stop auto-refresh when admin logs out
const _origLogoutAdmin = window.logoutAdmin;
window.logoutAdmin = function() {
  window.stopAdminAutoRefresh();
  if (_origLogoutAdmin) _origLogoutAdmin();
};


// ══════════════════════════════════════════════════════
//  FITUR CETAK NILAI
// ══════════════════════════════════════════════════════

window.showCetakModal = function() {
  const overlay = document.getElementById('cetak-modal-overlay');
  if (!overlay) return;

  // Isi dropdown ujian dari data hasil yang sudah ada
  const selectUjian = document.getElementById('cetak-select-ujian');
  const selectKelas = document.getElementById('cetak-select-kelas');
  if (!selectUjian || !selectKelas) return;

  // Kumpulkan daftar ujian unik dari adminState.hasil
  const hasil = window.adminState.hasil || [];
  const ujianMap = {};
  hasil.forEach(h => {
    if (h.examId && h.ujian) ujianMap[h.examId] = h.ujian;
  });

  // Juga ambil dari monitor jika ada
  const monitor = window.adminState.monitor;
  if (monitor && monitor.activeExams) {
    monitor.activeExams.forEach(ex => { ujianMap[ex.id] = ex.nama || ex.id; });
  }

  selectUjian.innerHTML = '<option value="">-- Pilih Ujian --</option>' +
    Object.entries(ujianMap).map(([id, nama]) =>
      `<option value="${id}">${nama}</option>`
    ).join('');

  // Isi dropdown kelas dari peserta
  const peserta = window.adminState.peserta || [];
  const kelasList = [...new Set(peserta.map(p => p.kelas).filter(Boolean))].sort();
  selectKelas.innerHTML = '<option value="semua">Semua Kelas</option>' +
    kelasList.map(k => `<option value="${k}">${k}</option>`).join('');

  overlay.style.display = 'flex';
};

window.closeCetakModal = function() {
  const overlay = document.getElementById('cetak-modal-overlay');
  if (overlay) overlay.style.display = 'none';
};

window.doCetakNilai = async function() {
  const examId = document.getElementById('cetak-select-ujian')?.value;
  const kelasFilter = document.getElementById('cetak-select-kelas')?.value || 'semua';

  if (!examId) {
    showCustomAlert('Pilih Ujian', 'Silakan pilih ujian terlebih dahulu.', '⚠️');
    return;
  }

  closeCetakModal();
  showLoading('Menyiapkan data cetak...');

  try {
    // 1. Ambil data identitas sekolah
    let schoolName = 'NAMA SEKOLAH';
    let schoolSub = '';
    let schoolLogo = null;
    let kkm = 75;
    try {
      const idenSnap = await db.ref('/config/identity').once('value');
      const iden = idenSnap.val() || {};
      schoolName = iden.name || schoolName;
      schoolSub = iden.sub || '';
      schoolLogo = iden.logo || null;
    } catch(_) {}

    // 2. Ambil data jadwal untuk nama ujian dan KKM
    let namaUjian = examId;
    try {
      const supJ = await fetchSupabase('jadwal_ujian', { id: 'eq.' + examId });
      if (supJ.success && supJ.data.length > 0) {
        namaUjian = supJ.data[0].nama || examId;
        kkm = supJ.data[0].kkm || 75;
      }
    } catch(_) {}

    // 3. Ambil semua peserta
    let allPeserta = window.adminState.peserta || [];
    if (allPeserta.length === 0) {
      const supP = await fetchSupabase('peserta');
      if (supP.success) allPeserta = supP.data.map(p => ({ id: p.id, nama: p.nama, kelas: p.kelas }));
    }

    // 4. Ambil hasil ujian untuk exam ini
    const supH = await fetchSupabase('hasil', { exam_id: 'eq.' + examId });
    const hasilMap = {}; // userId → skor
    if (supH.success) {
      supH.data.forEach(h => { hasilMap[h.user_id] = h.skor ?? 0; });
    }

    // 5. Filter peserta berdasarkan kelas
    let pesertaList = allPeserta;
    if (kelasFilter !== 'semua') {
      pesertaList = allPeserta.filter(p => p.kelas === kelasFilter);
    }

    // Kelompokkan per kelas untuk cetak
    const kelasPeserta = {};
    pesertaList.forEach(p => {
      const kelas = p.kelas || 'Tanpa Kelas';
      if (!kelasPeserta[kelas]) kelasPeserta[kelas] = [];
      kelasPeserta[kelas].push(p);
    });

    // Urutkan peserta per kelas berdasarkan nama
    Object.keys(kelasPeserta).forEach(k => {
      kelasPeserta[k].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    });

    const kelasList = Object.keys(kelasPeserta).sort();
    if (kelasList.length === 0) {
      hideLoading();
      showCustomAlert('Tidak Ada Data', 'Tidak ada peserta untuk dicetak.', 'ℹ️');
      return;
    }

    // 6. Bangun HTML cetak
    const tanggal = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const logoHtml = schoolLogo
      ? `<img src="${schoolLogo}" class="cetak-logo" alt="Logo">`
      : `<div class="cetak-logo-placeholder">LOGO</div>`;

    let pagesHtml = '';

    kelasList.forEach((kelas, pageIdx) => {
      const siswaList = kelasPeserta[kelas];
      let totalIkut = 0, totalLulus = 0, totalRemedial = 0, totalTidakIkut = 0;
      let jumlahNilai = 0;

      const rowsHtml = siswaList.map((p, idx) => {
        const skor = hasilMap[p.id];
        const sudahIkut = skor !== undefined && skor !== null;
        let nilaiHtml, ketHtml, rowClass = '';

        if (!sudahIkut) {
          nilaiHtml = `<span class="nilai-tidak-ikut">-</span>`;
          ketHtml = `<span class="nilai-tidak-ikut">Tidak Ikut</span>`;
          totalTidakIkut++;
        } else {
          totalIkut++;
          jumlahNilai += skor;
          if (skor >= kkm) {
            nilaiHtml = `<span class="nilai-lulus">${skor}</span>`;
            ketHtml = `<span class="nilai-lulus">Lulus</span>`;
            totalLulus++;
          } else {
            nilaiHtml = `<span class="nilai-remedial">${skor}</span>`;
            ketHtml = `<span class="nilai-remedial">Remedial</span>`;
            totalRemedial++;
          }
        }

        return `<tr>
          <td class="td-no">${idx + 1}</td>
          <td class="td-nis">${p.id || '-'}</td>
          <td>${p.nama || '-'}</td>
          <td class="td-nilai">${nilaiHtml}</td>
          <td class="td-ket">${ketHtml}</td>
        </tr>`;
      }).join('');

      const rataRata = totalIkut > 0 ? (jumlahNilai / totalIkut).toFixed(1) : '-';
      const pctLulus = totalIkut > 0 ? Math.round((totalLulus / totalIkut) * 100) : 0;

      pagesHtml += `
        <div class="cetak-page">
          <div class="cetak-header">
            ${logoHtml}
            <div class="cetak-school-info">
              <div class="cetak-school-name">${schoolName}</div>
              ${schoolSub ? `<div class="cetak-school-sub">${schoolSub}</div>` : ''}
            </div>
          </div>

          <div class="cetak-doc-title">
            <h2>Daftar Nilai Ujian</h2>
          </div>

          <div class="cetak-meta">
            <div class="cetak-meta-item">
              <span class="cetak-meta-label">Mata Ujian</span>
              <span>${namaUjian}</span>
            </div>
            <div class="cetak-meta-item">
              <span class="cetak-meta-label">Kelas</span>
              <span>${kelas}</span>
            </div>
            <div class="cetak-meta-item">
              <span class="cetak-meta-label">KKM</span>
              <span>${kkm}</span>
            </div>
            <div class="cetak-meta-item">
              <span class="cetak-meta-label">Tanggal</span>
              <span>${tanggal}</span>
            </div>
          </div>

          <table class="cetak-table">
            <thead>
              <tr>
                <th class="td-no">No</th>
                <th class="td-nis">NIS</th>
                <th>Nama Siswa</th>
                <th class="td-nilai">Nilai</th>
                <th class="td-ket">Keterangan</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="cetak-summary">
            <div class="cetak-summary-item"><span class="cetak-summary-label">Peserta:</span><span>${siswaList.length} siswa</span></div>
            <div class="cetak-summary-item"><span class="cetak-summary-label">Ikut Ujian:</span><span>${totalIkut}</span></div>
            <div class="cetak-summary-item"><span class="cetak-summary-label">Tidak Ikut:</span><span>${totalTidakIkut}</span></div>
            <div class="cetak-summary-item"><span class="cetak-summary-label">Lulus:</span><span>${totalLulus} (${pctLulus}%)</span></div>
            <div class="cetak-summary-item"><span class="cetak-summary-label">Remedial:</span><span>${totalRemedial}</span></div>
            <div class="cetak-summary-item"><span class="cetak-summary-label">Rata-rata:</span><span>${rataRata}</span></div>
          </div>

          <div class="cetak-footer">
            <div class="cetak-ttd">
              <div class="cetak-ttd-label">${schoolName}, ${tanggal}</div>
              <div class="cetak-ttd-label">Guru / Pengawas</div>
              <div class="cetak-ttd-space"></div>
              <div class="cetak-ttd-name">( _________________________ )</div>
            </div>
          </div>
        </div>`;
    });

    // 7. Buka window baru untuk cetak (lebih reliable dari @media print)
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      hideLoading();
      showCustomAlert('Popup Diblokir', 'Izinkan popup di browser Anda, lalu coba lagi.', '⚠️');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nilai ${namaUjian} - ${kelasFilter === 'semua' ? 'Semua Kelas' : kelasFilter}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; padding: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { size: A4 portrait; margin: 15mm 15mm 15mm 20mm; }
    }
    .print-btn-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #1e293b; color: #fff;
      padding: 10px 20px;
      display: flex; align-items: center; justify-content: space-between;
      z-index: 999; gap: 10px;
    }
    .print-btn-bar span { font-family: sans-serif; font-size: 14px; font-weight: 600; }
    .print-btn {
      padding: 8px 20px; border-radius: 8px; border: none; cursor: pointer;
      font-weight: 700; font-size: 14px; font-family: sans-serif;
    }
    .btn-print { background: #6366f1; color: #fff; }
    .btn-close { background: #475569; color: #fff; }
    .content-wrap { margin-top: 52px; }
    .cetak-page { page-break-after: always; padding: 0 0 30px 0; }
    .cetak-page:last-child { page-break-after: avoid; padding-bottom: 0; }
    .cetak-header { display: flex; align-items: center; gap: 16px; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 14px; }
    .cetak-logo { width: 72px; height: 72px; object-fit: contain; flex-shrink: 0; }
    .cetak-logo-placeholder { width: 72px; height: 72px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; flex-shrink: 0; }
    .cetak-school-info { flex: 1; text-align: center; }
    .cetak-school-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; }
    .cetak-school-sub { font-size: 10pt; margin-top: 2px; }
    .cetak-doc-title { text-align: center; margin: 12px 0 4px; }
    .cetak-doc-title h2 { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0; text-decoration: underline; }
    .cetak-meta { display: flex; gap: 30px; margin: 10px 0 14px; font-size: 10pt; flex-wrap: wrap; }
    .cetak-meta-item { display: flex; gap: 6px; }
    .cetak-meta-label { font-weight: bold; min-width: 80px; }
    .cetak-meta-label::after { content: ':'; }
    .cetak-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .cetak-table th { background: #1e293b; color: #fff; padding: 7px 10px; text-align: center; font-weight: bold; border: 1px solid #000; }
    .cetak-table td { padding: 6px 10px; border: 1px solid #555; vertical-align: middle; }
    .cetak-table tr:nth-child(even) td { background: #f8f8f8; }
    .td-no { text-align: center; width: 36px; }
    .td-nis { text-align: center; width: 100px; }
    .td-nilai { text-align: center; width: 60px; font-weight: bold; }
    .td-ket { text-align: center; width: 110px; font-size: 9pt; }
    .nilai-lulus { color: #166534; }
    .nilai-remedial { color: #92400e; }
    .nilai-tidak-ikut { color: #64748b; font-style: italic; }
    .cetak-footer { margin-top: 24px; display: flex; justify-content: flex-end; }
    .cetak-ttd { text-align: center; min-width: 200px; }
    .cetak-ttd-label { font-size: 10pt; margin-bottom: 4px; }
    .cetak-ttd-space { height: 56px; }
    .cetak-ttd-name { font-size: 10pt; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
    .cetak-summary { margin-top: 14px; padding: 8px 14px; border: 1px solid #ccc; font-size: 9.5pt; display: flex; gap: 24px; flex-wrap: wrap; }
    .cetak-summary-label { font-weight: bold; }
    hr.page-sep { border: none; border-top: 2px dashed #ccc; margin: 24px 0; }
    hr.page-sep:last-child { display: none; }
  </style>
</head>
<body>
  <div class="print-btn-bar no-print">
    <span>🖨️ Nilai ${namaUjian} — ${kelasFilter === 'semua' ? 'Semua Kelas' : kelasFilter}</span>
    <div style="display:flex;gap:8px;">
      <button class="print-btn btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      <button class="print-btn btn-close" onclick="window.close()">✕ Tutup</button>
    </div>
  </div>
  <div class="content-wrap">
    ${pagesHtml}
  </div>
</body>
</html>`);

    printWindow.document.close();
    hideLoading();

  } catch(e) {
    hideLoading();
    showCustomAlert('Gagal', 'Gagal menyiapkan data cetak: ' + e.message, '❌');
  }
};
