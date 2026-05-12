# 📊 Penjelasan Data Storage - Firebase vs Supabase

## Ringkasan Singkat
**Data SEBENARNYA disimpan ke SUPABASE, bukan Firebase.**

---

## Bagaimana Cara Kerjanya?

### 1. **Kode Menggunakan Firebase API**
```javascript
// Kode di admin-core.min.js, exam-core.min.js, dll
await db.ref('/peserta').once('value');
await db.ref('/peserta/123').set({nama: 'Budi', kelas: 'X-A'});
```

### 2. **Adapter Mengubah ke Supabase**
File `supabase-patch.min.js` adalah **adapter/proxy** yang:
- Menangkap semua panggilan `db.ref()` 
- Mengubahnya menjadi panggilan Supabase REST API
- Mengirim ke Supabase, bukan Firebase

```javascript
// supabase-patch.min.js mengubah:
db.ref('/peserta').once('value')
// Menjadi:
fetchSupabase('peserta')  // → Supabase REST API
```

### 3. **Supabase Config**
```javascript
// supabase-adapter.min.js
const SUPABASE_CONFIG = {
  enabled: true,
  url: "https://dmydinmosdxazypdwbed.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

---

## Alur Data

```
┌─────────────────────────────────────────────────────────┐
│ Admin Panel / Exam / Index                              │
│ (Menggunakan Firebase API)                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ supabase-patch.min.js (Adapter)                         │
│ - Intercept db.ref() calls                              │
│ - Convert to Supabase REST API                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ supabase-adapter.min.js (HTTP Client)                   │
│ - fetchSupabase()                                       │
│ - insertSupabase()                                      │
│ - deleteSupabase()                                      │
│ - updateSupabase()                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Supabase REST API                                       │
│ https://dmydinmosdxazypdwbed.supabase.co/rest/v1/...   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Supabase Database (PostgreSQL)                          │
│ - peserta table                                         │
│ - jadwal_ujian table                                    │
│ - soal table                                            │
│ - hasil table                                           │
│ - dll                                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Tabel Supabase yang Digunakan

| Tabel | Fungsi |
|-------|--------|
| `peserta` | Menyimpan data siswa (id, nama, kelas) |
| `jadwal_ujian` | Menyimpan jadwal ujian |
| `soal` | Menyimpan bank soal |
| `kunci` | Menyimpan kunci jawaban |
| `hasil` | Menyimpan hasil ujian siswa |
| `pelanggaran` | Menyimpan log pelanggaran |
| `online_status` | Menyimpan status online siswa |
| `status_sync` | Menyimpan status sinkronisasi soal |
| `broadcasts` | Menyimpan pesan broadcast |
| `config` | Menyimpan konfigurasi sistem |

---

## Mengapa Menggunakan Adapter?

### Keuntungan:
1. **Kompatibilitas** - Kode tetap menggunakan Firebase API yang familiar
2. **Fleksibilitas** - Bisa switch ke backend lain tanpa ubah kode
3. **Migrasi Mudah** - Dari Firebase ke Supabase tanpa refactor besar
4. **Offline Support** - LocalDB untuk caching data lokal

### Kode Tetap Sama:
```javascript
// Kode tidak perlu berubah
await db.ref('/peserta').once('value');
await db.ref('/peserta/123').set({nama: 'Budi'});
await db.ref('/peserta/123').remove();
```

---

## Fitur Hapus Siswa

File `admin-siswa-delete.min.js` menggunakan Supabase langsung:

```javascript
// Menggunakan Supabase client
const { data, error } = await window.supabase
  .from('peserta')
  .select('*')
  .eq('kelas', selectedKelas);

// Menghapus
await window.supabase
  .from('peserta')
  .delete()
  .eq('id', siswa.id);
```

---

## Kesimpulan

✅ **Data TIDAK masuk ke Firebase**
✅ **Data MASUK ke Supabase**
✅ **Adapter mengubah Firebase API → Supabase REST API**
✅ **Fitur hapus siswa menggunakan Supabase client**

Jadi sistem ini adalah **Firebase API + Supabase Backend** = Best of both worlds! 🎉
