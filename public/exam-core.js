// exam-core.js - Exam page logic
// Loaded by exam.html after script.js

(function() {
  'use strict';

  if (!document.body.classList.contains('exam-page')) return;
  
  // Safety fallback for safeAddListener
  if (typeof window.safeAddListener !== 'function') {
    window.safeAddListener = function(id, event, callback) {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, callback);
    };
  }

  async function initExamCore() {
    console.log('[ExamCore] Starting exam initialization...');
    
    // Retry session load up to 3x dengan delay (handle race condition di device lambat)
    let sessionLoaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      loadExamSessionFromStorage();
      if (State.user && State.config) {
        sessionLoaded = true;
        console.log('[ExamCore] Session loaded on attempt', attempt);
        break;
      }
      if (attempt < 3) {
        console.warn(`[ExamCore] Session not ready, retry ${attempt}/3 in 300ms...`);
        await new Promise(r => setTimeout(r, 300));
      }
    }

    if (!sessionLoaded) {
      console.error('[ExamCore] ❌ Session load failed after 3 attempts');
      window.showCustomAlert('Sesi Tidak Valid', 'Sesi ujian tidak ditemukan. Silakan masuk kembali dari halaman jadwal.', '⚠️');
      setTimeout(() => { window.location.href = 'index.html'; }, 2500);
      return;
    }

    loadExamStateFromStorage();
    
    // WAIT for questions to load (async)
    await loadQuestionsFromCache();

    // Jika soal belum ada di cache, coba retry 1x setelah 500ms
    // (handle kasus IndexedDB belum selesai write saat redirect)
    if (!State.questions || !Array.isArray(State.questions) || State.questions.length === 0) {
      console.warn('[ExamCore] Questions not found on first try, retrying in 500ms...');
      await new Promise(r => setTimeout(r, 500));
      await loadQuestionsFromCache();
    }

    // Detailed validation with specific error messages
    if (!State.user) {
      console.error('[ExamCore] ❌ Validation failed: State.user is null');
      window.showCustomAlert('Sesi Tidak Valid', 'Data pengguna tidak ditemukan. Silakan login kembali dari halaman jadwal.', '⚠️');
      setTimeout(() => { window.location.href = 'index.html'; }, 2500);
      return;
    }

    if (!State.config) {
      console.error('[ExamCore] ❌ Validation failed: State.config is null');
      window.showCustomAlert('Sesi Tidak Valid', 'Data ujian tidak ditemukan. Silakan mulai ujian dari halaman jadwal.', '⚠️');
      setTimeout(() => { window.location.href = 'index.html'; }, 2500);
      return;
    }

    if (!State.questions || !Array.isArray(State.questions) || State.questions.length === 0) {
      console.error('[ExamCore] ❌ Validation failed: Questions not loaded. Count:', State.questions ? State.questions.length : 'null');
      console.error('[ExamCore] Cache key:', State.config ? `SOAL_${State.config.id_ujian}_v${State.config.versi_soal || 1}` : 'unknown');
      window.showCustomAlert('Soal Tidak Tersedia', 'Soal ujian belum di-download. Silakan sync ulang dari halaman jadwal.', '📥');
      setTimeout(() => { window.location.href = 'index.html'; }, 2500);
      return;
    }

    console.log('[ExamCore] ✅ Validation passed. User:', State.user.name, 'Questions:', State.questions.length);

    await ensureSecurityLoadedForExam();
    enforcePwaIfNeeded();
    initExamPage();
  }

  // Guard DOMContentLoaded race condition: jika sudah fired, langsung panggil
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initExamCore);
  } else {
    initExamCore();
  }

  async function ensureSecurityLoadedForExam() {
    if (State.security && typeof State.security === 'object') return;
    try {
      if (window.dbConnectFast) await window.dbConnectFast();
      const snap = await db.ref('/config/security').once('value');
      State.security = snap.val() || {};
    } catch (e) {
      State.security = State.security || {};
    } finally {
      if (window.dbDisconnect) window.dbDisconnect();
    }
  }

  function enforcePwaIfNeeded() {
    try {
      if (!State.security || !State.security.pwa) return;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      const hasBypass = sessionStorage.getItem('pwa_bypass_granted') === '1';
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      if (isMobile && !isStandalone && !hasBypass && !isLocal) {
        window.showCustomAlert('Wajib Install PWA', 'Aplikasi harus dibuka dari mode terpasang (PWA). Minta proktor untuk bypass jika diperlukan.', '📱');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
      }
    } catch (e) { }
  }

  function loadExamSessionFromStorage() {
    const sessionData = localStorage.getItem('CBT_EXAM_SESSION');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        // Validate required fields
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid session data structure');
        }
        if (!parsed.user || !parsed.user.id || !parsed.user.name) {
          throw new Error('Invalid user data in session');
        }
        if (!parsed.config || !parsed.config.id_ujian || !parsed.config.nama_ujian) {
          throw new Error('Invalid config data in session');
        }
        State.user = parsed.user;
        State.config = parsed.config;
        console.log('[ExamCore] Session loaded. User:', State.user.name, 'Exam:', State.config.nama_ujian);
      } catch (e) {
        console.error('[ExamCore] Failed to load exam session:', e);
        // Clear corrupt data
        localStorage.removeItem('CBT_EXAM_SESSION');
        State.user = null;
        State.config = null;
      }
    } else {
      console.warn('[ExamCore] No CBT_EXAM_SESSION found in localStorage');
    }
  }

  function loadExamStateFromStorage() {
    if (!State.user || !State.config) return;

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

        // Kurangi waktu yang berlalu sejak terakhir disimpan
        if (parsed.lastSavedAt) {
          const diffSec = Math.floor((new Date().getTime() - parsed.lastSavedAt) / 1000);
          if (diffSec > 0) tr -= diffSec;
        }

        // Jangan biarkan tr negatif atau melebihi durasi maksimal
        tr = Math.min(Math.max(tr, 0), maxTime);

        // Jika end_ms ada, hitung sisa waktu berdasarkan deadline absolut
        // dan ambil yang LEBIH KECIL (lebih aman)
        if (State.config.end_ms && State.config.end_ms > 0) {
          const trFromDeadline = Math.floor((State.config.end_ms - Date.now()) / 1000);
          if (trFromDeadline > 0) {
            tr = Math.min(tr, trFromDeadline);
          } else {
            // Deadline sudah lewat — siswa tidak bisa mulai
            tr = 0;
          }
        }

        State.timeRemaining = tr;
        console.log(`[ExamState] timeRemaining=${tr}s, durasi=${maxTime}s, end_ms=${State.config.end_ms}`);
      } catch (e) {
        console.warn('Failed to load exam state:', e);
        State.timeRemaining = State.config.durasi * 60;
      }
    } else {
      State.answers = {};
      State.doubts = new Set();
      State.currentIndex = 0;
      State.violations = 0;

      const maxTime = State.config.durasi * 60;
      let tr = maxTime;

      // Siswa baru mulai — hitung dari deadline jika ada
      if (State.config.end_ms && State.config.end_ms > 0) {
        const trFromDeadline = Math.floor((State.config.end_ms - Date.now()) / 1000);
        if (trFromDeadline > 0) {
          tr = Math.min(maxTime, trFromDeadline);
        } else {
          tr = 0;
        }
      }

      State.timeRemaining = tr;
      console.log(`[ExamState] Fresh start. timeRemaining=${tr}s, durasi=${maxTime}s, end_ms=${State.config.end_ms}`);
    }
  }

  async function loadQuestionsFromCache() {
    if (!State.config) {
      console.warn('[ExamCore] Cannot load questions - State.config is null');
      return;
    }
    const examId = State.config.id_ujian;
    const version = State.config.versi_soal || State.config.version || 1;
    const cacheKey = `SOAL_${examId}_v${version}`;
    
    console.log('[ExamCore] Loading questions. ExamId:', examId, 'Version:', version, 'CacheKey:', cacheKey);
    
    // Try IndexedDB first
    try {
      if (typeof window.cbtIdbGet === 'function') {
        const data = await window.cbtIdbGet(cacheKey);
        if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          State.questions = data.questions;
          // ✅ FIX: Normalisasi q.id ke String agar konsisten dengan server grading
          State.questions.forEach(q => { if (q.id !== undefined && q.id !== null) q.id = String(q.id); });
          console.log('[ExamCore] ✅ Loaded', State.questions.length, 'questions from IndexedDB');
          return;
        }
        console.log('[ExamCore] IndexedDB cache miss, trying localStorage...');
      }
    } catch (err) {
      console.warn('[ExamCore] IndexedDB error:', err);
    }

    // Fallback to localStorage
    loadFromLocalStorage(cacheKey);
  }

  function loadFromLocalStorage(cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    console.log('[ExamCore] localStorage lookup. CacheKey:', cacheKey, 'Found:', !!cached);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          State.questions = data.questions;
          // ✅ FIX: Normalisasi q.id ke String
          State.questions.forEach(q => { if (q.id !== undefined && q.id !== null) q.id = String(q.id); });
          console.log('[ExamCore] ✅ Loaded', State.questions.length, 'questions from localStorage');
        } else {
          console.error('[ExamCore] ❌ Invalid questions data structure in cache');
          console.error('[ExamCore] Data:', data);
        }
      } catch (e) {
        console.error('[ExamCore] ❌ Failed to parse questions from cache:', e);
      }
    } else {
      console.error('[ExamCore] ❌ No cached questions found for key:', cacheKey);
      // List all cache keys for debugging
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('SOAL_'));
      console.error('[ExamCore] Available cache keys:', allKeys);
    }
  }

  function initExamPage() {
    State.examActive = true;
    State.submissionLocked = false;
    State.submissionFailed = false; // Pastikan false saat mulai
    State.pingOffset = Math.floor(Math.random() * 600);

    document.getElementById('exam-title').textContent = State.config.nama_ujian;
    document.getElementById('exam-user-info').textContent = State.user.name + " (" + State.user.kelas + ")";

    const fullscreenEnabled = !!((State.security && State.security.fullscreen) || (State.config && State.config.fullscreen));
    if (fullscreenEnabled) {
      const root = document.documentElement;
      if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen().catch(() => {});

      // Re-enforce fullscreen jika user keluar (ESC)
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && State.examActive) {
          // Coba masuk fullscreen lagi
          document.documentElement.requestFullscreen().catch(() => {});
        }
      });
    }

    gasRun('setStudentOnline', State.config.id_ujian, State.user.id).catch(() => {});

    startTimer();
    initGrid();
    renderQuestion(State.currentIndex);

    // Pastikan tombol navigasi sesuai posisi awal (soal pertama)
    if (typeof updateNavButtons === 'function') {
      updateNavButtons();
    }

    // Safety: Sembunyikan tombol Selesai secara paksa jika bukan di soal terakhir
    const btnSubmit = document.getElementById('btnSubmit');
    const btnNext = document.getElementById('btnNext');
    if (btnSubmit && btnNext) {
      const isLast = State.questions && State.questions.length > 0 && State.currentIndex === State.questions.length - 1;
      if (!isLast) {
        btnSubmit.style.display = 'none';
        btnNext.style.display = 'flex';
      }
    }

    saveStateLocal();

    setupExamEventListeners();
    setupAntiCheat();
    setupAutoSave();
  }

  function setupExamEventListeners() {
    // btnNext, btnPrev, btnDoubt listeners are handled by script.js
    // This prevents duplicate listeners that cause conflicts

    safeAddListener('btnGrid', 'click', () => {
      openGrid();
    });

    safeAddListener('btnCloseGrid', 'click', () => {
      closeGrid();
    });
  }

  function setupAutoSave() {
    // FREE TIER OPTIMIZATION: Interval sangat lebar untuk reduce load
    // - Default: 60-120s (2x lebih lebar dari sebelumnya)
    // - Menjelang akhir (<5 menit): 20-40s
    // - Offline: skip sync ke server, tetap simpan lokal
    // Target: 900 siswa = ~10 req/s (sustainable untuk free tier)
    const rand = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
    const schedule = () => {
      if (!State.examActive) return;

      const tr = Number(State.timeRemaining || 0);
      const isEndGame = tr > 0 && tr <= 300; // 5 menit terakhir
      // Aggressive interval untuk free tier: 60-120s (dari 40-80s)
      const delayMs = isEndGame ? rand(20000, 40000) : rand(60000, 120000);

      setTimeout(async () => {
        if (!State.examActive) return;
        try {
          saveStateLocal();
          if (navigator.onLine !== false) {
            await syncAnswersToServer();
          }
        } finally {
          schedule();
        }
      }, delayMs);
    };
    schedule();
  }

  function setupAntiCheat() {
    const antiCheatEnabled = !!((State.security && State.security.anticheat) || (State.config && State.config.anticheat));
    if (!antiCheatEnabled) return;

    // NOTE: visibilitychange dan blur TIDAK dipasang di sini karena sudah ada di script.js
    // Memasang duplikat akan menyebabkan violations dihitung 2x dan auto-submit terlalu cepat

    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // contextmenu sudah di-handle oleh script.js global, tidak perlu duplikat
  }

  function showCheatAlert() {
    const overlay = document.getElementById('cheat-alert-overlay');
    if (!overlay) return;

    overlay.style.display = 'flex';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    let countdown = 3;
    const countdownEl = document.getElementById('cheat-countdown');
    if (countdownEl) countdownEl.textContent = countdown;

    const interval = setInterval(() => {
      countdown--;
      if (countdownEl) countdownEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(interval);
        overlay.style.display = 'none';
      }
    }, 1000);
  }

  function openGrid() {
    const container = document.getElementById('qGridContainer');
    const overlay = document.getElementById('gridOverlay');
    if (container) container.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    if (typeof updateGridUI === 'function') updateGridUI();
  }

  window.closeGrid = function() {
    const container = document.getElementById('qGridContainer');
    const overlay = document.getElementById('gridOverlay');
    if (container) container.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  };

  window.syncAnswersToServer = async function() {
    if (!State.config || !State.user) return;
    // Skip sync if we know it will fail (permission denied)
    // Answers are safely stored in localStorage via saveStateLocal()
    if (State._syncDenied) return;

    const answers = State.answers || {};
    const lastSynced = State._lastSyncedAnswers || {};
    const answerDelta = {};
    const answerKeys = new Set([...Object.keys(answers), ...Object.keys(lastSynced)]);
    answerKeys.forEach((qId) => {
      const currentVal = answers[qId];
      const previousVal = lastSynced[qId];
      if (JSON.stringify(currentVal) !== JSON.stringify(previousVal)) {
        answerDelta[qId] = currentVal === undefined ? null : currentVal;
      }
    });

    // FREE TIER OPTIMIZATION: Batch sync - hanya sync jika ada 3+ perubahan
    // Kecuali di 5 menit terakhir (endgame) → sync semua perubahan
    const tr = Number(State.timeRemaining || 0);
    const isEndGame = tr > 0 && tr <= 300;
    const changeCount = Object.keys(answerDelta).length;
    
    if (changeCount === 0) return;
    
    if (!isEndGame && changeCount < 3) {
      console.log(`[SyncAnswers] Batching: ${changeCount} changes (waiting for 3+)`);
      return; // Skip sync, tunggu lebih banyak perubahan
    }

    console.log(`[SyncAnswers] Syncing ${changeCount} changes (endgame: ${isEndGame})`);

    const payload = {
      id_ujian: State.config.id_ujian,
      id_siswa: State.user.id,
      answerDelta,
      timeRemaining: State.timeRemaining,
      violations: State.violations || 0
    };
    try {
      await gasRun('syncAnswers', payload);
      State._lastSyncedAnswers = JSON.parse(JSON.stringify(answers));
      console.log(`[SyncAnswers] ✅ Synced successfully`);
    } catch (err) {
      if (err && err.toString().includes('PERMISSION_DENIED')) {
        console.warn('[SyncAnswers] Permission denied - disabling sync to server. Answers saved locally.');
        State._syncDenied = true;
      } else {
        console.warn('[SyncAnswers] Sync failed:', err);
      }
    }
  };

  window.addEventListener('beforeunload', (e) => {
    if (State.examActive) {
      saveStateLocal();
      e.preventDefault();
      e.returnValue = '';
    }
  });

})();
