-- Migration: Tambah kolom kiri dan kanan untuk soal tipe JODOH
-- Jalankan di Supabase SQL Editor

ALTER TABLE soal 
  ADD COLUMN IF NOT EXISTS kiri JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kanan JSONB DEFAULT '[]'::jsonb;

-- Verifikasi
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'soal' 
  AND column_name IN ('kiri', 'kanan');
