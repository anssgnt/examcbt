-- ========================================================
--   CBT ONLINE - SUPABASE DATABASE SETUP
--   Run this SQL in your Supabase SQL Editor
-- ========================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ========================================================
-- 1. CONFIG TABLE (Security & Identity settings)
-- ========================================================
drop table if exists config;
create table config (
    key text primary key,
    value jsonb,
    updated_at timestamptz default now()
);

insert into config (key, value) values
('identity', '{"name":"CBT Online MGMP","sub":"Computer Based Test"}'::jsonb),
('security', '{"pwa":false,"fullscreen":false,"anticheat":false,"showExamStatus":true,"showSyncBadge":true,"showSystemInfo":true,"minTime":0}'::jsonb),
('admin_pass', '"proktor123"'::jsonb);

-- ========================================================
-- 2. PESERTA TABLE (Student data)
-- ========================================================
drop table if exists peserta;
create table peserta (
    id text primary key,
    nama text not null,
    kelas text not null,
    created_at timestamptz default now()
);

-- Enable Row Level Security
alter table peserta enable row level security;

-- Allow public read and write
create policy "Allow all access to peserta" on peserta
    for all using (true) with check (true);

-- ========================================================
-- 3. JADWAL_UJIAN TABLE (Exam schedules)
-- ========================================================
drop table if exists jadwal_ujian;
create table jadwal_ujian (
    id text primary key,
    nama text not null,
    nama_soal text not null,
    aktif boolean default true,
    force_aktif boolean default false,
    token text,
    durasi integer default 60,
    mulai bigint not null,
    selesai bigint not null,
    target_kelas text,
    kelas text,
    shuffle_soal boolean default true,
    shuffle_opsi boolean default true,
    min_selesai integer default 0,
    versi_soal text,
    kkm integer default 75,
    created_at timestamptz default now()
);

alter table jadwal_ujian enable row level security;
create policy "Allow all access to jadwal_ujian" on jadwal_ujian
    for all using (true) with check (true);

-- ========================================================
-- 4. SOAL TABLE (Question bank)
-- ========================================================
drop table if exists soal;
create table soal (
    id serial primary key,
    bank_id text not null,
    pertanyaan text,
    tipe text default 'PG',
    gambar text,
    opsi jsonb,
    bobot float default 1,
    kiri jsonb default '[]'::jsonb,
    kanan jsonb default '[]'::jsonb,
    created_at timestamptz default now()
);

-- Index for faster bank_id lookups
create index idx_soal_bank_id on soal(bank_id);

alter table soal enable row level security;
create policy "Allow all access to soal" on soal
    for all using (true) with check (true);

-- ========================================================
-- 5. KUNCI TABLE (Answer keys)
-- ========================================================
drop table if exists kunci;
create table kunci (
    id serial primary key,
    bank_id text not null,
    kunci text not null,
    created_at timestamptz default now()
);

create index idx_kunci_bank_id on kunci(bank_id);

alter table kunci enable row level security;
create policy "Allow all access to kunci" on kunci
    for all using (true) with check (true);

-- ========================================================
-- 6. HASIL TABLE (Exam results)
-- ========================================================
drop table if exists hasil;
create table hasil (
    id text primary key,
    exam_id text not null,
    user_id text not null,
    nama text,
    kelas text,
    skor integer default 0,
    waktu text,
    detail jsonb,
    violations integer default 0,
    timestamp bigint,
    created_at timestamptz default now()
);

create index idx_hasil_exam_id on hasil(exam_id);
create index idx_hasil_user_id on hasil(user_id);
create index idx_hasil_timestamp on hasil(timestamp desc);

alter table hasil enable row level security;
create policy "Allow all access to hasil" on hasil
    for all using (true) with check (true);

-- ========================================================
-- 7. PELANGGARAN TABLE (Cheat logs)
-- ========================================================
drop table if exists pelanggaran;
create table pelanggaran (
    id serial primary key,
    exam_id text,
    user_id text,
    nama text,
    tipe text,
    waktu text,
    timestamp bigint,
    created_at timestamptz default now()
);

create index idx_pelanggaran_exam_id on pelanggaran(exam_id);
create index idx_pelanggaran_timestamp on pelanggaran(timestamp desc);

