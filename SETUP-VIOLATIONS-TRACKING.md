# Setup Violations Tracking - Complete Guide

## Status: ✅ Ready to Deploy

Semua code sudah siap. Tinggal setup di Supabase.

## Step 1: Create Table `pelanggaran` di Supabase

1. Buka Supabase Dashboard: https://app.supabase.com
2. Pilih project: `dmydinmosdxazypwdbed`
3. Buka **SQL Editor**
4. Klik **New Query**
5. Copy-paste SQL dari `supabase-setup.sql`:

```sql
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
```

6. Klik **Run** (atau Ctrl+Enter)
7. Tunggu sampai selesai ✅

## Step 2: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref dmydinmosdxazypwdbed

# Deploy function
supabase functions deploy sync-violations
```

### Option B: Manual Upload via Dashboard

1. Buka Supabase Dashboard
2. Pilih **Edge Functions** di sidebar
3. Klik **Create a new function**
4. Name: `sync-violations`
5. Copy-paste code dari `supabase/functions/sync-violations/index.ts`
6. Deploy

## Step 3: Verify Setup

### Test Edge Function

```bash
curl -X POST https://dmydinmosdxazypwdbed.supabase.co/functions/v1/sync-violations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8" \
  -d '{
    "violations": [{
      "timestamp": "2026-05-09T10:30:00Z",
      "nama": "Test Student",
      "kelas": "XII-A",
      "exam_id": "exam-001",
      "tipe": "Keluar Layar/Ganti Tab",
      "user_id": "student-001",
      "waktu": "09/05/2026 10:30"
    }]
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Synced 1 violations",
  "data": [...]
}
```

### Check Table Data

1. Buka Supabase Dashboard
2. Pilih **Table Editor**
3. Cari tabel `pelanggaran`
4. Lihat apakah data test sudah masuk

## Step 4: Test di Admin Dashboard

1. Buka admin dashboard: https://examcbt.netlify.app/admin.html
2. Login dengan akun admin
3. Klik tab **Hasil**
4. Lihat section **Log Pelanggaran**
5. Seharusnya data test sudah muncul dengan:
   - ✅ Waktu
   - ✅ Nama (dengan ⚠️ icon, bold red)
   - ✅ Kelas
   - ✅ Ujian
   - ✅ Tipe (badge)

## Step 5: Deploy ke Netlify

```bash
git push origin master
```

Netlify akan auto-deploy. Tunggu sampai build selesai.

## How It Works

```
Student Exam
    ↓
Melanggar (keluar layar, ganti tab, dll)
    ↓
handleCheatDetection() triggered
    ↓
Violation saved to Firebase /pelanggaran (immediate)
    ↓
Edge Function sync-violations called (async)
    ↓
Violation inserted to Supabase pelanggaran table
    ↓
Admin views tab Hasil → Log Pelanggaran
    ↓
Data loaded from Supabase via getAdminLaporanLengkap()
```

## Troubleshooting

### Edge Function returns 401 Unauthorized
- Verify Anon Key is correct
- Check RLS policies are created

### Violations not appearing in admin dashboard
- Check Supabase table `pelanggaran` has data
- Verify Edge Function logs: `supabase functions logs sync-violations`
- Check browser console (F12) for fetch errors

### RLS Policy Error
If you get error "new row violates row-level security policy", run:

```sql
ALTER TABLE pelanggaran DISABLE ROW LEVEL SECURITY;
```

Then re-enable with correct policies.

### Table doesn't exist
Run the SQL setup script again from Step 1.

## Configuration Summary

- **Supabase Project**: dmydinmosdxazypwdbed
- **Supabase URL**: https://dmydinmosdxazypwdbed.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8
- **Edge Function**: sync-violations
- **Table**: pelanggaran
- **Netlify**: examcbt.netlify.app

## Next Steps

1. ✅ Create table `pelanggaran` (Step 1)
2. ✅ Deploy Edge Function (Step 2)
3. ✅ Verify setup (Step 3)
4. ✅ Test admin dashboard (Step 4)
5. ✅ Deploy to Netlify (Step 5)

Done! Violations tracking is now live. 🎉
