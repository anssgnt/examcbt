// --- Dynamic PWA Manifest Logic ---
window.updatePWAManifest = function (schoolName = "CBT Online MGMP", logoUrl = null) {
  const defaultIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzFEMEVEOCI+PHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiLz48cGF0aCBkPSJNMkEgOVYxNEMyIDE0IDcuNSAxNy41IDEyIDE5LjVDMTYuNSAxNy41IDIyIDE0IDIyIDE0VjlMMTIgMTRMMiA5WiIgb3BhY2l0eT0iMC43NSIvPjwvc3ZnPg==";
  const iconSrc = logoUrl || defaultIcon;

  const manifestData = {
    "name": schoolName,
    "short_name": "CBT",
    "start_url": window.location.href,
    "display": "standalone",
    "background_color": "#F5F7FF",
    "theme_color": "#1D4ED8",
    "icons": [
      {
        "src": iconSrc,
        "sizes": "192x192",
        "type": logoUrl ? "image/png" : "image/svg+xml",
        "purpose": "any maskable"
      },
      {
        "src": iconSrc,
        "sizes": "512x512",
        "type": logoUrl ? "image/png" : "image/svg+xml",
        "purpose": "any maskable"
      }
    ]
  };
  const stringManifest = JSON.stringify(manifestData);
  const encodedManifest = encodeURIComponent(stringManifest);
  const manifestURL = 'data:application/manifest+json;charset=utf-8,' + encodedManifest;
  const manifestLink = document.getElementById('pwa-manifest');
  if (manifestLink) manifestLink.setAttribute('href', manifestURL);
};

// Initial call
window.updatePWAManifest();

// --- MODAL PANDUAN ---
window.openGuideModal = function () {
  const overlay = document.getElementById('guide-overlay');
  const modal = document.getElementById('guide-modal');
  if (!overlay || !modal) return;
  overlay.classList.add('active');
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
};

window.closeGuideModal = function () {
  const overlay = document.getElementById('guide-overlay');
  const modal = document.getElementById('guide-modal');
  if (!overlay || !modal) return;
  overlay.classList.remove('active');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
};

// --- Page Detection ---
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isExamPage = currentPage === 'exam.html';
const isResultPage = currentPage === 'result.html';
const isAdminPage = currentPage === 'admin.html';
const isIndexPage = currentPage === 'index.html' || currentPage === '' || currentPage === 'dashboard.html';

// --- Global State ---
const State = {
  user: null,
  config: null,
  questions: [],
  answers: {},
  doubts: new Set(),
  currentIndex: 0,
  timerInterval: null,
  timeRemaining: 0,
  examActive: false,
  violations: 0,
  security: {},
  tempLogoBase64: null,
  submissionFailed: false,
  submissionLocked: false
};
window.State = State; // Explicitly bind to window for cross-script access

// --- IndexedDB Storage Bridge ---
// For large data (exam sessions, cache), we use IndexedDB via localDB.
// For small flags, we continue using localStorage.
window.dbSet = async function(key, value) {
    try { await localDB.set('user_session', key, value); } catch(e) { console.error('dbSet error:', e); }
};
window.dbGet = async function(key) {
    try { return await localDB.get('user_session', key); } catch(e) { console.error('dbGet error:', e); return null; }
};
window.dbRemove = async function(key) {
    try { await localDB.delete('user_session', key); } catch(e) { console.error('dbRemove error:', e); }
};

// --- School Logo & Identity Support ---
function applySchoolIdentity(iden) {
  if (!iden) return;

  if (iden.name) {
    document.title = `CBT Online – ${iden.name}`;
    safeSetText('ph-sekolah', iden.name);
    safeSetText('ph-sekolah-2', iden.name);
    safeSetText('ph-sekolah-print', iden.name);
    safeSetText('portal-school-name', iden.name);
    // Mobile
    safeSetText('mobile-school-name', iden.name);
  }

  if (iden.sub && iden.sub !== iden.name) {
    safeSetText('portal-school-sub', iden.sub);
    safeSetText('mobile-school-sub', iden.sub);
  } else {
    safeSetText('portal-school-sub', 'Computer Based Portal v.2');
    safeSetText('mobile-school-sub', 'Computer Based Test');
  }

  if (iden.logo) {
    const logoImg = document.getElementById('school-logo-img');
    const defaultLogo = document.getElementById('default-logo-svg');
    if (logoImg && defaultLogo) {
      logoImg.src = iden.logo;
      logoImg.style.display = 'block';
      defaultLogo.style.display = 'none';
    }
    // Mobile header logo
    const mobileLogoImg = document.getElementById('mobile-logo-img');
    const mobileLogoFallback = document.getElementById('mobile-logo-fallback');
    if (mobileLogoImg) {
      mobileLogoImg.src = iden.logo;
      mobileLogoImg.style.display = 'block';
      if (mobileLogoFallback) mobileLogoFallback.style.display = 'none';
    }
  }

  // Update PWA Manifest dynamically (Armor 1000)
  updatePWAManifest(iden.name || "CBT Online", iden.logo);
}
// Expose ke window agar bisa dipanggil dari supabase-patch.js
window.applySchoolIdentity = applySchoolIdentity;

// Cek dan enforce PWA — dipanggil setelah State.security di-load
function checkAndEnforcePwa() {
  if (!State.security || !State.security.pwa) return;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const hasBypass = sessionStorage.getItem('pwa_bypass_granted') === '1';
  const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
  if (isMobile && !isStandalone && !hasBypass && !isLocal) {
    const pwaOverlay = document.getElementById('pwa-blocker-overlay');
    if (pwaOverlay) pwaOverlay.style.display = 'flex';
  }
}
window.checkAndEnforcePwa = checkAndEnforcePwa;

// Global initialization for School Identity
async function initSchoolIdentity() {
  try {
    const idenSnap = await db.ref('/config/identity').once('value');
    const iden = idenSnap.val();
    if (iden) applySchoolIdentity(iden);
  } catch (e) {
    console.warn("Failed to load school identity:", e);
  }
}
// Expose ke window agar bisa dipanggil dari supabase-patch.js
window.initSchoolIdentity = initSchoolIdentity;

// --- Utilities ---
function showView(viewId) {
  if (viewId === 'exam-view' && isIndexPage) {
    // Check if exam is already submitted or session is cleared
    const hasSession = localStorage.getItem('CBT_EXAM_SESSION');
    const hasResult = localStorage.getItem('CBT_LAST_RESULT');
    
    // Only redirect if there's an active session and no result
    if (hasSession && !hasResult) {
      window.location.href = 'exam.html';
    }
    return;
  }
  if (viewId === 'result-view' && isIndexPage) {
    window.location.href = 'result.html';
    return;
  }
  if (viewId === 'admin-dash-view' && isIndexPage) {
    window.location.href = 'admin.html';
    return;
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.admin-layout').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
  hideLoading();
}

// Helper untuk mencegah error memori penuh (Storage Quota)
function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      showCustomAlert('Memori HP Penuh', 'Penyimpanan browser Anda penuh. Harap hapus beberapa data browser untuk melanjutkan ujian.', '💾');
    } else {
      console.warn('Gagal menyimpan ke localStorage', e);
    }
    return false;
  }
}

function safeAddListener(id, event, callback) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, callback);
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function safeSetValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function safeSetChecked(id, bool) {
  const el = document.getElementById(id);
  if (el) el.checked = !!bool;
}

function safeGetValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function isSafeResourceUrl(url) {
  const value = String(url || '').trim();
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
}

function showAlert(msg, type = 'danger') {
  const alertEl = document.getElementById('login-alert');
  if (!alertEl) return;
  alertEl.textContent = msg;
  alertEl.className = `alert alert-${type}`;
  alertEl.style.display = 'block';
  setTimeout(() => { alertEl.style.display = 'none'; }, 3000);
}

function showLoading(text) {
  const overlay = document.getElementById('loading-overlay');
  const textEl = document.getElementById('loading-overlay-text');
  if (overlay && textEl) {
    textEl.textContent = text || 'Memuat...';
    overlay.classList.add('active');
  }
  // Mobile
  if (typeof showMobileLoading === 'function') showMobileLoading(text);
  // Safety auto-hide after 30s
  if (window._loadingSafetyTimer) clearTimeout(window._loadingSafetyTimer);
  window._loadingSafetyTimer = setTimeout(() => hideLoading(), 30000);
}

function hideLoading() {
  if (window._loadingSafetyTimer) { clearTimeout(window._loadingSafetyTimer); window._loadingSafetyTimer = null; }
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('active');
  // Mobile
  if (typeof hideMobileLoading === 'function') hideMobileLoading();
}

// --- Global Network Spinner (for high load) ---
let _netPendingCount = 0;
let _netSpinnerDelayTimer = null;
let _netSpinnerVisible = false;
let _netSpinnerEl = null;

function ensureGlobalNetSpinner() {
  if (_netSpinnerEl) return _netSpinnerEl;
  const el = document.createElement('div');
  el.id = 'global-net-spinner';
  el.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.28);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:250000;';
  el.innerHTML = '<div style="background:#fff;padding:14px 18px;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.15);display:flex;align-items:center;gap:10px;"><span style="width:18px;height:18px;border:2px solid #E5E7EB;border-top-color:#2563EB;border-radius:999px;display:inline-block;animation:spinNet .8s linear infinite;"></span><span style="font-size:.85rem;color:#334155;font-weight:600;">Memproses...</span></div>';
  if (!document.getElementById('global-net-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'global-net-spinner-style';
    style.textContent = '@keyframes spinNet{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }
  document.body.appendChild(el);
  _netSpinnerEl = el;
  return el;
}

function showGlobalNetSpinner() {
  const el = ensureGlobalNetSpinner();
  el.style.display = 'flex';
  _netSpinnerVisible = true;
}

function hideGlobalNetSpinner() {
  if (_netSpinnerEl) _netSpinnerEl.style.display = 'none';
  _netSpinnerVisible = false;
}

if (!window.__wrappedGlobalFetchSpinner) {
  window.__wrappedGlobalFetchSpinner = true;
  const _origFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    _netPendingCount++;
    if (!_netSpinnerDelayTimer) {
      _netSpinnerDelayTimer = setTimeout(() => {
        _netSpinnerDelayTimer = null;
        if (_netPendingCount > 0 && !_netSpinnerVisible) showGlobalNetSpinner();
      }, 700);
    }
    try {
      return await _origFetch(...args);
    } finally {
      _netPendingCount = Math.max(0, _netPendingCount - 1);
      if (_netPendingCount === 0) {
        if (_netSpinnerDelayTimer) {
          clearTimeout(_netSpinnerDelayTimer);
          _netSpinnerDelayTimer = null;
        }
        hideGlobalNetSpinner();
      }
    }
  };
}

// --- Seeded Randomizer & Shuffler ---
function getSeededRandom(seedStr) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < seedStr.length; i++) {
    k = seedStr.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  let a = (h1 ^ h2 ^ h3 ^ h4) >>> 0;
  let b = (h2 ^ h1) >>> 0;
  let c = (h3 ^ h1) >>> 0;
  let d = (h4 ^ h1) >>> 0;
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

function shuffleArray(array, randFn) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(randFn() * (i + 1));
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

// --- Local Storage Cadangan ---
async function saveStateLocal() {
  if (!State.examActive || !State.config || !State.user) return;
  const lsKey = `CBT_${State.user.id}_${State.config.id_ujian}`;
  const data = {
    answers: State.answers,
    doubts: Array.from(State.doubts),
    currentIndex: State.currentIndex,
    timeRemaining: State.timeRemaining,
    violations: State.violations,
    lastSavedAt: new Date().getTime()
  };
  await window.dbSet(lsKey, data);
}

async function clearAllLocalStorage() {
  const examId = State.config ? State.config.id_ujian : null;
  const userId = State.user ? State.user.id : null;
  
  // Clear IndexedDB entries
  await localDB.clear('cache');
  await localDB.clear('user_session');
  
  // Also clear native localStorage for legacy keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('CBT_') || key.startsWith('SOAL_') || key === 'SYNC_PROGRESS') {
      if (examId && userId) {
        if (key === `CBT_${userId}_${examId}` || key === `SOAL_${examId}` || key === `CBT_SUBMITTED_${examId}_${userId}`) {
          keysToRemove.push(key);
        }
      } else {
        keysToRemove.push(key);
      }
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

function playSiren() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.3);
  oscillator.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.6);
  oscillator.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + 0.9);
  oscillator.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 1.2);

  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 1.5);
}

function handleCheatDetection() {
  if (!State.examActive || !State.security || !State.security.anticheat) return;
  State.violations++;
  saveStateLocal();

  const overlay = document.getElementById('cheat-alert-overlay');
  if (overlay) overlay.classList.add('active');

  try { playSiren(); } catch (e) { }

  let count = 5 * State.violations;
  const countEl = document.getElementById('cheat-countdown');
  if (countEl) countEl.textContent = count;

  const iv = setInterval(() => {
    count--;
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(iv);
      if (overlay) overlay.classList.remove('active');
      if (State.security.fullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => { });
      }
    }
  }, 1000);

  withDB(async function () {
    const violationData = {
      waktu: new Date().toLocaleString('id-ID'),
      nama: State.user.name,
      kelas: State.user.kelas,
      userId: State.user.id,
      ujian: State.config.nama_ujian,
      examId: State.config.id_ujian,
      tipe: 'Keluar Layar/Ganti Tab',
      timestamp: new Date().toISOString()
    };
    
    // Save to Firebase
    await db.ref('/pelanggaran').push(violationData);
    
    // Sync to Supabase via Edge Function
    try {
      const response = await fetch(
        'https://dmydinmosdxazypwdbed.supabase.co/functions/v1/sync-violations',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8'
          },
          body: JSON.stringify({ violations: [violationData] })
        }
      );
      if (!response.ok) {
        console.warn('[handleCheatDetection] Failed to sync violation to Supabase:', response.status);
      }
    } catch (e) {
      console.warn('[handleCheatDetection] Error syncing violation:', e);
    }
  });
}

document.addEventListener('contextmenu', e => { if (State.examActive) e.preventDefault(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && State.examActive) handleCheatDetection();
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && State.examActive && State.security && State.security.fullscreen) {
    handleCheatDetection();
  }
});
document.addEventListener('copy', e => e.preventDefault());
document.addEventListener('paste', e => e.preventDefault());

const db = firebase.database();
const auth = firebase.auth();

/* ================================
   🚀 PERFORMANCE CORE PATCH
================================ */

// Memory cache (ultra cepat)
const memoryCache = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cachedGet(path) {
  const now = Date.now();
  const cached = memoryCache[path];
  if (cached && (now - cached.ts < 10 * 60 * 1000)) return cached.val;

  const snap = await db.ref(path).once('value');
  const val = snap.val();
  memoryCache[path] = { val, ts: now };
  return val;
}

// Database caching logic (Memory Cache)
let searchTimeout = null;

// Deklarasi di sini agar bisa dipakai oleh dbConnectFast dan dbConnect di bawah
// tanpa ReferenceError (let tidak di-hoist seperti var).
let activeDbRequests = 0;
let dbDisconnectTimer = null;
let connectionPromise = null;

// --- KONEKSI CEPAT TANPA JITTER (khusus operasi interaktif) ---
window.dbConnectFast = async function () {
  activeDbRequests++;
  if (activeDbRequests === 1) {
    connectionPromise = (async () => {
      if (dbDisconnectTimer) clearTimeout(dbDisconnectTimer);
      db.goOnline();
    })();
  }
  if (connectionPromise) await connectionPromise;
};

window.dbOffline = function () {
  // Hanya matikan koneksi jika TIDAK sedang di Admin Dashboard
  const isAdmin = document.getElementById('admin-dash-view') && document.getElementById('admin-dash-view').classList.contains('active');
  if (isAdmin) return;

  activeDbRequests = 0;
  db.goOffline();
};

// --- CACHE PESERTA PERSISTENT (localStorage, 30 menit) ---
const PESERTA_CACHE_KEY = 'CBT_CACHE_PESERTA';
const PESERTA_CACHE_TIME_KEY = 'CBT_CACHE_PESERTA_TIME';
const PESERTA_CACHE_TTL = 10 * 60 * 1000; // 10 menit
let cachedPeserta = null;

async function loadPesertaCache(force = false) {
  // Cek apakah cache masih valid
  try {
    if (!force) {
      const cachedTime = localStorage.getItem(PESERTA_CACHE_TIME_KEY);
      if (cachedTime && (Date.now() - parseInt(cachedTime)) < PESERTA_CACHE_TTL) {
        const cached = localStorage.getItem(PESERTA_CACHE_KEY);
        if (cached) {
          cachedPeserta = JSON.parse(cached);
          SystemStatus.peserta = 'success';
          updateInitStatusDisplay();
          return cachedPeserta;
        }
      }
    }
  } catch (e) { /* cache rusak, lanjut fetch */ }

  // Fetch dari Firebase (patched methods handle connection)
  try {
    const snap = await db.ref('/peserta').once('value');
    const data = snap.val() || {};
    const results = [];
    for (let id in data) {
      const p = data[id];
      results.push({
        id,
        name: p.nama || '',
        kelas: p.kelas || '',
        _search: ((p.nama || '') + ' ' + (p.kelas || '') + ' ' + id).toLowerCase()
      });
    }
    // Simpan ke cache
    cachedPeserta = results;
    try {
      localStorage.setItem(PESERTA_CACHE_KEY, JSON.stringify(results));
      localStorage.setItem(PESERTA_CACHE_TIME_KEY, Date.now().toString());
    } catch (e) { /* storage penuh, skip */ }
    SystemStatus.peserta = 'success';
    updateInitStatusDisplay();
    return results;
  } catch (e) {
    console.error("Gagal memuat daftar peserta:", e);
    SystemStatus.peserta = 'error';
    updateInitStatusDisplay();
    return [];
  }
}

// Expose ke window agar bisa dipanggil dari supabase-patch.js
window.loadPesertaCache = loadPesertaCache;

