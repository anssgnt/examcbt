# 🎫 Queue System - Behavior & Logic

## 🔄 Smart Queue Logic

Queue system secara otomatis mendeteksi apakah ada antrian atau tidak.

---

## 📊 Skenario Behavior

### **Skenario 1: Tidak Ada Antrian (Sepi)**

```
Siswa klik "Sinkronisasi"
  ↓
Queue system check: Ada antrian?
  ↓
Tidak ada (queueLength = 0 atau position = 0)
  ↓
✅ LANGSUNG PROCEED (instant, tidak ada delay)
  ↓
Download soal
```

**Hasil:**
- ✅ Tidak ada screen antrian
- ✅ Tidak ada delay
- ✅ Seperti normal (tanpa queue)
- ⏱️ Waktu: ~2-3 detik (hanya download)

---

### **Skenario 2: Ada Antrian (Ramai)**

```
Siswa klik "Sinkronisasi"
  ↓
Queue system check: Ada antrian?
  ↓
Ada (queueLength > 0, position > 0)
  ↓
🎫 SHOW QUEUE SCREEN
  ├─ Nomor antrian: 45
  ├─ Estimasi: ~4 menit
  ├─ Progress bar
  └─ Stay di halaman
  ↓
Check posisi setiap 5 detik
  ├─ 45 → 40 → 35 → ... → 5 → 0
  └─ Update UI real-time
  ↓
Posisi = 0 (Giliran Anda!)
  ↓
✅ AUTO-PROCEED
  ↓
Download soal
```

**Hasil:**
- 🎫 Ada screen antrian
- ⏱️ Delay sesuai posisi (5 detik × posisi)
- ✅ Fair (first-come first-served)
- ⏱️ Waktu: Tergantung posisi

---

## 🧮 Perhitungan Waktu

### **Formula:**
```
Waktu Tunggu = (Posisi × 5 detik) + Waktu Download (3 detik)
```

### **Contoh:**

**Posisi 0 (Tidak ada antrian):**
```
Waktu = (0 × 5) + 3 = 3 detik
Status: ✅ Instant
```

**Posisi 10:**
```
Waktu = (10 × 5) + 3 = 53 detik (~1 menit)
Status: ⚠️ Tunggu sebentar
```

**Posisi 50:**
```
Waktu = (50 × 5) + 3 = 253 detik (~4 menit)
Status: ⚠️ Tunggu agak lama
```

**Posisi 100:**
```
Waktu = (100 × 5) + 3 = 503 detik (~8 menit)
Status: ⚠️ Tunggu lama
```

---

## 🎯 Kapan Queue Aktif?

### **Queue TIDAK Aktif (Instant):**

✅ Siswa pertama yang sync
✅ Tidak ada siswa lain sedang sync
✅ Semua slot processing kosong (< 10 concurrent)
✅ Waktu sepi (malam, H-1)

### **Queue Aktif (Ada Delay):**

⚠️ Ada 10+ siswa sedang sync bersamaan
⚠️ Slot processing penuh (10 concurrent)
⚠️ Waktu ramai (hari H, 30 menit sebelum ujian)
⚠️ Banyak siswa klik sync bersamaan

---

## 📊 Perbandingan Skenario

| Skenario | Siswa Sync | Queue Length | Behavior | Waktu |
|----------|------------|--------------|----------|-------|
| **Sepi** | 1-5 siswa | 0 | ✅ Instant | 3 detik |
| **Normal** | 10-20 siswa | 5-10 | ⚠️ Queue | 30-60 detik |
| **Ramai** | 50+ siswa | 20-50 | ⚠️ Queue | 2-5 menit |
| **Padat** | 100+ siswa | 50-100 | ⚠️ Queue | 5-10 menit |

---

## 🔧 Konfigurasi Max Concurrent

Default: **10 siswa bersamaan**

Jika ingin ubah (misal jadi 20):

```javascript
// Di queue-system.js, line 10
const QUEUE_CONFIG = {
  enabled: true,
  maxConcurrent: 20, // ← Ubah ini (dari 10 → 20)
  queueInterval: 5000,
  ticketExpiry: 300000,
  storageKey: 'CBT_QUEUE_TICKET',
  serverQueuePath: '/queue_status'
};
```

**Impact:**
- Max 20 concurrent: Load 2× lipat (6.66 req/s)
- Queue lebih cepat (2× throughput)
- Tapi load server lebih tinggi

**Rekomendasi:**
- Free tier: Max 10 concurrent (aman)
- Pro tier: Max 20-30 concurrent (optimal)

---

## 💡 Tips Optimasi

### **Untuk Mengurangi Antrian:**

1. **H-1 Sync** (BEST)
   - Siswa sync H-1 → Hari H tidak ada antrian
   - Queue length = 0 → Instant

2. **Stagger Scheduling**
   - Kelompok A: Sync 16:00-16:15
   - Kelompok B: Sync 16:15-16:30
   - Kelompok C: Sync 16:30-16:45
   - Queue length per batch: 10-20 (manageable)

3. **Increase Max Concurrent**
   - Dari 10 → 20 concurrent
   - Queue 2× lebih cepat
   - Tapi butuh server lebih kuat

4. **Disable Queue (Fallback Jitter)**
   - Jika server tidak support queue
   - Gunakan jitter random 120s
   - Load: 7.5 req/s (limit tapi bisa)

---

## 🧪 Testing Behavior

### **Test 1: Tidak Ada Antrian**

```javascript
// Buka 1 tab, klik sync
// Expected: Langsung download (instant)
// Actual: ✅ Tidak ada queue screen
```

### **Test 2: Ada Antrian Kecil**

```javascript
// Buka 15 tab, klik sync bersamaan
// Expected: 
//   - Tab 1-10: Instant (slot kosong)
//   - Tab 11-15: Queue 5-10 detik
// Actual: ✅ Queue screen untuk tab 11-15
```

### **Test 3: Ada Antrian Besar**

```javascript
// Buka 50 tab, klik sync bersamaan
// Expected:
//   - Tab 1-10: Instant
//   - Tab 11-50: Queue 5-200 detik
// Actual: ✅ Queue screen dengan posisi 1-40
```

---

## ✅ Kesimpulan

### **Smart Queue Logic:**

```
if (queueLength === 0 || position === 0) {
  // TIDAK ADA ANTRIAN
  ✅ Langsung proceed (instant)
  ✅ Tidak ada delay
  ✅ Seperti normal
} else {
  // ADA ANTRIAN
  🎫 Show queue screen
  ⏱️ Delay sesuai posisi
  ✅ Fair & controlled
}
```

### **Benefit:**

- ✅ **Sepi:** Instant (tidak ada overhead)
- ✅ **Ramai:** Controlled (tidak overload)
- ✅ **Fair:** First-come first-served
- ✅ **Flexible:** Auto-adapt ke kondisi

---

**Version:** 1.0  
**Last Updated:** 8 Mei 2026  
**Status:** Implemented & Tested
