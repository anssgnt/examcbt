# ⚙️ Konfigurasi Optimasi CBT

## 🎯 Pengaturan Saat Ini: **FREE TIER MODE**

---

## 📊 Perbandingan Mode

| Fitur | Free Tier | Pro Tier ($25/mo) |
|-------|-----------|-------------------|
| **Max Siswa** | 900 (dengan protokol) | 1500+ |
| **Sync Jitter** | 0-120 detik | 0-30 detik |
| **Auto-Save** | 60-120 detik | 40-80 detik |
| **Ping Status** | ❌ Disabled | ✅ Enabled |
| **Batch Sync** | Min 3 changes | Min 1 change |
| **Dashboard Real-time** | ❌ No | ✅ Yes |
| **Broadcast** | ❌ No | ✅ Yes |
| **Sync Bersamaan** | ❌ Harus bertahap | ✅ Bisa |

---

## 🔧 Cara Upgrade ke Pro Tier

### **1. Upgrade Supabase**
```
1. Login ke supabase.com
2. Pilih project CBT
3. Settings → Billing
4. Upgrade to Pro ($25/month)
```

### **2. Update Kode**

#### **A. mobile-core.js (line ~220)**
**Ubah dari:**
```javascript
const jitter = Math.floor(Math.random() * 120000); // 0-120s
```
**Menjadi:**
```javascript
const jitter = Math.floor(Math.random() * 30000); // 0-30s
```

#### **B. exam-core.js (line ~268)**
**Ubah dari:**
```javascript
const delayMs = isEndGame ? rand(20000, 40000) : rand(60000, 120000);
```
**Menjadi:**
```javascript
const delayMs = isEndGame ? rand(15000, 25000) : rand(40000, 80000);
```

#### **C. script.js (line ~2481)**
**Uncomment kode ping:**
```javascript
// Hapus /* dan */ untuk aktifkan
if (State.timeRemaining > 0 && (State.timeRemaining + State.pingOffset) % 120 === 0) {
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
```

#### **D. exam-core.js (line ~374)**
**Ubah batch sync:**
```javascript
// Ubah dari 3 menjadi 1
if (!isEndGame && changeCount < 1) {
  return;
}
```

### **3. Deploy Ulang**
```bash
git add .
git commit -m "Upgrade to Pro Tier optimization"
git push
```

---

## 🔙 Cara Downgrade ke Free Tier

Jika ingin kembali ke free tier (hemat biaya):

### **1. Downgrade Supabase**
```
1. Login ke supabase.com
2. Settings → Billing
3. Downgrade to Free
```

### **2. Revert Kode**
Gunakan nilai yang ada di file saat ini (sudah optimal untuk free tier)

---

## 📈 Monitoring & Metrics

### **Supabase Dashboard:**
1. Database → Logs
2. API → Usage
3. Bandwidth → Monitor

### **Indikator Overload:**
- ⚠️ Request rate >10 req/s sustained (free tier)
- ⚠️ Error rate >5%
- ⚠️ Response time >2 detik
- ⚠️ Bandwidth >80% quota

### **Action Plan jika Overload:**
1. Tambah jitter sync (+30-60s)
2. Tambah auto-save interval (+20-40s)
3. Disable fitur non-critical
4. Upgrade ke Pro Tier

---

## 🎯 Rekomendasi Berdasarkan Jumlah Siswa

### **0-50 siswa:**
- Mode: Free Tier
- Jitter: 30s
- Auto-save: 40-80s
- Ping: Enabled
- Protokol: Santai

### **50-200 siswa:**
- Mode: Free Tier
- Jitter: 60s
- Auto-save: 60-120s
- Ping: Disabled
- Protokol: Sync bertahap (10 menit)

### **200-900 siswa:**
- Mode: Free Tier (CURRENT)
- Jitter: 120s
- Auto-save: 60-120s
- Ping: Disabled
- Protokol: Sync bertahap (30 menit)

### **900-1500 siswa:**
- Mode: Pro Tier (REQUIRED)
- Jitter: 30-60s
- Auto-save: 40-80s
- Ping: Enabled
- Protokol: Sync bertahap (15 menit)

### **1500+ siswa:**
- Mode: Pro Tier + CDN
- Jitter: 30s
- Auto-save: 40-80s
- Ping: Enabled
- Protokol: Sync bertahap (20 menit)
- Extra: Upload soal ke CDN (Netlify/Vercel)

---

## 🧪 Testing Checklist

Sebelum ujian besar (>200 siswa):

- [ ] Test dengan 10% siswa (90 siswa)
- [ ] Monitor Supabase dashboard
- [ ] Catat waktu sync rata-rata
- [ ] Test submit bersamaan
- [ ] Cek bandwidth usage
- [ ] Simulasi network delay
- [ ] Test offline mode
- [ ] Backup database

---

## 📞 Support

Jika butuh bantuan optimasi:
1. Cek Supabase logs
2. Screenshot error
3. Catat jumlah siswa aktif
4. Dokumentasi kendala

---

**Mode Aktif:** FREE TIER  
**Max Siswa:** 900 (dengan protokol)  
**Last Updated:** 8 Mei 2026