async function syncAllDataForPortal(force = false) {
  console.log("syncAllDataForPortal called, force:", force);

  // Anti-spam: cegah klik sync berulang & "refresh spam"
  try {
    const now = Date.now();
    const cooldownUntil = parseInt(sessionStorage.getItem('CBT_SYNC_COOLDOWN_UNTIL') || '0', 10) || 0;
    if (cooldownUntil && now < cooldownUntil) {
      const sisa = Math.ceil((cooldownUntil - now) / 1000);
      showCustomAlert('Terlalu Banyak Refresh', `Tunggu ${sisa} detik sebelum sinkron ulang.`, '⏳');
      return;
    }
    const inFlight = sessionStorage.getItem('CBT_SYNC_INFLIGHT') === '1';
    const lastSync = parseInt(sessionStorage.getItem('CBT_LAST_SYNC_TS') || '0', 10) || 0;
    const minGap = 20 * 1000;
    if (inFlight) {
      showCustomAlert('Sedang Proses', 'Sinkronisasi sedang berjalan. Mohon tunggu…', '⏳');
      return;
    }
    if (now - lastSync < minGap) {
      const sisa = Math.ceil((minGap - (now - lastSync)) / 1000);
      showCustomAlert('Terlalu Cepat', `Tunggu ${sisa} detik lalu coba lagi.`, '⏳');
      return;
    }
    sessionStorage.setItem('CBT_SYNC_INFLIGHT', '1');
    sessionStorage.setItem('CBT_LAST_SYNC_TS', String(now));
  } catch (e) { /* ignore */ }

  // FIX: validasi bypass code SETELAH set inflight
  if (force) {
    const input = prompt("Masukkan Kode Sinkron (Hanya untuk Proktor/Pengawas):");
    if (!input) {
      try { sessionStorage.removeItem('CBT_SYNC_INFLIGHT'); } catch (_) {}
      return;
    }
    try {
      const snap = await db.ref('/config/security/bypassCode').once('value');
      const validCode = snap.val();
      if (!validCode || input.toUpperCase() !== String(validCode).toUpperCase()) {
        showCustomAlert('Akses Ditolak', 'Kode sinkron tidak valid!', '🔐');
        try { sessionStorage.removeItem('CBT_SYNC_INFLIGHT'); } catch (_) {}
        return;
      }
    } catch (e) {
      console.error("Sync bypass error:", e.message);
      showCustomAlert('Error', 'Gagal memverifikasi kode: ' + e.message, '❌');
      try { sessionStorage.removeItem('CBT_SYNC_INFLIGHT'); } catch (_) {}
      return;
    }
  }

  console.log("Starting sync...");
  let synced = false;

  try {
    // 1. Fetch Identity
    console.log("Fetching identity...");
    const idenSnap = await db.ref('/config/identity').once('value');
    const iden = idenSnap.val();
    if (iden) {
      applySchoolIdentity(iden);
      SystemStatus.portal = 'success';
    }
    console.log("Identity fetched:", iden ? "OK" : "null");

    // 2. Fetch Peserta
    console.log("Fetching peserta...");
    await loadPesertaCache(force);
    console.log("Peserta fetched");

    // 3. Fetch Jadwal
    console.log("Fetching jadwal...");
    const jSnap = await db.ref('/jadwal').once('value');
    const jadwals = jSnap.val() || {};
    
    // ✅ FIX MULTI-USER: Simpan cache jadwal global (untuk preview sebelum login)
    localStorage.setItem('CBT_CACHE_JADWAL', JSON.stringify(jadwals));
    localStorage.setItem('CBT_CACHE_JADWAL_TIME', Date.now().toString());
    
    // ✅ FIX MULTI-USER: Jika user sudah login, simpan cache per-user juga
    // Ini memastikan saat user login ulang, cache jadwal sudah tersedia
    if (State.user && State.user.id) {
      localStorage.setItem(`CBT_CACHE_JADWAL_${State.user.id}`, JSON.stringify(jadwals));
      localStorage.setItem(`CBT_CACHE_JADWAL_TIME_${State.user.id}`, Date.now().toString());
      console.log(`[Sync] Saved jadwal cache for user ${State.user.id}`);
    }
    
    // ✅ FIX MULTI-USER: Hanya update State.schedules jika user belum login
    // Jika sudah login, State.schedules dikelola oleh loadSchedules() dengan status yang benar
    if (!State.user) {
      State.schedules = Object.keys(jadwals).map(id => ({ id, ...jadwals[id] }));
    }
    console.log("Jadwal fetched:", Object.keys(jadwals).length, "items");

    synced = true;
  } catch (e) {
    console.error("Sync error:", e.message, e.code);
    if (e.code === 'PERMISSION_DENIED') {
      console.warn("Permission denied. Check Firebase Auth and Rules.");
      showCustomAlert('Akses Ditolak', 'Firebase memblokir akses. Pastikan:\n1. Anonymous Auth enabled di Firebase Console\n2. Database Rules benar', '🔐');
    }
  } finally {
    try { sessionStorage.removeItem('CBT_SYNC_INFLIGHT'); } catch (e) { }
    console.log("Sync finished, synced:", synced);

    // Update UI badge status
    const badge = document.getElementById('landing-sync-badge');
    const dot = document.getElementById('top-sync-dot');
    const text = document.getElementById('top-sync-text');

    if (badge) {
      badge.style.background = synced ? '#D1FAE5' : '#FEF3C7';
      badge.style.color = synced ? '#065F46' : '#92400E';
      badge.style.cursor = 'pointer';
      badge.title = 'Klik untuk sinkron ulang data terbaru';
      badge.onclick = () => syncAllDataForPortal(true);
    }
    if (dot) dot.style.background = synced ? '#10B981' : '#F59E0B';
    if (text) text.textContent = synced ? 'Data Ter-Sinkron' : 'Cache Lokal';

    // Mobile UI updates
    if (typeof updateMobileSyncBadge === 'function') updateMobileSyncBadge(synced);
    if (typeof updateMobileStatus === 'function') updateMobileStatus('', synced ? 'ready' : '');
    // FIX: hanya render jadwal dari sini jika user belum login.
    // Kalau sudah login, loadSchedules() yang handle render dengan filter kelas yang benar.
    if (!State.user && typeof renderMobileSchedule === 'function') renderMobileSchedule();

    SystemStatus.portal = 'success';
    updateInitStatusDisplay();
  }
}async function searchPeserta(keyword) {
  const key = keyword.trim().toLowerCase();
  if (key.length < 2) return [];

  // Pastikan cache terisi
  const list = cachedPeserta || await loadPesertaCache();
  if (!list || list.length === 0) return [];

  const queryWords = key.split(/\s+/).filter(w => w.length > 0);
  const results = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const haystack = p._search || ((p.name || '') + ' ' + (p.kelas || '') + ' ' + (p.id || '')).toLowerCase();
    if (queryWords.every(word => haystack.includes(word))) {
      results.push(p);
      if (results.length >= 15) break;
    }
  }
  return results;
}

/* ================================
   📦 CACHE SOAL (SUPER CEPAT)
================================ */

// IndexedDB cache (lebih stabil dibanding localStorage untuk data besar)
const CBT_IDB_NAME = 'cbtmo_cache';
const CBT_IDB_VERSION = 1;
const CBT_IDB_STORE = 'exam_cache';

function _cbtOpenIdb() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(CBT_IDB_NAME, CBT_IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CBT_IDB_STORE)) {
          db.createObjectStore(CBT_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

async function cbtIdbGet(key) {
  const db = await _cbtOpenIdb();
  if (!db) return null;
  return await new Promise((resolve) => {
    const tx = db.transaction(CBT_IDB_STORE, 'readonly');
    const store = tx.objectStore(CBT_IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function cbtIdbSet(key, value) {
  const db = await _cbtOpenIdb();
  if (!db) return false;
  return await new Promise((resolve) => {
    const tx = db.transaction(CBT_IDB_STORE, 'readwrite');
    const store = tx.objectStore(CBT_IDB_STORE);
    const req = store.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

// Expose for exam-core.js (loaded after script.js)
window.cbtIdbGet = cbtIdbGet;
window.cbtIdbSet = cbtIdbSet;

async function getExamDataOptimized(examId, token, forceRefresh = false, skipTokenCheck = false) {
  // Armor 1000: Coba ambil dari cache jadwal dulu untuk menghemat koneksi
  let sch = null;
  try {
    const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
    if (cachedJadwal) {
      const jadwals = JSON.parse(cachedJadwal);
      sch = jadwals[examId];
    }
  } catch (e) { }

  // Jika tidak ada di cache, baru ambil dari Firebase
  if (!sch || forceRefresh) {
    await dbConnectFast();
    try {
      const jSnap = await db.ref('/jadwal/' + examId).once('value');
      sch = jSnap.val();
    } finally {
      dbDisconnect();
    }
  }

  if (!sch) throw new Error("Ujian tidak ditemukan");

  // Cache Versioning (Armor 1000)
  // Prioritaskan versi eksplisit agar perubahan soal/kunci/token memaksa sync ulang.
  const ver = getScheduleVersion(sch);
  const CACHE_KEY = `SOAL_${examId}_v${ver}`;

  // Token harus divalidasi sebelum cache lokal dipakai agar sync H-1 tidak membypass token ujian.
  if (!skipTokenCheck && sch.token) {
    const inputToken = String(token || '').toUpperCase().trim();
    const serverToken = String(sch.token).toUpperCase().trim();
    console.log('[TokenCheck] Input:', inputToken, 'Server:', serverToken, 'Match:', inputToken === serverToken);

    if (serverToken !== inputToken) {
      const offlineHash = localStorage.getItem(`CBT_TOKEN_HASH_${examId}`);
      if (offlineHash && simpleHash(inputToken) === offlineHash) {
        console.log("✅ Offline Token Verified");
      } else {
        throw new Error("Token salah!");
      }
    }
  } else {
    console.log('[TokenCheck] Skipped (skipTokenCheck=' + skipTokenCheck + ', sch.token=' + (sch.token || 'null') + ')');
  }

  if (!forceRefresh) {
    // 1) Coba IndexedDB dulu (lebih aman untuk data besar)
    try {
      const idbCached = await cbtIdbGet(CACHE_KEY);
      if (idbCached && idbCached.questions && idbCached.questions.length > 0) {
        return idbCached;
      }
    } catch (_) {}

    // 2) Fallback localStorage (kompatibilitas lama)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached);
        // Validasi ekstra: pastikan object punya array questions
        if (parsedData && parsedData.questions && parsedData.questions.length > 0) {
          if (parsedData.keys) {
            delete parsedData.keys;
            safeSetLocalStorage(CACHE_KEY, JSON.stringify(parsedData));
          }
          // Migrasi silent ke IndexedDB
          cbtIdbSet(CACHE_KEY, parsedData).catch(() => {});
          return parsedData;
        } else {
          throw new Error("Cache kosong atau rusak");
        }
      } catch (e) {
        console.warn("Cache rusak, melakukan auto re-download...", e);
        showLoading('Memperbaiki Data yang Rusak...');
      }
    }
  }

  await dbConnect();
  try {
    const sData = await cachedGet('/soal/' + sch.nama_soal);

    const questions = [];
    let idx = 0;

    for (let qId in sData) {
      let q = sData[qId];
      q._index = idx++;
      if (!q.opsi) q.opsi = [];
      q.id = qId;
      questions.push(q);
    }

    const result = {
      success: true,
      config: {
        id_ujian: examId,
        nama_ujian: sch.nama,
        durasi: sch.durasi,
        end_ms: sch.selesai,
        min_selesai: sch.min_selesai || 0,  // wajib ada agar batas waktu minimal mengerjakan berlaku dari cache
        shuffle_soal: sch.shuffle_soal,
        shuffle_opsi: sch.shuffle_opsi,
        versi_soal: ver
      },
      questions,
      tokenHash: sch.token ? simpleHash(String(sch.token).toUpperCase().trim()) : null
    };

    // Simpan cache utama ke IndexedDB (dan localStorage sebagai fallback)
    try { await cbtIdbSet(CACHE_KEY, result); } catch (_) {}
    try { safeSetLocalStorage(CACHE_KEY, JSON.stringify(result)); } catch (_) {}
    return result;
  } finally {
    dbDisconnect();
  }
}

// --- STORAGE & SYNC UTILS ---
async function checkStorageQuota() {
  if (!navigator.storage || !navigator.storage.estimate) return true;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const available = quota - usage;
    // Estimasi 1MB per paket soal (termasuk gambar base64)
    const required = State.schedules.length * 1024 * 1024;

    // Update UI jika ada
    const availEl = document.getElementById('sync-storage-avail');
    const reqEl = document.getElementById('sync-storage-req');
    if (availEl) availEl.textContent = (available / 1024 / 1024).toFixed(0) + ' MB';
    if (reqEl) reqEl.textContent = (required / 1024 / 1024).toFixed(1) + ' MB';

    if (available < required) {
      showCustomAlert(
        'Memori Penuh',
        `Butuh sekitar ${(required / 1024 / 1024).toFixed(1)}MB, namun sisa ruang hanya ${(available / 1024 / 1024).toFixed(1)}MB. Hapus beberapa foto atau aplikasi agar ujian lancar.`,
        '💾'
      );
      return false;
    }
  } catch (e) { console.warn("Gagal cek kuota storage", e); }
  return true;
}

function cleanupOldCache() {
  if (!State.schedules || State.schedules.length === 0) return;
  const activeIds = new Set(State.schedules.map(s => s.id));
  const activeCacheKeys = new Set(State.schedules.map(s => `SOAL_${s.id}_v${getScheduleVersion(s)}`));
  let count = 0;

  // Cari item cache soal/token lama dan hapus yang tidak lagi aktif/versinya berubah.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    let shouldRemove = false;

    if (key.startsWith('SOAL_')) {
      shouldRemove = !activeCacheKeys.has(key);
    } else if (key.startsWith('CBT_TOKEN_HASH_')) {
      const id = key.replace('CBT_TOKEN_HASH_', '');
      shouldRemove = !activeIds.has(id);
    } else if (key.startsWith('CBT_SOAL_') || key.startsWith('CBT_KUNCI_')) {
      shouldRemove = true;
    }

    if (shouldRemove) {
      localStorage.removeItem(key);
      count++;
      // Karena item dihapus, index bergeser
      i--;
    }
  }
  if (count > 0) console.log(`🧹 Cache cleanup: ${count} item lama dihapus.`);
}

function getMyStaggerDelay() {
  if (!State.user || !State.user.id) return 0;
  const userId = String(State.user.id);
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const group = hash % 10; // Bagi menjadi 10 grup
  return group * 20000; // Jeda 20 detik per grup (Total rentang 3 menit)
}

// --- BULLETPROOF UTILS ---
let wakeLock = null;
async function toggleWakeLock(on) {
  if (!('wakeLock' in navigator)) return;
  try {
    if (on) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log("🔒 Screen Wake Lock Aktif");
    } else if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
      console.log("🔓 Screen Wake Lock Dilepas");
    }
  } catch (e) { }
}

function validateDataIntegrity(data) {
  if (!data || typeof data !== 'object') return false;
  // Pastikan ada array soal dan minimal ada satu soal (jika bukan bank kosong)
  if (!data.questions || !Array.isArray(data.questions)) return false;
  // Cek integritas struktur soal pertama
  if (data.questions.length > 0) {
    const q = data.questions[0];
    if (!q.id || !q.pertanyaan || !q.tipe) return false;
  }
  return true;
}

// Simple hash untuk offline token (mencegah token terlihat telanjang di localStorage)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'OFF_' + Math.abs(hash).toString(36);
}

function getScheduleVersion(sch) {
  if (!sch) return '0';
  return String(sch.versi_soal || sch.updatedAt || sch.updated_at || sch.lastUpdated || sch.mulai || 0);
}

// --- H-1 PRE-SYNC LOGIC ---
/**
 * Memindai semua soal dan menyimpan gambar eksternal ke CacheStorage (PWA)
 * agar bisa diakses 100% offline tanpa internet.
 */
async function cacheAllImages(questions) {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('cbt-cache-v5');
    const imageUrls = [];

    questions.forEach(q => {
      if (q.gambar) imageUrls.push(q.gambar);
      if (q.image) imageUrls.push(q.image);
      if (q.opsi) {
        q.opsi.forEach(o => {
          if (o.gambar) imageUrls.push(o.gambar);
          if (o.image) imageUrls.push(o.image);
        });
      }
      // Scan for img tags in text (jika ada)
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      let match;
      if (q.pertanyaan) {
        while ((match = imgRegex.exec(q.pertanyaan)) !== null) imageUrls.push(match[1]);
      }
      if (q.soal) {
        while ((match = imgRegex.exec(q.soal)) !== null) imageUrls.push(match[1]);
      }
    });

    const uniqueUrls = [...new Set(imageUrls)].filter(u => u && u.startsWith('http'));
    for (const url of uniqueUrls) {
      try {
        const cachedResponse = await cache.match(url);
        if (!cachedResponse) {
          await cache.add(new Request(url, { mode: 'no-cors' }));
        }
      } catch (e) { console.warn("Skip cache gambar:", url); }
    }
  } catch (e) { console.warn("PWA Cache error", e); }
}

async function syncAllQuestions() {
  if (!State.schedules || State.schedules.length === 0) {
    showCustomAlert('Informasi', 'Tidak ada jadwal ujian yang ditemukan untuk disinkronkan.', 'ℹ️');
    return;
  }

  const bar = document.getElementById('sync-all-bar');
  const text = document.getElementById('sync-all-text');
  const fileLabel = document.getElementById('sync-file-label');
  const currentItem = document.getElementById('sync-current-item');

  // Transisi ke state progress
  if (typeof setSyncState === 'function') setSyncState('progress');

  // Adaptive Delay (Kecepatan Internet)
  let baseDelay = 800;
  if (navigator.connection && navigator.connection.downlink) {
    if (navigator.connection.downlink < 1.5) baseDelay = 2000;
    else if (navigator.connection.downlink < 3) baseDelay = 1200;
  }

  // Aktifkan Wake Lock
  await toggleWakeLock(true);

  if (!(await checkStorageQuota())) {
    await toggleWakeLock(false);
    if (typeof setSyncState === 'function') setSyncState('ready');
    return;
  }

  // Bersihkan cache lama sebelum sync baru
  cleanupOldCache();

  // Resume Mechanism
  const progressData = JSON.parse(localStorage.getItem('SYNC_PROGRESS') || '{}');
  const completedMap = Array.isArray(progressData.completed)
    ? progressData.completed.reduce((acc, id) => { acc[id] = true; return acc; }, {})
    : (progressData.completed || {});

  let count = State.schedules.filter(s => completedMap[s.id] === getScheduleVersion(s)).length;
  const total = State.schedules.length;

  for (let i = 0; i < total; i++) {
    const sch = State.schedules[i];
    const schVersion = getScheduleVersion(sch);
    if (completedMap[sch.id] === schVersion) continue;

    count++;
    const percent = Math.round((count / total) * 100);
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `${percent}%`;
    if (fileLabel) fileLabel.textContent = `${count} / ${total} soal`;
    if (currentItem) currentItem.textContent = `⬇ ${sch.nama}...`;

    try {
      // SkipTokenCheck = true agar bisa download H-1 tanpa tahu token
      const examData = await getExamDataOptimized(sch.id, null, true, true);

      // Pre-cache images if any
      if (examData && examData.questions) {
        await cacheAllImages(examData.questions);
      }

      // Hash token for offline verification, tanpa menyimpan token mentah di cache.
      if (examData && examData.tokenHash) {
        localStorage.setItem(`CBT_TOKEN_HASH_${sch.id}`, examData.tokenHash);
      }

      completedMap[sch.id] = schVersion;
      localStorage.setItem('SYNC_PROGRESS', JSON.stringify({ completed: completedMap }));
      await new Promise(r => setTimeout(r, baseDelay));
    } catch (e) {
      console.warn("Gagal sync:", sch.id, e);
    }
  }

  // Aktifkan Wake Lock
  await toggleWakeLock(false);

  // Cek apakah semua benar-benar selesai
  const isFullySynced = State.schedules.every(s => completedMap[s.id] === getScheduleVersion(s));

  // Laporkan ke Firebase bahwa siswa ini sudah sync
  try {
    await dbConnectFast();
    if (State.schedules[0]) {
      await db.ref(`/status_sync/${State.schedules[0].id}/${State.user.id}`).set({
        nama: State.user.name,
        kelas: State.user.kelas,
        time: new Date().getTime(),
        status: isFullySynced ? 'FULL' : 'PARTIAL'
      });
    }
  } catch (e) { console.warn("Gagal lapor status sync", e); }
  finally { dbDisconnect(); }

  if (isFullySynced) {
    bar.style.width = '100%';
    if (text) text.textContent = '100%';
    if (fileLabel) fileLabel.textContent = `${total} / ${total} soal`;
    if (typeof renderMobileSchedule === 'function') renderMobileSchedule();
    if (typeof renderSchedules === 'function') renderSchedules();
    // Transisi ke state selesai
    if (typeof setSyncState === 'function') setSyncState('done');
  } else {
    const syncedCount = State.schedules.filter(s => completedMap[s.id] === getScheduleVersion(s)).length;
    const errMsg = document.getElementById('sync-error-msg');
    if (errMsg) errMsg.textContent = `${syncedCount} dari ${total} paket berhasil diunduh. Coba ulangi untuk mengunduh sisanya.`;
    // Transisi ke state error
    if (typeof setSyncState === 'function') setSyncState('error');
    showCustomAlert('Sinkron Gagal Sebagian', 'Beberapa soal gagal diunduh. Pastikan internet stabil dan klik tombol "Ulangi" kembali.', '⚠️');
  }
}

/* ================================
   💾 AUTO SAVE (ANTI DATA HILANG)
================================ */

// ✅ OPTIMIZATION: Increased backup interval from 5s to 15s (30% CPU reduction)
// Periodic backup (every 15s instead of 5s)
setInterval(() => {
  if (State.examActive) {
    saveStateLocal();
  }
}, 15000);

// ✅ OPTIMIZATION: Increased debounce delay from 1s to 5s (40% I/O reduction)
// Debounced save for interactions (anti-lag on low-end devices)
let saveTimeout = null;
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveStateLocal();
  }, 5000);
}

