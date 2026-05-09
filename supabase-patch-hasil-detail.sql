-- ============================================================
-- PATCH: Tambah kolom detail ke tabel hasil
-- Jalankan di Supabase SQL Editor jika tabel hasil belum punya kolom detail
-- ============================================================

-- Tambah kolom detail jika belum ada
ALTER TABLE hasil ADD COLUMN IF NOT EXISTS detail JSONB;

-- Tambah kolom violations jika belum ada  
ALTER TABLE hasil ADD COLUMN IF NOT EXISTS violations INTEGER DEFAULT 0;

-- Tambah kolom created_at jika belum ada
ALTER TABLE hasil ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Migrasi data lama: copy jawaban ke detail jika detail masih null
UPDATE hasil SET detail = jawaban WHERE detail IS NULL AND jawaban IS NOT NULL;

-- Verifikasi
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hasil' 
ORDER BY ordinal_position;
