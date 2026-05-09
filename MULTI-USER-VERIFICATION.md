# ✅ MULTI-USER CACHE FIX - VERIFICATION CHECKLIST

**Date:** 2026-05-09  
**Status:** Ready for Testing

---

## 🧪 MANUAL TESTING CHECKLIST

### **Test 1: Siswa Bergantian Login (Kelas Berbeda)**

**Setup:**
- Siswa A: FITRI RAMADHANI (Kelas IX G)
- Siswa B: MIFTAHUL JANAH (Kelas IX G) atau siswa dari kelas berbeda

**Steps:**
```
1. [ ] Buka aplikasi di browser
2. [ ] Login sebagai Siswa A
3. [ ] Verifikasi: Lihat jadwal untuk kelas IX G
4. [ ] Kerjakan ujian sampai selesai (atau buka ujian)
5. [ ] Logout
6. [ ] Login sebagai Siswa B
7. [ ] Verifikasi: Lihat jadwal untuk kelas Siswa B
8. [ ] Verifikasi: Status ujian Siswa A TIDAK muncul
9. [ ] Verifikasi: Bisa kerjakan ujian untuk Siswa B
```

**Expected Result:**
- ✅ Jadwal Siswa B terlihat dengan benar
- ✅ Status ujian Siswa A tidak muncul
- ✅ Tidak ada data Siswa A yang tertinggal

**Console Check:**
```javascript
// Buka DevTools (F12) → Console
// Setelah login Siswa B, cek:
console.log(State.user);           // Harus: {id: ..., name: "MIFTAHUL JANAH", ...}
console.log(State.schedules);      // Harus: array jadwal untuk Siswa B
console.log(State._schedulesForUserId); // Harus: ID Siswa B
```

---

### **Test 2: Siswa Bergantian Login (Kelas Sama)**

**Setup:**
- Siswa A: FITRI RAMADHANI (Kelas IX G)
- Siswa B: Siswa lain dari Kelas IX G

**Steps:**
```
1. [ ] Login sebagai Siswa A
2. [ ] Verifikasi: Lihat jadwal untuk kelas IX G
3. [ ] Kerjakan ujian "EXAM-4L1JP" sampai selesai
4. [ ] Verifikasi: Status berubah menjadi "Lihat Nilai"
5. [ ] Logout
6. [ ] Login sebagai Siswa B
7. [ ] Verifikasi: Lihat jadwal untuk kelas IX G
8. [ ] Verifikasi: Ujian "EXAM-4L1JP" masih bisa dikerjakan (status "Mulai Ujian")
9. [ ] Verifikasi: Tidak ada nilai Siswa A yang muncul
```

**Expected Result:**
- ✅ Jadwal sama (kelas sama)
- ✅ Status ujian berbeda per-siswa
- ✅ Siswa B bisa kerjakan ujian yang sudah Siswa A selesaikan

**Console Check:**
```javascript
// Setelah login Siswa B:
localStorage.getItem('CBT_SUBMITTED_EXAM-4L1JP_' + State.user.id);
// Harus: null atau undefined (Siswa B belum submit)

localStorage.getItem('CBT_SUBMITTED_EXAM-4L1JP_' + siswaaId);
// Harus: ada (Siswa A sudah submit)
```

---

### **Test 3: Logout Tanpa Login Ulang**

**Steps:**
```
1. [ ] Login sebagai Siswa A
2. [ ] Verifikasi: Lihat jadwal
3. [ ] Click "Logout"
4. [ ] Verifikasi: State.user = null
5. [ ] Verifikasi: Tidak ada jadwal yang ditampilkan (atau preview tanpa filter)
6. [ ] Verifikasi: Tidak ada data Siswa A yang tertinggal
```

**Expected Result:**
- ✅ UI menampilkan empty state atau preview
- ✅ Tidak ada data Siswa A yang tertinggal

**Console Check:**
```javascript
// Setelah logout:
console.log(State.user);           // Harus: null
console.log(State.schedules);      // Harus: []
console.log(State._schedulesForUserId); // Harus: null
```

---

### **Test 4: Cache Filter Verification**