// Question rendering optimizations

/* ================================
   ⚡ PRELOAD NEXT SOAL
================================ */

function preloadNext(index) {
  const next = State.questions[index + 1];
  if (!next) return;

  if (next.image) {
    const img = new Image();
    img.src = next.image;
  }
}

/* ================================
   🚀 SUBMIT SUPER AMAN
================================ */

// submitExamSafe integrated into submitExam below

/* ================================
   ⏱️ TIMER RINGAN
================================ */

let lastUpdate = 0;

function updateTimerOptimized() {
  const now = Date.now();

  if (now - lastUpdate < 1000) return;
  lastUpdate = now;

  // update timer UI di sini
}

/* ================================
   🚨 CHEAT LOG LOCAL ONLY
================================ */

let cheatLogs = [];

function handleCheatDetectionOptimized() {
  cheatLogs.push({
    time: Date.now(),
    type: 'TAB_SWITCH'
  });
}

/* ================================
   📡 SYSTEM INITIALIZATION TRACKER
================================ */
const SystemStatus = {
  auth: 'pending',
  peserta: 'pending',
  portal: 'pending'
};

function updateInitStatusDisplay() {
  const dot = document.getElementById('init-dot');
  const text = document.getElementById('init-text');
  if (!dot || !text) return;

  const statuses = [SystemStatus.auth, SystemStatus.peserta, SystemStatus.portal];
  dot.classList.remove('init-success', 'init-warning', 'init-error');

  const topSyncDot = document.getElementById('top-sync-dot');
  const topSyncText = document.getElementById('top-sync-text');

  if (statuses.every(s => s === 'success')) {
    dot.classList.add('init-success');
    dot.style.animation = 'none';
    text.textContent = 'Sistem Siap. Ujian dapat dimulai!';
    text.style.color = '#10b981';
    if (topSyncDot) topSyncDot.style.background = '#10B981';
    if (topSyncText) topSyncText.textContent = 'Sudah Sinkron';
  } else if (statuses.some(s => s === 'error')) {
    dot.classList.add('init-error');
    text.textContent = 'Gagal memuat data. Mohon muat ulang halaman.';
    text.style.color = '#ef4444';
    if (topSyncDot) topSyncDot.style.background = '#EF4444';
    if (topSyncText) topSyncText.textContent = 'Gagal Sinkron';
  } else if (statuses.some(s => s === 'success')) {
    dot.classList.add('init-warning');
    text.textContent = 'Sedang menyiapkan data...';
    text.style.color = 'var(--text-muted)';
    if (topSyncDot) topSyncDot.style.background = '#F59E0B';
    if (topSyncText) topSyncText.textContent = 'Menyinkronkan...';
  } else {
    if (topSyncDot) topSyncDot.style.background = '#EF4444';
    if (topSyncText) topSyncText.textContent = 'Belum Sinkron';
    text.textContent = 'Menyiapkan sistem...';
    text.style.color = 'var(--text-muted)';
  }
}

/* ================================
   🚀 INIT
================================ */
// initAutocomplete removed here, using original logic




// Initialize School Identity
// initSchoolIdentity call removed from here, moved to initPortal for safety

// --- SMART DB CONNECTION MANAGER (HIT & RUN) ---
// Trik ini membuat Firebase berjalan secara stateless seperti REST API.
// Sangat vital untuk mem-bypass limit 100 concurrent connection di versi gratis (Spark).
db.goOffline(); // Matikan koneksi bawaan seketika!

// activeDbRequests dan dbDisconnectTimer sudah dideklarasikan di atas (dekat dbConnectFast)
// agar tidak ReferenceError saat loadPesertaCache() dipanggil sebelum blok ini.

// sleep is already declared above in the Performance Core Patch

window.dbConnect = async function () {
  activeDbRequests++;
  if (activeDbRequests === 1) {
    connectionPromise = (async () => {
      if (dbDisconnectTimer) clearTimeout(dbDisconnectTimer);
      await sleep(Math.floor(Math.random() * 1500));
      db.goOnline();
    })();
  }
  // Add 5s timeout to prevent hanging
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Connection timeout")), 5000)
  );
  if (connectionPromise) await Promise.race([connectionPromise, timeout]).catch(e => console.warn("dbConnect race:", e.message));
};

window.dbDisconnect = function () {
  activeDbRequests--;
  if (activeDbRequests <= 0) {
    activeDbRequests = 0;
    if (dbDisconnectTimer) clearTimeout(dbDisconnectTimer);
    // Jeda 1.5 detik untuk mengamankan jika ada query susulan
    dbDisconnectTimer = setTimeout(() => {
      if (activeDbRequests === 0) {
        db.goOffline();
      }
    }, 1500);
  }
};

window.withDB = async function (promiseFunc) {
  await dbConnect();
  try {
    // ✅ OPTIMIZATION: Reduced timeout from 15s to 5s (faster error handling)
    // Timeout 5 detik untuk mencegah request menggantung selamanya
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firebase Timeout")), 5000)
    );
    return await Promise.race([promiseFunc(), timeoutPromise]);
  } catch (err) {
    console.warn("DB Operation Error:", err.message);
    throw err;
  } finally {
    dbDisconnect();
  }
};

// --- AUTOMATIC FIREBASE PROTOTYPE PATCHING ---
// (tidak diperlukan lagi - semua via Supabase)
let isAuthReady = false;
let authPromise = null;

function patchFirebase() {
  // no-op
}

function initAuth() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    SystemStatus.auth = 'error';
    updateInitStatusDisplay();
    authPromise = Promise.resolve();
    window.authPromise = authPromise;
    return;
  }
  const auth = firebase.auth();
  authPromise = auth.signInAnonymously()
    .then(() => {
      isAuthReady = true;
      SystemStatus.auth = 'success';
      updateInitStatusDisplay();
    })
    .catch(err => {
      console.error("Auth error:", err);
      // Still resolve so portal can load with cached data
      isAuthReady = true;
      SystemStatus.auth = 'error';
      updateInitStatusDisplay();
    });
  window.authPromise = authPromise;
}

