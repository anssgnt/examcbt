-- Create pelanggaran table for violations tracking
CREATE TABLE IF NOT EXISTS pelanggaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nama TEXT NOT NULL,
  kelas TEXT,
  exam_id TEXT NOT NULL,
  tipe TEXT NOT NULL,
  user_id TEXT NOT NULL,
  waktu TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exam_id, timestamp)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pelanggaran_timestamp ON pelanggaran(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_exam_id ON pelanggaran(exam_id);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_user_id ON pelanggaran(user_id);

-- Enable RLS
ALTER TABLE pelanggaran ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for Edge Function)
CREATE POLICY "Allow anonymous inserts" ON pelanggaran
  FOR INSERT
  WITH CHECK (true);

-- Allow anonymous reads (for admin dashboard)
CREATE POLICY "Allow anonymous reads" ON pelanggaran
  FOR SELECT
  USING (true);

-- Grant permissions
GRANT INSERT, SELECT ON pelanggaran TO anon;
GRANT USAGE ON SCHEMA public TO anon;