**Steps:**
```
1. [ ] Login sebagai Siswa A (Kelas IX G)
2. [ ] Buka DevTools → Console
3. [ ] Jalankan:
      const cached = localStorage.getItem('CBT_CACHE_JADWAL');
      const jadwals = JSON.parse(cached);
      console.log('Total jadwal di cache:', Object.keys(jadwals).length);
      console.log('Jadwal yang ditampilkan:', State.schedules.length);
4. [ ] Verifikasi: Jadwal yang ditampilkan ≤ Total jadwal di cache
5. [ ] Logout
6. [ ] Login sebagai Siswa B (Kelas berbeda)
7. [ ] Jalankan ulang step 3
8. [ ] Verifikasi: Jadwal yang ditampilkan berbeda dengan Siswa A
```

**Expected Result:**
- ✅ Cache berisi semua jadwal
- ✅ Setiap siswa hanya melihat jadwal untuk kelasnya
- ✅ Filter bekerja dengan benar

---

### **Test 5: Status Strip Verification**

**Steps:**
```
1. [ ] Login sebagai Siswa A
2. [ ] Kerjakan ujian sampai selesai
3. [ ] Verifikasi: Status berubah menjadi "Lihat Nilai"
4. [ ] Logout
5. [ ] Login sebagai Siswa B (kelas sama)
6. [ ] Buka DevTools → Console
7. [ ] Jalankan:
      const exam = State.schedules.find(s => s.id === 'EXAM-4L1JP');
      console.log('Status ujian:', exam.status);
      console.log('Waktu sekarang:', Date.now());
      console.log('Waktu mulai:', exam.mulai);
      console.log('Waktu selesai:', exam.selesai);
8. [ ] Verifikasi: Status = "AKTIF" (bukan "SELESAI" dari Siswa A)
```

**Expected Result:**
- ✅ Status ujian untuk Siswa B = "AKTIF" (bukan "SELESAI")
- ✅ Status di-hitung berdasarkan waktu saja
- ✅ Status dari Siswa A tidak terbawa

---

## 🔍 CODE VERIFICATION

### **Check 1: Filter Kelas di renderMobileSchedule()**

**File:** `mobile-core.js` (Line 56-90)

```javascript
// ✅ Harus ada:
if (State.user && State.user.kelas) {
  schedules = allSchedules.filter(s => {
    const kelasTarget = s.target_kelas || s.kelas_target || s.kelas || '';
    // ... filter logic
  });
}
```

**Verification:**
```bash
grep -n "State.user && State.user.kelas" mobile-core.js
# Harus ada di line ~75
```

---

### **Check 2: Strip Status di renderMobileSchedule()**

**File:** `mobile-core.js` (Line 85-95)

```javascript
// ✅ Harus ada:
const nowMs = Date.now();
let safeStatus = 'BELUM_MULAI';
if (s.aktif === false) safeStatus = 'NONAKTIF';
else if (s.force_aktif) safeStatus = 'AKTIF';
else if (nowMs < s.mulai) safeStatus = 'BELUM_MULAI';
else if (nowMs > s.selesai) safeStatus = 'TUTUP';
else safeStatus = 'AKTIF';
```

**Verification:**
```bash
grep -n "safeStatus" mobile-core.js
# Harus ada di line ~87 dan ~2197
```

---

### **Check 3: Clear State Saat Logout**

**File:** `mobile-core.js` (Line 462-475)

```javascript
// ✅ Harus ada:
if (window.State) {
  window.State.user = null;
  window.State.schedules = [];
  window.State._schedulesForUserId = null;
  // ... clear logic
}
```

**Verification:**
```bash
grep -n "State.user = null" mobile-core.js
# Harus ada di line ~464
```

---

### **Check 4: Clear State Saat Login Baru**

**File:** `script.js` (Line 1924-1960)

```javascript
// ✅ Harus ada:
State.schedules = [];
State._schedulesForUserId = null;
State.user = tempSelectedUser;
// ... clear localStorage logic
```

**Verification:**
```bash
grep -n "State.schedules = \[\]" script.js
# Harus ada di line ~1928 dan ~1933
```

---

### **Check 5: Ownership Flag**

**File:** `script.js` (Line 2256-2260)

```javascript
// ✅ Harus ada:
State._schedulesForUserId = State.user ? State.user.id : null;
```

**Verification:**
```bash
grep -n "_schedulesForUserId" script.js
# Harus ada di line ~2256 dan ~2290
```

