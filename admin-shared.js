// =====================================================
// Admin Shared Module (split from script.js)
// =====================================================

function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = [];
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    let row = [], cols = rows[i].querySelectorAll('td, th');
    for (let j = 0; j < cols.length; j++) {
      let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, ' ').replace(/"/g, '""');
      row.push('"' + data + '"');
    }
    csv.push(row.join(','));
  }

  const csvData = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(csvData);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
window.exportTableToCSV = exportTableToCSV;

function hideAdminPreview() {
  const modal = document.getElementById('admin-preview-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  modal.style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    modal.style.display = 'none';
    const overlay = document.getElementById('preview-overlay');
    if (overlay) overlay.classList.remove('active');
  }, 300);
}

window.closePreviewModal = function () {
  hideAdminPreview();
};

let PreviewState = {
  questions: [],
  currentIndex: 0,
  examId: ''
};

window.navigatePreview = function (dir) {
  const newIdx = PreviewState.currentIndex + dir;
  if (newIdx >= 0 && newIdx < PreviewState.questions.length) {
    PreviewState.currentIndex = newIdx;
    renderPreviewQuestion(PreviewState.currentIndex);
  }
};

function renderPreviewQuestion(index) {
  const q = PreviewState.questions[index];
  if (!q) return;

  document.getElementById('prev-q-indicator').textContent = `${index + 1} / ${PreviewState.questions.length}`;
  document.getElementById('prev-q-number').innerHTML = `SOAL ${index + 1} <span style="font-size:0.75rem; font-weight:normal; margin-left:6px; color:var(--text-muted);">(Tipe: ${q.tipe})</span> <button class="btn btn-outline" style="padding:2px 8px; font-size:0.75rem; margin-left:10px;" onclick="openSoalEditModal('${PreviewState.examId}', '${q.id}')">✏️ Edit</button>`;
  document.getElementById('prev-q-text').textContent = q.pertanyaan;

  const imgContainer = document.getElementById('prev-q-image-container');
  if (q.gambar && q.gambar.trim() !== '') {
    imgContainer.innerHTML = `<img src="${q.gambar.trim()}" class="q-image" loading="lazy" onclick="openZoomModal('${q.gambar.trim()}')" alt="Gambar Soal" />`;
    imgContainer.style.display = 'block';
  } else {
    imgContainer.style.display = 'none';
    imgContainer.innerHTML = '';
  }

  renderPreviewOptions(q);
  document.getElementById('btnPrevPreview').disabled = (index === 0);
  document.getElementById('btnNextPreview').disabled = (index === PreviewState.questions.length - 1);
}