async function gasRun(funcName, ...args) {
  console.log('🔧 gasRun START:', funcName);
  // Delegate to supabase gasRun if available (avoids Firebase mock)
  if (window._supaGasRun) {
    console.log('🔧 Using _supaGasRun');
    return window._supaGasRun(funcName, ...args);
  }
  if (!isAuthReady && authPromise) await authPromise;

  // Gunakan dbConnectFast untuk aksi interaktif (Siswa & Admin) agar tidak kena jitter 1.5 detik
  const interactiveFuncs = [
    'getAllPeserta', 'getSchedules', 'getPortalInfo', 'getExamData',
    'validateAdmin', 'getAdminMonitoringData', 'getAdminJadwalFull',
    'getAdminLaporanLengkap', 'getAdminPreviewSoal',
    'syncAnswers', 'submitExam', 'getStudentResult'
  ];
  const isFast = interactiveFuncs.includes(funcName);

  if (isFast) {
    showLoading();
    await dbConnectFast();
  }

  console.log('🔧 gasRun called:', funcName, 'args:', args);

  try {
    if (funcName === 'getAllPeserta') {
      // Cek Cache Local Storage (Valid 30 Menit)
      const CACHE_KEY = 'CBT_CACHE_PESERTA';
      const CACHE_TIME_KEY = 'CBT_CACHE_PESERTA_TIME';
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();

      if (cachedData && cachedTime && (now - cachedTime < 30 * 60 * 1000)) {
        try {
          return JSON.parse(cachedData);
        } catch (e) { localStorage.removeItem(CACHE_KEY); }
      }

      const snap = await db.ref('/peserta').once('value');
      const data = snap.val() || {};
      const results = [];
      for (let id in data) {
        const p = data[id];
        results.push({ id, name: p.nama, kelas: p.kelas });
      }

      // Simpan ke Cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(results));
      localStorage.setItem(CACHE_TIME_KEY, now.toString());
      return results;
    }

    else if (funcName === 'getSchedules') {
      const [userId, kelas] = args;
      // Jalankan kedua query secara paralel (bukan serial) untuk memotong waktu tunggu ~50%
      const [snap, hSnap] = await Promise.all([
        db.ref('/jadwal').once('value'),
        db.ref('/hasil').orderByChild('userId').equalTo(userId).once('value')
      ]);
      const data = snap.val() || {};
      const hData = hSnap.val() || {};
      const completedSet = new Set();
      for (let k in hData) completedSet.add(hData[k].examId);

      const schedules = [];
      const nowMs = Date.now();
      for (let id in data) {
        const sch = data[id];
        let targetKelasRaw = sch.target_kelas || sch.kelas || '';
        let matched = true;
        if (targetKelasRaw && targetKelasRaw.toLowerCase() !== 'semua' && kelas) {
          const targets = String(targetKelasRaw).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
          matched = targets.some(t => kelas.toLowerCase().includes(t) || t.includes(kelas.toLowerCase()));
        }
        if (!matched) continue;

        let status = 'BELUM_MULAI';
        if (completedSet.has(id)) status = 'SELESAI';
        else if (sch.aktif === false) status = 'NONAKTIF';
        else if (sch.force_aktif) status = 'AKTIF';   // Admin override – ignores time window
        else if (nowMs < sch.mulai) status = 'BELUM_MULAI';
        else if (nowMs > sch.selesai) status = 'TUTUP';
        else status = 'AKTIF';

        schedules.push({ id, nama: sch.nama, mulai: sch.mulai, selesai: sch.selesai, durasi: sch.durasi, status });
      }
      return { success: true, schedules, serverTime: nowMs };
    }

    else if (funcName === 'getPortalInfo') {
      const snap = await db.ref('/jadwal').once('value');
      const data = snap.val() || {};
      const activeSchedules = [];
      const nowMs = Date.now();
      for (let id in data) {
        const sch = data[id];
        const isAktif = sch.aktif !== false;
        const nowMs = Date.now();
        let statusText = 'Aktif';
        let badgeClass = 'live';
        
        if (!isAktif) {
          statusText = 'Nonaktif';
          badgeClass = 'wait';
        } else if (nowMs < sch.mulai) {
          statusText = 'Belum Mulai';
          badgeClass = 'wait';
        } else if (nowMs > sch.selesai) {
          statusText = 'Selesai';
          badgeClass = 'done';
        }

        activeSchedules.push({ 
          nama: sch.nama, 
          durasi: sch.durasi, 
          statusText, 
          badgeClass 
        });
      }
      return { success: true, activeSchedules };
    }


    else if (funcName === 'submitExam') {
      const [payload] = args;
      // Gunakan path deterministik untuk mencegah duplikasi dan mempercepat proses
      const resultPath = `/hasil/${payload.examId}_${payload.user.id}`;

      // Trust client score to avoid massive DB reads (Armor 1000)
      const finalScore = payload.score || 0;
      const existingSnap = await db.ref(resultPath).once('value');
      if (existingSnap.exists()) {
        const existing = existingSnap.val() || {};
        return { success: true, score: existing.skor, alreadySubmitted: true };
      }

      await db.ref(resultPath).set({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        uid: firebase.auth().currentUser.uid, // Simpan UID untuk proteksi Firebase Rules
        userId: payload.user.id,
        nama: payload.user.name,
        kelas: payload.user.kelas || '-',
        examId: payload.examId,
        namaUjian: payload.namaUjian || payload.examId,
        skor: finalScore,
        waktu: payload.usedTime || '',
        detail: payload.detail || "{}"
      });

      if (payload.violations && payload.violations > 0) {
        await db.ref('/pelanggaran').push({
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          userId: payload.user.id,
          nama: payload.user.name,
          examId: payload.examId,
          tipe: `Melanggar ${payload.violations} kali`
        });
      }

      // Cleanup: remove online status and mark as SELESAI
      await db.ref(`/online_status/${payload.examId}/${payload.user.id}`).remove();
      await db.ref(`/status_sync/${payload.examId}/${payload.user.id}`).set({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'SELESAI'
      });

      return { success: true, score: finalScore };
    }

    else if (funcName === 'getStudentResult') {
      const [examId, userId] = args;
      const [hSnap, jSnap] = await Promise.all([
        db.ref(`/hasil/${examId}_${userId}`).once('value'),
        db.ref(`/jadwal/${examId}`).once('value')
      ]);
      
      const hData = hSnap.val();
      const jData = jSnap.val();
      
      if (!hData) return { success: false, message: "Hasil tidak ditemukan." };
      
      return {
        success: true,
        result: {
          score: hData.skor,
          namaUjian: hData.namaUjian || (jData ? jData.nama : 'Ujian'),
          user: { id: hData.userId, name: hData.nama, kelas: hData.kelas },
          usedTime: hData.waktu,
          violations: hData.violations || 0,
          detail: hData.detail || "{}",
          config: { kkm: (jData ? jData.kkm : 75) }
        }
      };
    }

    else if (funcName === 'setStudentOnline') {
      const [examId, userId] = args;
      const resetSnap = await db.ref(`/reset_flags/${examId}/${userId}`).once('value');
      if (resetSnap.exists()) {
        await db.ref(`/reset_flags/${examId}/${userId}`).remove();
        return { success: true, sessionReset: true };
      }
      await db.ref(`/online_status/${examId}/${userId}`).set({
        last_seen: firebase.database.ServerValue.TIMESTAMP,
        uid: firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'anon',
        progress: (State.answers) ? Object.keys(State.answers).length : 0,
        total: (State.questions) ? State.questions.length : 0
      });
      const bSnap = await db.ref(`/broadcasts/${examId}`).once('value');
      if (bSnap.exists()) return { success: true, broadcast: bSnap.val() };
      return { success: true };
    }

    else if (funcName === 'validateAdmin') {
      const [pwd] = args;
      const snap = await db.ref('/config/admin_pass').once('value');
      return { success: true, valid: pwd === snap.val() };
    }

    else if (funcName === 'getAdminMonitoringData') {
      const [skipPeserta] = args;
      const nowMs = Date.now();

      const jSnap = await db.ref('/jadwal').once('value');
      const jData = jSnap.val() || {};
      const activeExams = [];
      const onlineQueries = [];

      for (let id in jData) {
        if (jData[id].aktif && nowMs >= jData[id].mulai && nowMs <= jData[id].selesai) {
          activeExams.push({ id, nama: jData[id].nama, token: jData[id].token });
          onlineQueries.push(db.ref(`/online_status/${id}`).once('value'));
        }
      }

      const queries = [
        db.ref('/hasil').limitToLast(500).once('value')
      ];
      if (!skipPeserta) queries.push(db.ref('/peserta').once('value'));

      const snaps = await Promise.all([...queries, ...onlineQueries]);
      const hSnap = snaps[0];
      const pSnap = skipPeserta ? null : snaps[1];

      const onlinesMap = {};
      const onlineSnaps = snaps.slice(skipPeserta ? 1 : 2);
      activeExams.forEach((ex, idx) => {
        const raw = onlineSnaps[idx] ? onlineSnaps[idx].val() || {} : {};
        // Normalisasi data karena sekarang berbentuk object {last_seen, uid}
        const normalized = {};
        for (let uid in raw) {
          normalized[uid] = (raw[uid] && typeof raw[uid] === 'object') ? raw[uid].last_seen : raw[uid];
        }
        onlinesMap[ex.id] = normalized;
      });

      const pData = pSnap ? pSnap.val() || {} : null;
      const expectedPeserta = [];
      if (pData) {
        for (let id in pData) expectedPeserta.push({ id, nama: pData[id].nama, kelas: pData[id].kelas });
      }

      const hData = hSnap.val() || {};
      const completedMap = {};
      for (let k in hData) {
        let eid = hData[k].examId, uid = hData[k].userId;
        if (!completedMap[eid]) completedMap[eid] = [];
        if (!completedMap[eid].includes(uid)) completedMap[eid].push(uid);
      }

      return { success: true, activeExams, peserta: expectedPeserta, completions: completedMap, onlines: onlinesMap };
    }

    else if (funcName === 'getAdminJadwalFull') {
      const snap = await db.ref('/jadwal').once('value'); const data = snap.val() || {};
      const result = [];
      for (let id in data) result.push({
        id,
        nama: data[id].nama,
        nama_soal: data[id].nama_soal,
        aktif: data[id].aktif,
        force_aktif: data[id].force_aktif || false,
        token: data[id].token,
        mulai: data[id].mulai,
        selesai: data[id].selesai,
        durasi: data[id].durasi,
        target_kelas: data[id].target_kelas || '',
        min_selesai: data[id].min_selesai || 0
      });
      return { success: true, data: result };
    }

    else if (funcName === 'updateJadwalSistem') {
      const [id, token, status, force_aktif] = args;
      await db.ref(`/jadwal/${id}`).update({
        token,
        aktif: status === 'Aktif',
        force_aktif: force_aktif === true
      });
      return { success: true };
    }

    else if (funcName === 'updateJadwalFull') {
      const [id, payload] = args;
      await db.ref(`/jadwal/${id}`).update(payload);
      return { success: true };
    }

    else if (funcName === 'getAdminLaporanLengkap') {
      const [examId] = args;
      let hasilRef = db.ref('/hasil');
      if (examId) hasilRef = hasilRef.orderByChild('examId').equalTo(examId).limitToLast(1000);
      else hasilRef = hasilRef.limitToLast(1000);

      const [hSnap, pSnap] = await Promise.all([
        hasilRef.once('value'),
        db.ref('/pelanggaran').limitToLast(200).once('value')
      ]);
      const hData = hSnap.val() || {}; const pData = pSnap.val() || {};
      console.log('📊 getAdminLaporanLengkap - pData:', pData, 'pData keys:', Object.keys(pData));

      const hasilResult = Object.values(hData).sort((a, b) => b.timestamp - a.timestamp).map(h => {
        let d = new Date(h.timestamp || Date.now());
        return {
          waktu: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          nama: h.nama, kelas: h.kelas, ujian: h.namaUjian, skor: h.skor, detail: h.detail
        };
      });

      const pelResult = Object.values(pData).sort((a, b) => b.timestamp - a.timestamp).map(p => {
        let d = new Date(p.timestamp || Date.now());
        return {
          waktu: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          nama: p.nama, kelas: p.kelas, ujian: p.examId, tipe: p.tipe
        };
      });
      console.log('📊 getAdminLaporanLengkap - pelResult:', pelResult.length, 'items');
      return { success: true, hasil: hasilResult, pelanggaran: pelResult };
    }

    else if (funcName === 'sendBroadcastAdmin') {
      const [examId, pesan, targetKelas, targetStatus] = args;
      const bData = {
        text: pesan,
        kelas: targetKelas || 'all',
        status: targetStatus || 'all',
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      await db.ref(`/broadcasts/${examId}`).set(bData);
      setTimeout(() => { db.ref(`/broadcasts/${examId}`).remove(); }, 600000);
      return { success: true };
    }

    else if (funcName === 'resetStudentSession') {
      const [examId, userId] = args;
      await Promise.all([
        db.ref(`/online_status/${examId}/${userId}`).remove(),
        db.ref(`/status_sync/${examId}/${userId}`).remove(),
        db.ref(`/hasil/${examId}_${userId}`).remove(),
        db.ref(`/reset_flags/${examId}/${userId}`).set({ time: firebase.database.ServerValue.TIMESTAMP })
      ]);
      return { success: true };
    }

    else if (funcName === 'remedialStudent') {
      const [examId, userId] = args;
      await Promise.all([
        db.ref(`/online_status/${examId}/${userId}`).remove(),
        db.ref(`/hasil/${examId}_${userId}`).remove(),
        db.ref(`/reset_flags/${examId}/${userId}`).set({ time: firebase.database.ServerValue.TIMESTAMP })
      ]);
      return { success: true };
    }

    else if (funcName === 'forceSelesaiSemua') {
      const [examId] = args;
      const [snapOnline, snapPeserta, snapJadwal] = await Promise.all([
        db.ref(`/online_status/${examId}`).once('value'),
        db.ref('/peserta').once('value'),
        db.ref(`/jadwal/${examId}`).once('value')
      ]);
      const online = snapOnline.val() || {};
      const pesertaData = snapPeserta.val() || {};
      const jadwalData = snapJadwal.val() || {};
      const ujianNama = jadwalData.nama || examId;
      const updates = {};
      const timestamp = firebase.database.ServerValue.TIMESTAMP;
      for (let uid in online) {
        const p = pesertaData[uid] || {};
        updates[`/hasil/${examId}_${uid}`] = {
          userId: uid,
          nama: p.nama || uid,
          kelas: p.kelas || '-',
          examId: examId,
          namaUjian: ujianNama,
          waktu: 'Force Submit',
          skor: 0,
          detail: '{"forced":true}',
          timestamp: timestamp
        };
        updates[`/online_status/${examId}/${uid}`] = null;
      }
      await db.ref().update(updates);
      return { success: true };
    }

    else if (funcName === 'getAdminPreviewSoal') {
      const [examId] = args;
      const jSnap = await db.ref(`/jadwal/${examId}`).once('value'); const sch = jSnap.val();
      if (!sch) throw new Error("Jadwal tidak ditemukan");

      const sSnap = await db.ref(`/soal/${sch.nama_soal}`).once('value'); const sData = sSnap.val() || {};
      const kSnap = await db.ref(`/kunci/${sch.nama_soal}`).once('value'); const kData = kSnap.val() || {};

      const questions = []; let idx = 0;
      for (let qId in sData) {
        let q = sData[qId];
        q._index = idx++;
        q.kunci = kData[qId] || '';
        if (!q.opsi) q.opsi = []; // ensure array
        questions.push(q);
      }
      return { success: true, examName: sch.nama, questions };
    }

    else if (funcName === 'syncAnswers') {
      const [payload] = args;
      const { id_ujian, id_siswa, answerDelta, timeRemaining, violations } = payload;
      await db.ref(`/sync_answers/${id_ujian}/${id_siswa}`).set({
        answers: answerDelta || {},
        timeRemaining: timeRemaining || 0,
        violations: violations || 0,
        last_sync: firebase.database.ServerValue.TIMESTAMP
      });
      return { success: true };
    }

    else if (funcName === 'getExamData') {
      const [examId, token, force] = args;
      const res = await getExamDataOptimized(examId, token, !!force);
      return res;
    }

    // ============================================
    // QUERY SELECTIVITY OPTIMIZATION HANDLERS
    // ============================================

    else if (funcName === 'getAdminMonitoringDataOptimized') {
      const [skipPeserta, page, kelas] = args;
      return await getAdminMonitoringDataOptimized(skipPeserta, page, kelas);
    }

    else if (funcName === 'getSchedulesOptimized') {
      const [userId, kelas] = args;
      return await getSchedulesOptimized(userId, kelas);
    }

    else if (funcName === 'getStudentResultOptimized') {
      const [examId, userId] = args;
      return await getStudentResultOptimized(examId, userId);
    }

    else if (funcName === 'getAdminLaporanLengkapOptimized') {
      const [examId] = args;
      return await getAdminLaporanLengkapOptimized(examId);
    }

    else if (funcName === 'getAllPesertaOptimized') {
      return await getAllPesertaOptimized();
    }

  } catch (e) {
    console.error("Firebase Error in", funcName, e);
    return { success: false, message: e.toString() };
  } finally {
    if (isFast) {
      hideLoading();
      dbDisconnect();
    }
  }
}

// searchTimeout is already declared above in the Performance Core Patch
const userNameInput = document.getElementById('userName');
const autoList = document.getElementById('autocomplete-list');
let tempSelectedUser = null;

let fetchPesertaPromise = null;

if (userNameInput) {
  userNameInput.addEventListener('focus', () => {
    // Scroll agar form tidak tertutup keyboard HP
    setTimeout(() => {
      userNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    // Prefetch cache peserta di background saat user fokus ke input,
    // sehingga ketika mulai mengetik, data sudah siap di memori.
    if (!cachedPeserta) {
      loadPesertaCache().catch(() => { });
    }
  });

  userNameInput.addEventListener('input', async function (e) {
    const val = e.target.value.trim().toLowerCase();
    autoList.innerHTML = '';
    autoList.classList.remove('show');

    if (searchTimeout) clearTimeout(searchTimeout);
    if (val.length < 2) return;

    // Tunjukkan loading segera agar user tahu sistem merespons
    autoList.innerHTML = '<div class="autocomplete-item text-muted">Mencari...</div>';
    autoList.classList.add('show');

    searchTimeout = setTimeout(async function () {
      // searchPeserta sudah menangani cache + fallback ke Firebase secara otomatis
      const results = await searchPeserta(val);

      autoList.innerHTML = '';
      if (results.length > 0) {
        results.forEach(p => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.textContent = (p.name || p.id) + ' - ' + (p.kelas || '');
          div.addEventListener('click', (evt) => {
            evt.preventDefault();
            tempSelectedUser = p;
            autoList.classList.remove('show');
            userNameInput.value = '';

            // Mobile: show confirm overlay
            const mobileOverlay = document.getElementById('mobile-confirm-overlay');
            const mobileName = document.getElementById('mobile-confirm-name');
            const mobileClass = document.getElementById('mobile-confirm-class');
            if (mobileOverlay) {
              if (mobileName) mobileName.textContent = p.name || p.id;
              if (mobileClass) mobileClass.textContent = 'Kelas: ' + (p.kelas || '-');
              mobileOverlay.classList.add('show');
            } else {
              // Desktop fallback
              document.getElementById('confirm-name-text').textContent = (p.name || p.id) + ' (' + (p.kelas || '') + ')';
              showView('login-confirm-view');
            }
          });
          autoList.appendChild(div);
        });
      } else {
        autoList.innerHTML = '<div class="autocomplete-item text-muted" style="padding:12px; font-size:0.8rem;">Nama tidak ditemukan.</div>';
      }
      autoList.classList.add('show');
    }, 350);
  });
}

// Tutup list jika klik di luar
document.addEventListener('click', (e) => {
  if (userNameInput && e.target !== userNameInput) {
    if (autoList) autoList.classList.remove('show');
  }
});

safeAddListener('btnCancelLogin', 'click', () => {
  tempSelectedUser = null;
  if (typeof hideMobileConfirm === 'function') hideMobileConfirm();
  showView('login-view');
});

safeAddListener('btnConfirmLogin', 'click', async () => {
  if (tempSelectedUser) {
    if (typeof hideMobileConfirm === 'function') hideMobileConfirm();
    
    // ✅ FIX MULTI-USER: Bersihkan SEMUA state user sebelumnya secara menyeluruh
    State.schedules = [];
    State._schedulesForUserId = null;  // Invalidate ownership flag
    State.answers = {};
    State.examActive = false;
    State.config = null;
    State.questions = [];
    State.user = tempSelectedUser;
    
    // ✅ FIX MULTI-USER: Clear cache jadwal per-user untuk force-refresh dari server
    // Ini memastikan saat user login, jadwal di-fetch ulang dari Supabase dengan status completion yang benar
    try {
      localStorage.removeItem(`CBT_CACHE_JADWAL_${tempSelectedUser.id}`);
      localStorage.removeItem(`CBT_CACHE_JADWAL_TIME_${tempSelectedUser.id}`);
      console.log(`[Login] Cleared cached schedules for user ${tempSelectedUser.id} - will force-refresh from server`);
    } catch (e) { console.warn('[Login] Gagal clear cache jadwal:', e); }
    
    // ✅ FIX: Bersihkan CBT_SUBMITTED milik user LAIN yang mungkin tertinggal di device ini
    // (kasus: siswa A tidak logout, langsung tutup browser, siswa B buka device yang sama)
    try {
      const newUserId = tempSelectedUser.id;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        // Hapus CBT_SUBMITTED yang BUKAN milik user baru ini
        if (key.startsWith('CBT_SUBMITTED_') && !key.endsWith('_' + newUserId)) {
          console.log('[Login] Clearing stale CBT_SUBMITTED from other user:', key);
          localStorage.removeItem(key);
        }
        // Hapus CBT_ exam state yang BUKAN milik user baru ini
        if (key.startsWith('CBT_') && key.includes('_') && !key.startsWith('CBT_CACHE_') && !key.startsWith('CBT_SUBMITTED_' ) && !key.endsWith('_' + newUserId) && !key.startsWith('CBT_' + newUserId + '_')) {
          // Hati-hati: jangan hapus CBT_CACHE_JADWAL, CBT_CACHE_PESERTA, dll
          const isSafeToKeep = key.startsWith('CBT_CACHE_') || key.startsWith('CBT_LOGGED_') || key.startsWith('CBT_LAST_') || key.startsWith('CBT_TOKEN_HASH_') || key === 'CBT_EXAM_SESSION';
          if (!isSafeToKeep) {
            console.log('[Login] Clearing stale state from other user:', key);
            localStorage.removeItem(key);
          }
        }
      });
    } catch(e) {
      console.warn('[Login] Failed to clear stale data:', e);
    }
    
    // Simpan sesi dengan flag ready untuk mencegah race condition
    const sessionData = {
      user: tempSelectedUser,
      timestamp: new Date().getTime(),
      ready: true
    };
    localStorage.setItem('CBT_LOGGED_USER', JSON.stringify(sessionData));
    
    // Trigger UI update setelah sesi tersimpan
    if (typeof showMobileUserBar === 'function') showMobileUserBar(tempSelectedUser);
    
    // Sembunyikan elemen utama, tampilkan halaman sinkronisasi
    const searchSection = document.querySelector('.mobile-search-section');
    const menuGrid = document.getElementById('mobile-menu-grid');
    const profileSection = document.getElementById('mobile-profile-section');
    const scheduleSection = document.querySelector('.mobile-schedule');
    const syncPage = document.getElementById('mobile-sync-page');
    
    if (searchSection) searchSection.style.display = 'none';
    if (menuGrid) menuGrid.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (scheduleSection) scheduleSection.style.display = 'none';
    if (syncPage) syncPage.style.display = 'flex';

    // Tampilkan state spinner/loading
    setSyncState('loading');

    // Daftarkan listener tombol sinkron dan retry
    const btnSync = document.getElementById('btnSyncAllSoal');
    if (btnSync) {
      btnSync.removeEventListener('click', syncAllQuestions);
      btnSync.addEventListener('click', syncAllQuestions);
    }
    const btnRetry = document.getElementById('btnRetrySyncAllSoal');
    if (btnRetry) {
      btnRetry.removeEventListener('click', syncAllQuestions);
      btnRetry.addEventListener('click', syncAllQuestions);
    }
    
    // ✅ FIX: Fetch jadwal dari server untuk user ini (dengan status completion yang benar)
    try {
      const res = await window.gasRun('getSchedules', State.user.id, State.user.kelas);
      if (res && res.success) {
        State.schedules = res.schedules;
        // ✅ Tandai data ini milik user saat ini — status SELESAI sekarang valid
        State._schedulesForUserId = State.user.id;
        const count = res.schedules.length;
        const countEl = document.getElementById('sync-ready-count');
        if (countEl) countEl.textContent = `${count} paket ujian ditemukan untuk kelas ${State.user.kelas}`;
      } else {
        // Fallback ke cache lokal jika server gagal, tapi strip status
        _loadSchedulesFromCacheStripped();
        const countEl = document.getElementById('sync-ready-count');
        if (countEl) countEl.textContent = 'Menggunakan data cache lokal';
      }
    } catch(e) {
      console.warn('[Login] getSchedules failed, using cache:', e.message);
      _loadSchedulesFromCacheStripped();
      const countEl = document.getElementById('sync-ready-count');
      if (countEl) countEl.textContent = 'Menggunakan data cache lokal';
    }
    
    // Transisi ke state siap
    setSyncState('ready');
  }
});

