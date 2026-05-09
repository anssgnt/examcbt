# 🔧 FIX: Multi-User Cache Issue

## 📋 MASALAH YANG DITEMUKAN

Saat siswa sudah mengerjakan ujian sampai muncul nilai, kemudian logout, dan ada siswa lain yang login, **jadwal ujian masih menampilkan data siswa sebelumnya**.

### Root Cause Analysis

#### **1. Cache Jadwal Tidak Di-filter Berdasarkan Kelas User** ❌

**File:** `mobile-core.js` line 56-73

**Masalah:**
```javascript
// SEBELUM PERBAIKAN
if (schedules.length === 0) {
  const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
  if (cachedJadwal) {
    const jadwals = JSON.parse(cachedJadwal);
    schedules = Object.keys(jadwals).map(id => ({ id, ...jadwals[id] }));
    State.schedules = schedules; // ❌ TIDAK ADA FILTER KELAS!
  }
}
```

**Dampak:**
- Cache `CBT_CACHE_JADWAL` berisi **SEMUA jadwal untuk SEMUA kelas**
- Saat render, tidak ada filter berdasarkan `State.user.kelas`
- Siswa A (kelas 10A) logout → Siswa B (kelas 10B) login → **masih lihat jadwal kelas 10A**

#### **2. State.schedules Tidak Di-clear Dengan Benar Saat Logout** ⚠️

**File:** `mobile-core.js` line 463

**Masalah:**
```javascript
// SEBELUM PERBAIKAN
if (window.State) State.schedules = [];
try { renderMobileSchedule(); } catch (_) {}
```

