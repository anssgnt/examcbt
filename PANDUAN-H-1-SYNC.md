# 📅 Panduan Sinkronisasi H-1 (Hari Sebelum Ujian)

## 🎯 Strategi Terbaik: Sync H-1, Ujian Hari H Tinggal Token!

---

## ✅ Keuntungan Sync H-1

### **Untuk Siswa:**
- ✅ Hari H tidak perlu download soal (hemat waktu)
- ✅ Tidak perlu koneksi internet saat ujian
- ✅ Tidak ada antrian sync (sudah selesai H-1)
- ✅ Tinggal login → token → langsung kerjakan

### **Untuk Sekolah:**
- ✅ Load server tersebar (tidak menumpuk hari H)
- ✅ Tidak ada bottleneck saat ujian
- ✅ Bisa handle 900+ siswa tanpa masalah
- ✅ Ujian lebih lancar dan cepat

---

## 📋 Protokol H-1 (Hari Sebelum Ujian)

### **Waktu: Sore/Malam H-1**

#### **Pengawas/Guru:**
1. Umumkan ke siswa: "Besok ujian, sync soal HARI INI"
2. Kirim link aplikasi CBT ke grup kelas
3. Instruksikan siswa sync dari rumah/sekolah
4. Pantau progress sync di dashboard admin (opsional)

#### **Siswa:**

**LANGKAH 1: Login**
1. Buka aplikasi CBT di browser (Chrome/Edge)
2. Ketik nama lengkap di kolom pencarian
3. Pilih nama dari daftar
4. Klik "Lanjutkan"

**LANGKAH 2: Sinkronisasi**
1. Lihat jadwal ujian besok
2. Klik tombol "🔄 Sinkronisasi"
3. Tunggu countdown (0-120 detik) - **JANGAN REFRESH**
4. Tunggu download soal selesai
5. Muncul "✅ Soal berhasil disinkronkan"
6. Tombol berubah jadi "▶ Mulai Ujian"

**LANGKAH 3: Verifikasi**
1. Pastikan tombol sudah "▶ Mulai Ujian" (hijau)
2. **JANGAN LOGOUT** - biarkan tetap login
3. **JANGAN CLEAR CACHE** browser
4. Tutup browser (boleh)
5. Matikan HP/laptop (boleh)

---

## 📅 Protokol Hari H (Hari Ujian)

### **Waktu: 15 Menit Sebelum Ujian**

#### **Siswa:**

**LANGKAH 1: Buka Aplikasi**
1. Buka aplikasi CBT (link yang sama)
2. **Otomatis login** (nama masih tersimpan)
3. Lihat jadwal ujian hari ini
4. Status: "▶ Mulai Ujian" (hijau) ✅

**LANGKAH 2: Mulai Ujian**
1. Klik "▶ Mulai Ujian"
2. Masukkan **token dari pengawas**
3. Klik "Mulai"
4. Langsung kerjakan soal (tidak perlu download lagi)

**LANGKAH 3: Kerjakan**
1. Jawab soal satu per satu
2. Sistem auto-save otomatis
3. Klik "Selesai" di soal terakhir
4. Konfirmasi submit

---

## 🔒 Keamanan Cache & Session

### **Cache Soal:**
- ✅ Tersimpan di **IndexedDB** (persistent)
- ✅ Tersimpan di **localStorage** (backup)
- ✅ Tidak hilang saat tutup browser
- ✅ Tidak hilang saat restart HP/laptop
- ✅ Hanya hilang jika clear cache browser

### **Session Login:**
- ✅ Tersimpan di **localStorage** (`CBT_LOGGED_USER`)
- ✅ Auto-restore saat buka aplikasi lagi
- ✅ Nama dan kelas tetap tersimpan
- ✅ Tidak perlu login ulang hari H

### **Token Ujian:**
- ✅ Hash token tersimpan untuk offline mode
- ✅ Bisa validasi token tanpa internet
- ⚠️ Token baru diberikan hari H (keamanan)

---

## ⚠️ PENTING: Yang TIDAK Boleh Dilakukan

### **Setelah Sync H-1:**
- ❌ **JANGAN LOGOUT** (session hilang)
- ❌ **JANGAN CLEAR CACHE** browser (soal hilang)
- ❌ **JANGAN UNINSTALL** aplikasi (data hilang)
- ❌ **JANGAN GANTI BROWSER** (cache tidak pindah)
- ❌ **JANGAN GANTI DEVICE** (cache tidak pindah)

### **Yang BOLEH Dilakukan:**
- ✅ Tutup browser (boleh)
- ✅ Matikan HP/laptop (boleh)
- ✅ Buka aplikasi lain (boleh)
- ✅ Restart device (boleh)
- ✅ Update browser (hati-hati, bisa hilang cache)

---

## 🧪 Cara Verifikasi Cache Tersimpan

### **Metode 1: Cek Status Tombol**
1. Buka aplikasi CBT
2. Lihat jadwal ujian
3. Jika tombol "▶ Mulai Ujian" (hijau) → ✅ Cache tersimpan
4. Jika tombol "🔄 Sinkronisasi" (kuning) → ❌ Cache hilang

### **Metode 2: Cek Browser DevTools (Advanced)**
1. Tekan F12 di browser
2. Tab "Application" → "Local Storage"
3. Cari key: `SOAL_{id_ujian}_v{versi}`
4. Jika ada → ✅ Cache tersimpan
5. Tab "IndexedDB" → "CBT_CACHE"
6. Jika ada data → ✅ Cache tersimpan

