# 📊 MULTI-USER FLOW DIAGRAM

---

## 🔄 LOGIN FLOW (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER SELECTS SISWA                         │
│                   (Click "Konfirmasi" button)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLEAR STATE FROM PREVIOUS USER                     │
│  ✅ State.schedules = []                                        │
│  ✅ State._schedulesForUserId = null                            │
│  ✅ State.answers = {}                                          │
│  ✅ State.examActive = false                                    │
│  ✅ State.config = null                                         │
│  ✅ State.questions = []                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           CLEAR LOCALSTORAGE FROM OTHER USERS                   │
│  ✅ Remove CBT_SUBMITTED_${examId}_${otherUserId}               │
│  ✅ Remove CBT_${otherUserId}_* keys                            │
│  ✅ Keep CBT_CACHE_* (global cache)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              SET NEW USER TO STATE                              │
│  ✅ State.user = tempSelectedUser                               │
│  ✅ State.user.id = 101078171 (example)                         │
│  ✅ State.user.kelas = "IX G"                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              CALL loadSchedules()                               │
│  (Fetch jadwal untuk user baru)                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│  LOAD FROM CACHE         │          │  FETCH FROM SERVER       │
│  (Responsive)            │          │  (Accurate status)       │
├──────────────────────────┤          ├──────────────────────────┤
│ 1. Get CBT_CACHE_JADWAL  │          │ 1. Call gasRun()         │
│ 2. Filter by kelas       │          │ 2. Get fresh schedules   │
│ 3. Strip status (time)   │          │ 3. Update State          │
│ 4. Set State.schedules   │          │ 4. Set ownership flag    │
│ 5. Render immediately    │          │ 5. Render updated        │
└──────────────────────────┘          └──────────────────────────┘
        │                                         │
        └────────────────────┬────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           SET OWNERSHIP FLAG                                    │