Meskipun `State.schedules = []`, tapi `renderMobileSchedule()` langsung dipanggil dan akan **mengisi ulang dari cache** yang tidak di-filter (masalah #1).

#### **3. Status "SELESAI" Di-reset Secara Global** ⚠️

**File:** `mobile-core.js` line 422-432

**Masalah:**
```javascript
// SEBELUM PERBAIKAN - TIDAK PERLU!
const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
if (cachedJadwal) {
  const jadwals = JSON.parse(cachedJadwal);
  for (let id in jadwals) {
    jadwals[id].status = 'AKTIF'; // ❌ RESET SEMUA JADWAL!
    delete jadwals[id]._lastRenderedStatus;
  }
  localStorage.setItem('CBT_CACHE_JADWAL', JSON.stringify(jadwals));
}
```

**Dampak:**
- Reset status **SEMUA jadwal** di cache global
- Padahal status "SELESAI" per-siswa sudah disimpan dengan benar di `CBT_SUBMITTED_${examId}_${userId}`
- Tidak perlu memodifikasi cache global

#### **4. State.schedules Tidak Di-clear Saat Login Baru** ⚠️

**File:** `script.js` line 1907

**Masalah:**
```javascript
// SEBELUM PERBAIKAN
State.user = tempSelectedUser;
// ❌ State.schedules masih berisi data user sebelumnya!
```

---

## ✅ SOLUSI YANG DITERAPKAN

### **1. Tambahkan Filter Kelas di renderMobileSchedule()**

**File:** `mobile-core.js`

```javascript
// SETELAH PERBAIKAN
if (schedules.length === 0) {
  const cachedJadwal = localStorage.getItem('CBT_CACHE_JADWAL');
  if (cachedJadwal) {
    const jadwals = JSON.parse(cachedJadwal);
    let allSchedules = Object.keys(jadwals).map(id => ({ id, ...jadwals[id] }));
    
    // ✅ FILTER: Hanya tampilkan jadwal sesuai kelas user
    if (State.user && State.user.kelas) {
      schedules = allSchedules.filter(s => {
        const kelasTarget = s.target_kelas || s.kelas_target || s.kelas || '';
        
        // Support "SEMUA", "ALL", atau kosong
        if (!kelasTarget || kelasTarget.toUpperCase() === 'SEMUA' || kelasTarget.toUpperCase() === 'ALL') {
          return true;
        }
        
        // Support multiple kelas: "10A,10B,10C"
        const kelasList = String(kelasTarget).split(',').map(k => k.trim().toLowerCase()).filter(k => k);
        const userKelas = State.user.kelas.toLowerCase();
        
        // Match dengan partial match untuk fleksibilitas
        return kelasList.some(k => userKelas.includes(k) || k.includes(userKelas));
      });
      console.log(`[RenderSchedule] Filtered ${allSchedules.length} → ${schedules.length} schedules for kelas ${State.user.kelas}`);
    } else {
      // Jika belum login, tampilkan semua (untuk preview)
      schedules = allSchedules;
    }
    
    State.schedules = schedules;
  }
}
```

**Manfaat:**
- ✅ Setiap siswa hanya melihat jadwal untuk kelasnya
- ✅ Support multiple kelas target: `"10A,10B,10C"`
- ✅ Support "SEMUA" atau "ALL" untuk jadwal global
- ✅ Partial match untuk fleksibilitas (misal: "10" match "10A", "10B")

### **2. Clear State Dengan Benar Saat Logout**

**File:** `mobile-core.js`

```javascript
// SETELAH PERBAIKAN
// ✅ FIX MULTI-USER: Clear schedules SEBELUM render
if (window.State) {
  State.schedules = [];
  State.user = null; // Pastikan user null SEBELUM render
}

// Render dengan state kosong
try { renderMobileSchedule(); } catch (_) {}
```

**Manfaat:**
- ✅ `State.user` di-set `null` SEBELUM render
- ✅ `renderMobileSchedule()` akan tampilkan empty state atau preview tanpa filter
- ✅ Tidak ada data user sebelumnya yang tertinggal

### **3. Hapus Reset Status Global (Tidak Perlu)**

**File:** `mobile-core.js`

```javascript
// SETELAH PERBAIKAN
try { 
  localStorage.removeItem('CBT_LOGGED_USER'); 
  localStorage.removeItem('CBT_LAST_RESULT'); 
  localStorage.removeItem('CBT_EXAM_SESSION');
  
  // ✅ FIX MULTI-USER: TIDAK perlu reset status global di cache
  // Status "SELESAI" per-siswa sudah disimpan di CBT_SUBMITTED_${examId}_${userId}
  // Cache jadwal tetap bersih dan tidak perlu dimodifikasi saat logout
} catch (_) {}
```

**Manfaat:**
- ✅ Cache global tidak dimodifikasi
- ✅ Status per-siswa tetap akurat
- ✅ Performa lebih baik (tidak perlu write ke localStorage)

### **4. Clear State.schedules Saat Login Baru**

**File:** `script.js`

```javascript
// SETELAH PERBAIKAN
safeAddListener('btnConfirmLogin', 'click', async () => {
  if (tempSelectedUser) {
    if (typeof hideMobileConfirm === 'function') hideMobileConfirm();
    
    // ✅ FIX MULTI-USER: Clear schedules dari user sebelumnya
    State.schedules = [];
    State.user = tempSelectedUser;
    // ... rest of code
  }
});
```

**Manfaat:**
- ✅ Setiap login baru mulai dengan state bersih
- ✅ Tidak ada data user sebelumnya yang tertinggal
- ✅ `loadSchedules()` akan fetch data fresh untuk user baru

---

## 🧪 TESTING SCENARIO

### **Skenario 1: Siswa Bergantian Login (Kelas Berbeda)**

1. **Siswa A (Kelas 10A)** login
   - ✅ Lihat jadwal untuk kelas 10A
   - ✅ Kerjakan ujian sampai selesai
   - ✅ Logout

2. **Siswa B (Kelas 10B)** login
   - ✅ Lihat jadwal untuk kelas 10B (BUKAN 10A)
   - ✅ Status ujian siswa A tidak muncul
   - ✅ Bisa kerjakan ujian untuk kelasnya

### **Skenario 2: Siswa Bergantian Login (Kelas Sama)**

1. **Siswa A (Kelas 10A)** login
   - ✅ Lihat jadwal untuk kelas 10A
   - ✅ Kerjakan ujian "Matematika" sampai selesai
   - ✅ Logout

2. **Siswa B (Kelas 10A)** login
   - ✅ Lihat jadwal untuk kelas 10A
   - ✅ Ujian "Matematika" masih bisa dikerjakan (status per-siswa)
   - ✅ Tidak ada data siswa A yang muncul

### **Skenario 3: Logout Tanpa Login Ulang**

1. **Siswa A** logout
   - ✅ `State.user = null`
   - ✅ `State.schedules = []`
   - ✅ UI menampilkan empty state atau preview tanpa filter
   - ✅ Tidak ada data siswa A yang tertinggal

---

## 📊 PERBANDINGAN SEBELUM & SESUDAH

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Filter Kelas** | ❌ Tidak ada | ✅ Ada (dengan partial match) |
| **Clear State Logout** | ⚠️ Partial | ✅ Lengkap (user + schedules) |
| **Reset Status Global** | ❌ Ya (tidak perlu) | ✅ Tidak (lebih efisien) |
| **Clear State Login** | ❌ Tidak ada | ✅ Ada |
| **Multi-User Support** | ❌ Broken | ✅ Working |
| **Performa** | ⚠️ Write cache saat logout | ✅ Lebih cepat (no write) |

---

## 🎯 KESIMPULAN

Perbaikan ini memastikan aplikasi CBT **benar-benar multi-user** dengan:

1. ✅ **Isolasi Data Per-User**: Setiap siswa hanya melihat jadwal untuk kelasnya
2. ✅ **Clean State Management**: State di-clear dengan benar saat logout dan login
3. ✅ **Performa Optimal**: Tidak ada operasi write yang tidak perlu
4. ✅ **Status Akurat**: Status per-siswa tetap akurat tanpa modifikasi cache global

**Siswa sekarang bisa bergantian login dengan aman tanpa data saling tumpang tindih!** 🎉

---

## 📝 FILES MODIFIED

1. `mobile-core.js`
   - Line 56-90: Tambah filter kelas di `renderMobileSchedule()`
   - Line 462-467: Perbaiki clear state saat logout
   - Line 418-427: Hapus reset status global

2. `script.js`
   - Line 1905-1910: Tambah clear schedules saat login baru

---

**Date:** 2026-05-09  
**Issue:** Multi-user cache conflict  
**Status:** ✅ FIXED
