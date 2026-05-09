# 🎓 Panduan Ujian 900 Siswa

## ✅ Sistem BISA Handle 900 Siswa!

Dengan optimasi yang sudah diterapkan, sistem CBT ini bisa menangani 900 siswa secara bersamaan.

---

## 📋 Alur Ujian

### **1. Login (Siswa)**
- Buka aplikasi CBT
- Ketik nama di kolom pencarian
- Pilih nama dari daftar
- Klik "Lanjutkan"

**Load:** ✅ Ringan (client-side)

---

### **2. Sinkronisasi Soal**
- Klik tombol "🔄 Sinkronisasi" pada jadwal ujian
- **PENTING:** Sistem akan menunda 0-30 detik secara otomatis
- Tunggu hingga muncul "Soal berhasil disinkronkan"
- Tombol berubah menjadi "▶ Mulai Ujian"

**Load:** ⚠️ Sedang (dengan jitter 30s)

**Tips:**
- Jangan refresh halaman saat sinkronisasi
- Pastikan koneksi internet stabil
- Jika gagal, coba lagi setelah 1 menit

---

### **3. Cek Jadwal**
- Jadwal muncul otomatis setelah login
- Status ujian:
  - 🟡 **Belum Mulai** - Tunggu waktu mulai
  - 🟢 **Aktif** - Bisa dikerjakan
  - 🔴 **Selesai** - Sudah berakhir
  - 🔒 **Login Dulu** - Belum login

**Load:** ✅ Ringan (dari cache)

---

### **4. Input Token**
- Klik "▶ Mulai Ujian"
- Masukkan token dari pengawas
- Klik "Mulai"

**Load:** ✅ Ringan (validasi lokal)

---

### **5. Kerjakan Ujian**
- Jawab soal satu per satu
- Sistem auto-save setiap 40-80 detik
- Klik "Ragu" untuk menandai soal
- Klik "Selesai" di soal terakhir

**Load:** ⚠️ Sedang (auto-save tersebar)

**Tips:**
- Jawaban tersimpan otomatis
- Jangan tutup browser/tab
- Jangan refresh halaman
- Jika koneksi putus, jawaban tetap aman di cache lokal

---

## 🚀 Optimasi yang Sudah Diterapkan

### **1. Jitter Sinkronisasi (30 detik)**
```
Siswa 1: Sync setelah 3 detik
Siswa 2: Sync setelah 17 detik
Siswa 3: Sync setelah 8 detik
...
Siswa 900: Sync setelah 25 detik
```
**Hasil:** Load tersebar dalam 30 detik, tidak menumpuk

---

### **2. Auto-Save Adaptif (40-80 detik)**
```
Normal: 40-80 detik (acak)
5 menit terakhir: 15-25 detik (lebih sering)
```
**Hasil:** 900 siswa = ~15-20 request/detik (sustainable)

---

### **3. Ping dengan Offset (120 detik + 0-600s offset)**
```
Siswa 1: Ping setiap 120 detik (offset 45s)
Siswa 2: Ping setiap 120 detik (offset 312s)
...
```
**Hasil:** Load tersebar, tidak ada spike

---

## 📊 Kapasitas Sistem

### **Dengan Supabase Free:**
- ✅ 0-50 siswa: Lancar
- ⚠️ 50-200 siswa: Kadang delay
- ❌ 200+ siswa: Bottleneck

### **Dengan Supabase Pro ($25/bulan):**
- ✅ 0-900 siswa: Lancar
- ✅ 900-1500 siswa: Perlu monitoring
- ⚠️ 1500+ siswa: Perlu optimasi tambahan

---

## ⚠️ Troubleshooting

### **"Gagal sinkronisasi"**
- Tunggu 1-2 menit, coba lagi
- Cek koneksi internet
- Refresh halaman dan login ulang

### **"Sesi tidak valid"**
- Logout dan login ulang
- Sync ulang soal ujian
- Hubungi pengawas

### **"Jawaban tidak tersimpan"**
- Jawaban tersimpan di cache lokal
- Jangan tutup browser
- Sistem akan sync otomatis saat koneksi kembali

### **Ujian lambat/lag**
- Tutup tab/aplikasi lain
- Gunakan Chrome/Edge terbaru
- Pastikan RAM cukup (min 2GB)

---

## 📞 Kontak Teknis

Jika ada masalah saat ujian:
1. Hubungi pengawas ruangan
2. Screenshot error message
3. Catat waktu kejadian

---

## ✅ Checklist Sebelum Ujian

**Siswa:**
- [ ] Browser Chrome/Edge versi terbaru
- [ ] Koneksi internet stabil (min 1 Mbps)
- [ ] RAM cukup (min 2GB)
- [ ] Sudah login dan sync soal
- [ ] Sudah dapat token dari pengawas

**Pengawas:**
- [ ] Supabase Pro aktif (untuk 200+ siswa)
- [ ] Jadwal ujian sudah dibuat
- [ ] Token ujian sudah disiapkan
- [ ] Monitoring dashboard terbuka

**Admin:**
- [ ] Database backup terbaru
- [ ] Soal sudah di-upload
- [ ] Kunci jawaban sudah benar
- [ ] Security settings aktif

---

**Versi:** 1.0  
**Terakhir diupdate:** 8 Mei 2026
