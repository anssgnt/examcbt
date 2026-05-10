// =====================================================
// Admin Import Module (split from admin-core.js)
// =====================================================

// --- Import Logic ---
let currentImportType = '';

window.downloadTemplateExcel = async function () {
  if (typeof XLSX === 'undefined') {
    showLoading('Memuat Library...');
    await loadXLSXLibrary();
    hideLoading();
  }
  let data = [];
  if (currentImportType === 'siswa') {
    data = [
      ["ID_SISWA", "NAMA_LENGKAP", "KELAS"],
      ["12345", "Budi Santoso", "IX A"],
      ["67890", "Siti Aminah", "IX B"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, "Template_Siswa.xlsx");
  } else {
    data = [
      ["Jenis (PG/BS/KOMPLEKS/ISIAN/JODOH)", "Teks Pertanyaan", "Tautan Gambar Soal", "Tautan Audio/Video", "Opsi A", "Gambar A", "Opsi B", "Gambar B", "Opsi C", "Gambar C", "Opsi D", "Gambar D", "Kunci Jawaban (1=A,2=B.. atau Teks)"],
      ["PG", "Apa ibukota Indonesia?", "", "", "Bandung", "", "Surabaya", "", "Jakarta", "", "Semarang", "", "3"],
      ["PG", "Perhatikan gambar berikut. Bangun apakah ini?", "https://link-gambar.com/kubus.jpg", "", "Kubus", "", "Balok", "", "Bola", "", "Tabung", "", "1"],
      ["KOMPLEKS", "Pilih kota yang ada di Jawa Tengah", "", "", "Semarang", "", "Solo", "", "Bandung", "", "Surabaya", "", "1, 2"],
      ["BS", "Matahari terbenam di timur", "", "", "Benar", "", "Salah", "", "", "", "", "", "2"],
      ["JODOH", "Pasangkan negara dengan benuanya", "", "", "Indonesia=Asia", "", "Mesir=Afrika", "", "Jerman=Eropa", "", "", "", "(Otomatis)"],
      ["ISIAN", "15 + 25 = ?", "", "", "", "", "", "", "", "", "", "", "40"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Soal");
    XLSX.writeFile(wb, "Template_Soal.xlsx");
  }
}

window.openImportModal = function (type) {
  currentImportType = type;
  document.getElementById('import-overlay').classList.add('active');
  document.getElementById('import-modal').style.display = 'flex';
  document.getElementById('importFileInput').value = '';

  setTimeout(() => {
    document.getElementById('import-modal').style.opacity = '1';
    document.getElementById('import-modal').style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);

  if (type === 'siswa') {
    document.getElementById('import-title').innerText = 'Import Data Siswa';
    document.getElementById('import-desc').innerText = 'Format Excel (.xlsx): Kolom A(ID), B(Nama), C(Kelas)';
    document.getElementById('import-extra-inputs').style.display = 'none';
  } else if (type === 'soal') {
    document.getElementById('import-title').innerText = 'Import Bank Soal';
    document.getElementById('import-desc').innerText = 'Gunakan Template Excel (.xlsx) Standar.';
    document.getElementById('import-extra-inputs').style.display = 'flex';
    document.getElementById('importBankId').value = '';
  }
}

window.closeImportModal = function () {
  document.getElementById('import-overlay').classList.remove('active');
  document.getElementById('import-modal').style.opacity = '0';
  document.getElementById('import-modal').style.transform = 'translate(-50%, -50%) scale(0.95)';
  setTimeout(() => {
    document.getElementById('import-modal').style.display = 'none';
  }, 300);
}

window.handleImportFile = async function (file) {
  if (!file) return;
  const fileInput = document.getElementById('importFileInput');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showCustomAlert('File Tidak Valid', 'Gagal membaca file yang dipilih.', '❌');
    return;
  }
  try {
    await window.processImport();
  } catch (e) {
    showCustomAlert('Import Gagal', 'Terjadi kesalahan saat import: ' + e.message, '❌');
  }
}

// --- XLSX Import Logic ---
function makeScopedSoalId(bankId, rowIndex) {
  const raw = String(bankId || '').trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 1000000;
  }
  return (hash * 1000) + rowIndex;
}

async function importSoalExcel(jsonData, bankId) {
  if (window.dbConnectFast) await window.dbConnectFast();
  try {
    let soalUpdates = {};
    let kunciUpdates = {};
    let count = 0;
    let warnings = [];
    const letters = ['A', 'B', 'C', 'D', 'E'];

    let headerRow = jsonData[0] || [];
    let kunciIdx = -1;
    let opsiIndices = [];

    for (let c = 0; c < headerRow.length; c++) {
      const head = String(headerRow[c]).toLowerCase();
      if (head.includes('kunci')) kunciIdx = c;
      else if (head.startsWith('opsi ') || (head.includes('pilihan') && !head.includes('kompleks'))) {
        const label = head.replace(/opsi|pilihan|\s/g, '').toUpperCase();
        if (label.length === 1 && label >= 'A' && label <= 'E') {
          let imgIdx = -1;
          if (c + 1 < headerRow.length && String(headerRow[c + 1]).toLowerCase().includes('gambar')) imgIdx = c + 1;
          opsiIndices.push({ label, textIdx: c, imgIdx });
        }
      }
    }

    if (opsiIndices.length === 0) {
      for (let j = 0; j < 5; j++) {
        let tIdx = 4 + (j * 2);
        let iIdx = 5 + (j * 2);
        if (tIdx < (kunciIdx > 0 ? kunciIdx : headerRow.length)) opsiIndices.push({ label: letters[j], textIdx: tIdx, imgIdx: iIdx });
      }
    }
    if (kunciIdx === -1) kunciIdx = 12;

    for (let i = 1; i < jsonData.length; i++) {
      let row = jsonData[i];
      if (!row || row.length === 0 || !row[1]) continue;

      let id = String(makeScopedSoalId(bankId, count + 1));
      let rawJenis = String(row[0]).trim().toUpperCase();
      let tipe = 'PG';
      if (rawJenis.includes('KOMPLEKS')) tipe = 'KOMPLEKS';
      else if (rawJenis.includes('BS') || rawJenis.includes('BENAR')) tipe = 'BS';
      else if (rawJenis.includes('JODOH')) tipe = 'JODOH';
      else if (rawJenis.includes('ISIAN')) tipe = 'ISIAN';

      let pertanyaan = String(row[1]).trim();
      let gambarSoal = String(row[2] || '').trim();
      if (gambarSoal.startsWith('data:image')) {
        gambarSoal = "";
        warnings.push(`Baris ke-${i + 1}: Gambar Base64 diblokir. Gunakan link external.`);
      }

      let opsi = [];
      opsiIndices.forEach(idxMap => {
        let teks = row[idxMap.textIdx] !== undefined ? String(row[idxMap.textIdx]).trim() : '';
        let gmb = '';
        if (idxMap.imgIdx !== -1) {
          gmb = row[idxMap.imgIdx] !== undefined ? String(row[idxMap.imgIdx]).trim() : '';
          if (gmb.startsWith('data:image')) gmb = "";
        }
        if (teks || gmb) opsi.push({ id: idxMap.label, text: teks, gambar: gmb });
      });

      let rawKunci = String(row[kunciIdx] || '').trim();
      let kunci = rawKunci;
      if (tipe === 'PG' || tipe === 'BS') {
        if (rawKunci === '1') kunci = 'A';
        else if (rawKunci === '2') kunci = 'B';
        else if (rawKunci === '3') kunci = 'C';
        else if (rawKunci === '4') kunci = 'D';
        else if (rawKunci === '5') kunci = 'E';
        else kunci = rawKunci.toUpperCase();
      } else if (tipe === 'KOMPLEKS') {
        kunci = String(rawKunci).split(',').map(s => {
          s = s.trim().toUpperCase();
          if (s === '1') return 'A'; if (s === '2') return 'B'; if (s === '3') return 'C'; if (s === '4') return 'D'; if (s === '5') return 'E';
          return s;
        }).filter(s => s).join(',');
      }

      let updateData = { id, tipe, pertanyaan, opsi, bobot: 1, gambar: gambarSoal };
      if (tipe === 'JODOH') {
        let kiri = []; let kanan = []; let autoKunci = [];
        opsi.forEach(o => {
          if (o.text.includes('=')) {
            let parts = o.text.split('=');
            let k = parts[0].trim(); let v = parts[1].trim();
            if (k && v) { kiri.push(k); kanan.push(v); autoKunci.push(`${k}=${v}`); }
          }
        });
        updateData.kiri = kiri; updateData.kanan = [...kanan].sort();
        kunci = autoKunci.join(';');
      }

      soalUpdates[id] = updateData;
      kunciUpdates[id] = kunci;
      count++;
    }

    if (count > 0) {
      const cleanSoal = JSON.parse(JSON.stringify(soalUpdates, (k, v) => v === undefined ? "" : v));
      const cleanKunci = JSON.parse(JSON.stringify(kunciUpdates, (k, v) => v === undefined ? "" : v));
      const bank = String(bankId || '').trim().toUpperCase();
      const soalRes = await db.ref('/soal/' + bank).set(cleanSoal);
      const kunciRes = await db.ref('/kunci/' + bank).set(cleanKunci);
      if ((soalRes && soalRes.success === false) || (kunciRes && kunciRes.success === false)) {
        throw new Error((soalRes && soalRes.error) || (kunciRes && kunciRes.error) || 'Gagal menyimpan ke database');
      }
      const verifySnap = await db.ref('/soal/' + bank).once('value');
      const verifyData = verifySnap.val() || {};
      if (Object.keys(verifyData).length <= 0) {
        throw new Error('Data soal belum tersimpan di database.');
      }

      let imgTotal = 0;
      Object.values(soalUpdates).forEach(s => {
        if (s.gambar && String(s.gambar).startsWith('data:image')) imgTotal++;
        if (s.opsi) s.opsi.forEach(o => { if (o.gambar && String(o.gambar).startsWith('data:image')) imgTotal++; });
      });

      let msg = `Berhasil import ${count} soal ke bank ${bank}.`;
      if (imgTotal > 0) msg = `Berhasil import ${count} soal (${imgTotal} gambar terdeteksi) ke bank ${bank}.`;
      showCustomAlert('Import Berhasil', msg, '✅');
      closeImportModal();
      loadAdminSoal();
    } else showCustomAlert('Import Gagal', 'Tidak ada soal valid ditemukan. Periksa format file.', '❌');
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }
}

window.processImport = async function () {
  const fileInput = document.getElementById('importFileInput');
  if (fileInput.files.length === 0) return showCustomAlert('File Diperlukan', 'Pilih file terlebih dahulu.', '📂');

  const file = fileInput.files[0];
  const reader = new FileReader();
  const isCSV = file.name.toLowerCase().endsWith('.csv');

  if (!isCSV && typeof XLSX === 'undefined') {
    showLoading('Memuat Library Excel...');
    await loadXLSXLibrary();
    hideLoading();
  }

  if (isCSV) {
    reader.onload = async function (e) {
      const text = e.target.result;
      showLoading('Mengimpor Data...');
      try {
        if (currentImportType === 'siswa') await importSiswaCSV(text);
        else if (currentImportType === 'soal') {
          const bankId = document.getElementById('importBankId').value.trim();
          if (!bankId) return showCustomAlert('Kode Wajib Diisi', 'Kode Bank Soal wajib diisi.', '📝');
          await importSoalCSV(text, bankId);
        }
      } finally {
        hideLoading();
      }
    };
    reader.readAsText(file);
  } else {
    reader.onload = async function (e) {
      showLoading('Memproses File Excel...');
      try {
        const data = new Uint8Array(e.target.result);

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (currentImportType === 'siswa') {
          await importSiswaExcel(jsonData);
        } else if (currentImportType === 'soal') {
          const bankId = document.getElementById('importBankId').value.trim();
          if (!bankId) return showCustomAlert('Kode Wajib Diisi', 'Kode Bank Soal wajib diisi.', '📝');
          await importSoalExcel(jsonData, bankId);
        }
      } catch (err) {
        showCustomAlert('Gagal Membaca File', 'Gagal membaca file Excel. Pastikan file tidak rusak.', '❌');
        console.error(err);
      } finally {
        hideLoading();
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

async function importSiswaExcel(jsonData) {
  if (window.dbConnectFast) await window.dbConnectFast();
  try {
    let count = 0;
    let updates = {};
    let warnings = [];
    for (let i = 1; i < jsonData.length; i++) {
      let row = jsonData[i];
      if (!row || row.length === 0) continue;
      if (!row[0]) {
        warnings.push(`Baris ke-${i + 1} dilewati: ID kosong.`);
        continue;
      }
      let id = String(row[0]).trim();
      updates[id] = {
        nama: String(row[1] || '').trim(),
        kelas: String(row[2] || '').trim()
      };
      count++;
    }
    if (count > 0) {
      await db.ref('/peserta').update(updates);
      let msg = 'Berhasil import ' + count + ' siswa.';
      if (warnings.length > 0) {
        msg += '\n\nPeringatan:\n- ' + warnings.slice(0, 5).join('\n- ');
        if (warnings.length > 5) msg += `\n...dan ${warnings.length - 5} peringatan lainnya.`;
      }
      showCustomAlert('Import Berhasil', msg, '✅');
      closeImportModal();
      loadAdminSiswa();
    } else {
      showCustomAlert('Import Gagal', 'Tidak ada data valid di Excel. Pastikan ID ada di kolom A.', '❌');
    }
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }
}

async function importSiswaCSV(csvText) {
  if (window.dbConnectFast) await window.dbConnectFast();
  try {
    const lines = csvText.split('\n');
    let count = 0;
    let updates = {};
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 3) {
        let id = cols[0];
        updates[id] = {
          nama: cols[1],
          kelas: cols[2]
        };
        count++;
      }
    }
    if (count > 0) {
      await db.ref('/peserta').update(updates);
      showCustomAlert('Import Berhasil', 'Berhasil mengimpor ' + count + ' siswa.', '✅');
      closeImportModal();
      loadAdminSiswa();
    } else {
      showCustomAlert('Import Gagal', 'Tidak ada data valid di CSV. Pastikan ada header di baris 1.', '❌');
    }
  } finally {
    if (window.dbDisconnect) window.dbDisconnect();
  }
}

async function importSoalCSV(csvText, bankId) {
  const lines = csvText.split('\n');
  let soalUpdates = {};
  let kunciUpdates = {};
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(';').map(c => c.trim());

    if (cols.length >= 8) {
      let id = String(makeScopedSoalId(bankId, count + 1));
      let tipe = cols[1] || 'PG';
      let pertanyaan = cols[2];
      let opsi = [
        { id: 'A', text: cols[3] },
        { id: 'B', text: cols[4] },
        { id: 'C', text: cols[5] },
        { id: 'D', text: cols[6] }
      ].filter(o => o.text);

      let kunci = cols[7];
      let bobot = parseFloat(cols[8] || '1');

      soalUpdates[id] = { id, tipe, pertanyaan, opsi, bobot, gambar: "" };
      kunciUpdates[id] = kunci;
      count++;
    }
  }
  if (count > 0) {
    if (window.dbConnectFast) await window.dbConnectFast();
    try {
      const bank = String(bankId || '').trim().toUpperCase();
      const soalRes = await db.ref('/soal/' + bank).set(soalUpdates);
      const kunciRes = await db.ref('/kunci/' + bank).set(kunciUpdates);
      if ((soalRes && soalRes.success === false) || (kunciRes && kunciRes.success === false)) {
        throw new Error((soalRes && soalRes.error) || (kunciRes && kunciRes.error) || 'Gagal menyimpan ke database');
      }
      const verifySnap = await db.ref('/soal/' + bank).once('value');
      const verifyData = verifySnap.val() || {};
      if (Object.keys(verifyData).length <= 0) {
        throw new Error('Data soal belum tersimpan di database.');
      }
      showCustomAlert('Import Berhasil', 'Berhasil mengimpor ' + count + ' soal ke bank ' + bank + '.', '✅');
      closeImportModal();
      loadAdminSoal();
    } finally {
      if (window.dbDisconnect) window.dbDisconnect();
    }
  } else {
    showCustomAlert('Format Salah', 'Data kosong/salah format. Gunakan titik koma (;) sebagai pemisah.', '⚠️');
  }
}