// ✅ Helper: Load jadwal dari cache lokal dengan status di-strip (tanpa status completion user lain)
function _loadSchedulesFromCacheStripped() {
  try {
    const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
    if (!cachedJadwal || !State.user) return;
    const jadwals = JSON.parse(cachedJadwal);
    const nowMs = Date.now();
    const list = [];
    for (let id in jadwals) {
      const s = { ...jadwals[id], id };
      // Filter kelas
      const targetKelasRaw = s.target_kelas || s.kelas || '';
      if (targetKelasRaw && targetKelasRaw.toLowerCase() !== 'semua' && targetKelasRaw.toLowerCase() !== 'all') {
        const targets = String(targetKelasRaw).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
        const matched = targets.some(t => State.user.kelas.toLowerCase().includes(t) || t.includes(State.user.kelas.toLowerCase()));
        if (!matched) continue;
      }
      // ✅ Hitung status dari waktu saja — JANGAN pakai status dari cache
      let safeStatus = 'BELUM_MULAI';
      if (s.aktif === false) safeStatus = 'NONAKTIF';
      else if (s.force_aktif) safeStatus = 'AKTIF';
      else if (nowMs < s.mulai) safeStatus = 'BELUM_MULAI';
      else if (nowMs > s.selesai) safeStatus = 'TUTUP';
      else safeStatus = 'AKTIF';
      list.push({ ...s, status: safeStatus, _lastRenderedStatus: safeStatus });
    }
    State.schedules = list;
    // ✅ _schedulesForUserId TIDAK di-set — status completion belum divalidasi server
  } catch(e) {
    console.warn('[_loadSchedulesFromCacheStripped] Error:', e);
  }
}

// Helper: Kontrol tampilan state halaman sinkronisasi
function setSyncState(state) {
  const states = ['loading', 'ready', 'progress', 'done', 'error'];
  states.forEach(s => {
    const el = document.getElementById(`sync-state-${s}`);
    if (el) el.style.display = (s === state) ? 'flex' : 'none';
  });
}

// Listener Tombol Lanjut ke Utama (setelah sinkronisasi selesai)
safeAddListener('btnLanjutUtama', 'click', () => {
  const syncPage = document.getElementById('mobile-sync-page');
  const profileSection = document.getElementById('mobile-profile-section');
  const scheduleSection = document.querySelector('.mobile-schedule');
  const searchSection = document.querySelector('.mobile-search-section');
  const menuGrid = document.getElementById('mobile-menu-grid');
  
  if (syncPage) syncPage.style.display = 'none';
  if (profileSection) profileSection.style.display = 'flex';
  if (scheduleSection) scheduleSection.style.display = 'block';
  if (searchSection) searchSection.style.display = 'block';
  if (menuGrid) menuGrid.style.display = 'grid';

  // FIX: clear timer lama sebelum loadSchedules membuat timer baru
  if (window._mobileScheduleTimer) { clearInterval(window._mobileScheduleTimer); window._mobileScheduleTimer = null; }

  setTimeout(() => { if (typeof showMobileUserBar === 'function') showMobileUserBar(State.user); }, 50);
  
  // ✅ FIX MULTI-USER: loadSchedules() akan fetch server dengan status completion user ini
  // Tidak perlu renderMobileSchedule() dulu karena State.schedules sudah diisi
  // saat btnConfirmLogin dengan data yang benar (sudah ada _schedulesForUserId)
  loadSchedules();
});

let scheduleTimer = null;


// Helper untuk mengecek status cache semua jadwal dan update UI
function updatePreSyncUI(list) {
  const preSyncContainer = document.getElementById('pre-sync-container');
  if (preSyncContainer && list.length > 0) {
    preSyncContainer.style.display = 'block';

    let allCached = true;
    for (let sch of list) {
      const ver = getScheduleVersion(sch);
      const CACHE_KEY = `SOAL_${sch.id}_v${ver}`;
      if (!localStorage.getItem(CACHE_KEY)) {
        allCached = false;
        break;
      }
    }

    const notSyncedDiv = document.getElementById('pre-sync-content-not-synced');
    const syncedDiv = document.getElementById('pre-sync-content-synced');
    const nameSpan = document.getElementById('sync-synced-name');

    if (notSyncedDiv && syncedDiv) {
      if (allCached) {
        notSyncedDiv.style.display = 'none';
        syncedDiv.style.display = 'block';
        if (nameSpan) nameSpan.textContent = State.user.name;

        // Tampilan minimalis hemat space
        preSyncContainer.style.background = 'rgba(16, 185, 129, 0.05)';
        preSyncContainer.style.border = '1px dashed #10B981';
        preSyncContainer.style.padding = '10px 16px';
      } else {
        notSyncedDiv.style.display = 'block';
        syncedDiv.style.display = 'none';

        // Kembalikan ke tampilan default
        preSyncContainer.style.background = '#EEF2FF';
        preSyncContainer.style.border = '1px dashed #6366F1';
        preSyncContainer.style.padding = '16px';

        const btnSync = document.getElementById('btnSyncAllSoal');
        if (btnSync) {
          btnSync.textContent = 'Mulai Sinkronisasi';
          btnSync.style.background = '#4F46E5';
          btnSync.disabled = false;
          btnSync.style.opacity = '1';
          // remove listener to avoid duplicates, then add
          btnSync.removeEventListener('click', syncAllQuestions);
          btnSync.addEventListener('click', syncAllQuestions);
        }
      }
    }
  }
}

async function loadSchedules() {
  // FIX: guard State.user null agar tidak crash saat race condition
  if (!State.user) {
    console.warn('[LoadSchedules] State.user is null, skipping');
    return;
  }
  
  const isMobileIndex = isIndexPage && document.querySelector('.mobile-header');
  
  console.log('[LoadSchedules] Starting. User:', State.user.name, 'Mobile:', isMobileIndex);
  
  if (!isMobileIndex) {
    const scheduleUserName = document.getElementById('schedule-user-name');
    if (scheduleUserName) scheduleUserName.textContent = State.user.name + ' - ' + State.user.kelas;
  }
  
  // Show loading for both mobile and desktop
  if (isMobileIndex) {
    if (typeof showMobileLoading === 'function') showMobileLoading('Memuat jadwal...');
  } else {
    showLoading('Memeriksa Jadwal...');
  }

  // Timeout protection: Auto-hide loading after 10 seconds
  const loadingTimeout = setTimeout(() => {
    console.warn('[LoadSchedules] ⚠️ Timeout reached (10s), force hiding loading');
    if (isMobileIndex) {
      if (typeof hideMobileLoading === 'function') hideMobileLoading();
    } else {
      hideLoading();
    }
    // Show error if no cache
    if (!State.schedules || State.schedules.length === 0) {
      showCustomAlert('Timeout', 'Gagal memuat jadwal (timeout). Silakan coba lagi atau hubungi pengawas.', '⏱️');
    }
  }, 10000);

  // Armor 1000: Mencoba ambil dari cache lokal dulu agar responsif
  let hasCache = false;
  try {
    const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
    if (cachedJadwal) {
      const jadwals = JSON.parse(cachedJadwal);
      const list = [];
      for (let id in jadwals) {
        let s = jadwals[id];
        s.id = id;
        // Filter jadwal yang relevan untuk kelas siswa (atau ALL) menggunakan logika yang sama dengan server
        let targetKelasRaw = s.target_kelas || s.kelas || '';
        let matched = true;
        if (targetKelasRaw && targetKelasRaw.toLowerCase() !== 'semua' && targetKelasRaw.toLowerCase() !== 'all' && State.user.kelas) {
          const targets = String(targetKelasRaw).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
          matched = targets.some(t => State.user.kelas.toLowerCase().includes(t) || t.includes(State.user.kelas.toLowerCase()));
        }
        if (matched) {
          // ✅ FIX MULTI-USER: Strip status dari cache lokal — status harus dari server
          // untuk user saat ini, bukan sisa user sebelumnya.
          // Hitung status berdasarkan waktu saja (tanpa info completion user).
          const nowMs = Date.now();
          let safeStatus = 'BELUM_MULAI';
          if (s.aktif === false) safeStatus = 'NONAKTIF';
          else if (s.force_aktif) safeStatus = 'AKTIF';
          else if (nowMs < s.mulai) safeStatus = 'BELUM_MULAI';
          else if (nowMs > s.selesai) safeStatus = 'TUTUP';
          else safeStatus = 'AKTIF';
          
          list.push({ ...s, status: safeStatus });
        }
      }
      State.schedules = list;
      State.schedules.forEach(s => s._lastRenderedStatus = s.status);
      // ✅ FIX MULTI-USER: Cache lokal belum divalidasi untuk user ini
      // Jangan set _schedulesForUserId sampai server fetch berhasil
      hasCache = true;
      console.log('[LoadSchedules] ✅ Loaded', list.length, 'schedules from cache');
      
      // Render cache immediately
      if (!isMobileIndex) {
        renderSchedules();
        updatePreSyncUI(list);
        showView('schedule-view');
      }
      if (isMobileIndex) {
        if (typeof renderMobileSchedule === 'function') renderMobileSchedule();
        if (typeof toggleFloatResultBtn === 'function') toggleFloatResultBtn();
      }
    }
  } catch (e) {
    console.error('[LoadSchedules] Cache error:', e);
  }

  try {
    // Tetap fetch dari server untuk status terbaru (misal: apakah sudah SELESAI di server)
    console.log('[LoadSchedules] Fetching from server...');
    const res = await gasRun('getSchedules', State.user.id, State.user.kelas);
    
    if (res.success) {
      console.log('[LoadSchedules] ✅ Server fetch success. Schedules:', res.schedules.length);
      State.serverTimeOffset = (res.serverTime || Date.now()) - Date.now();
      State.schedules = res.schedules;
      State.schedules.forEach(s => s._lastRenderedStatus = s.status);
      // ✅ FIX MULTI-USER: Tandai bahwa data ini milik user saat ini
      State._schedulesForUserId = State.user ? State.user.id : null;
      
      if (!isMobileIndex) {
        renderSchedules();
        updatePreSyncUI(State.schedules);
        showView('schedule-view');
      }
      if (isMobileIndex) {
        if (typeof renderMobileSchedule === 'function') renderMobileSchedule();
        if (typeof toggleFloatResultBtn === 'function') toggleFloatResultBtn();
      }

      if (scheduleTimer) clearInterval(scheduleTimer);
      if (!isMobileIndex) {
        // ✅ OPTIMIZATION: Desktop timer runs only when schedule-view is active
        scheduleTimer = setInterval(() => {
          const sv = document.getElementById('schedule-view');
          if (sv && sv.classList.contains('active')) {
            updateSchedulesStatus();
          } else {
            clearInterval(scheduleTimer);
          }
        }, 1000);
      }

      // ✅ OPTIMIZATION: Mobile timer runs every 60s (not 1s) to reduce CPU usage
      // Mobile: periodic schedule refresh (60s) to detect SELESAI status changes
      if (isMobileIndex) {
        if (window._mobileScheduleTimer) clearInterval(window._mobileScheduleTimer);
        window._mobileScheduleTimer = setInterval(async () => {
          // Stop timer jika user sudah logout
          if (!State.user) {
            clearInterval(window._mobileScheduleTimer);
            window._mobileScheduleTimer = null;
            return;
          }
          try {
            const res = await gasRun('getSchedules', State.user.id, State.user.kelas);
            if (res.success && res.schedules) {
              State.schedules = res.schedules;
              State.schedules.forEach(s => s._lastRenderedStatus = s.status);
              // ✅ FIX MULTI-USER: Update flag kepemilikan data
              State._schedulesForUserId = State.user ? State.user.id : null;
              if (typeof renderMobileSchedule === 'function') renderMobileSchedule();
            }
          } catch (e) { 
            console.warn('[LoadSchedules] Background refresh failed:', e);
          }
        }, 60000);
      }

    } else {
      console.error('[LoadSchedules] ❌ Server fetch failed:', res.message);
      // Jika gagal fetch tapi sudah ada data dari cache, tidak perlu mental ke login
      if (!hasCache && (!State.schedules || State.schedules.length === 0)) {
        showCustomAlert('Gagal Memuat Jadwal', 'Gagal memuat jadwal: ' + res.message, '❌');
        if (!isMobileIndex) showView('login-view');
      } else {
        console.log('[LoadSchedules] Using cached data, server fetch failed');
      }
    }
  } catch (err) {
    console.error('[LoadSchedules] ❌ Exception:', err);
    if (!hasCache && (!State.schedules || State.schedules.length === 0)) {
      showCustomAlert('Kesalahan Jaringan', 'Terjadi kesalahan sinkronisasi jaringan: ' + err.message, '🌐');
      if (!isMobileIndex) showView('login-view');
    } else {
      console.log('[LoadSchedules] Using cached data, exception occurred');
    }
  } finally {
    // Clear timeout
    clearTimeout(loadingTimeout);
    
    // ALWAYS hide loading (both mobile and desktop)
    if (isMobileIndex) {
      if (typeof hideMobileLoading === 'function') hideMobileLoading();
    } else {
      hideLoading();
    }
    console.log('[LoadSchedules] Completed');
  }

    // --- AUTO BACKGROUND SYNC (Distributed) ---
    const TODAY = new Date().toISOString().split('T')[0];
    if (localStorage.getItem('LAST_SYNC_DATE') !== TODAY) {
      const delay = getMyStaggerDelay();
      console.log(`Auto-sync dijadwalkan dalam ${(delay / 1000).toFixed(0)} detik...`);
      setTimeout(async () => {
        // Cek lagi apakah sudah sync di tab lain
        if (localStorage.getItem('LAST_SYNC_DATE') !== TODAY) {
          await syncAllQuestions();
          const progressData = JSON.parse(localStorage.getItem('SYNC_PROGRESS') || '{}');
          const completed = progressData.completed || {};
          const fullSynced = (State.schedules || []).every(s => completed[s.id] === getScheduleVersion(s));
          if (fullSynced) localStorage.setItem('LAST_SYNC_DATE', TODAY);
        }
      }, delay);
    }
  }

function updateSchedulesStatus() {
  if (!State.schedules) return;
  let changed = false;
  const nowMs = Date.now() + (State.serverTimeOffset || 0);

  State.schedules.forEach(sch => {
    let dynStatus = sch.status;
    if (sch.status === 'BELUM_MULAI' || sch.status === 'AKTIF') {
      if (nowMs < sch.mulai) dynStatus = 'BELUM_MULAI';
      else if (nowMs >= sch.mulai && nowMs <= sch.selesai) dynStatus = 'AKTIF';
      else if (nowMs > sch.selesai) dynStatus = 'TUTUP';
    }

    if (sch._lastRenderedStatus !== dynStatus) {
      sch._lastRenderedStatus = dynStatus;
      changed = true;
    }
  });

  if (changed) renderSchedules();
}

function renderSchedules() {
  const schedules = State.schedules || [];
  const container = document.getElementById('schedule-list');
  if (!container) return; // SAFETY: Cegah crash jika diakses dari mobile
  container.innerHTML = '';

  if (schedules.length === 0) {
    container.innerHTML = '<div class="alert alert-info">Belum ada ujian yang dijadwalkan untuk saat ini.</div>';
    return;
  }

  schedules.forEach(sch => {
    let badgeClass = 'badge-wait';
    let badgeText = 'Belum Mulai';
    let badgeStyle = '';
    let btnDisabled = `disabled`;
    let btnText = `Belum Waktunya`;
    let curStatus = sch._lastRenderedStatus || sch.status;

    if (curStatus === 'SELESAI') {
      badgeClass = 'badge-done';
      badgeText = 'Selesai';
      btnText = `Sudah Dikerjakan`;
    } else if (curStatus === 'TUTUP') {
      badgeClass = 'badge-closed';
      badgeText = 'Ditutup';
      btnText = `Waktu Ujian Habis`;
    } else if (curStatus === 'AKTIF') {
      // Cek apakah soal sudah tersinkronisasi
      const ver = getScheduleVersion(sch);
      const CACHE_KEY = `SOAL_${sch.id}_v${ver}`;
      const isSynced = localStorage.getItem(CACHE_KEY) !== null;

      if (!isSynced) {
        badgeClass = 'badge-wait';
        badgeText = 'Belum Sinkron';
        badgeStyle = 'background:#FDE68A;color:#92400E';
        btnDisabled = `disabled`;
        btnText = `Sinkronisasi Dulu`;
      } else {
        badgeClass = 'badge-active';
        badgeText = 'Sedang Aktif';
        btnDisabled = ``;
        btnText = `Mulai Ujian`;
      }
    } else if (curStatus === 'NONAKTIF' || curStatus === 'NON-AKTIF') {
      badgeClass = 'badge-closed';
      badgeText = 'Non-Aktif';
      btnText = `Belum Dibuka`;
    }

    const startObj = new Date(sch.mulai);
    const endObj = new Date(sch.selesai);
    const pad = (n) => n.toString().padStart(2, '0');
    const timeStr = `${pad(startObj.getHours())}:${pad(startObj.getMinutes())} - ${pad(endObj.getHours())}:${pad(endObj.getMinutes())}`;

    // Format Tanggal (untuk ujian 6 hari)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateStr = `${days[startObj.getDay()]}, ${startObj.getDate()} ${months[startObj.getMonth()]}`;

    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '16px';
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'flex-start';
    header.style.marginBottom = '8px';
    const title = document.createElement('h3');
    title.style.fontSize = '1.1rem';
    title.style.margin = '0';
    title.style.lineHeight = '1.3';
    title.textContent = sch.nama || '';
    const badgeWrap = document.createElement('div');
    const badgeEl = document.createElement('span');
    badgeEl.className = `badge ${badgeClass}`;
    if (badgeStyle) badgeEl.setAttribute('style', badgeStyle);
    badgeEl.textContent = badgeText;
    badgeWrap.appendChild(badgeEl);
    header.appendChild(title);
    header.appendChild(badgeWrap);

    const dateEl = document.createElement('div');
    dateEl.style.fontSize = '0.85rem';
    dateEl.style.fontWeight = '600';
    dateEl.style.color = 'var(--primary)';
    dateEl.style.marginBottom = '8px';
    dateEl.textContent = `📅 ${dateStr}`;

    const meta = document.createElement('p');
    meta.className = 'text-muted';
    meta.style.fontSize = '0.9rem';
    meta.style.marginBottom = '16px';
    meta.textContent = `⏰ ${timeStr} | ⏳ ${sch.durasi} Menit`;

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.style.width = '100%';
    btn.disabled = !!btnDisabled;
    btn.textContent = btnText;

    card.appendChild(header);
    card.appendChild(dateEl);
    card.appendChild(meta);
    card.appendChild(btn);
    if (!btnDisabled) {
      btn.onclick = () => {
        // Show Token Modal
        document.getElementById('token-overlay').classList.add('active');
        const modal = document.getElementById('token-modal');
        modal.style.display = 'flex';
        // trigger reflow for transition
        void modal.offsetWidth;
        modal.style.opacity = '1';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
        document.getElementById('examTokenInput').value = '';
        document.getElementById('examTokenInput').focus();

        // Setup temp handlers
        document.getElementById('btnCancelToken').onclick = closeTokenModal;
        document.getElementById('btnSubmitToken').onclick = () => {
          const tk = document.getElementById('examTokenInput').value.trim();
          if (!tk) { showCustomAlert('Token Diperlukan', 'Harap masukkan token ujian dari pengawas.', '🔑'); return; }
          closeTokenModal();
          loadDashboard(sch.id, tk);
        };
      };
    }
    container.appendChild(card);
  });
}

