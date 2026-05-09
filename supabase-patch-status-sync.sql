-- ========================================================
--   PATCH: Tambah kolom ready & timestamp ke status_sync
--   Jalankan di Supabase SQL Editor jika tabel sudah ada
-- ========================================================

alter table status_sync
    add column if not exists ready boolean default true,
    add column if not exists timestamp bigint;

-- Verifikasi
select column_name, data_type
from information_schema.columns
where table_name = 'status_sync'
order by ordinal_position;
