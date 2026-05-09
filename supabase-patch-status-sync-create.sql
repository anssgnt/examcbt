-- ============================================================
-- PATCH: Buat tabel status_sync jika belum ada
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS status_sync (
  id TEXT PRIMARY KEY,
  exam_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nama TEXT,
  kelas TEXT,
  ready BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'FULL',
  time BIGINT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_sync_exam ON status_sync(exam_id);
CREATE INDEX IF NOT EXISTS idx_status_sync_user ON status_sync(user_id);

-- Disable RLS agar Edge Function bisa write
-- (Edge Function pakai service_role_key, tidak perlu RLS)
ALTER TABLE status_sync DISABLE ROW LEVEL SECURITY;

-- Verifikasi
SELECT 'status_sync table ready' as status, count(*) as rows FROM status_sync;
