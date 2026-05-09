-- ========================================================
-- CBT ONLINE - STAGE 1 HARDENING (PRODUCTION)
-- Jalankan SETELAH tabel sudah dibuat.
-- Catatan:
-- - Ini mengunci operasi sensitif dari akses publik langsung.
-- - Untuk write sensitif, gunakan Edge Function / backend trusted.
-- ========================================================

-- 1) Pastikan RLS aktif di semua tabel
alter table if exists config enable row level security;
alter table if exists peserta enable row level security;
alter table if exists jadwal_ujian enable row level security;
alter table if exists soal enable row level security;
alter table if exists kunci enable row level security;
alter table if exists hasil enable row level security;
alter table if exists pelanggaran enable row level security;
alter table if exists online_status enable row level security;
alter table if exists status_sync enable row level security;
alter table if exists reset_flags enable row level security;
alter table if exists broadcasts enable row level security;
alter table if exists sync_answers enable row level security;

-- 2) Hapus policy lama "Allow all access ..."
drop policy if exists "Allow all access to peserta" on peserta;
drop policy if exists "Allow all access to jadwal_ujian" on jadwal_ujian;
drop policy if exists "Allow all access to soal" on soal;
drop policy if exists "Allow all access to kunci" on kunci;
drop policy if exists "Allow all access to hasil" on hasil;
drop policy if exists "Allow all access to pelanggaran" on pelanggaran;
drop policy if exists "Allow all access to online_status" on online_status;
drop policy if exists "Allow all access to status_sync" on status_sync;
drop policy if exists "Allow all access to reset_flags" on reset_flags;
drop policy if exists "Allow all access to broadcasts" on broadcasts;
drop policy if exists "Allow all access to sync_answers" on sync_answers;

-- 3) Read publik minimum untuk portal ujian
create policy "Public read peserta" on peserta
  for select to anon, authenticated using (true);

create policy "Public read jadwal" on jadwal_ujian
  for select to anon, authenticated using (true);

create policy "Public read soal" on soal
  for select to anon, authenticated using (true);

-- Kunci jawaban harus private (tanpa policy select publik).
-- Table kunci sengaja TANPA policy select anon/authenticated.

-- 4) Lock write langsung publik untuk tabel sensitif
create policy "No direct insert hasil" on hasil
  for insert to anon, authenticated with check (false);
create policy "No direct update hasil" on hasil
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete hasil" on hasil
  for delete to anon, authenticated using (false);

create policy "No direct insert sync_answers" on sync_answers
  for insert to anon, authenticated with check (false);
create policy "No direct update sync_answers" on sync_answers
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete sync_answers" on sync_answers
  for delete to anon, authenticated using (false);

create policy "No direct insert online_status" on online_status
  for insert to anon, authenticated with check (false);
create policy "No direct update online_status" on online_status
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete online_status" on online_status
  for delete to anon, authenticated using (false);

create policy "No direct insert status_sync" on status_sync
  for insert to anon, authenticated with check (false);
create policy "No direct update status_sync" on status_sync
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete status_sync" on status_sync
  for delete to anon, authenticated using (false);

create policy "No direct insert reset_flags" on reset_flags
  for insert to anon, authenticated with check (false);
create policy "No direct update reset_flags" on reset_flags
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete reset_flags" on reset_flags
  for delete to anon, authenticated using (false);

create policy "No direct insert broadcasts" on broadcasts
  for insert to anon, authenticated with check (false);
create policy "No direct update broadcasts" on broadcasts
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete broadcasts" on broadcasts
  for delete to anon, authenticated using (false);

create policy "No direct insert pelanggaran" on pelanggaran
  for insert to anon, authenticated with check (false);
create policy "No direct update pelanggaran" on pelanggaran
  for update to anon, authenticated using (false) with check (false);
create policy "No direct delete pelanggaran" on pelanggaran
  for delete to anon, authenticated using (false);

-- 5) Config juga private
drop policy if exists "Public read config" on config;
create policy "No public access config" on config
  for all to anon, authenticated using (false) with check (false);
