-- Complete Supabase Tables - RUN ALL AT ONCE
-- Copy this entire block to SQL Editor and run

-- ============================================
-- MAIN TABLES (READ/WRITE)
-- ============================================

-- 1. JADWAL (Exam Schedules)
DROP TABLE IF EXISTS jadwal_ujian CASCADE;
CREATE TABLE jadwal_ujian (
  id TEXT PRIMARY KEY,
  nama TEXT,
  nama_soal TEXT,
  token TEXT,
  durasi INTEGER DEFAULT 60,
  mulai BIGINT,
  selesai BIGINT,
  min_selesai INTEGER DEFAULT 0,
  shuffle_soal BOOLEAN DEFAULT false,
  shuffle_opsi BOOLEAN DEFAULT false,
  aktif BOOLEAN DEFAULT true,
  target_kelas TEXT DEFAULT '',
  kelas TEXT DEFAULT '',
  force_aktif BOOLEAN DEFAULT false,
  versi_soal TEXT DEFAULT '1',
  status TEXT DEFAULT ''
);
-- 2. SOAL (Questions)
DROP TABLE IF EXISTS soal CASCADE;
CREATE TABLE soal (
  bank_id TEXT NOT NULL,
  id TEXT NOT NULL,
  pertanyaan TEXT,
  tipe TEXT DEFAULT 'PG',
  opsi JSONB DEFAULT '[]'::jsonb,
  gambar TEXT,
  bobot REAL DEFAULT 1,
  kiri JSONB DEFAULT '[]'::jsonb,
  kanan JSONB DEFAULT '[]'::jsonb,
  PRIMARY KEY (bank_id, id)
);

-- 3. KUNCI (Answer Keys)
DROP TABLE IF EXISTS kunci CASCADE;
CREATE TABLE kunci (
  bank_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kunci TEXT,
  PRIMARY KEY (bank_id, id)
);

-- 4. PESERTA (Students)
DROP TABLE IF EXISTS peserta CASCADE;
CREATE TABLE peserta (
  id TEXT PRIMARY KEY,
  nama TEXT,
  kelas TEXT
);

-- ============================================
-- WRITE TABLES (EXAM OPERATIONS)
-- ============================================

-- 5. HASIL (Exam Results)
DROP TABLE IF EXISTS hasil CASCADE;
CREATE TABLE hasil (
  id TEXT PRIMARY KEY,
  exam_id TEXT,
  user_id TEXT,
  nama TEXT,
  kelas TEXT,
  skor REAL DEFAULT 0,
  detail JSONB,
  waktu TEXT,
  violations INTEGER DEFAULT 0,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SYNC_ANSWERS (Real-time sync)
DROP TABLE IF EXISTS sync_answers CASCADE;
CREATE TABLE sync_answers (
  exam_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  answers JSONB,
  time_remaining INTEGER,
  violations INTEGER DEFAULT 0,
  last_sync BIGINT,
  PRIMARY KEY (exam_id, user_id)
);

-- 7. ONLINE_STATUS (Who is online)
DROP TABLE IF EXISTS online_status CASCADE;
CREATE TABLE online_status (
  exam_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_seen BIGINT,
  status TEXT,
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  PRIMARY KEY (exam_id, user_id)
);

-- 8. RESET_FLAGS (Reset exam)
DROP TABLE IF EXISTS reset_flags CASCADE;
CREATE TABLE reset_flags (
  exam_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  time BIGINT,
  PRIMARY KEY (exam_id, user_id)
);

-- 9. BROADCASTS (Admin messages)
DROP TABLE IF EXISTS broadcasts CASCADE;
CREATE TABLE broadcasts (
  id SERIAL PRIMARY KEY,
  exam_id TEXT,
  message TEXT,
  timestamp BIGINT
);

-- 10. STATUS_SYNC (Student sync status for admin monitor)
DROP TABLE IF EXISTS status_sync CASCADE;
CREATE TABLE status_sync (
  id TEXT PRIMARY KEY,        -- format: "{examId}_{userId}"
  exam_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nama TEXT,
  kelas TEXT,
  ready BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'FULL', -- 'FULL', 'PARTIAL', 'SELESAI'
  time BIGINT,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_sync_exam ON status_sync(exam_id);
CREATE INDEX IF NOT EXISTS idx_status_sync_user ON status_sync(user_id);

-- ============================================
-- SECURITY & INDEXES
-- ============================================

-- WARNING:
-- File ini untuk DEV/LOCAL TESTING, bukan production.
-- Untuk production gunakan: supabase-stage1-hardening.sql
-- Disable RLS (development only)
ALTER TABLE jadwal_ujian DISABLE ROW LEVEL SECURITY;
ALTER TABLE soal DISABLE ROW LEVEL SECURITY;
ALTER TABLE kunci DISABLE ROW LEVEL SECURITY;
ALTER TABLE peserta DISABLE ROW LEVEL SECURITY;
ALTER TABLE hasil DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE online_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE reset_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_sync DISABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hasil_user ON hasil(user_id);
CREATE INDEX IF NOT EXISTS idx_hasil_exam ON hasil(exam_id);
CREATE INDEX IF NOT EXISTS idx_online_exam ON online_status(exam_id);
CREATE INDEX IF NOT EXISTS idx_soal_bank ON soal(bank_id);
CREATE INDEX IF NOT EXISTS idx_kunci_bank ON kunci(bank_id);

-- ============================================
-- DONE!
-- ============================================
SELECT 
  '✅ All tables created!' as status,
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as table_count;