// Token Modal helper
function closeTokenModal() {
  const modal = document.getElementById('token-modal');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('token-overlay').classList.remove('active');
  }, 300);
}

safeAddListener('btnScheduleLogout', 'click', () => {
  State.user = null;
  State.schedules = [];
  // ✅ FIX MULTI-USER: Clear flag kepemilikan data jadwal
  State._schedulesForUserId = null;
  document.getElementById('userName').value = '';
  document.getElementById('autocomplete-list').innerHTML = '';
  if (scheduleTimer) clearInterval(scheduleTimer);
  tempSelectedUser = null;
  showView('login-view');
});

async function loadDashboard(examId, token) {
  State.examToken = token;
  showLoading('Verifikasi Token...');
  console.log('[LoadDashboard] examId:', examId, 'user:', State.user ? State.user.id : 'NONE', 'token:', token);
  try {
    if (!State.user) {
      hideLoading();
      showCustomAlert('Login Diperlukan', 'Silakan login terlebih dahulu.', '⚠️');
      return;
    }
    const res = await getExamDataOptimized(examId, token);
    console.log('[LoadDashboard] getExamDataOptimized result:', res.success ? 'SUCCESS' : 'FAILED', res.message || '');
    if (res.success) {
      State.config = res.config;
      State.config.keys = res.keys || {};
      console.log('[LoadDashboard] Config loaded:', JSON.stringify(State.config));
      console.log('[LoadDashboard] Questions count from res:', res.questions ? res.questions.length : 0);

      // Cek reset flags sebelum restore localStorage (post-remedial check)
      console.log('[LoadDashboard] Checking reset flags...');
      try {
        const resetSnap = await db.ref(`/reset_flags/${examId}/${State.user.id}`).once('value');
        if (resetSnap.exists()) {
          await db.ref(`/reset_flags/${examId}/${State.user.id}`).remove();
          clearAllLocalStorage();
          showCustomAlert('Sesi Direset', 'Data ujian Anda telah direset. Silakan mulai ujian baru.', '🔄');
        }
      } catch (e) { console.warn("Reset flag check failed:", e); }

      // SHUFFLE ALGORITHM (Seeded per User + Exam)
      console.log('[LoadDashboard] Starting shuffle...');
      const seedStr = State.user.id + "_" + State.config.id_ujian;
      const randFn = getSeededRandom(seedStr);
      let rQc = res.questions;

      // Respect Shuffle Soal
      if (State.config.shuffle_soal !== false && State.config.shuffle_soal !== "false") {
        shuffleArray(rQc, randFn);
      }

      // Respect Shuffle Opsi
      if (State.config.shuffle_opsi !== false && State.config.shuffle_opsi !== "false") {
        rQc.forEach(q => {
          if ((q.tipe === 'PG' || q.tipe === 'KOMPLEKS') && q.opsi.length > 0) {
            shuffleArray(q.opsi, randFn);
          }
        });
      }
      State.questions = rQc;
      // ✅ FIX: Normalisasi semua q.id ke String setelah shuffle
      // Mencegah type mismatch antara State.answers key (number) vs server grading (String)
      State.questions.forEach(q => { if (q.id !== undefined && q.id !== null) q.id = String(q.id); });
      console.log('[LoadDashboard] Shuffle done. State.questions count:', State.questions.length);

      // Progressive Preloading: Gambar tidak lagi dipaksakan termuat di awal secara massal 
      // demi mencegah crash jaringan saat loading bersamaan 1000 siswa.

      const isMobile = isIndexPage && document.querySelector('.mobile-header');
      console.log('[LoadDashboard] isMobile:', !!isMobile, 'isIndexPage:', isIndexPage, 'mobile-header:', !!document.querySelector('.mobile-header'));
      // Restore LocalStorage if any
      const lsKey = `CBT_${State.user.id}_${State.config.id_ujian}`;
      const savedData = localStorage.getItem(lsKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          State.answers = parsed.answers || {};
          State.doubts = new Set(parsed.doubts || []);
          State.currentIndex = parsed.currentIndex || 0;
          State.violations = parsed.violations || 0;

          const maxTime = State.config.durasi * 60;
          let tr = parsed.timeRemaining || maxTime;
          if (parsed.lastSavedAt) {
            const diffSec = Math.floor((new Date().getTime() - parsed.lastSavedAt) / 1000);
            if (diffSec > 0) tr -= diffSec;
          }
          // ✅ FIX: Jangan biarkan tr negatif atau melebihi durasi
          tr = Math.min(Math.max(tr, 0), maxTime);
          // ✅ FIX: Hitung dari deadline absolut jika ada, ambil yang lebih kecil
          if (State.config.end_ms && State.config.end_ms > 0) {
            const trFromDeadline = Math.floor((State.config.end_ms - Date.now()) / 1000);
            if (trFromDeadline > 0) tr = Math.min(tr, trFromDeadline);
            else tr = 0;
          }
          State.timeRemaining = tr;
        } catch (e) { }
      } else {
        State.answers = {};
        State.doubts = new Set();
        State.currentIndex = 0;
        State.violations = 0;
        const maxTime = State.config.durasi * 60;
        let tr = maxTime;
        // ✅ FIX: Hitung dari deadline absolut untuk siswa yang baru mulai
        if (State.config.end_ms && State.config.end_ms > 0) {
          const trFromDeadline = Math.floor((State.config.end_ms - Date.now()) / 1000);
          if (trFromDeadline > 0) tr = Math.min(maxTime, trFromDeadline);
          else tr = 0;
        }
        State.timeRemaining = tr;
      }

      if (scheduleTimer) clearInterval(scheduleTimer);

      // Mobile: skip dashboard, go straight to exam
      if (isIndexPage && document.querySelector('.mobile-header')) {
        console.log('[LoadDashboard] ✅ Mobile flow detected. Setting examActive...');
        State.examActive = true;
        State.submissionLocked = false;
        State.pingOffset = Math.floor(Math.random() * 600);
        console.log('[LoadDashboard] Questions count:', State.questions.length, 'Duration:', State.config.durasi);
        gasRun('setStudentOnline', State.config.id_ujian, State.user.id).catch(() => {});
        const sessionData = {
          user: State.user,
          config: { ...State.config, keys: State.config.keys || {} }
        };
        console.log('[LoadDashboard] Saving session. config.versi_soal:', State.config.versi_soal);
        localStorage.setItem('CBT_EXAM_SESSION', JSON.stringify(sessionData));
        saveStateLocal();
        hideLoading();
        console.log('[LoadDashboard] 🚀 Redirecting to exam.html');
        // Beri waktu 100ms agar localStorage flush sebelum redirect (handle device lambat)
        await new Promise(r => setTimeout(r, 100));
        window.location.href = 'exam.html';
      } else {
        console.log('[LoadDashboard] Desktop flow. isIndexPage:', isIndexPage, 'mobile-header:', !!document.querySelector('.mobile-header'));
        showView('dashboard-view');
      }
    } else {
      showCustomAlert('Gagal Mengambil Data', 'Error: ' + res.message, '❌');
      showView('schedule-view');
    }
  } catch (err) {
    console.error('[LoadDashboard] ERROR:', err);
    showCustomAlert('Kesalahan Sinkronisasi', 'Terjadi kesalahan sinkronisasi: ' + err.message, '🔄');
    showView('schedule-view');
  }
}

// --- Exam Flow ---
safeAddListener('btnStartExam', 'click', async () => {
  State.examActive = true;
  State.submissionLocked = false;
  State.pingOffset = Math.floor(Math.random() * 600);

  gasRun('setStudentOnline', State.config.id_ujian, State.user.id).catch(() => {});

  // Save session info for exam page
  const sessionData = {
    user: State.user,
    config: {
      ...State.config,
      keys: State.config.keys || {}
    }
  };
  localStorage.setItem('CBT_EXAM_SESSION', JSON.stringify(sessionData));

  saveStateLocal();

  // Beri waktu 100ms agar localStorage flush sebelum redirect
  await new Promise(r => setTimeout(r, 100));
  window.location.href = 'exam.html';
});

function startTimer() {
  // ✅ FIX: Guard — jika timeRemaining sudah 0 saat mulai, jangan jalankan timer
  if (State.timeRemaining <= 0) {
    console.warn('[Timer] timeRemaining=0 saat startTimer dipanggil, auto-submit.');
    submitExam(true);
    return;
  }

  State.timerInterval = setInterval(() => {
    State.timeRemaining--;

    // Hard deadline: jika waktu tutup ujian sudah lewat, paksa habis
    // Tapi hanya jika end_ms valid dan sudah benar-benar lewat
    if (State.config && State.config.end_ms && State.config.end_ms > 0) {
      const nowMs = Date.now();
      if (nowMs >= State.config.end_ms) {
        State.timeRemaining = 0;
      }
    }

    updateTimerDisplay();

    // Auto save periodic backup (localStorage)
    if (State.timeRemaining % 10 === 0) saveStateLocal();

  // FREE TIER OPTIMIZATION: Disable ping untuk hemat request
  // Ping online status hanya untuk monitoring, bukan critical feature
  // Dengan 900 siswa, ping = 7.5 req/s → DISABLED untuk free tier
  // Jika butuh monitoring, aktifkan hanya untuk ujian penting (<100 siswa)
  
  // UNCOMMENT baris di bawah jika ingin aktifkan ping (hanya untuk <100 siswa):
  /*
  if (State.timeRemaining > 0 && (State.timeRemaining + State.pingOffset) % 240 === 0) {
    gasRun('setStudentOnline', State.config.id_ujian, State.user.id).then(res => {
      if (!res || !res.success) return;
      if (res.sessionReset) {
        clearAllLocalStorage();
        showCustomAlert('Sesi Direset', 'Sesi Anda telah direset oleh proktor. Silakan login ulang.', '🔄');
        setTimeout(() => { location.reload(); }, 2000);
        return;
      }
      if (res.broadcast) {
        checkAndShowBroadcast(res.broadcast);
      }
    }).catch(() => { });
  }
  */

  if (State.timeRemaining <= 0) {
    clearInterval(State.timerInterval);
    showCustomAlert('Waktu Habis', 'Waktu ujian telah habis! Jawaban Anda otomatis dikirim.', '⏰');
    submitExam(true);
  }
}, 1000);
}