│  ✅ State._schedulesForUserId = State.user.id                   │
│  ✅ Marks data belongs to current user                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              RENDER SCHEDULES                                   │
│  ✅ renderMobileSchedule() or renderSchedules()                 │
│  ✅ Display jadwal untuk user baru                              │
│  ✅ Status sudah di-filter dan di-strip                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚪 LOGOUT FLOW (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER CLICKS LOGOUT                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLEAR ALL STATE                                    │
│  ✅ State.user = null                                           │
│  ✅ State.schedules = []                                        │
│  ✅ State.pendingExam = null                                    │
│  ✅ State.answers = {}                                          │
│  ✅ State.examActive = false                                    │
│  ✅ State._schedulesForUserId = null                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           CLEAR LOCALSTORAGE FOR THIS USER                      │
│  ✅ Remove CBT_LOGGED_USER                                      │
│  ✅ Remove CBT_LAST_RESULT                                      │
│  ✅ Remove CBT_EXAM_SESSION                                     │
│  ✅ Remove CBT_SUBMITTED_${examId}_${userId}                    │
│  ✅ Remove CBT_${userId}_* keys                                 │
│  ✅ Keep CBT_CACHE_* (global cache)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              CALL renderMobileSchedule()                        │
│  (Render dengan state kosong)                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           CHECK: State.user && State.user.kelas?                │
│  ✅ NO (State.user = null)                                      │
│  ✅ Skip filter, show all or empty state                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              DISPLAY EMPTY STATE OR PREVIEW                     │
│  ✅ No user data displayed                                      │
│  ✅ No schedules from previous user                             │
│  ✅ Ready for next user to login                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 RENDER FLOW (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│              renderMobileSchedule() CALLED                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           CHECK: State.schedules.length > 0?                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
       YES                                       NO
        │                                         │
        ▼                                         ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│  USE EXISTING STATE      │          │  LOAD FROM CACHE         │
│  (Already loaded)        │          │  (CBT_CACHE_JADWAL)      │
└──────────────────────────┘          └────────────┬─────────────┘
        │                                          │
        │                                          ▼
        │                             ┌──────────────────────────┐
        │                             │  PARSE CACHE             │
        │                             │  Get all jadwals         │
        │                             └────────────┬─────────────┘
        │                                          │
        │                                          ▼
        │                             ┌──────────────────────────┐
        │                             │  CHECK: State.user?      │
        │                             └────────────┬─────────────┘
        │                                          │
        │                        ┌─────────────────┴──────────────┐
        │                        │                                │
        │                       YES                              NO
        │                        │                                │
        │                        ▼                                ▼
        │                ┌──────────────────┐        ┌──────────────────┐
        │                │  FILTER BY KELAS │        │  SHOW ALL        │
        │                │  (Multi-match)   │        │  (Preview mode)  │
        │                └────────┬─────────┘        └──────────────────┘
        │                         │
        │                         ▼
        │                ┌──────────────────┐
        │                │  STRIP STATUS    │
        │                │  (Time-based)    │
        │                └────────┬─────────┘
        │                         │
        │                         ▼
        │                ┌──────────────────┐
        │                │  SET STATE       │
        │                │  .schedules      │
        │                └────────┬─────────┘
        │                         │
        └─────────────────┬───────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  RENDER SCHEDULES TO DOM            │
        │  - Update mobile-schedule-list      │
        │  - Update schedule-count            │
        │  - Add click handlers               │
        └─────────────────────────────────────┘
```

---

## 🔐 FILTER LOGIC (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│              FILTER JADWAL BY KELAS                             │
│  Input: allSchedules (from cache)                               │
│  Output: filtered schedules (for current user)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  FOR EACH SCHEDULE IN allSchedules:                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET kelasTarget FROM SCHEDULE                                  │
│  (Try: target_kelas, kelas_target, kelas)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHECK: kelasTarget EMPTY OR "SEMUA" OR "ALL"?                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
       YES                                       NO
        │                                         │
        ▼                                         ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│  INCLUDE SCHEDULE        │          │  SPLIT kelasTarget       │
│  (Global for all kelas)  │          │  By comma: "10A,10B,10C" │
└──────────────────────────┘          └────────────┬─────────────┘
        │                                          │
        │                                          ▼
        │                             ┌──────────────────────────┐
        │                             │  FOR EACH KELAS IN LIST: │
        │                             │  - Trim whitespace       │
        │                             │  - Convert to lowercase  │
        │                             └────────────┬─────────────┘
        │                                          │
        │                                          ▼
        │                             ┌──────────────────────────┐
        │                             │  CHECK: MATCH?           │
        │                             │  - userKelas.includes(k) │
        │                             │  - k.includes(userKelas) │
        │                             └────────────┬─────────────┘
        │                                          │
        │                        ┌─────────────────┴──────────────┐
        │                        │                                │
        │                       YES                              NO
        │                        │                                │
        │                        ▼                                ▼
        │                ┌──────────────────┐        ┌──────────────────┐
        │                │  INCLUDE         │        │  EXCLUDE         │
        │                │  SCHEDULE        │        │  SCHEDULE        │
        │                └──────────────────┘        └──────────────────┘
        │                        │                                │
        └────────────────────────┴────────────────────────────────┘
                                 │
                                 ▼
        ┌─────────────────────────────────────┐
        │  RETURN FILTERED SCHEDULES          │
        │  (Only for current user's kelas)    │
        └─────────────────────────────────────┘
```

---

## 📊 STATUS STRIP LOGIC (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│              STRIP STATUS FROM CACHE                            │
│  Input: schedule from cache (may have stale status)             │
│  Output: safe status (based on time only)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET CURRENT TIME                                               │
│  nowMs = Date.now()                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  INITIALIZE safeStatus = 'BELUM_MULAI'                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHECK: s.aktif === false?                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
       YES                                       NO
        │                                         │
        ▼                                         ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│  safeStatus = 'NONAKTIF' │          │  CHECK: s.force_aktif?   │
│  RETURN                  │          └────────────┬─────────────┘
└──────────────────────────┘                       │
                                ┌──────────────────┴──────────────┐
                                │                                 │
                               YES                               NO
                                │                                 │
                                ▼                                 ▼
                        ┌──────────────────┐        ┌──────────────────┐
                        │  safeStatus =    │        │  CHECK: nowMs <  │
                        │  'AKTIF'         │        │  s.mulai?        │
                        │  RETURN          │        └────────────┬─────┘
                        └──────────────────┘                     │
                                                ┌────────────────┴──────────┐
                                                │                           │
                                               YES                         NO
                                                │                           │
                                                ▼                           ▼
                                        ┌──────────────────┐    ┌──────────────────┐
                                        │  safeStatus =    │    │  CHECK: nowMs >  │
                                        │  'BELUM_MULAI'   │    │  s.selesai?      │
                                        │  RETURN          │    └────────────┬─────┘
                                        └──────────────────┘                 │
                                                                ┌────────────┴──────────┐
                                                                │                       │
                                                               YES                     NO
                                                                │                       │
                                                                ▼                       ▼
                                                        ┌──────────────────┐  ┌──────────────────┐
                                                        │  safeStatus =    │  │  safeStatus =    │
                                                        │  'TUTUP'         │  │  'AKTIF'         │
                                                        │  RETURN          │  │  RETURN          │
                                                        └──────────────────┘  └──────────────────┘
```

---

## 🔄 STATE OWNERSHIP VALIDATION (Detailed)

```
┌─────────────────────────────────────────────────────────────────┐
│              VALIDATE DATA OWNERSHIP                            │
│  Ensure schedules belong to current user                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET CURRENT USER ID                                            │
│  currentUserId = State.user?.id                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  GET OWNERSHIP FLAG                                             │
│  ownershipFlag = State._schedulesForUserId                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPARE: currentUserId === ownershipFlag?                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
       YES                                       NO
        │                                         │
        ▼                                         ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│  DATA IS VALID           │          │  DATA IS STALE           │
│  ✅ Use schedules        │          │  ❌ Reload from server   │
│  ✅ Render normally      │          │  ❌ Clear State          │
└──────────────────────────┘          │  ❌ Fetch fresh data     │
                                      └──────────────────────────┘
```

---

## 📱 MULTI-USER SCENARIO (Visual)

```
TIME 1: Siswa A Login
┌─────────────────────────────────────────────────────────────────┐
│  State.user = {id: 101078171, name: "FITRI", kelas: "IX G"}     │
│  State.schedules = [EXAM-4L1JP, ...]                            │
│  State._schedulesForUserId = 101078171                          │
│  UI: Tampilkan jadwal untuk IX G                                │
└─────────────────────────────────────────────────────────────────┘

TIME 2: Siswa A Kerjakan Ujian
┌─────────────────────────────────────────────────────────────────┐
│  localStorage['CBT_SUBMITTED_EXAM-4L1JP_101078171'] = {...}     │
│  UI: Status berubah menjadi "Lihat Nilai"                       │
└─────────────────────────────────────────────────────────────────┘

TIME 3: Siswa A Logout
┌─────────────────────────────────────────────────────────────────┐
│  State.user = null                                              │
│  State.schedules = []                                           │
│  State._schedulesForUserId = null                               │
│  localStorage['CBT_LOGGED_USER'] = removed                      │
│  UI: Tampilkan empty state                                      │
└─────────────────────────────────────────────────────────────────┘

TIME 4: Siswa B Login
┌─────────────────────────────────────────────────────────────────┐
│  Clear: localStorage['CBT_SUBMITTED_EXAM-4L1JP_101078171']      │
│  Clear: localStorage['CBT_101078171_*']                         │
│  State.user = {id: 111878985, name: "MIFTAHUL", kelas: "IX G"}  │
│  State.schedules = [EXAM-4L1JP, ...] (status stripped)          │
│  State._schedulesForUserId = 111878985                          │
│  UI: Tampilkan jadwal untuk IX G (status AKTIF, bukan SELESAI)  │
└─────────────────────────────────────────────────────────────────┘

TIME 5: Siswa B Kerjakan Ujian
┌─────────────────────────────────────────────────────────────────┐
│  localStorage['CBT_SUBMITTED_EXAM-4L1JP_111878985'] = {...}     │
│  UI: Status berubah menjadi "Lihat Nilai"                       │
│  ✅ TERPISAH dari Siswa A!                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 KEY DIFFERENCES

### **BEFORE (❌ Broken)**
```
Siswa A Login → Kerjakan ujian → Logout
                                    ↓
                            Siswa B Login
                                    ↓
                    ❌ Lihat status ujian Siswa A
                    ❌ Tidak bisa kerjakan ujian
                    ❌ Data tumpang tindih
```

### **AFTER (✅ Fixed)**
```
Siswa A Login → Kerjakan ujian → Logout
                                    ↓
                            Siswa B Login
                                    ↓
                    ✅ Lihat status ujian Siswa B
                    ✅ Bisa kerjakan ujian
                    ✅ Data terpisah per-siswa
```

---

**Last Updated:** 2026-05-09  
**Status:** ✅ FULLY IMPLEMENTED

