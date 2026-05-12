# 🚀 CARA MENJALANKAN LOCAL SERVER

**Status:** ✅ SIAP UNTUK TESTING

---

## ⚠️ PENTING: Jangan Gunakan file:// Protocol

Aplikasi ini memerlukan HTTP server karena:
- ❌ CORS policy tidak support file:// protocol
- ❌ Service Worker tidak bisa di-register di file://
- ❌ PWA manifest tidak bisa di-load di file://
- ❌ LocalStorage & IndexedDB tidak berfungsi optimal

---

## 🚀 CARA MENJALANKAN

### Option 1: Python (Recommended)

**Python 3:**
```bash
cd c:\laragon\www\cbtmo\temp
python -m http.server 8000
```

**Python 2:**
```bash
cd c:\laragon\www\cbtmo\temp
python -m SimpleHTTPServer 8000
```

Kemudian buka: **http://localhost:8000**

---

### Option 2: Node.js

**Install http-server:**
```bash
npm install -g http-server
```

**Jalankan:**
```bash
cd c:\laragon\www\cbtmo\temp
http-server -p 8000
```

Kemudian buka: **http://localhost:8000**

---

### Option 3: Laragon (Built-in)

Jika sudah menggunakan Laragon:

1. Buka Laragon
2. Klik "Start All"
3. Buka browser: **http://localhost/cbtmo/temp**

---

### Option 4: PHP Built-in Server

```bash
cd c:\laragon\www\cbtmo\temp
php -S localhost:8000
```

Kemudian buka: **http://localhost:8000**

---

## ✅ VERIFIKASI SERVER BERJALAN

Setelah menjalankan server, buka browser dan cek:

1. **Halaman Utama:**
   ```
   http://localhost:8000/index.html
   ```

2. **Exam Page:**
   ```
   http://localhost:8000/exam.html
   ```

3. **Admin Panel:**
   ```
   http://localhost:8000/admin.html
   ```

4. **Manifest:**
   ```
   http://localhost:8000/manifest.json
   ```

---

## 🔍 BROWSER CONSOLE CHECK

Buka Developer Tools (F12) dan cek console:

### ✅ EXPECTED (Tidak ada error):
```
[Firebase Mock] ✅ Firebase mock created
[Supabase Patch] ✅ Ready - db and auth mocked
[BandwidthOptimizer] ✅ Initialized
[ImageOptimizer] ✅ Initialized
[RestoreSession] ✅ Session restored successfully
[CacheSyncManager] ✅ Initialized
```

### ❌ TIDAK BOLEH ADA:
```
Access to manifest at 'file://...' has been blocked by CORS policy
Failed to register a ServiceWorker
Uncaught SyntaxError
```

---

## 📊 TESTING CHECKLIST

### 1. Login Page
- [ ] Halaman load dengan benar
- [ ] Tidak ada error di console
- [ ] Bisa input nama siswa
- [ ] Bisa pilih kelas

### 2. Dashboard
- [ ] Jadwal ujian tampil
- [ ] Status sinkronisasi tampil
- [ ] Tombol "Mulai Sinkronisasi" terlihat
- [ ] Tidak perlu scroll untuk lihat tombol

### 3. Sinkronisasi
- [ ] Tombol "Mulai Sinkronisasi" di atas
- [ ] Progress bar berjalan
- [ ] Teks singkat dan jelas
- [ ] Selesai dengan sukses

### 4. Exam Page
- [ ] Soal load dengan cepat
- [ ] Bisa navigasi soal
- [ ] Bisa jawab soal
- [ ] Bisa submit ujian

### 5. Result Page
- [ ] Nilai tampil dengan benar
- [ ] Tidak ada error

### 6. Admin Panel
- [ ] Admin page load
- [ ] Bisa lihat jadwal
- [ ] Bisa lihat hasil ujian

---

## 🐛 TROUBLESHOOTING

### Error: "Address already in use"
```bash
# Port 8000 sudah digunakan, gunakan port lain
python -m http.server 8001
# Buka: http://localhost:8001
```

### Error: "CORS policy blocked"
```
❌ Jangan gunakan file:// protocol
✅ Gunakan http://localhost:8000
```

### Error: "Service Worker failed to register"
```
❌ Jangan gunakan file:// protocol
✅ Gunakan http://localhost:8000
```

### Error: "Manifest not found"
```
✅ Manifest sudah di-fix di index.html
✅ Pastikan manifest.json ada di folder
```

### Error: "SyntaxError in pwa-inline.js"
```
✅ Sudah di-fix
✅ Reload halaman (Ctrl+F5)
```

---

## 📱 TESTING DI HP

### Cara 1: Sama Network
```
1. Cari IP address komputer: ipconfig
2. Di HP, buka: http://[IP_ADDRESS]:8000
3. Contoh: http://192.168.1.100:8000
```

### Cara 2: USB Debugging (Android)
```
1. Connect HP ke komputer via USB
2. Enable USB Debugging di HP
3. Jalankan: adb reverse tcp:8000 tcp:8000
4. Di HP, buka: http://localhost:8000
```

### Cara 3: Ngrok (Public URL)
```bash
# Install ngrok
# Jalankan: ngrok http 8000
# Buka URL yang diberikan ngrok
```

---

## 🎯 PERFORMANCE MONITORING

Buka DevTools (F12) → Performance tab:

### Expected Metrics:
- **First Contentful Paint (FCP):** < 1s
- **Largest Contentful Paint (LCP):** < 2s
- **Cumulative Layout Shift (CLS):** < 0.1
- **Time to Interactive (TTI):** < 3s

### Check Network Tab:
- **Total Size:** < 500KB
- **Load Time:** < 3s
- **Requests:** < 50

---

## ✅ READY FOR TESTING

Setelah menjalankan server lokal:

1. ✅ Buka http://localhost:8000
2. ✅ Cek console (F12) - tidak ada error
3. ✅ Test semua halaman
4. ✅ Test di HP kecil
5. ✅ Verifikasi optimasi kecepatan

---

**Generated:** 12 Mei 2026  
**Status:** ✅ READY FOR LOCAL TESTING

