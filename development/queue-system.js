// =====================================================
// Queue System - Sistem Antrian Terpusat
// Loaded by index.html untuk kontrol akses bertahap
// =====================================================

(function() {
  'use strict';

  // Konfigurasi Queue
  const QUEUE_CONFIG = {
    enabled: true, // Set false untuk disable queue
    maxConcurrent: 10, // Max 10 siswa sync bersamaan
    queueInterval: 5000, // Check queue setiap 5 detik
    ticketExpiry: 300000, // Tiket expired 5 menit
    storageKey: 'CBT_QUEUE_TICKET',
    serverQueuePath: '/queue_status' // Path di Supabase untuk queue terpusat
  };

  // State Queue
  const QueueState = {
    ticket: null,
    position: null,
    checkInterval: null,
    isWaiting: false
  };

  // ═══════════════════════════════════════════════════════
  // QUEUE UI
  // ═══════════════════════════════════════════════════════

  function showQueueScreen(position, estimatedWait) {
    // Cek apakah sudah ada queue screen
    let queueScreen = document.getElementById('queue-screen');
    
    if (!queueScreen) {
      queueScreen = document.createElement('div');
      queueScreen.id = 'queue-screen';
      queueScreen.innerHTML = `
        <div class="queue-overlay">
          <div class="queue-card">
            <div class="queue-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="queue-title">Sedang Memuat</h2>
            <p class="queue-subtitle">Banyak siswa membuka aplikasi bersamaan. Mohon tunggu sebentar.</p>
            
            <div class="queue-ticket">
              <div class="ticket-label">Nomor Antrian Anda</div>
              <div class="ticket-number" id="queue-position">${position}</div>
            </div>
            
            <div class="queue-info">
              <div class="info-row">
                <span class="info-label">Estimasi Waktu:</span>
                <span class="info-value" id="queue-estimate">${estimatedWait}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value" id="queue-status">Menunggu...</span>
              </div>
            </div>
            
            <div class="queue-progress">
              <div class="progress-bar">
                <div class="progress-fill" id="queue-progress-fill"></div>
              </div>
              <p class="progress-text" id="queue-progress-text">Memproses antrian...</p>
            </div>
            
            <div class="queue-tips">
              <p><strong>Tips:</strong></p>
              <ul>
                <li>Jangan tutup atau refresh halaman ini</li>
                <li>Pastikan koneksi internet stabil</li>
                <li>Sistem akan otomatis melanjutkan saat giliran Anda</li>
              </ul>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(queueScreen);
      
      // Add styles
      addQueueStyles();
    }
    
    // Update position
    document.getElementById('queue-position').textContent = position;
    document.getElementById('queue-estimate').textContent = estimatedWait;
    
    queueScreen.style.display = 'flex';
    QueueState.isWaiting = true;
  }

  function hideQueueScreen() {
    const queueScreen = document.getElementById('queue-screen');
    if (queueScreen) {
      queueScreen.style.display = 'none';
    }
    QueueState.isWaiting = false;
  }

  function updateQueueProgress(position, total, status) {
    const positionEl = document.getElementById('queue-position');
    const statusEl = document.getElementById('queue-status');
    const progressFill = document.getElementById('queue-progress-fill');
    const progressText = document.getElementById('queue-progress-text');
    const estimateEl = document.getElementById('queue-estimate');
    
    if (positionEl) positionEl.textContent = position;
    if (statusEl) statusEl.textContent = status;
    
    // Calculate progress
    const progress = total > 0 ? ((total - position) / total) * 100 : 0;
    if (progressFill) progressFill.style.width = progress + '%';
    
    // Update estimate
    const estimatedSeconds = position * 5; // 5 detik per siswa
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);
    if (estimateEl) {
      estimateEl.textContent = estimatedMinutes > 0 
        ? `~${estimatedMinutes} menit` 
        : 'Sebentar lagi...';
    }
    
    if (progressText) {
      progressText.textContent = position > 0 
        ? `${position} siswa di depan Anda` 
        : 'Giliran Anda! Memproses...';
    }
  }

  function addQueueStyles() {
    if (document.getElementById('queue-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'queue-styles';
    style.textContent = `
      .queue-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }
      
      .queue-card {
        background: white;
        border-radius: 24px;
        padding: 40px 32px;
        max-width: 480px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: queue-slide-up 0.4s ease;
      }
      
      @keyframes queue-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .queue-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: queue-pulse 2s ease-in-out infinite;
      }
      
      .queue-icon svg {
        color: white;
        animation: queue-rotate 3s linear infinite;
      }
      
      @keyframes queue-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4); }
        50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(102, 126, 234, 0); }
      }
      
      @keyframes queue-rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .queue-title {
        font-size: 1.5rem;
        font-weight: 800;
        text-align: center;
        color: #0F172A;
        margin: 0 0 8px;
      }
      
      .queue-subtitle {
        font-size: 0.875rem;
        color: #64748B;
        text-align: center;
        margin: 0 0 32px;
        line-height: 1.5;
      }
      
      .queue-ticket {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        margin-bottom: 24px;
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      }
      
      .ticket-label {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 8px;
      }
      
      .ticket-number {
        font-size: 3rem;
        font-weight: 900;
        color: white;
        font-family: 'JetBrains Mono', monospace;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      }
      
      .queue-info {
        background: #F8FAFC;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 24px;
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
      }
      
      .info-row:not(:last-child) {
        border-bottom: 1px solid #E2E8F0;
      }
      
      .info-label {
        font-size: 0.875rem;
        color: #64748B;
        font-weight: 500;
      }
      
      .info-value {
        font-size: 0.875rem;
        color: #0F172A;
        font-weight: 700;
      }
      
      .queue-progress {
        margin-bottom: 24px;
      }
      
      .progress-bar {
        height: 8px;
        background: #E2E8F0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 12px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 4px;
        transition: width 0.5s ease;
        width: 0%;
      }
      
      .progress-text {
        font-size: 0.875rem;
        color: #64748B;
        text-align: center;
        margin: 0;
      }
      
      .queue-tips {
        background: #FEF3C7;
        border: 1px solid #FDE68A;
        border-radius: 12px;
        padding: 16px;
      }
      
      .queue-tips p {
        font-size: 0.875rem;
        font-weight: 700;
        color: #92400E;
        margin: 0 0 8px;
      }
      
      .queue-tips ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .queue-tips li {
        font-size: 0.8rem;
        color: #92400E;
        line-height: 1.6;
        margin-bottom: 4px;
      }
      
      @media (max-width: 640px) {
        .queue-card {
          padding: 32px 24px;
        }
        
        .ticket-number {
          font-size: 2.5rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════
  // QUEUE LOGIC
  // ═══════════════════════════════════════════════════════

  async function requestQueueTicket() {
    try {
      // Generate unique ticket ID
      const ticketId = 'ticket_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Request ticket dari server (via Edge Function atau Supabase)
      const ticket = {
        id: ticketId,
        timestamp: Date.now(),
        userId: window.State?.user?.id || 'anonymous',
        status: 'waiting'
      };
      
      // Simpan ke localStorage
      localStorage.setItem(QUEUE_CONFIG.storageKey, JSON.stringify(ticket));
      
      // Simpan ke server (untuk koordinasi terpusat)
      if (typeof window.gasRun === 'function') {
        await window.gasRun('requestQueueTicket', ticket);
      }
      
      QueueState.ticket = ticket;
      return ticket;
    } catch (e) {
      console.error('[Queue] Failed to request ticket:', e);
      return null;
    }
  }

  async function checkQueuePosition() {
    if (!QueueState.ticket) return null;
    
    try {
      // Check position dari server
      let position = null;
      let queueLength = 0;
      
      if (typeof window.gasRun === 'function') {
        const result = await window.gasRun('checkQueuePosition', QueueState.ticket.id);
        if (result && result.success) {
          position = result.position;
          queueLength = result.queueLength || 0;
          
          // Update UI
          if (position > 0) {
            updateQueueProgress(position, result.total || position, 'Menunggu...');
          } else {
            updateQueueProgress(0, 1, 'Giliran Anda!');
          }
          
          return { position, queueLength };
        }
      }
      
      // Fallback: Client-side estimation (jika server tidak support)
      const elapsed = Date.now() - QueueState.ticket.timestamp;
      const estimatedPosition = Math.max(0, Math.floor((QUEUE_CONFIG.ticketExpiry - elapsed) / 5000));
      
      updateQueueProgress(estimatedPosition, 100, 'Menunggu...');
      return { position: estimatedPosition, queueLength: estimatedPosition };
      
    } catch (e) {
      console.error('[Queue] Failed to check position:', e);
      return null;
    }
  }

  async function waitInQueue() {
    if (!QUEUE_CONFIG.enabled) return true;
    
    console.log('[Queue] Entering queue system...');
    
    // Check existing ticket
    const savedTicket = localStorage.getItem(QUEUE_CONFIG.storageKey);
    if (savedTicket) {
      try {
        const ticket = JSON.parse(savedTicket);
        // Check if ticket still valid (not expired)
        if (Date.now() - ticket.timestamp < QUEUE_CONFIG.ticketExpiry) {
          QueueState.ticket = ticket;
          console.log('[Queue] Using existing ticket:', ticket.id);
        }
      } catch (e) {
        localStorage.removeItem(QUEUE_CONFIG.storageKey);
      }
    }
    
    // Request new ticket if needed
    if (!QueueState.ticket) {
      QueueState.ticket = await requestQueueTicket();
      if (!QueueState.ticket) {
        console.warn('[Queue] Failed to get ticket, proceeding without queue');
        return true;
      }
    }
    
    // OPTIMIZATION: Check position immediately
    const initialCheck = await checkQueuePosition();
    
    if (initialCheck === null) {
      // Error checking, proceed without queue
      console.warn('[Queue] Failed initial check, proceeding without queue');
      localStorage.removeItem(QUEUE_CONFIG.storageKey);
      return true;
    }
    
    // FAST PATH: Jika tidak ada antrian atau posisi 0, langsung proceed
    if (initialCheck.position === 0 || initialCheck.queueLength === 0) {
      console.log('[Queue] No queue detected, proceeding immediately');
      localStorage.removeItem(QUEUE_CONFIG.storageKey);
      return true;
    }
    
    // Ada antrian, show queue screen
    console.log(`[Queue] Queue detected. Position: ${initialCheck.position}, Length: ${initialCheck.queueLength}`);
    showQueueScreen(initialCheck.position, '~5 menit');
    
    // Start checking position
    return new Promise((resolve) => {
      QueueState.checkInterval = setInterval(async () => {
        const result = await checkQueuePosition();
        
        if (result === null) {
          // Error checking position, proceed anyway
          clearInterval(QueueState.checkInterval);
          hideQueueScreen();
          localStorage.removeItem(QUEUE_CONFIG.storageKey);
          resolve(true);
          return;
        }
        
        if (result.position === 0) {
          // Giliran kita!
          console.log('[Queue] Your turn! Proceeding...');
          clearInterval(QueueState.checkInterval);
          
          // Delay 1 detik untuk animasi
          setTimeout(() => {
            hideQueueScreen();
            localStorage.removeItem(QUEUE_CONFIG.storageKey);
            resolve(true);
          }, 1000);
        }
      }, QUEUE_CONFIG.queueInterval);
    });
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════

  window.QueueSystem = {
    enabled: QUEUE_CONFIG.enabled,
    
    // Enable/disable queue
    setEnabled: (enabled) => {
      QUEUE_CONFIG.enabled = enabled;
      console.log('[Queue] System', enabled ? 'enabled' : 'disabled');
    },
    
    // Wait in queue before sync
    waitInQueue: waitInQueue,
    
    // Release slot after sync selesai (dipanggil dari mobile-core.js)
    releaseSlot: () => {
      if (QueueState.ticket) {
        localStorage.removeItem(QUEUE_CONFIG.storageKey);
        QueueState.ticket = null;
        QueueState.position = null;
        QueueState.isWaiting = false;
        console.log('[Queue] Slot released');
      }
    },
    
    // Check if currently waiting
    isWaiting: () => QueueState.isWaiting,
    
    // Clear queue (admin only)
    clearQueue: () => {
      if (QueueState.checkInterval) {
        clearInterval(QueueState.checkInterval);
      }
      hideQueueScreen();
      localStorage.removeItem(QUEUE_CONFIG.storageKey);
      QueueState.ticket = null;
      QueueState.position = null;
      console.log('[Queue] Queue cleared');
    }
  };

  console.log('[Queue] System initialized. Enabled:', QUEUE_CONFIG.enabled);

})();