### **Metode 3: Cek Console Log**
1. Tekan F12 → Tab "Console"
2. Refresh halaman
3. Cari log: `[ExamCore] Loaded X questions from cache`
4. Jika ada → ✅ Cache tersimpan

---

## 🔄 Troubleshooting

### **"Cache hilang setelah tutup browser"**

**Penyebab:**
- Browser mode incognito/private
- Setting browser: "Clear cache on exit"
- Extension privacy yang agresif

**Solusi:**
1. Gunakan mode normal (bukan incognito)
2. Disable "Clear cache on exit" di browser settings
3. Disable extension privacy sementara
4. Sync ulang H-1

---

### **"Lupa logout, sekarang mau ganti siswa"**

**Solusi:**
1. Klik tombol "Keluar" di profil
2. Login dengan nama siswa baru
3. Sync ulang soal
4. Cache soal tetap ada (tidak hilang)

---

### **"Sudah sync H-1, tapi hari H tombol masih 'Sinkronisasi'"**

**Penyebab:**
- Cache hilang (clear cache/incognito)
- Ganti browser/device
- Versi soal berubah (admin update soal)

**Solusi:**
1. Sync ulang (cepat, karena load server rendah)
2. Atau: Gunakan device yang sama dengan H-1

---

### **"Sync H-1 gagal terus"**

**Penyebab:**
- Koneksi internet lambat
- Server overload (terlalu banyak siswa sync bersamaan)

**Solusi:**
1. Coba lagi 30 menit kemudian
2. Sync malam hari (load server rendah)
3. Gunakan WiFi (lebih stabil dari data seluler)
4. Jika masih gagal → sync pagi hari H (30 menit sebelum ujian)

---

## 📊 Timeline Ideal

### **H-2 (2 Hari Sebelum):**
- Admin upload soal
- Admin buat jadwal ujian
- Admin test dengan 5-10 siswa

### **H-1 Sore (16:00-20:00):**
- Siswa login dari rumah
- Siswa sync soal (tersebar 4 jam)
- Load server: ~3-5 req/s (sangat ringan)

### **H-1 Malam (20:00-22:00):**
- Siswa verifikasi cache tersimpan
- Siswa jangan logout
- Siswa tutup browser (boleh)

### **Hari H Pagi (07:00):**
- Siswa buka aplikasi (auto-login)
- Verifikasi tombol "▶ Mulai Ujian"
- Jika hilang → sync ulang (cepat)

### **Hari H (07:30 - Ujian Mulai):**
- Pengawas bagikan token
- Siswa input token
- Langsung kerjakan (tidak perlu download)

---

## ✅ Checklist Siswa

### **H-1 (Setelah Sync):**
- [ ] Sudah login dengan nama lengkap
- [ ] Sudah sync soal ujian besok
- [ ] Tombol sudah "▶ Mulai Ujian" (hijau)
- [ ] **TIDAK logout**
- [ ] **TIDAK clear cache**
- [ ] Tutup browser (boleh)

### **Hari H (Sebelum Ujian):**
- [ ] Buka aplikasi CBT
- [ ] Otomatis login (nama masih ada)
- [ ] Tombol masih "▶ Mulai Ujian" (hijau)
- [ ] Siap terima token dari pengawas
- [ ] HP/laptop full battery
- [ ] Koneksi internet stabil (untuk auto-save)

---

## ✅ Checklist Pengawas

### **H-2:**
- [ ] Soal sudah di-upload
- [ ] Jadwal ujian sudah dibuat
- [ ] Test dengan 5-10 siswa
- [ ] Token ujian sudah disiapkan

### **H-1:**
- [ ] Umumkan ke siswa untuk sync
- [ ] Kirim link aplikasi ke grup
- [ ] Pantau progress sync (opsional)
- [ ] Siapkan backup plan

### **Hari H:**
- [ ] Cek siswa yang belum sync
- [ ] Bagikan token ujian
- [ ] Monitor ujian berjalan
- [ ] Siap troubleshoot

---

## 💡 Tips Pro

### **Untuk Siswa:**
1. **Sync malam hari** (load server rendah, lebih cepat)
2. **Gunakan WiFi** (lebih stabil dari data seluler)
3. **Jangan ganti browser** (cache tidak pindah)
4. **Screenshot tombol hijau** (bukti sudah sync)
5. **Charge HP/laptop** sebelum tidur

### **Untuk Pengawas:**
1. **Umumkan H-2** (beri waktu cukup)
2. **Kirim reminder H-1 sore** (via grup)
3. **Cek dashboard H-1 malam** (siapa yang belum sync)
4. **Siapkan 2-3 device cadangan** (untuk siswa yang gagal sync)
5. **Backup plan: Ujian manual** (jika sistem down)

---

## 🎯 Kesimpulan

**Sync H-1 adalah strategi TERBAIK untuk ujian 900 siswa!**

### **Keuntungan:**
- ✅ Load server tersebar (tidak menumpuk)
- ✅ Hari H tinggal token (cepat)
- ✅ Tidak perlu internet saat ujian (offline mode)
- ✅ Tidak ada bottleneck
- ✅ Bisa handle 900+ siswa tanpa masalah

### **Syarat:**
- ⚠️ Siswa **JANGAN logout** setelah sync
- ⚠️ Siswa **JANGAN clear cache** browser
- ⚠️ Gunakan browser yang sama hari H

---

**Versi:** 1.0  
**Terakhir diupdate:** 8 Mei 2026  
**Rekomendasi:** WAJIB untuk ujian >200 siswa