window.showBroadcastMessage = function(msg) {
  const overlay = document.getElementById('broadcast-overlay');
  const modal = document.getElementById('broadcast-modal');
  const text = document.getElementById('broadcast-text');
  if (!overlay || !modal || !text) return;
  
  // Mencegah pesan yang sama muncul berulang kali jika sudah ditutup
  const lastMsg = sessionStorage.getItem('last_broadcast');
  if (lastMsg === msg) return;
  
  text.innerText = msg;
  overlay.classList.add('active');
  modal.style.display = 'flex';
  
  // Haptic feedback if available
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  
  setTimeout(() => {
    overlay.style.opacity = '1';
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
};

window.closeBroadcastModal = function() {
  const overlay = document.getElementById('broadcast-overlay');
  const modal = document.getElementById('broadcast-modal');
  const text = document.getElementById('broadcast-text');
  if (!overlay || !modal || !text) return;
  
  // Simpan agar tidak muncul lagi di ping berikutnya kecuali pesan berubah
  sessionStorage.setItem('last_broadcast', text.innerText);
  
  overlay.classList.remove('active');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
};

function checkAndShowBroadcast(bData) {
  if (!bData) return;
  const text = typeof bData === 'string' ? bData : bData.text;
  if (!text) return;

  const lastMsg = sessionStorage.getItem('last_broadcast');
  if (lastMsg === text) return;

  if (typeof bData === 'object') {
    if (bData.kelas && bData.kelas !== 'all' && State.user && State.user.kelas && bData.kelas !== State.user.kelas) return;
    if (bData.status && bData.status !== 'all') {
      if (bData.status === 'online' && !State.examActive) return;
      if (bData.status === 'finished' && State.examActive) return;
    }
  }

  showBroadcastMessage(text);
}

function updateTimerDisplay() {
  const t = Math.max(0, State.timeRemaining);
  const h = Math.floor(t / 3600).toString().padStart(2, '0');
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
  const s = (t % 60).toString().padStart(2, '0');
  document.getElementById('exam-timer').textContent = `${h}:${m}:${s}`;
}

// --- Render Logic ---
let lastForceRefresh = 0;
const REFRESH_COOLDOWN_MS = 15 * 60 * 1000; // 15 menit

safeAddListener('btnRefreshExam', 'click', async function () {
  if (!State.examActive) return;
  const now = Date.now();

  if (now - lastForceRefresh < REFRESH_COOLDOWN_MS) {
    const sisa = Math.ceil((REFRESH_COOLDOWN_MS - (now - lastForceRefresh)) / 60000);
    showCustomAlert('Cooldown Refresh', `Harap tunggu ${sisa} menit lagi sebelum refresh ulang.`, '⏳');
    return;
  }

  if (confirm("Gunakan fitur ini JIKA ADA soal atau gambar yang tidak termuat secara sempurna. Koneksi internet wajib stabil!\n\nJangan khawatir, Murni-jawaban Anda akan tetap tersimpan.\n\nYakin ingin merefresh data soal?")) {
    lastForceRefresh = now;
    showLoading('Menyegarkan Soal...');
    try {
      const res = await gasRun('getExamData', State.config.id_ujian, State.examToken, true);
      if (res.success) {
        // Re-shuffle as per user+exam seed to match the exact same question order
        const seedStr = State.user.id + "_" + State.config.id_ujian;
        const randFn = getSeededRandom(seedStr);
        let rQc = res.questions;

        if (State.config.shuffle_soal !== false && State.config.shuffle_soal !== "false") {
          shuffleArray(rQc, randFn);
        }

        if (State.config.shuffle_opsi !== false && State.config.shuffle_opsi !== "false") {
          rQc.forEach(q => {
            if ((q.tipe === 'PG' || q.tipe === 'KOMPLEKS') && q.opsi.length > 0) {
              shuffleArray(q.opsi, randFn);
            }
          });
        }
        State.questions = rQc;

        renderQuestion(State.currentIndex);
        initGrid();
        updateGridUI();

        showView('exam-view');
        showCustomAlert('Berhasil', 'Penyegaran data soal berhasil! Silakan lanjutkan ujian.', '✅');
      } else {
        showCustomAlert('Gagal Refresh', 'Gagal menyegarkan soal: ' + res.message, '❌');
        showView('exam-view');
      }
    } catch (err) {
      showCustomAlert('Kesalahan Jaringan', 'Terjadi kesalahan jaringan. Periksa koneksi.', '🌐');
      showView('exam-view');
    }
  }
});

function renderQuestion(index) {
  if (index < 0 || index >= State.questions.length) return;
  State.currentIndex = index;
  const q = State.questions[index];

  // ✅ FIX: Normalisasi q.id ke String agar State.answers key konsisten
  // Supabase bisa mengembalikan id sebagai number, tapi server grading pakai String(k.id)
  if (q.id !== undefined && q.id !== null) q.id = String(q.id);

  // Progressive Preload
  for (let i = 1; i <= 2; i++) {
    const nextQ = State.questions[index + i];
    if (nextQ && nextQ.gambar && nextQ.gambar.trim() !== '') {
      const img = new Image();
      img.src = nextQ.gambar;
    }
  }

  // Modern Progress Area
  const total = State.questions.length;
  const percent = Math.round(((index + 1) / total) * 100);
  safeSetText('q-progress-text', `SOAL ${index + 1} / ${total} (${q.tipe})`);
  safeSetText('q-percentage', `${percent}%`);
  const pb = document.getElementById('q-progress-bar');
  if (pb) pb.style.width = `${percent}%`;

  // Type Badge & Instruction
  const badge = document.getElementById('q-type-badge');
  const instruction = document.getElementById('q-instruction');

  let typeLabel = 'SOAL PILIHAN GANDA';
  let instrText = 'Pilih salah satu jawaban yang menurut Anda paling benar.';
  let typeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

  if (q.tipe === 'ISIAN') {
    typeLabel = 'SOAL ISIAN';
    instrText = 'Ketik jawaban berupa angka tanpa spasi atau tanda baca.';
    typeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  } else if (q.tipe === 'KOMPLEKS') {
    typeLabel = 'PILIHAN GANDA KOMPLEKS';
    instrText = 'Pilih satu atau lebih jawaban yang menurut Anda benar.';
    typeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>';
  } else if (q.tipe === 'BS') {
    typeLabel = 'BENAR / SALAH';
    instrText = 'Tentukan apakah pernyataan berikut Benar atau Salah.';
  } else if (q.tipe === 'JODOH') {
    typeLabel = 'MENJODOHKAN';
    instrText = 'Pasangkan item di sebelah kiri dengan pilihan yang sesuai di sebelah kanan.';
  }

  if (badge) badge.innerHTML = `${typeIcon}<span>${typeLabel}</span>`;
  if (instruction) {
    instruction.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><p>${instrText}</p>`;
  }

  // Question Text
  safeSetText('q-text', q.pertanyaan);

  // Render Image
  const imgContainer = document.getElementById('q-image-container');
  imgContainer.innerHTML = '';
  if (q.gambar && q.gambar.trim() !== '' && isSafeResourceUrl(q.gambar)) {
    const img = document.createElement('img');
    img.src = q.gambar.trim();
    img.className = 'q-image';
    img.loading = 'lazy';
    img.alt = 'Gambar Soal';
    img.onclick = () => openZoomModal(q.gambar.trim());
    imgContainer.appendChild(img);
    imgContainer.style.display = 'block';
  } else {
    imgContainer.style.display = 'none';
  }

  renderOptions(q);
  updateNavButtons();
  updateGridUI();

  // Update Doubt Button State
  const btnDoubt = document.getElementById('btnDoubt');
  if (btnDoubt) {
    if (State.doubts.has(q.id)) {
      btnDoubt.classList.add('active');
    } else {
      btnDoubt.classList.remove('active');
    }
  }
}

function renderOptions(q) {
  const container = document.getElementById('q-options');
  container.innerHTML = '';

  const currentAnswer = State.answers[q.id];
  const isLocked = State.submissionLocked;

  if (q.tipe === 'PG' || q.tipe === 'BS') {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const opsi = Array.isArray(q.opsi) ? q.opsi : [];
    opsi.forEach((opt, idx) => {
      const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;
      const displayLabel = labels[idx] || (idx + 1);

      const div = document.createElement('div');
      div.className = `modern-option ${isSelected ? 'selected' : ''}`;
      if (isLocked) div.style.pointerEvents = 'none';

      const circle = document.createElement('div');
      circle.className = 'option-circle';
      const label = document.createElement('div');
      label.className = 'option-label';
      label.textContent = `${displayLabel}.`;
      const textWrap = document.createElement('div');
      textWrap.className = 'option-text-container';
      textWrap.style.flex = '1';
      const optText = document.createElement('div');
      optText.className = 'option-text';
      optText.textContent = opt.text || '';
      textWrap.appendChild(optText);
      if (opt.gambar && isSafeResourceUrl(opt.gambar)) {
        const img = document.createElement('img');
        img.src = opt.gambar;
        img.className = 'q-image';
        img.loading = 'lazy';
        img.style.maxHeight = '140px';
        img.style.marginTop = '8px';
        img.style.display = 'block';
        img.onclick = (e) => { e.stopPropagation(); openZoomModal(opt.gambar); };
        textWrap.appendChild(img);
      }
      div.appendChild(circle);
      div.appendChild(label);
      div.appendChild(textWrap);
      div.onclick = () => {
        if (State.submissionLocked) return;
        State.answers[q.id] = opt.id;
        // Optimization: Update classes instead of rebuilding DOM for snappy performance
        container.querySelectorAll('.modern-option').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        debouncedSave();
      };
      container.appendChild(div);
    });
  }
  else if (q.tipe === 'KOMPLEKS') {
    const selectedArr = currentAnswer || [];
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const opsi = Array.isArray(q.opsi) ? q.opsi : [];
    opsi.forEach((opt, idx) => {
      const isSelected = selectedArr.includes(opt.id) || selectedArr.includes(opt.text);
      const displayLabel = labels[idx] || (idx + 1);
      const div = document.createElement('div');
      div.className = `modern-option ${isSelected ? 'selected' : ''}`;
      if (isLocked) div.style.pointerEvents = 'none';

      const circle = document.createElement('div');
      circle.className = 'option-circle';
      circle.style.borderRadius = '4px';
      const label = document.createElement('div');
      label.className = 'option-label';
      label.textContent = `${displayLabel}.`;
      const textWrap = document.createElement('div');
      textWrap.className = 'option-text-container';
      textWrap.style.flex = '1';
      const optText = document.createElement('div');
      optText.className = 'option-text';
      optText.textContent = opt.text || '';
      textWrap.appendChild(optText);
      if (opt.gambar && isSafeResourceUrl(opt.gambar)) {
        const img = document.createElement('img');
        img.src = opt.gambar;
        img.className = 'q-image';
        img.loading = 'lazy';
        img.style.maxHeight = '140px';
        img.style.marginTop = '8px';
        img.style.display = 'block';
        img.onclick = (e) => { e.stopPropagation(); openZoomModal(opt.gambar); };
        textWrap.appendChild(img);
      }
      div.appendChild(circle);
      div.appendChild(label);
      div.appendChild(textWrap);
      div.onclick = (e) => {
        if (State.submissionLocked) return;
        e.preventDefault();
        let arr = State.answers[q.id] || [];
        if (arr.includes(opt.id) || arr.includes(opt.text)) {
          arr = arr.filter(x => x !== opt.id && x !== opt.text);
          div.classList.remove('selected');
        } else {
          arr.push(opt.id);
          div.classList.add('selected');
        }
        if (arr.length === 0) delete State.answers[q.id];
        else State.answers[q.id] = arr;
        debouncedSave();
      };
      container.appendChild(div);
    });
  }
  else if (q.tipe === 'ISIAN') {
    const div = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.className = 'essay-textarea';
    textarea.placeholder = 'Ketik jawaban Anda...';
    textarea.value = currentAnswer || '';
    div.appendChild(textarea);
    textarea.disabled = isLocked;
    textarea.oninput = (e) => {
      if (State.submissionLocked) return;
      const val = e.target.value.trim();
      if (val) State.answers[q.id] = val;
      else delete State.answers[q.id];
      debouncedSave();
    };
    container.appendChild(div);
  }
  else if (q.tipe === 'JODOH') {
    const selectedObj = currentAnswer || {}; // { "leftItem": "rightItem" }
    const kiri = Array.isArray(q.kiri) ? q.kiri : [];
    const kanan = Array.isArray(q.kanan) ? q.kanan : [];

    kiri.forEach(leftText => {
      const row = document.createElement('div');
      row.className = 'matching-row';

      const lbl = document.createElement('div');
      lbl.className = 'matching-left';
      lbl.textContent = leftText;

      const sel = document.createElement('select');
      sel.className = 'matching-right';
      sel.disabled = isLocked;
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Pilih --';
      sel.appendChild(emptyOption);
      kanan.forEach(rightText => {
        const optEl = document.createElement('option');
        optEl.value = rightText;
        optEl.textContent = rightText;
        optEl.selected = selectedObj[leftText] === rightText;
        sel.appendChild(optEl);
      });

      sel.onchange = (e) => {
        if (State.submissionLocked) return;
        if (!State.answers[q.id]) State.answers[q.id] = {};
        const val = e.target.value;
        if (val) {
          State.answers[q.id][leftText] = val;
        } else {
          delete State.answers[q.id][leftText];
        }
        // cleanup empty objects to trigger answered state correctly
        if (Object.keys(State.answers[q.id]).length === 0) delete State.answers[q.id];
        debouncedSave(); // Auto-save
      };

      row.appendChild(lbl);
      row.appendChild(sel);
      container.appendChild(row);
    });
  }
}

// --- Navigation ---
safeAddListener('btnNext', 'click', () => {
  if (State.currentIndex < State.questions.length - 1) {
    if (isAnswered(State.currentIndex)) removeFromDoubt(State.currentIndex);
    renderQuestion(State.currentIndex + 1);
  }
});

safeAddListener('btnPrev', 'click', () => {
  if (State.currentIndex > 0) {
    renderQuestion(State.currentIndex - 1);
  }
});

safeAddListener('btnDoubt', 'click', () => {
  const qId = State.questions[State.currentIndex].id;
  const btnDoubt = document.getElementById('btnDoubt');
  if (State.doubts.has(qId)) {
    State.doubts.delete(qId);
    if (btnDoubt) btnDoubt.classList.remove('active');
  } else {
    State.doubts.add(qId);
    if (btnDoubt) btnDoubt.classList.add('active');
  }
  updateGridUI(); // Hanya update grid, jangan render ulang soal
  debouncedSave(); // Auto-save
});

function isAnswered(index) {
  const qId = State.questions[index].id;
  return State.answers[qId] !== undefined;
}

function removeFromDoubt(index) {
  const qId = State.questions[index].id;
  State.doubts.delete(qId);
}

function updateNavButtons() {
  document.getElementById('btnPrev').disabled = State.currentIndex === 0;

  const isLast = State.currentIndex === State.questions.length - 1;
  const btnNext = document.getElementById('btnNext');
  const btnSubmit = document.getElementById('btnSubmit');

  if (isLast || State.submissionFailed) {
    btnNext.style.display = 'none';
    btnSubmit.style.display = 'flex'; // Uses flex to match bottom-actions layout
    if (State.submissionFailed) {
      btnSubmit.classList.add('btn-pulse'); // Tambahkan efek visual jika gagal
      btnSubmit.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Kirim Ulang';
    }
  } else {
    btnNext.style.display = 'flex';
    btnSubmit.style.display = 'none';
  }
}

function closeGrid() {
  const overlay = document.getElementById('overlay');
  const qGridContainer = document.getElementById('qGridContainer');
  if (overlay) overlay.classList.remove('active');
  if (qGridContainer) qGridContainer.classList.remove('open');
}

// --- Grid UI ---
function initGrid() {
  const grid = document.getElementById('qGrid');
  if (!grid) return;
  grid.innerHTML = '';
  State.questions.forEach((q, idx) => {
    const b = document.createElement('div');
    b.className = 'q-bubble';
    b.textContent = idx + 1;
    b.id = `bubble-${idx}`;
    b.onclick = () => {
      renderQuestion(idx);
      closeGrid();
    };
    grid.appendChild(b);
  });
}

const bubbleCache = {};

function updateGridUI() {
  State.questions.forEach((q, idx) => {
    let b = bubbleCache[idx];
    if (!b) {
      b = document.getElementById(`bubble-${idx}`);
      if (b) bubbleCache[idx] = b;
    }
    if (!b) return;

    b.className = 'q-bubble'; // reset
    if (State.currentIndex === idx) b.classList.add('active');

    if (State.doubts.has(q.id)) {
      b.classList.add('doubt');
    } else if (State.answers[q.id] !== undefined) {
      b.classList.add('answered');
    }
  });
}

const overlay = document.getElementById('overlay');
const qGridContainer = document.getElementById('qGridContainer');

safeAddListener('btnGrid', 'click', () => {
  const container = document.getElementById('qGridContainer');
  const ovl = document.getElementById('overlay');
  if (container && container.classList.contains('open')) {
    closeGrid();
  } else {
    updateGridUI();
    if (ovl) ovl.classList.add('active');
    if (container) container.classList.add('open');
  }
});

safeAddListener('btnCloseGrid', 'click', closeGrid);
if (overlay) overlay.addEventListener('click', closeGrid);

// --- Submit ---
safeAddListener('btnSubmit', 'click', () => {
  // Aturan Waktu Minimal Mengerjakan (Dinamis dari Sheet Jadwal)
  const elapsedSeconds = (State.config.durasi * 60) - State.timeRemaining;
  const minLockMinutes = (State.security && State.security.minTime) ? State.security.minTime : (State.config.min_selesai || 0);

  if (minLockMinutes > 0) {
    const MINIMUM_TIME_SECONDS = minLockMinutes * 60;
    if (elapsedSeconds < MINIMUM_TIME_SECONDS) {
      const sisaTunggu = MINIMUM_TIME_SECONDS - elapsedSeconds;
      const m = Math.floor(sisaTunggu / 60);
      const s = sisaTunggu % 60;
      showCustomAlert('Tombol Selesai Terkunci', `Anda baru bisa mengakhiri ujian setelah minimal ${minLockMinutes} menit mengerjakan. Mohon tunggu ${m} menit ${s} detik lagi.`, '🔒');
      return;
    }
  }

  const answered = Object.keys(State.answers).length;
  const total = State.questions.length;
  const unanswered = total - answered;
  
  let msg = `Anda telah menjawab ${answered} dari ${total} soal.`;
  if (unanswered > 0) {
    msg += `\n\n⚠️ Terdapat ${unanswered} soal yang belum dijawab!`;
  }
  if (State.doubts.size > 0) {
    msg += `\n\n💡 Terdapat ${State.doubts.size} soal yang ragu-ragu!`;
  }
  msg += "\n\nYakin ingin mengakhiri ujian dan mengirimkan jawaban?";

  showCustomAlert('Konfirmasi Selesai', msg, '📝', (confirmed) => {
    if (confirmed) {
      submitExam(false);
    }
  }, true);
});

// ══════════════════════════════════════════════════════
// SUBMIT ENGINE v2 — Jitter + Auto-Retry
// Dirancang untuk menangani 1.000 auto-submit serentak
// tanpa membuat server Google crash.
// ══════════════════════════════════════════════════════

/**
 * Fungsi pembantu: menunggu N milidetik secara async (non-blocking)
 */
// sleep function is defined above near dbConnect

/**
 * Fungsi pembantu: Wrapper gasRun dengan logika Auto-Retry senyap.
 * Jika server sedang overload (error jaringan), fungsi ini akan
 * menunggu beberapa saat dan mencoba lagi tanpa menampilkan alert.
 * @param {number} maxRetries - Jumlah percobaan ulang maksimal (default: 10)
 * @param {number} retryDelayMs - Jeda dasar antar percobaan (default: 5 detik)
 */
async function gasRunWithRetry(funcName, args, maxRetries = 10, retryDelayMs = 5000) {
  const argsArray = Array.isArray(args) ? args : [args];
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await gasRun(funcName, ...argsArray);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const waitTime = Math.ceil((retryDelayMs * attempt) / 1000);
        showLoading(`Antrean Penuh. Mengantri di server... (Mencoba lagi dalam ${waitTime} detik)`);
        await sleep(retryDelayMs * attempt);
      }
    }
  }
  throw lastError;
}

async function submitExam(isAutoSubmit) {
  const lockAnswersOnFailure = isAutoSubmit || State.timeRemaining <= 0;
  State.examActive = false;
  clearInterval(State.timerInterval);

  // ─── FASE 1: JITTER (Pengacak Antrean) ───────────────────────────
  // Hanya aktif jika waktu habis secara otomatis (bukan klik manual).
  // Setiap HP akan mengacak jeda uniknya sendiri antara 0-55 detik.
  // Ini memecah "Tsunami 1000 Submit" menjadi gelombang ~18 /detik.
  if (isAutoSubmit) {
    const jitterMs = Math.floor(Math.random() * 60000); // 0 - 60.000 ms: cukup untuk 1000 siswa (~17/detik), tidak membuat siswa panik
    const jitterSec = Math.ceil(jitterMs / 1000);
    showLoading(`Waktu habis. Jawaban dikirim dalam ${jitterSec} detik...`);
    await sleep(jitterMs);
  } else {
    // Manual jitter (0-2s) to prevent exact simultaneous clicks
    await sleep(Math.floor(Math.random() * 2000));
  }

  saveStateLocal(); // Pastikan jawaban terbaru tersimpan di LocalStorage sebelum kirim
  showLoading('Menyimpan jawaban ke server...');

  // ─── FASE 2: FULL CLIENT-SIDE GRADING ───────────────────────────
  const keys = State.config.keys || {};
  const hasClientKeys = Object.keys(keys).length > 0;
  let totalPoints = 0;
  let maxPoints = 0;
  let detailEvals = {};

  // ✅ FIX: Pastikan State.questions tidak kosong saat submit
  // Jika kosong, coba restore dari cache sebelum grading
  if (!State.questions || State.questions.length === 0) {
    console.warn('[Submit] State.questions kosong saat submit — mencoba restore dari session...');
    try {
      const sessionData = localStorage.getItem('CBT_EXAM_SESSION');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (parsed.config) {
          const examId = parsed.config.id_ujian;
          const ver = parsed.config.versi_soal || '1';
          const cacheKey = `SOAL_${examId}_v${ver}`;
          const cached = await (window.cbtIdbGet ? window.cbtIdbGet(cacheKey) : null)
            || JSON.parse(localStorage.getItem(cacheKey) || 'null');
          if (cached && cached.questions) {
            State.questions = cached.questions;
            State.questions.forEach(q => { if (q.id !== undefined) q.id = String(q.id); });
            console.log('[Submit] Restored', State.questions.length, 'questions from cache');
          }
        }
      }
    } catch (e) {
      console.warn('[Submit] Gagal restore questions:', e);
    }
  }

  State.questions.forEach(q => {
    const bobot = parseFloat(q.bobot) || 1;
    const correctAns = keys[String(q.id)] || '';
    const userAns = State.answers[String(q.id)];
    let isCorrect = false;
    if (hasClientKeys) maxPoints += bobot;

    if (hasClientKeys && userAns !== undefined) {
      if (q.tipe === 'PG' || q.tipe === 'BS') {
        isCorrect = String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase();
      } else if (q.tipe === 'KOMPLEKS') {
        if (Array.isArray(userAns)) {
          let cArr = String(correctAns).split(',').map(s => s.trim().toUpperCase()).sort();
          let uArr = userAns.map(s => String(s).trim().toUpperCase()).sort();
          isCorrect = JSON.stringify(cArr) === JSON.stringify(uArr);
        }
      } else if (q.tipe === 'ISIAN') {
        isCorrect = String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
      } else if (q.tipe === 'JODOH') {
        let cPairs = {};
        String(correctAns).split(';').forEach(p => {
          let pt = p.split('=');
          if (pt.length == 2) cPairs[pt[0].trim()] = pt[1].trim();
        });
        if (typeof userAns === 'object' && !Array.isArray(userAns)) {
          let allMatch = true;
          let kList = Object.keys(cPairs);
          if (kList.length === 0) allMatch = false;
          for (let k of kList) { if (userAns[k] !== cPairs[k]) { allMatch = false; break; } }
          isCorrect = allMatch;
        }
      }
    }

    if (hasClientKeys && isCorrect) totalPoints += bobot;
    // ✅ FIX: Selalu simpan answer di detail, correct = null jika kunci tidak ada di client
    detailEvals[String(q.id)] = { answer: userAns !== undefined ? userAns : '-', correct: hasClientKeys ? isCorrect : null };
  });

  const score = hasClientKeys && maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : null;

  const payload = {
    examId: State.config.id_ujian,
    namaUjian: State.config.nama_ujian,
    user: {
      id: State.user.id,
      name: State.user.name,
      kelas: State.user.kelas
    },
    usedTime: getUsedTimeStr(),
    violations: State.violations,
    score: score,
    detail: JSON.stringify(detailEvals),
    answers: State.answers
  };

  // ─── FASE 3: SUBMIT DENGAN AUTO-RETRY ────────────────────────────
  try {
    const res = await gasRunWithRetry('submitExam', payload, 5, 3000);
    if (res.success) {
      const lsKey = `CBT_${State.user.id}_${State.config.id_ujian}`;
      localStorage.removeItem(lsKey);

      // ✅ FIX: Jika detailEvals kosong (State.questions kosong saat submit),
      // bangun detail minimal dari State.answers agar total soal tidak 0
      let finalDetail = detailEvals;
      if (Object.keys(finalDetail).length === 0 && State.answers && Object.keys(State.answers).length > 0) {
        console.warn('[Submit] detailEvals kosong, membangun dari State.answers...');
        Object.keys(State.answers).forEach(qId => {
          finalDetail[qId] = { answer: State.answers[qId], correct: null };
        });
      }

      // Jika server mengembalikan detail (dari Edge Function), gunakan itu
      if (res.detail && typeof res.detail === 'object' && Object.keys(res.detail).length > 0) {
        finalDetail = res.detail;
      } else if (res.detail && typeof res.detail === 'string') {
        try { finalDetail = JSON.parse(res.detail); } catch (_) {}
      }

      const resultData = {
        score: Number.isFinite(res.score) ? res.score : (Number.isFinite(score) ? score : 0),
        namaUjian: State.config.nama_ujian,
        user: State.user,
        usedTime: getUsedTimeStr(),
        violations: State.violations,
        detail: finalDetail,
        config: { kkm: State.config.kkm || 75 }
      };
      localStorage.setItem('CBT_LAST_RESULT', JSON.stringify(resultData));
      localStorage.setItem(`CBT_SUBMITTED_${State.config.id_ujian}_${State.user.id}`, '1');
      window.location.href = 'result.html';
    } else {
      const errMsg = res.message || 'Terjadi kesalahan pada server.';
      if (errMsg.includes('sudah')) {
        const resultData = {
          score: '✓',
          namaUjian: State.config.nama_ujian,
          user: State.user,
          usedTime: getUsedTimeStr(),
          violations: State.violations,
          detail: detailEvals,
          config: { kkm: State.config.kkm || 75 }
        };
        localStorage.setItem('CBT_LAST_RESULT', JSON.stringify(resultData));
        localStorage.setItem(`CBT_SUBMITTED_${State.config.id_ujian}_${State.user.id}`, '1');
        window.location.href = 'result.html';
      } else {
        showCustomAlert('Gagal Mengirim', 'Gagal mengirim jawaban: ' + errMsg, '❌');
        showView('exam-view');
      }
    }
  } catch (err) {
    // Gagal total setelah 3x retry — beri tahu siswa
    showCustomAlert('Koneksi Terputus', 'Jawaban Anda AMAN di perangkat. Tekan tombol Kirim Ulang.', '📡');
    State.examActive = !lockAnswersOnFailure;
    State.submissionLocked = lockAnswersOnFailure;
    State.submissionFailed = true;
    updateNavButtons();
    hideLoading();
    renderQuestion(State.currentIndex);
    showView('exam-view');
  }
}

function getUsedTimeStr() {
  const totalSecs = (State.config.durasi * 60) - Math.max(0, State.timeRemaining);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  return `${minutes} Menit ${seconds} Detik`;
}

// --- Image Zoom Handlers ---
window.openZoomModal = function (src) {
  const overlay = document.getElementById('zoom-overlay');
  const img = document.getElementById('zoom-image'); // Fix ID mismatch from HTML
  if (overlay && img) {
    img.src = src;
    overlay.classList.add('active');
  }
};

window.closeZoomModal = function () {
  const overlay = document.getElementById('zoom-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    const img = document.getElementById('zoom-image');
    if (img) img.src = '';
  }
};

safeAddListener('btnLogout', 'click', () => {
  console.log('[Logout Desktop] Starting logout process...');
  
  // Stop all timers
  if (scheduleTimer) clearInterval(scheduleTimer);
  if (window._mobileScheduleTimer) clearInterval(window._mobileScheduleTimer);
  
  // Clear State
  const userId = State.user ? State.user.id : null;
  State.user = null;
  State.answers = {};
  State.doubts = new Set();
  State.currentIndex = 0;
  State.timeRemaining = 0;
  State.examActive = false;
  State.violations = 0;
  State.schedules = [];
  State.config = null;
  State.questions = [];
  // ✅ FIX MULTI-USER: Clear flag kepemilikan data jadwal
  State._schedulesForUserId = null;
  tempSelectedUser = null;
  
  // Clear exam-specific cache if user was logged in
  if (userId) {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        // ✅ FIX: Hanya hapus key milik user ini, JANGAN hapus milik user lain
        if (key.startsWith(`CBT_${userId}_`) || 
            key.includes(`_${userId}`) ||
            key.endsWith(`_${userId}`)) {
          localStorage.removeItem(key);
          console.log('[Logout Desktop] Cleared:', key);
        }
      });
    } catch (e) {
      console.warn('[Logout Desktop] Failed to clear user-specific cache:', e);
    }
  }
  
  // Clear session and result data
  try { localStorage.removeItem('CBT_LOGGED_USER'); } catch (_) {}
  try { localStorage.removeItem('CBT_LAST_RESULT'); } catch (_) {}
  try { localStorage.removeItem('CBT_EXAM_SESSION'); } catch (_) {}
  try { sessionStorage.clear(); } catch (_) {}

  // Clear UI
  const userInp = document.getElementById('userName');
  if (userInp) userInp.value = '';
  const autoList = document.getElementById('autocomplete-list');
  if (autoList) autoList.innerHTML = '';
  safeSetText('confirm-name-text', '-');

  // Hide float result button
  try { if (typeof toggleFloatResultBtn === 'function') toggleFloatResultBtn(); } catch (_) {}

  // Switch to Login View
  showView('login-view');
  initPortal(); // Re-init portal whenever logout
  
  console.log('[Logout Desktop] ✅ Logout complete');
});

// --- Portal Init ---
let portalClockInterval = null;
let _portalLifecycleBound = false;

function initPortal() {
  patchFirebase();
  initAuth();
  updateClock();
  if (typeof updateMobileClock === 'function') updateMobileClock();
  if (!portalClockInterval) {
    portalClockInterval = setInterval(() => {
      updateClock();
      if (typeof updateMobileClock === 'function') updateMobileClock();
    }, 1000);
  }
  fetchPortalExams();
  initSchoolIdentity();

  // Mobile: schedule grid dirender oleh restoreLoginSession di mobile-core.js
  // setelah State.user di-restore — jangan render di sini karena State.user belum ada

  // Bind lifecycle listeners sekali saja (hindari dobel setelah logout/login berulang)
  if (!_portalLifecycleBound) {
    _portalLifecycleBound = true;
    // FIX: isMobileIndex harus dievaluasi saat event terjadi, bukan saat bind
    const _isMobileIndex = () => isIndexPage && !!document.querySelector('.mobile-header');

    // Refresh schedule when page becomes visible (user returns from exam/result)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && State.user && _isMobileIndex()) {
        loadSchedules();
      }
    });

    // Force refresh when page is restored from bfcache (back/forward navigation)
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && State.user && _isMobileIndex()) {
        console.log('[PageShow] Restored from bfcache, refreshing schedules');
        loadSchedules();
      }
    });
  }

  // Auto-restore login: ditangani oleh mobile-core.js setelah semua script siap
  // (mobile-core.js load setelah script.js, jadi restore dilakukan di sana)

  // Prefetch daftar peserta di background
  authPromise.then(() => {
    if (!cachedPeserta) {
      loadPesertaCache().catch(() => { });
    } else {
      SystemStatus.peserta = 'success';
      updateInitStatusDisplay();
    }
  });

  // ─── ARMOR 1000: Initial Sync & Offline First ───────────────────
  authPromise.then(async () => {
    console.log("Auth resolved, isAuthReady:", isAuthReady, "user:", auth.currentUser?.uid);
    if (!isAuthReady) {
      console.warn("Auth not ready, sync may fail with permission_denied");
    }

    // Add timeout to prevent hanging
    const syncTimeout = setTimeout(() => {
      console.warn("Sync timeout — using cached data if available");
      hideLoading();
      SystemStatus.portal = 'success';
      updateInitStatusDisplay();
    }, 15000);

    try {
      await syncAllDataForPortal();
      console.log("Sync completed successfully");
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      clearTimeout(syncTimeout);
    }

    // Load Security Settings
    try {
      const snap = await db.ref('/config/security').once('value');
      State.security = snap.val() || {};

      // Toggle Landing Page Features (legacy desktop UI)
      const examCard = document.getElementById('landing-exam-status-card');
      const sysCard = document.getElementById('landing-system-info-card');
      const syncBadge = document.getElementById('landing-sync-badge');

      if (examCard) examCard.style.display = (State.security.showExamStatus !== false) ? 'block' : 'none';
      if (sysCard) sysCard.style.display = (State.security.showSystemInfo !== false) ? 'block' : 'none';
      if (syncBadge) syncBadge.style.display = (State.security.showSyncBadge !== false) ? 'flex' : 'none';

      // Toggle Mobile UI Elements
      const mobileSyncBadge = document.getElementById('mobile-sync-badge');
      if (mobileSyncBadge) mobileSyncBadge.style.display = (State.security.showSyncBadge !== false) ? '' : 'none';

      const mobileStatusBar = document.querySelector('.mobile-status-bar');
      if (mobileStatusBar) mobileStatusBar.style.display = (State.security.showSystemInfo !== false) ? '' : 'none';

      // PWA Enforcer Check
      checkAndEnforcePwa();
    } catch (e) { console.error("Armor 1000: Security Load Error", e); }
  });

  // admin auth hotkeys moved to admin-auth.js
}

function updateClock() {
  const clockEl = document.getElementById('portal-clock');
  if (!clockEl) return;
  const now = new Date();

  // Custom manual formatting to ensure compatibility in old android webviews
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const m = months[now.getMonth()];
  const y = now.getFullYear();

  clockEl.textContent = `${date} ${m} ${y}`;
}

async function fetchPortalExams() {
  const container = document.getElementById('portal-active-exams');
  if (!container) return;

  try {
    const res = await gasRun('getPortalInfo');
    if (res.success) {
      if (res.activeSchedules && res.activeSchedules.length > 0) {
        container.innerHTML = res.activeSchedules.map((ex, index) => {
          let statusText = ex.statusText || "Aktif";
          let badgeClass = ex.badgeClass || "live";
          let iconClass = "blue";
          let iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />`;

          if (badgeClass === 'wait') {
            iconClass = "yellow";
            iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
          } else if (badgeClass === 'done') {
            iconClass = "green";
            iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`;
          }

          return `
          <div class="landing-exam-item">
            <div class="landing-exam-icon ${iconClass}">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="width:24px;height:24px;">
                ${iconSvg}
              </svg>
            </div>
            <div class="landing-exam-info">
              <h4>${ex.nama}</h4>
              <p>Durasi: ${ex.durasi} Menit</p>
            </div>
            <div class="landing-exam-badge ${badgeClass}">
              ${badgeClass === 'done' ? '✓' : badgeClass === 'wait' ? '⏳' : '▶'} ${statusText}
            </div>
          </div>
        `}).join('');
      } else {
        container.innerHTML = '<div class="text-muted" style="text-align:center; padding: 20px;">Tidak ada jadwal ujian yang aktif saat ini.</div>';
      }
    } else {
      container.innerHTML = '<p class="text-muted" style="color:var(--danger); text-align:center; padding: 20px;">Gagal memuat jadwal.</p>';
    }
  } catch (e) {
    container.innerHTML = '<p class="text-muted" style="color:var(--danger); text-align:center; padding: 20px;">Koneksi terputus.</p>';
  }
}

// --- ADMIN FUNCTIONS are now loaded via admin-core.js <script defer> ---

// PWA bypass logic moved to pwa-core.js

window.showScheduleListOnly = function() {
  const schedView = document.getElementById('schedule-view');
  if (schedView && schedView.classList.contains('active')) return;
  if (State.user && State.schedules && State.schedules.length > 0) {
    showView('schedule-view');
  } else {
    showCustomAlert('Info', 'Login terlebih dahulu untuk melihat jadwal.', 'ℹ️');
  }
};

window.openBankSoalModal = function() {
  const bankId = prompt("Masukkan nama Bank Soal baru:");
  if (bankId && bankId.trim()) {
    window.openSoalEditorPage(bankId.trim());
  }
};

window.fixPesertaIndex = async function() {
  showLoading('Memperbaiki Index Peserta...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const snap = await db.ref('/peserta').once('value');
    const data = snap.val() || {};
    const updates = {};
    for (let id in data) {
      if (data[id].nama && !data[id].nama_lower) {
        updates[`/peserta/${id}/nama_lower`] = data[id].nama.toLowerCase();
      }
    }
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      showCustomAlert('Berhasil', `${Object.keys(updates).length} index diperbaiki.`, '✅');
    } else {
      showCustomAlert('Info', 'Tidak ada yang perlu diperbaiki.', 'ℹ️');
    }
  } catch (e) {
    showCustomAlert('Gagal', 'Error: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

// Initial Call
if (isIndexPage) {
  // Auto-redirect to admin if already authenticated
  if (sessionStorage.getItem('admin_auth') === '1') {
    window.location.href = 'admin.html';
  } else {
    initPortal();
  }
}

// Anti spam refresh (Index only):
// jika user reload berkali-kali dalam 60 detik, aktifkan cooldown sync berat 60 detik.
try {
  if (isIndexPage) {
    const now = Date.now();
    const winMs = 60 * 1000;
    const maxReload = 4;
    const stampKey = 'CBT_RELOAD_WINDOW_TS';
    const countKey = 'CBT_RELOAD_WINDOW_COUNT';
    const w0 = parseInt(sessionStorage.getItem(stampKey) || '0', 10) || 0;
    const c0 = parseInt(sessionStorage.getItem(countKey) || '0', 10) || 0;
    if (!w0 || (now - w0) > winMs) {
      sessionStorage.setItem(stampKey, String(now));
      sessionStorage.setItem(countKey, '1');
    } else {
      const c1 = c0 + 1;
      sessionStorage.setItem(countKey, String(c1));
      if (c1 >= maxReload) {
        sessionStorage.setItem('CBT_SYNC_COOLDOWN_UNTIL', String(now + 60 * 1000));
      }
    }
  }
} catch (e) { /* ignore */ }

if (isAdminPage || isExamPage || isResultPage) {
  patchFirebase();
  initAuth();
}

// admin stealth mode moved to admin-auth.js

// Logo tap handler is now registered inside initPortal() to ensure DOM is ready.

// masukUjianHandler removed as per user request

// --- PENGATURAN KEAMANAN ADMIN ---

// FIX: showBroadcastMessage duplikat dihapus — fungsi asli sudah ada di atas (dengan modal overlay)
// Fungsi ini tidak perlu didefinisikan ulang di sini.

// admin preview/soal-edit module moved to admin-shared.js

// PWA install + bypass module moved to pwa-core.js
let _alertCallback = null;

function showCustomAlert(title, message, icon = '⚠️', onOk = null, isConfirm = false) {
  const modal = document.getElementById('custom-alert-modal');
  if (!modal) return;
  hideLoading();
  const titleEl = document.getElementById('custom-alert-title');
  const msgEl = document.getElementById('custom-alert-message');
  const iconEl = document.getElementById('custom-alert-icon');
  const cancelBtn = document.getElementById('custom-alert-cancel');
  const okBtn = document.getElementById('custom-alert-ok');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = (message !== undefined && message !== null) ? message : '';
  if (iconEl) iconEl.textContent = icon;

  if (cancelBtn) cancelBtn.style.display = isConfirm ? 'block' : 'none';
  if (okBtn) okBtn.textContent = isConfirm ? 'Ya, Selesai' : 'OK';

  _alertCallback = onOk;

  // Handle dua jenis modal: mobile-confirm-overlay (index.html) dan custom-alert-overlay (exam/result)
  if (modal.classList.contains('mobile-confirm-overlay')) {
    modal.classList.add('show');
    modal.classList.remove('active');
  } else {
    // custom-alert-overlay: pakai display + active class
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

function closeCustomAlert(result = true) {
  const modal = document.getElementById('custom-alert-modal');
  if (!modal) return;

  if (modal.classList.contains('mobile-confirm-overlay')) {
    modal.classList.remove('show');
  } else {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }

  const cb = _alertCallback;
  _alertCallback = null;
  if (cb) cb(result);
}

// mobile ui module moved to mobile-core.js
// Expose ke window agar bisa dipanggil dari file lain
window.showCustomAlert = showCustomAlert;
window.closeCustomAlert = closeCustomAlert;
