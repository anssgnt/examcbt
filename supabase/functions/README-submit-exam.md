# Deploy Edge Functions CBT

## 1) Login dan link project

```bash
supabase login
supabase link --project-ref dmydinmosdxazypdwbed
```

## 2) Deploy functions

```bash
supabase functions deploy submit_exam --no-verify-jwt
supabase functions deploy sync_answer_delta --no-verify-jwt
supabase functions deploy set_student_online --no-verify-jwt
supabase functions deploy admin_jadwal --no-verify-jwt
supabase functions deploy admin_config --no-verify-jwt
supabase functions deploy admin_peserta --no-verify-jwt
supabase functions deploy admin_banksoal --no-verify-jwt
supabase functions deploy set_status_sync --no-verify-jwt
```

## 3) Verifikasi cepat

```bash
supabase functions list
```

## Catatan

- Function ini menghitung skor di server dari tabel `soal` + `kunci`.
- Client tidak perlu membawa `keys` lagi.
- Frontend sudah di-patch untuk mencoba Function dulu, lalu fallback ke mekanisme lama jika function belum aktif.
- `sync_answer_delta` menerima delta jawaban dan merge ke `sync_answers` di server.