function renderPreviewOptions(q) {
  const container = document.getElementById('prev-q-options');
  if (!container) return;
  container.innerHTML = '';

  if (q.tipe === 'PG' || q.tipe === 'BS') {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    q.opsi.forEach((opt, idx) => {
      const isCorrect = q.kunci && (String(opt.id).trim().toUpperCase() === String(q.kunci).trim().toUpperCase() || (opt.text && String(opt.text).trim().toUpperCase() === String(q.kunci).trim().toUpperCase()));
      const displayLabel = labels[idx] || (idx + 1);
      const div = document.createElement('div');
      div.className = `option-item ${isCorrect ? 'answer-correct' : ''}`;

      let imgHTML = '';
      if (opt.gambar) imgHTML = `<img src="${opt.gambar}" class="q-image" loading="lazy" style="max-height:140px; margin-top:8px; display:block;" onclick="openZoomModal('${opt.gambar}'); event.stopPropagation();" />`;

      div.innerHTML = `
        <div style="display:flex; align-items:flex-start; width:100%;">
          <input type="radio" ${isCorrect ? 'checked' : ''} disabled style="margin-top:4px;">
          <div style="margin-left:10px; width:100%;">
            <div class="option-text" style="font-weight:600; display:inline-block; margin-right:6px; color:${isCorrect ? '#065F46' : 'inherit'}">${displayLabel}.</div>
            <div class="option-text" style="display:inline-block; color:${isCorrect ? '#065F46' : 'inherit'}">${opt.text}</div>
            ${imgHTML}
          </div>
          ${isCorrect ? '<span style="margin-left:auto;">✅</span>' : ''}
        </div>
      `;
      container.appendChild(div);
    });
  } else if (q.tipe === 'KOMPLEKS') {
    const keysArr = q.kunci ? String(q.kunci).toUpperCase().split(',').map(s => s.trim()) : [];
    const labels = ['A', 'B', 'C', 'D', 'E'];
    q.opsi.forEach((opt, idx) => {
      const isCorrect = keysArr.includes(String(opt.id).toUpperCase()) || (opt.text && keysArr.includes(String(opt.text).toUpperCase()));
      const displayLabel = labels[idx] || (idx + 1);
      const div = document.createElement('div');
      div.className = `option-item ${isCorrect ? 'answer-correct' : ''}`;
      const imgHTML = `<img src="${opt.gambar}" class="q-image" loading="lazy" style="max-height:140px; margin-top:8px; display:block;" onclick="openZoomModal('${opt.gambar}'); event.stopPropagation();" />`;

      div.innerHTML = `
        <div style="display:flex; align-items:flex-start; width:100%;">
          <input type="checkbox" ${isCorrect ? 'checked' : ''} disabled style="margin-top:4px;">
          <div style="margin-left:10px; width:100%;">
            <div class="option-text" style="font-weight:600; display:inline-block; margin-right:6px; color:${isCorrect ? '#065F46' : 'inherit'}">${displayLabel}.</div>
            <div class="option-text" style="display:inline-block; color:${isCorrect ? '#065F46' : 'inherit'}">${opt.text}</div>
            ${imgHTML}
          </div>
          ${isCorrect ? '<span style="margin-left:auto;">✅</span>' : ''}
        </div>
      `;
      container.appendChild(div);
    });
  } else {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="padding:15px; border-radius:8px; background:#D1FAE5; border:1px solid #10B981; color:#065F46; font-weight:600; text-align:center;">
        🔑 KUNCI JAWABAN:<br>
        <span style="font-size:1.1rem; display:block; margin-top:8px;">${q.kunci || '<i>Belum diatur</i>'}</span>
      </div>
    `;
    container.appendChild(div);
  }
}

async function showAdminPreview(examId) {
  showLoading('Menarik Bank Soal...');
  try {
    const res = await gasRun('getAdminPreviewSoal', examId);
    hideLoading();

    if (res.success) {
      document.getElementById('preview-title').textContent = res.examName || examId;
      PreviewState.questions = res.questions;
      PreviewState.currentIndex = 0;
      PreviewState.examId = examId;

      if (res.questions.length === 0) {
        document.getElementById('prev-q-number').innerHTML = 'SOAL Kosong';
        document.getElementById('prev-q-text').innerHTML = '<p class="text-muted text-center" style="margin-top:40px;">Soal belum diunggah.</p>';
        document.getElementById('prev-q-options').innerHTML = '';
        document.getElementById('prev-q-image-container').style.display = 'none';
        document.getElementById('btnPrevPreview').parentElement.style.display = 'none';
      } else {
        document.getElementById('btnPrevPreview').parentElement.style.display = 'flex';
        renderPreviewQuestion(0);
      }

      const overlay = document.getElementById('preview-overlay');
      const modal = document.getElementById('admin-preview-modal');
      if (overlay) overlay.classList.add('active');
      if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
          modal.style.opacity = '1';
          modal.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
      }
    } else {
      showCustomAlert('Gagal Membaca Soal', 'Gagal membaca lembar soal: ' + res.message, '❌');
    }
  } catch (e) {
    hideLoading();
    showCustomAlert('Koneksi Bermasalah', 'Koneksi ke server bermasalah. Coba lagi.', '🌐');
  }
}
window.showAdminPreview = showAdminPreview;

window.openSoalEditModal = async function (bankId, soalId) {
  showLoading('Memuat data soal...');
  try {
    const snapSoal = await db.ref('/soal/' + bankId + '/' + soalId).once('value');
    const snapKunci = await db.ref('/kunci/' + bankId + '/' + soalId).once('value');
    const q = snapSoal.val();
    const k = snapKunci.val();
    hideLoading();

    if (q && (q.tipe === 'PG' || q.tipe === 'KOMPLEKS' || q.tipe === 'BS')) {
      document.getElementById('soalEditBankId').value = bankId;
      document.getElementById('soalEditId').value = soalId;
      document.getElementById('soalEditPertanyaan').value = q.pertanyaan || '';
      document.getElementById('soalEditGambar').value = q.gambar || '';
      const opsiContainer = document.getElementById('soalEditOpsiContainer');
      opsiContainer.innerHTML = '';

      q.opsi.forEach(opt => {
        opsiContainer.innerHTML += `
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-weight:700; width:20px;">${opt.id}</span>
            <input type="text" id="soalEditOpsiText_${opt.id}" class="form-control" placeholder="Teks opsi" value="${opt.text || ''}" style="flex:1;">
            <input type="text" id="soalEditOpsiGambar_${opt.id}" class="form-control" placeholder="Tautan gbr" value="${opt.gambar || ''}" style="flex:1;">
          </div>
        `;
      });

      const kVal = String(k || '').trim().toUpperCase();
      document.getElementById('soalEditKunci').value = kVal;
      document.getElementById('soal-edit-overlay').classList.add('active');
      document.getElementById('soal-edit-modal').style.display = 'flex';
      setTimeout(() => {
        document.getElementById('soal-edit-modal').style.opacity = '1';
        document.getElementById('soal-edit-modal').style.transform = 'translate(-50%, -50%) scale(1)';
      }, 10);
    } else {
      showCustomAlert('Tipe Tidak Didukung', 'Edit cepat hanya mendukung tipe PG, Benar-Salah, dan PG Kompleks.', 'ℹ️');
    }
  } catch (e) {
    hideLoading();
    showCustomAlert('Gagal', 'Gagal mengambil data soal dari server.', '❌');
  }
};

window.closeSoalEditModal = function () {
  document.getElementById('soal-edit-overlay').classList.remove('active');
  document.getElementById('soal-edit-modal').style.opacity = '0';
  document.getElementById('soal-edit-modal').style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    document.getElementById('soal-edit-modal').style.display = 'none';
  }, 300);
};

window.saveSoalEdit = async function () {
  const bankId = document.getElementById('soalEditBankId').value;
  const soalId = document.getElementById('soalEditId').value;
  const pertanyaan = document.getElementById('soalEditPertanyaan').value.trim();
  const gambar = document.getElementById('soalEditGambar').value.trim();
  const rawKunci = document.getElementById('soalEditKunci').value;

  if (!pertanyaan) return showCustomAlert('Data Tidak Lengkap', 'Teks soal tidak boleh kosong.', '📝');
  if (!rawKunci) return showCustomAlert('Data Tidak Lengkap', 'Kunci jawaban tidak boleh kosong.', '📝');

  const kunci = String(rawKunci).toUpperCase().replace(/\s+/g, '');
  const letters = ['A', 'B', 'C', 'D'];
  const newOpsi = [];
  letters.forEach(letter => {
    const textEl = document.getElementById('soalEditOpsiText_' + letter);
    const imgEl = document.getElementById('soalEditOpsiGambar_' + letter);
    if (textEl) {
      const t = textEl.value.trim();
      const g = imgEl.value.trim();
      if (t || g) newOpsi.push({ id: letter, text: t, gambar: g });
    }
  });

  showLoading('Menyimpan perubahan...');
  try {
    await db.ref('/soal/' + bankId + '/' + soalId).update({ pertanyaan, gambar, opsi: newOpsi });
    await db.ref('/kunci/' + bankId + '/' + soalId).set(kunci);
    hideLoading();
    closeSoalEditModal();
    showCustomAlert('Berhasil', 'Perubahan berhasil disimpan!', '✅');
    previewSoal(bankId);
  } catch (e) {
    hideLoading();
    showCustomAlert('Gagal Menyimpan', 'Gagal menyimpan perubahan. Coba lagi.', '❌');
  }
};
