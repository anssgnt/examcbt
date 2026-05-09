// result-core.js - Result page logic
// Loaded by result.html after script.js

(function() {
  'use strict';

  if (!document.body.classList.contains('result-page')) return;

  window.addEventListener('DOMContentLoaded', () => {
    loadResultPage();
  });

  async function loadResultPage() {
    window.showLoading('Memuat hasil ujian...');

    try {
      const lastResult = localStorage.getItem('CBT_LAST_RESULT');
      if (!lastResult) {
        window.showCustomAlert('Data Tidak Ditemukan', 'Hasil ujian tidak tersedia.', '⚠️');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
      }

      const result = JSON.parse(lastResult);

      // Parse detail sekali di awal
      let parsedDetail = null;
      if (result.detail) {
        parsedDetail = result.detail;
        if (typeof parsedDetail === 'string') {
          try { parsedDetail = JSON.parse(parsedDetail); } catch (e) { parsedDetail = {}; }
        }
        if (typeof parsedDetail !== 'object' || parsedDetail === null) parsedDetail = {};
      }

      // ✅ FIX: Hitung ulang score dari detail jika score = 0 tapi ada jawaban benar
      if (parsedDetail) {
        const entries = Object.values(parsedDetail);
        const hasCorrectInfo = entries.some(e => e && e.correct !== null && e.correct !== undefined);
        if (hasCorrectInfo && (result.score === 0 || result.score === null || result.score === undefined)) {
          const correctCount = entries.filter(e => e && e.correct === true).length;
          const totalCount = entries.length;
          if (totalCount > 0 && correctCount > 0) {
            result.score = Math.round((correctCount / totalCount) * 100);
            localStorage.setItem('CBT_LAST_RESULT', JSON.stringify(result));
          }
        }
      }

      window.safeSetText('result-score', result.score !== undefined && result.score !== null ? result.score : 0);
      window.safeSetText('result-exam-name', result.namaUjian || '-');
      window.safeSetText('result-name', result.user?.name || '-');
      window.safeSetText('result-kelas', result.user?.kelas || '-');
      window.safeSetText('result-time', result.usedTime || '-');
      window.safeSetText('result-violations', result.violations || 0);

      if (parsedDetail) {
        const entries = Object.values(parsedDetail);
        const total = entries.length;
        const hasCorrectInfo = entries.some(e => e && e.correct !== null && e.correct !== undefined);
        const correct = hasCorrectInfo ? entries.filter(e => e && e.correct === true).length : '-';
        const wrong = hasCorrectInfo ? entries.filter(e => e && e.correct === false && e.answer !== '-').length : '-';
        const empty = entries.filter(e => !e || e.answer === '-' || e.answer === undefined || e.answer === null).length;

        window.safeSetText('result-correct', correct);
        window.safeSetText('result-wrong', wrong);
        window.safeSetText('result-empty', empty);
        window.safeSetText('result-total', total);
      }

      const kkm = result.config?.kkm || 75;
      const remedialInfo = document.getElementById('result-remedial-info');
      if (result.score < kkm && remedialInfo) {
        remedialInfo.style.display = 'block';
      }

      window.hideLoading();
      setupResultListeners();

    } catch (e) {
      console.error('Result load error:', e);
      window.hideLoading();
      window.showCustomAlert('Error', 'Gagal memuat hasil: ' + e.message, '❌');
    }
  }

  function setupResultListeners() {
    const btnBack = document.getElementById('btnBackSchedule');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        // Clear all exam-related data from localStorage
        localStorage.removeItem('CBT_LAST_RESULT');
        localStorage.removeItem('CBT_EXAM_SESSION');
        localStorage.removeItem('CBT_EXAM_STATE');
        localStorage.removeItem('CBT_EXAM_CONFIG');
        localStorage.removeItem('CBT_QUESTIONS');
        
        // Clear state
        State.user = null;
        State.answers = {};
        State.doubts = new Set();
        State.currentIndex = 0;
        State.timeRemaining = 0;
        State.examActive = false;
        
        // Redirect to home page
        window.location.href = 'index.html';
      });
    }
  }

})();
