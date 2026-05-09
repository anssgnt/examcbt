# 🧪 Quick Test Guide - Multi-User Cache Fix

## ⚡ 5-Minute Test

### Setup
1. Buka aplikasi di browser
2. Buka DevTools (F12)
3. Pergi ke tab **Application → LocalStorage**

### Test Sequence

#### Test 1: Logout Clear Cache (2 min)
```
1. Login Siswa A
   ✓ Lihat: State.user = A
   ✓ Lihat: CBT_CACHE_JADWAL_A ada di localStorage

2. Logout
   ✓ Console: "[Logout] Cleared: CBT_CACHE_JADWAL_${A.id}"
   ✓ LocalStorage: CBT_CACHE_JADWAL_A HILANG
   ✓ LocalStorage: CBT_${A}_* HILANG
```

#### Test 2: Login Force-Refresh (2 min)
```
1. Login Siswa B
   ✓ Console: "[Login] Cleared cached schedules - will force-refresh from server"
   ✓ Console: "getSchedules called"
   ✓ Jadwal tampil dengan status BENAR (bukan dari Siswa A)

2. Lihat jadwal
   ✓ Status BELUM_MULAI (jika belum waktunya)
   ✓ Status AKTIF (jika sedang berlangsung)
   ✓ Status TUTUP (jika sudah selesai)
```

#### Test 3: Restore Session (1 min)
```
1. Login Siswa C
2. Refresh page (F5)
   ✓ Console: "[RestoreSession] Cleared cached schedules for user ${C.id}"
   ✓ Jadwal tetap tampil dengan status BENAR
```

---

## 🔍 Console Logs to Check

### Logout
```
[Logout] Starting logout process...
[Logout] Cleared: CBT_CACHE_JADWAL_${userId}
[Logout] Cleared: CBT_CACHE_JADWAL_TIME_${userId}
[Logout] Cleared: CBT_${userId}_${examId}
[Logout] ✅ Logout complete - Cache cleared for user
```

### Login
```
[Login] Cleared cached schedules for user ${userId} - will force-refresh from server
[LoadSchedules] Starting. User: ${name}
[LoadSchedules] ✅ Server fetch success. Schedules: ${count}
```

### Restore Session
```
[RestoreSession] Restoring session for: ${name}
[RestoreSession] Cleared cached schedules for user ${userId}
[RestoreSession] ✅ Session restored successfully
```

---

## 📊 LocalStorage Keys to Monitor

### Before Login
```
CBT_CACHE_JADWAL          ← Global cache (semua jadwal)
CBT_CACHE_JADWAL_TIME     ← Timestamp global cache
```

### After Login (Siswa A)
```
CBT_CACHE_JADWAL          ← Global cache
CBT_CACHE_JADWAL_TIME     ← Timestamp global cache
CBT_CACHE_JADWAL_${A.id}  ← Per-user cache (A)
CBT_CACHE_JADWAL_TIME_${A.id}
CBT_LOGGED_USER           ← Session data
CBT_${A.id}_${examId}     ← Exam state (A)
CBT_SUBMITTED_${examId}_${A.id}
```

### After Logout (Siswa A)
```
CBT_CACHE_JADWAL          ← Global cache (tetap)
CBT_CACHE_JADWAL_TIME     ← Timestamp global cache (tetap)
❌ CBT_CACHE_JADWAL_${A.id}  ← HILANG
❌ CBT_${A.id}_*             ← HILANG
❌ CBT_SUBMITTED_*_${A.id}   ← HILANG
```

### After Login (Siswa B)
```
CBT_CACHE_JADWAL          ← Global cache
CBT_CACHE_JADWAL_TIME     ← Timestamp global cache
CBT_CACHE_JADWAL_${B.id}  ← Per-user cache (B) - FRESH
CBT_CACHE_JADWAL_TIME_${B.id}
CBT_LOGGED_USER           ← Session data (B)
CBT_${B.id}_${examId}     ← Exam state (B)
CBT_SUBMITTED_${examId}_${B.id}
```

---

## ✅ Expected Results

### ✓ PASS
- [ ] Logout clear cache per-user
- [ ] Login force-refresh dari server
- [ ] Jadwal status BENAR untuk setiap user
- [ ] Restore session tidak bawa cache stale
- [ ] Console logs muncul sesuai alur

### ✗ FAIL
- [ ] Cache tidak di-clear saat logout
- [ ] Jadwal masih menampilkan status user lain
- [ ] Console error saat login/logout
- [ ] LocalStorage penuh dengan cache stale

---

## 🐛 Troubleshooting

### Problem: Jadwal masih menampilkan status lama
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Logout dan login ulang
3. Check console untuk error

### Problem: Console error saat logout
**Solution:**
1. Check browser console (F12)
2. Lihat error message
3. Verify localStorage tidak corrupt

### Problem: Login lambat
**Solution:**
1. Normal jika server lambat
2. Check network tab (F12)
3. Verify getSchedules() API responding

---

## 📱 Multi-Device Test

### Setup
- Device 1: Laptop/Desktop
- Device 2: HP/Tablet
- Sama network atau berbeda tidak masalah

### Test
```
Device 1:
  1. Login Siswa A
  2. Ujian SELESAI
  3. Logout

Device 2:
  1. Login Siswa B
  2. Lihat jadwal
  3. ✓ Status BELUM_MULAI (bukan SELESAI dari A)
```

---

## 📝 Test Report Template

```
TEST DATE: ___________
TESTER: ___________
DEVICE: ___________
BROWSER: ___________

Test 1: Logout Clear Cache
  Status: [ ] PASS [ ] FAIL
  Notes: ___________

Test 2: Login Force-Refresh
  Status: [ ] PASS [ ] FAIL
  Notes: ___________

Test 3: Restore Session
  Status: [ ] PASS [ ] FAIL
  Notes: ___________

Test 4: Multi-Device
  Status: [ ] PASS [ ] FAIL
  Notes: ___________

Overall: [ ] PASS [ ] FAIL
Issues Found: ___________
```

---

## 🎯 Success Criteria

✅ **PASS** jika:
- Semua 4 test PASS
- Console logs muncul sesuai alur
- LocalStorage keys sesuai ekspektasi
- Jadwal status BENAR untuk setiap user

❌ **FAIL** jika:
- Ada test yang FAIL
- Console error muncul
- Jadwal status SALAH
- Cache tidak di-clear

---

**Ready to test? Let's go! 🚀**