alter table pelanggaran enable row level security;
create policy "Allow all access to pelanggaran" on pelanggaran
    for all using (true) with check (true);

-- ========================================================
-- 8. ONLINE_STATUS TABLE (Real-time student status)
-- ========================================================
drop table if exists online_status;
create table online_status (
    id text primary key,
    exam_id text not null,
    user_id text not null,
    last_seen bigint,
    progress integer default 0,
    total integer default 0,
    status text default 'MENGERJAKAN',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_online_exam_id on online_status(exam_id);
create index idx_online_user_id on online_status(user_id);
create index idx_online_last_seen on online_status(last_seen desc);

alter table online_status enable row level security;
create policy "Allow all access to online_status" on online_status
    for all using (true) with check (true);

-- ========================================================
-- 9. STATUS_SYNC TABLE (Student sync status)
-- ========================================================
drop table if exists status_sync;
create table status_sync (
    id text primary key,
    exam_id text not null,
    user_id text not null,
    nama text,
    kelas text,
    ready boolean default true,
    time bigint,
    timestamp bigint,
    status text default 'PENDING',
    created_at timestamptz default now()
);

create index idx_status_sync_exam_id on status_sync(exam_id);
create index idx_status_sync_user_id on status_sync(user_id);

alter table status_sync enable row level security;
create policy "Allow all access to status_sync" on status_sync
    for all using (true) with check (true);

-- ========================================================
-- 10. RESET_FLAGS TABLE (Session reset flags)
-- ========================================================
drop table if exists reset_flags;
create table reset_flags (
    id text primary key,
    exam_id text not null,
    user_id text not null,
    time bigint,
    created_at timestamptz default now()
);

create index idx_reset_exam_user on reset_flags(exam_id, user_id);

alter table reset_flags enable row level security;
create policy "Allow all access to reset_flags" on reset_flags
    for all using (true) with check (true);

-- ========================================================
-- 11. BROADCASTS TABLE (Announcements)
-- ========================================================
drop table if exists broadcasts;
create table broadcasts (
    id serial primary key,
    exam_id text not null,
    message text,
    kelas text default 'all',
    status text default 'all',
    timestamp bigint,
    created_at timestamptz default now()
);

create index idx_broadcasts_exam_id on broadcasts(exam_id);
create index idx_broadcasts_timestamp on broadcasts(timestamp desc);

alter table broadcasts enable row level security;
create policy "Allow all access to broadcasts" on broadcasts
    for all using (true) with check (true);

-- ========================================================
-- 12. SYNC_ANSWERS TABLE (Auto-save answers)
-- ========================================================
drop table if exists sync_answers;
create table sync_answers (
    id text primary key,
    exam_id text not null,
    user_id text not null,
    answers jsonb,
    time_remaining integer default 0,
    violations integer default 0,
    last_sync bigint,
    created_at timestamptz default now()
);

create index idx_sync_answers_exam_user on sync_answers(exam_id, user_id);

alter table sync_answers enable row level security;
create policy "Allow all access to sync_answers" on sync_answers
    for all using (true) with check (true);

-- ========================================================
-- SAMPLE DATA FOR TESTING
-- ========================================================

-- Sample students
insert into peserta (id, nama, kelas) values
('1001', 'Ahmad Fauzi', 'X IPA 1'),
('1002', 'Siti Nurhaliza', 'X IPA 1'),
('1003', 'Budi Santoso', 'X IPA 1'),
('1004', 'Dewi Lestari', 'X IPA 2'),
('1005', 'Eko Prasetyo', 'X IPA 2');

-- Sample exam schedule (valid for 7 days from now)
insert into jadwal_ujian (id, nama, nama_soal, aktif, token, durasi, mulai, selesai, target_kelas) values
('UJIAN-01', 'Ulangan Harian Matematika', 'BANK-MAT-01', true, 'ABC123', 60, 
 (extract(epoch from now()) * 1000)::bigint, 
 ((extract(epoch from now()) + 604800000) / 1000)::bigint, 
 'X IPA 1,X IPA 2'),
('UJIAN-02', 'Ulangan Harian Fisika', 'BANK-FIS-01', true, 'XYZ789', 45,
 (extract(epoch from now()) * 1000)::bigint,
 ((extract(epoch from now()) + 604800000) / 1000)::bigint,
 'X IPA 1');

-- Sample questions for MAT
insert into soal (bank_id, pertanyaan, tipe, opsi, bobot) values
('BANK-MAT-01', 'Berapakah hasil dari 2 + 2?', 'PG', 
 '[{"id":"A","text":"3"},{"id":"B","text":"4"},{"id":"C","text":"5"},{"id":"D","text":"6"}]', 1),
('BANK-MAT-01', 'Tentukan hasil dari 5 x 6', 'PG',
 '[{"id":"A","text":"25"},{"id":"B","text":"30"},{"id":"C","text":"35"},{"id":"D","text":"40"}]', 1),
('BANK-MAT-01', 'Berapakah akar kuadrat dari 144?', 'PG',
 '[{"id":"A","text":"10"},{"id":"B","text":"11"},{"id":"C","text":"12"},{"id":"D","text":"14"}]', 1),
('BANK-MAT-01', 'Jika x + 5 = 10, maka nilai x adalah...', 'PG',
 '[{"id":"A","text":"3"},{"id":"B","text":"4"},{"id":"C","text":"5"},{"id":"D","text":"6"}]', 1),
('BANK-MAT-01', 'Berapakah 25% dari 200?', 'PG',
 '[{"id":"A","text":"25"},{"id":"B","text":"40"},{"id":"C","text":"50"},{"id":"D","text":"75"}]', 1);

-- Answer keys for MAT
insert into kunci (bank_id, kunci) values
('BANK-MAT-01', 'B'),
('BANK-MAT-01', 'B'),
('BANK-MAT-01', 'C'),
('BANK-MAT-01', 'C'),
('BANK-MAT-01', 'C');

-- Sample questions for FIS
insert into soal (bank_id, pertanyaan, tipe, opsi, bobot) values
('BANK-FIS-01', 'Satuan SI untuk massa adalah...', 'PG',
 '[{"id":"A","text":"Meter"},{"id":"B","text":"Kilogram"},{"id":"C","text":"Detik"},{"id":"D","text":"Newton"}]', 1),
('BANK-FIS-01', 'Hukum Newton pertama dikenal juga sebagai...', 'PG',
 '[{"id":"A","text":"Hukum Aksi-Reaksi"},{"id":"B","text":"Hukum Kelembaman"},{"id":"C","text":"Hukum Gravitasi"},{"id":"D","text":"Hukum Usaha"}]', 1);

insert into kunci (bank_id, kunci) values
('BANK-FIS-01', 'B'),
('BANK-FIS-01', 'B');

-- ========================================================
-- SECURITY NOTE (PRODUCTION)
-- ========================================================
-- Default policy di file ini masih "Allow all access" agar kompatibel
-- dengan arsitektur lama (direct client write menggunakan anon key).
--
-- Untuk production, jalankan file berikut setelah setup selesai:
--   supabase-stage1-hardening.sql
--
-- File hardening akan:
-- - Mengunci write sensitif dari akses publik langsung
-- - Menjaga soal tetap bisa dibaca publik
-- - Menutup akses kunci jawaban dari client

-- ========================================================
-- HELPER FUNCTIONS
-- ========================================================

-- Function to auto-delete old broadcasts (older than 1 hour)
create or replace function cleanup_old_broadcasts()
returns void as $$
begin
    delete from broadcasts 
    where timestamp < ((extract(epoch from now()) * 1000)::bigint - 3600000);
end;
$$ language plpgsql;

-- Schedule cleanup every 30 minutes (optional)
-- select cron.schedule('cleanup-broadcasts', '*/30 * * * *', 'SELECT cleanup_old_broadcasts()');

-- ========================================================
-- VERIFICATION QUERIES
-- ========================================================

-- Check all tables created
select 'Tables created:' as info;
select table_name from information_schema.tables 
where table_schema = 'public' order by table_name;

-- Check row counts
select 'Data count:' as info;
select 'peserta' as tbl, count(*) as cnt from peserta
union all select 'jadwal_ujian', count(*) from jadwal_ujian
union all select 'soal', count(*) from soal
union all select 'kunci', count(*) from kunci;