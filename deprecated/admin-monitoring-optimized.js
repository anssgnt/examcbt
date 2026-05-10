// ============================================
// ADMIN MONITORING OPTIMIZATION
// Pagination support for monitoring admin
// ============================================

/**
 * Initialize pagination state for admin monitoring
 */
window.adminMonitoringState = {
  currentPage: 0,
  pageSize: 50,
  totalPages: 1,
  currentKelas: 'all',
  currentStatus: 'all',
  searchQuery: ''
};

/**
 * Load admin monitoring data with pagination
 * 
 * @param {number} page - Page number (0-indexed)
 * @param {string} kelas - Filter by kelas
 */
window.loadAdminMonitoringPage = async function(page = 0, kelas = null) {
  showLoading('Memuat data monitoring...');
  
  try {
    // Update state
    window.adminMonitoringState.currentPage = page;
    if (kelas) window.adminMonitoringState.currentKelas = kelas;
    
    // Fetch optimized data with pagination
    const res = await gasRun('getAdminMonitoringDataOptimized', true, page, kelas);
    
    if (res.success) {
      // Calculate total pages
      const totalStudents = Object.keys(window.adminState.peserta || {}).length;
      window.adminMonitoringState.totalPages = Math.ceil(totalStudents / window.adminMonitoringState.pageSize);
      
      // Store in admin state
      window.adminState.monitor = res;
      window.adminState.monitorPage = window.adminState.monitorPage || {};
      
      // Render the monitoring dashboard
      renderAdminDashboardOptimized(res);
      
      // Update pagination controls
      updateMonitoringPaginationControls(page, window.adminMonitoringState.totalPages);
    } else {
      showCustomAlert('Gagal', 'Gagal memuat data monitoring: ' + res.message, '❌');
    }
  } catch (e) {
    console.error('[loadAdminMonitoringPage] Error:', e);
    showCustomAlert('Error', 'Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
};

/**
 * Render admin dashboard with optimized data
 * 
 * @param {object} data - Monitoring data
 */
window.renderAdminDashboardOptimized = function(data = window.adminState.monitor) {
  if (!data) return;
  
  window.adminState.monitor = data;
  
  // 1. Render Token List
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
  
  // 2. Render Monitoring List with Pagination
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
      
      return { nama: p.nama, kelas: p.kelas, status: d, badgeClass, progressPct, actionBtn, stat: d, id: p.id };
    });

    // Apply Filters
    const query = (document.getElementById('mon-search')?.value || '').toLowerCase();
    const fKelas = document.getElementById('mon-filter-kelas')?.value || 'all';
    const fStatus = document.getElementById('mon-filter-status')?.value || 'all';

    const filterRows = rRaw.filter(x => {
      if (absenMode && x.stat !== 'BELUM') return false;
      if (query && !x.nama.toLowerCase().includes(query)) return false;
      if (fKelas !== 'all' && x.kelas !== fKelas) return false;
      if (fStatus !== 'all' && x.stat !== fStatus) return false;
      return true;
    });

    const page = window.adminMonitoringState.currentPage || 0;
    const perPage = window.adminMonitoringState.pageSize;
    const slicedRows = filterRows.slice((page) * perPage, (page + 1) * perPage);
    const totalP = data.peserta.length;
    const pctSelesai = totalP > 0 ? Math.round((selesai / totalP) * 100) : 0;
    const pctAktif = totalP > 0 ? Math.round((mengerjakan / totalP) * 100) : 0;

    const rowsHtml = slicedRows.map(r => `
      <div class="monitor-row">
        <div class="monitor-name" title="${r.nama}">
          <span class="monitor-avatar">${r.nama.charAt(0).toUpperCase()}</span>
          <span class="monitor-name-text">${r.nama}</span>
        </div>
        <div class="monitor-kelas">${r.kelas}</div>
        <div class="monitor-status-col">
          <span class="monitor-badge ${r.badgeClass}">${r.status}</span>
          ${r.progressPct > 0 ? `<div class="monitor-progress-bar"><div class="monitor-progress-fill" style="width:${r.progressPct}%"></div></div><span class="monitor-progress-text">${r.progressPct}%</span>` : ''}
        </div>
        <div class="monitor-action">${r.actionBtn}</div>
      </div>
    `).join('');

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

  // Render pagination controls for each exam
  data.activeExams.forEach(ex => {
    const totalStudents = data.peserta.length;
    const totalPages = Math.ceil(totalStudents / window.adminMonitoringState.pageSize);
    renderPaginationControls(
      `admin-monitor-pg-${ex.id}`,
      totalStudents,
      window.adminMonitoringState.pageSize,
      window.adminMonitoringState.currentPage,
      'changeMonitorPageOptimized',
      ex.id
    );
  });
};

/**
 * Change monitoring page with optimization
 * 
 * @param {number} page - Page number
 * @param {string} examId - Exam ID
 */
window.changeMonitorPageOptimized = function(page, examId) {
  window.adminMonitoringState.currentPage = page;
  loadAdminMonitoringPage(page);
};

/**
 * Update pagination controls UI
 * 
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 */
function updateMonitoringPaginationControls(currentPage, totalPages) {
  const container = document.getElementById('admin-monitoring-pagination');
  if (!container) return;
  
  let html = `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;padding:12px;background:#F8FAFC;border-radius:8px;">
      <button class="page-btn" onclick="loadAdminMonitoringPage(${Math.max(0, currentPage - 1)})" ${currentPage === 0 ? 'disabled' : ''}>← Sebelumnya</button>
      <span style="color:#64748B;font-size:0.9rem;">Halaman ${currentPage + 1} dari ${totalPages}</span>
      <button class="page-btn" onclick="loadAdminMonitoringPage(${Math.min(totalPages - 1, currentPage + 1)})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Selanjutnya →</button>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Render pagination controls (generic function)
 * 
 * @param {string} containerId - Container element ID
 * @param {number} total - Total items
 * @param {number} perPage - Items per page
 * @param {number} current - Current page
 * @param {string} callbackName - Callback function name
 * @param {string} idParam - Optional ID parameter
 */
function renderPaginationControls(containerId, total, perPage, current, callbackName, idParam) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  
  let html = `<button class="page-btn" onclick="${callbackName}(${current - 1}${idParam ? ',\'' + idParam + '\'' : ''})" ${current === 0 ? 'disabled' : ''}>&laquo;</button>`;
  
  let start = Math.max(0, current - 2);
  let end = Math.min(totalPages, current + 3);
  
  if (start > 0) html += `<button class="page-btn" onclick="${callbackName}(0${idParam ? ',\'' + idParam + '\'' : ''})">1</button>${start > 1 ? '<span style="color:var(--text-muted)">...</span>' : ''}`;
  
  for (let i = start; i < end; i++) {
    html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${callbackName}(${i}${idParam ? ',\'' + idParam + '\'' : ''})">${i + 1}</button>`;
  }
  
  if (end < totalPages) html += `${end < totalPages - 1 ? '<span style="color:var(--text-muted)">...</span>' : ''}<button class="page-btn" onclick="${callbackName}(${totalPages - 1}${idParam ? ',\'' + idParam + '\'' : ''})">${totalPages}</button>`;
  
  html += `<button class="page-btn" onclick="${callbackName}(${current + 1}${idParam ? ',\'' + idParam + '\'' : ''})" ${current >= totalPages - 1 ? 'disabled' : ''}>&raquo;</button>`;
  
  container.innerHTML = html;
}

// Export functions
window.renderPaginationControls = renderPaginationControls;
window.updateMonitoringPaginationControls = updateMonitoringPaginationControls;
