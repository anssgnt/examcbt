// =====================================================
// Admin Analytics/Print Module (split from admin-core.js)
// =====================================================

window.startItemAnalysis = function() {
  const container = document.getElementById('analisis-container');
  if (!container) return;
  
  const results = window.adminState.hasil || [];
  if (results.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--danger);">Tidak ada data hasil untuk dianalisis.</div>';
    return;
  }

  showLoading('Menganalisis Butir Soal...');
  
  const stats = {};
  results.forEach(res => {
    if (!res.detail) return;
    try {
      const detail = JSON.parse(res.detail);
      Object.keys(detail).forEach(qId => {
        if (!stats[qId]) stats[qId] = { wrong: 0, total: 0 };
        stats[qId].total++;
        if (detail[qId].correct === false) stats[qId].wrong++;
      });
    } catch(e) {}
  });

  const sortedIds = Object.keys(stats).sort((a, b) => {
    const pctA = stats[a].wrong / stats[a].total;
    const pctB = stats[b].wrong / stats[b].total;
    return pctB - pctA;
  });

  if (sortedIds.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">Data detail jawaban tidak ditemukan. Pastikan siswa menggunakan versi aplikasi terbaru.</div>';
    hideLoading();
    return;
  }

  let html = '';
  sortedIds.forEach((id) => {
    const s = stats[id];
    const pct = Math.round((s.wrong / s.total) * 100);
    const color = pct > 70 ? '#EF4444' : (pct > 40 ? '#F59E0B' : '#10B981');
    
    html += `
      <div class="admin-card" style="padding:15px; border-left: 4px solid ${color};">
        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:5px;">ID SOAL: ${id}</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; font-size:1.1rem; color:${color}">${pct}% Salah</span>
          <span style="font-size:0.8rem; background:var(--bg-subtle); padding:2px 8px; border-radius:10px;">${s.wrong}/${s.total} Siswa</span>
        </div>
        <div style="margin-top:10px; height:6px; background:#E5E7EB; border-radius:3px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:${color};"></div>
        </div>
        <div style="margin-top:8px; font-size:0.75rem; color:var(--text-muted);">
          ${pct > 70 ? '⚠️ Soal ini sangat sulit!' : (pct < 20 ? '✅ Soal ini sangat mudah.' : 'Ketajaman soal rata-rata.')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  hideLoading();
};

window.openPrintModal = async function (examId, examName) {
  const overlay = document.getElementById('print-overlay');
  const modal = document.getElementById('print-config-modal');
  if (!overlay || !modal) return;

  document.getElementById('printExamId').value = examId;
  document.getElementById('printExamName').value = examName;

  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const jSnap = await db.ref('/jadwal/' + examId).once('value');
    const jData = jSnap.val() || {};
    const pSnap = await db.ref('/peserta').once('value');
    const pData = pSnap.val() || {};

    const targetKelas = jData.kelas || jData.target_kelas || '';
    const kelasList = new Set();
    for (let id in pData) {
      if (pData[id].kelas) {
        if (!targetKelas || targetKelas.toLowerCase() === 'semua') kelasList.add(pData[id].kelas);
        else {
          const targets = String(targetKelas).split(',').map(k => k.trim().toLowerCase());
          if (targets.some(t => pData[id].kelas.toLowerCase().includes(t))) kelasList.add(pData[id].kelas);
        }
      }
    }
    const sortedKelas = [...kelasList].sort();
    const select = document.getElementById('printKelas');
    select.innerHTML = '<option value="">Semua Kelas</option>' + sortedKelas.map(k => `<option value="${k}">${k}</option>`).join('');
  } catch (e) { console.warn("Gagal load kelas:", e); }
  finally { if (window.dbDisconnect) window.dbDisconnect(); }

  overlay.classList.add('active');
  modal.style.display = 'flex';
  setTimeout(() => {
    overlay.style.opacity = '1';
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
};

window.closePrintModal = function () {
  const overlay = document.getElementById('print-overlay');
  const modal = document.getElementById('print-config-modal');
  if (!overlay || !modal) return;
  overlay.classList.remove('active');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    overlay.style.display = 'none';
    modal.style.display = 'none';
  }, 300);
};

window.executePrint = async function () {
  const examName = document.getElementById('printExamName').value;
  const kelasFilter = document.getElementById('printKelas').value;
  const tanggal = document.getElementById('printTanggal').value;

  showLoading('Menyiapkan Dokumen...');
  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const idenSnap = await db.ref('/config/identity').once('value');
    const iden = idenSnap.val() || {};
    const schoolLogo = iden.logo || '';
    const schoolName = iden.name || 'CBT Online';

    const pSnap = await db.ref('/peserta').once('value');
    const pData = pSnap.val() || {};
    
    let students = [];
    for (let id in pData) if (!kelasFilter || pData[id].kelas === kelasFilter) students.push({ id, ...pData[id] });
    students.sort((a, b) => a.nama.localeCompare(b.nama));

    document.getElementById('pd-school-name').innerText = schoolName.toUpperCase();
    document.getElementById('pd-exam-name').innerText = examName.toUpperCase();
    document.getElementById('pd-exam-date').innerText = tanggal ? new Date(tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const logoImg = document.getElementById('pd-logo-img');
    if (schoolLogo) { logoImg.src = schoolLogo; logoImg.style.display = 'block'; }
    else logoImg.style.display = 'none';

    const tbody = document.getElementById('print-siswa-tbody');
    tbody.innerHTML = students.map((s, i) => `
      <tr>
        <td style="text-align:center; padding:8px; border:1px solid black;">${i + 1}</td>
        <td style="padding:8px; border:1px solid black;">${s.id}</td>
        <td style="padding:8px; border:1px solid black;">${s.nama}</td>
        <td style="padding:8px; border:1px solid black; width:17%;">${i % 2 === 0 ? (i + 1) + '. .........' : ''}</td>
        <td style="padding:8px; border:1px solid black; width:17%;">${i % 2 !== 0 ? (i + 1) + '. .........' : ''}</td>
      </tr>
    `).join('');

    const printArea = document.getElementById('print-document-area');
    const originalDisplay = printArea.style.display;
    printArea.style.display = 'block';
    window.print();
    printArea.style.display = originalDisplay;
    closePrintModal();
  } catch (e) {
    console.error(e);
    showCustomAlert('Gagal', 'Gagal mencetak: ' + e.message, '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
    hideLoading();
  }
};

window.doPrint = function () {
  return window.executePrint();
};

window.openAnalisisModal = async function (examId) {
  const overlay = document.getElementById('analisis-overlay');
  const modal = document.getElementById('analisis-modal');
  const content = document.getElementById('analisis-content');
  if (!overlay || !modal || !content) return;

  overlay.classList.add('active');
  modal.style.display = 'flex';
  content.innerHTML = '<div style="text-align:center; padding:40px;">Menganalisis data...</div>';

  try {
    if (window.dbConnectFast) await window.dbConnectFast();
    const jSnap = await db.ref('/jadwal/' + examId).once('value');
    const sch = jSnap.val();
    if (!sch) throw new Error("Jadwal tidak ditemukan.");
    
    const [sSnap, hSnap] = await Promise.all([
      db.ref('/soal/' + sch.nama_soal).once('value'),
      db.ref('/hasil').orderByChild('examId').equalTo(examId).once('value')
    ]);
    
    const sData = sSnap.val() || {};
    const hData = hSnap.val() || {};
    const hList = Object.values(hData);
    if (hList.length === 0) {
      content.innerHTML = '<div style="text-align:center; padding:40px;">Belum ada hasil yang masuk untuk ujian ini.</div>';
      return;
    }

    const stats = {};
    hList.forEach(h => {
      let detail = {};
      try { detail = JSON.parse(h.detail || '{}'); } catch(e) {}
      Object.keys(detail).forEach(qId => {
        if (!stats[qId]) stats[qId] = { wrong: 0, total: 0 };
        stats[qId].total++;
        if (detail[qId].correct === false) stats[qId].wrong++;
      });
    });

    const sorted = Object.keys(stats).map(qId => ({
      id: qId,
      wrong: stats[qId].wrong,
      total: stats[qId].total,
      pct: Math.round((stats[qId].wrong / stats[qId].total) * 100),
      text: sData[qId] ? sData[qId].pertanyaan : 'Soal telah dihapus'
    })).sort((a, b) => b.pct - a.pct);

    let html = `<div style="background:var(--primary-light); padding:10px; border-radius:8px; margin-bottom:15px; font-weight:600; font-size:0.85rem;">Total Peserta Teranalisis: ${hList.length} Siswa</div>`;
    sorted.forEach((s, i) => {
      const color = s.pct > 70 ? '#DC2626' : (s.pct > 40 ? '#D97706' : '#059669');
      html += `
        <div class="card" style="margin-bottom:10px; padding:12px; border-left: 4px solid ${color};">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span style="font-weight:700; color:${color};">#${i+1} - ${s.pct}% SALAH</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">${s.wrong}/${s.total} Siswa</span>
          </div>
          <div style="font-size:0.85rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${s.text}
          </div>
        </div>`;
    });
    
    content.innerHTML = html;
  } catch (e) {
    console.error(e);
    content.innerHTML = `<div style="text-align:center; padding:40px; color:var(--danger);">Error: ${e.message}</div>`;
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }

  setTimeout(() => {
    overlay.style.opacity = '1';
    modal.style.opacity = '1';
    modal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
};

window.closeAnalisisModal = function () {
  const overlay = document.getElementById('analisis-overlay');
  const modal = document.getElementById('analisis-modal');
  if (!overlay || !modal) return;
  overlay.classList.remove('active');
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
};