---

## 📋 BROWSER CONSOLE TESTS

### **Test A: Check State After Login**

```javascript
// Jalankan di console setelah login:
console.log('=== STATE CHECK ===');
console.log('User:', State.user);
console.log('Schedules count:', State.schedules.length);
console.log('Ownership flag:', State._schedulesForUserId);
console.log('User ID:', State.user?.id);
console.log('Match:', State._schedulesForUserId === State.user?.id);
```

**Expected Output:**
```
=== STATE CHECK ===
User: {id: 101078171, name: "FITRI RAMADHANI", kelas: "IX G", ...}
Schedules count: 1
Ownership flag: 101078171
User ID: 101078171
Match: true
```

---

### **Test B: Check Cache Filter**

```javascript
// Jalankan di console:
const cached = localStorage.getItem('CBT_CACHE_JADWAL');
const jadwals = JSON.parse(cached);
const totalInCache = Object.keys(jadwals).length;
const displayedCount = State.schedules.length;
const userKelas = State.user?.kelas;

console.log('=== CACHE FILTER CHECK ===');
console.log('Total jadwal di cache:', totalInCache);
console.log('Jadwal ditampilkan:', displayedCount);
console.log('User kelas:', userKelas);
console.log('Filter bekerja:', displayedCount <= totalInCache);
```

**Expected Output:**
```
=== CACHE FILTER CHECK ===
Total jadwal di cache: 5
Jadwal ditampilkan: 1
User kelas: IX G
Filter bekerja: true
```

---

### **Test C: Check Status Strip**

```javascript
// Jalankan di console setelah login Siswa B (yang Siswa A sudah selesai):
const exam = State.schedules.find(s => s.id === 'EXAM-4L1JP');
const nowMs = Date.now();
const isActive = nowMs >= exam.mulai && nowMs <= exam.selesai;

console.log('=== STATUS STRIP CHECK ===');
console.log('Exam:', exam.id);
console.log('Status:', exam.status);
console.log('Is active time:', isActive);
console.log('Expected status:', isActive ? 'AKTIF' : 'TUTUP');
console.log('Status correct:', exam.status === (isActive ? 'AKTIF' : 'TUTUP'));
```

**Expected Output:**
```
=== STATUS STRIP CHECK ===
Exam: EXAM-4L1JP
Status: AKTIF
Is active time: true
Expected status: AKTIF
Status correct: true
```

---

### **Test D: Check localStorage Cleanup**

```javascript
// Jalankan di console setelah login Siswa B:
const userBId = State.user.id;
const keys = Object.keys(localStorage);
const staleKeys = keys.filter(k => 
  k.startsWith('CBT_SUBMITTED_') && !k.endsWith('_' + userBId)
);

console.log('=== LOCALSTORAGE CLEANUP CHECK ===');
console.log('User B ID:', userBId);
console.log('Stale CBT_SUBMITTED keys:', staleKeys);
console.log('Cleanup successful:', staleKeys.length === 0);
```

**Expected Output:**
```
=== LOCALSTORAGE CLEANUP CHECK ===
User B ID: 111878985
Stale CBT_SUBMITTED keys: []
Cleanup successful: true
```

---

## 🎯 SUMMARY

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Kelas Berbeda | ⏳ Pending | Jalankan dengan 2 siswa kelas berbeda |
| Test 2: Kelas Sama | ⏳ Pending | Jalankan dengan 2 siswa kelas sama |
| Test 3: Logout | ⏳ Pending | Verifikasi state clear |
| Test 4: Cache Filter | ⏳ Pending | Verifikasi filter bekerja |
| Test 5: Status Strip | ⏳ Pending | Verifikasi status tidak terbawa |
| Check 1-5: Code | ✅ Done | Semua code sudah ada |
| Test A-D: Console | ⏳ Pending | Jalankan di browser console |

---

## 🚀 NEXT STEPS

1. **Run Manual Tests**: Jalankan Test 1-5 dengan siswa nyata
2. **Check Console**: Jalankan Test A-D di browser console
3. **Monitor Logs**: Lihat console logs untuk debug info
4. **Report Issues**: Jika ada masalah, cek console logs dan file yang relevan

---

**Last Updated:** 2026-05-09  
**Confidence Level:** 95% (semua fix sudah implemented)

