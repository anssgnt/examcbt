/**
 * ============================================
 * ADMIN MONITORING WITH VIRTUAL SCROLLING
 * Integration of VirtualScroller with admin monitoring
 * ============================================
 */

// Virtual scroller instances for each exam
window.virtualScrollers = {};

/**
 * Initialize virtual scroller for monitoring
 * 
 * @param {string} examId - Exam ID
 * @param {Array} items - Items to render
 * @param {string} containerId - Container element ID
 */
window.initVirtualScrollerForExam = function(examId, items, containerId) {
  try {
    // Destroy existing scroller if any
    if (window.virtualScrollers[examId]) {
      window.virtualScrollers[examId].destroy();
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[Virtual Scroll] Container ${containerId} not found`);
      return;
    }

    // Create virtual scroller
    const scroller = new VirtualScroller(
      container,
      items,
      60, // Row height in pixels
      {
        bufferSize: 5,
        overscan: 3,
        enableDebug: false,
        renderRow: (item, index) => renderMonitorRow(item, index, examId),
        onScroll: (scrollData) => {
          // Optional: Update scroll position indicator
          updateScrollIndicator(examId, scrollData);
        }
      }
    );

    window.virtualScrollers[examId] = scroller;
    console.log(`[Virtual Scroll] Initialized for exam ${examId} with ${items.length} items`);
    
    return scroller;
  } catch (error) {
    console.error('[Virtual Scroll] Initialization error:', error);
    return null;
  }
};

/**
 * Render a single monitoring row
 * 
 * @param {Object} item - Row data
 * @param {number} index - Row index
 * @param {string} examId - Exam ID
 * @returns {string} HTML string
 */
function renderMonitorRow(item, index, examId) {
  try {
    const { nama, kelas, status, badgeClass, progressPct, actionBtn, id } = item;
    
    const progressBar = progressPct > 0 
      ? `<div class="monitor-progress-bar"><div class="monitor-progress-fill" style="width:${progressPct}%"></div></div><span class="monitor-progress-text">${progressPct}%</span>`
      : '';

    return `
      <div class="monitor-row" data-student-id="${id}" data-exam-id="${examId}">
        <div class="monitor-name" title="${nama}">
          <span class="monitor-avatar">${nama.charAt(0).toUpperCase()}</span>
          <span class="monitor-name-text">${nama}</span>
        </div>
        <div class="monitor-kelas">${kelas}</div>
        <div class="monitor-status-col">
          <span class="monitor-badge ${badgeClass}">${status}</span>
          ${progressBar}
        </div>
        <div class="monitor-action">${actionBtn}</div>
      </div>
    `;
  } catch (error) {
    console.error('[Virtual Scroll] Row render error:', error);
    return `<div class="monitor-row" style="color: #DC2626;">Error rendering row</div>`;
  }
}

/**
 * Update scroll indicator
 * 
 * @param {string} examId - Exam ID
 * @param {Object} scrollData - Scroll data
 */
function updateScrollIndicator(examId, scrollData) {
  const indicator = document.getElementById(`scroll-indicator-${examId}`);
  if (!indicator) return;

  const { visibleStart, visibleEnd, itemsCount } = scrollData;
  indicator.textContent = `Showing ${visibleStart + 1}-${Math.min(visibleEnd, itemsCount)} of ${itemsCount}`;
}

/**
 * Render admin dashboard with virtual scrolling
 * 
 * @param {Object} data - Monitoring data
 */
window.renderAdminDashboardWithVirtualScroll = function(data = window.adminState.monitor) {
  if (!data) return;

  window.adminState.monitor = data;

  // 1. Render Token List (unchanged)
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

  // 2. Render Monitoring List with Virtual Scrolling
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

    // Prepare rows data
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

      return { 
        nama: p.nama, 
        kelas: p.kelas, 
        status: d, 
        badgeClass, 
        progressPct, 
        actionBtn, 
        stat: d, 
        id: p.id 
      };
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

    const totalP = data.peserta.length;
    const pctSelesai = totalP > 0 ? Math.round((selesai / totalP) * 100) : 0;
    const pctAktif = totalP > 0 ? Math.round((mengerjakan / totalP) * 100) : 0;
    const containerId = `exam-table-${ex.id}`;

    // Create exam card with virtual scroller container
    const examCard = `
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
          <div id="${containerId}" class="exam-table-body" style="height: 400px; position: relative; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;"></div>
          <div id="scroll-indicator-${ex.id}" style="padding: 8px; font-size: 0.75rem; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB;">Showing 0-0 of ${filterRows.length}</div>
        </div>
      </div>
    `;

    return examCard;
  }).join('');

  // Initialize virtual scrollers for each exam
  setTimeout(() => {
    data.activeExams.forEach(ex => {
      const containerId = `exam-table-${ex.id}`;
      const container = document.getElementById(containerId);
      
      if (container) {
        // Prepare filtered items
        const completedSet = new Set(data.completions[ex.id] || []);
        const query = (document.getElementById('mon-search')?.value || '').toLowerCase();
        const fKelas = document.getElementById('mon-filter-kelas')?.value || 'all';
        const fStatus = document.getElementById('mon-filter-status')?.value || 'all';
        const absenMode = document.getElementById('chkAbsenMode')?.checked || false;

        const items = data.peserta
          .map(p => {
            let d = 'BELUM';
            let badgeClass = 'status-belum';
            let actionBtn = '';
            let progressPct = 0;
            const onData = (data.onlines && data.onlines[ex.id]) ? data.onlines[ex.id][p.id] : null;
            const isOnline = !!onData;
            const namaEsc = p.nama.replace(/'/g, "\\'");

            if (completedSet.has(p.id)) {
              d = 'SELESAI'; badgeClass = 'status-selesai';
              actionBtn = `<button class="remedial-btn" onclick="remedialSiswa('${p.id}','${ex.id}','${namaEsc}')" title="Remedial">📝</button>`;
            } else if (isOnline) {
              d = 'MENGERJAKAN'; badgeClass = 'status-online';
              actionBtn = `<button class="reset-btn" onclick="resetSiswaLogin('${p.id}','${ex.id}','${namaEsc}')" title="Reset Sesi">🔄</button>`;
              if (onData.progress !== undefined && onData.total !== undefined && onData.total > 0) {
                progressPct = Math.round((onData.progress / onData.total) * 100);
              }
            }

            return { 
              nama: p.nama, 
              kelas: p.kelas, 
              status: d, 
              badgeClass, 
              progressPct, 
              actionBtn, 
              stat: d, 
              id: p.id 
            };
          })
          .filter(x => {
            if (absenMode && x.stat !== 'BELUM') return false;
            if (query && !x.nama.toLowerCase().includes(query)) return false;
            if (fKelas !== 'all' && x.kelas !== fKelas) return false;
            if (fStatus !== 'all' && x.stat !== fStatus) return false;
            return true;
          });

        // Initialize virtual scroller
        initVirtualScrollerForExam(ex.id, items, containerId);
      }
    });
  }, 100);
};

/**
 * Update monitoring with virtual scrolling
 * 
 * @param {number} page - Page number (for compatibility)
 * @param {string} kelas - Filter by kelas
 */
window.loadAdminMonitoringPageWithVirtualScroll = async function(page = 0, kelas = null) {
  showLoading('Memuat data monitoring...');

  try {
    // Update state
    window.adminMonitoringState = window.adminMonitoringState || {};
    window.adminMonitoringState.currentPage = page;
    if (kelas) window.adminMonitoringState.currentKelas = kelas;

    // Fetch optimized data
    const res = await gasRun('getAdminMonitoringDataOptimized', true, page, kelas);

    if (res.success) {
      window.adminState.monitor = res;
      renderAdminDashboardWithVirtualScroll(res);
    } else {
      showCustomAlert('Gagal', 'Gagal memuat data monitoring: ' + res.message, '❌');
    }
  } catch (e) {
    console.error('[loadAdminMonitoringPageWithVirtualScroll] Error:', e);
    showCustomAlert('Error', 'Error: ' + e.message, '❌');
  } finally {
    hideLoading();
  }
};

/**
 * Handle search/filter changes with virtual scrolling
 */
window.handleMonitoringFilterChange = function() {
  // Get all active virtual scrollers
  Object.keys(window.virtualScrollers).forEach(examId => {
    const scroller = window.virtualScrollers[examId];
    if (!scroller) return;

    // Get current filter values
    const query = (document.getElementById('mon-search')?.value || '').toLowerCase();
    const fKelas = document.getElementById('mon-filter-kelas')?.value || 'all';
    const fStatus = document.getElementById('mon-filter-status')?.value || 'all';
    const absenMode = document.getElementById('chkAbsenMode')?.checked || false;

    // Apply filter
    scroller.filter(item => {
      if (absenMode && item.stat !== 'BELUM') return false;
      if (query && !item.nama.toLowerCase().includes(query)) return false;
      if (fKelas !== 'all' && item.kelas !== fKelas) return false;
      if (fStatus !== 'all' && item.stat !== fStatus) return false;
      return true;
    });
  });
};

/**
 * Get virtual scroller metrics for all exams
 * 
 * @returns {Object} Metrics for all scrollers
 */
window.getVirtualScrollerMetrics = function() {
  const metrics = {};
  
  Object.keys(window.virtualScrollers).forEach(examId => {
    const scroller = window.virtualScrollers[examId];
    if (scroller) {
      metrics[examId] = scroller.getMetrics();
    }
  });

  return metrics;
};

/**
 * Cleanup virtual scrollers
 */
window.cleanupVirtualScrollers = function() {
  Object.keys(window.virtualScrollers).forEach(examId => {
    const scroller = window.virtualScrollers[examId];
    if (scroller) {
      scroller.destroy();
    }
  });
  window.virtualScrollers = {};
};

// Export functions
window.renderAdminDashboardWithVirtualScroll = renderAdminDashboardWithVirtualScroll;
window.loadAdminMonitoringPageWithVirtualScroll = loadAdminMonitoringPageWithVirtualScroll;
window.handleMonitoringFilterChange = handleMonitoringFilterChange;
window.getVirtualScrollerMetrics = getVirtualScrollerMetrics;
window.cleanupVirtualScrollers = cleanupVirtualScrollers;
