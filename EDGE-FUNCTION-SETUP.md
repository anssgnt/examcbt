# Edge Function Setup - Sync Violations

## Overview

Edge Function `sync-violations` menyinkronkan data violations dari Firebase ke Supabase secara real-time.

## Setup Steps

### 1. Deploy Edge Function ke Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login ke Supabase
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy sync-violations
```

### 2. Create Supabase Table `pelanggaran`

Di Supabase SQL Editor, jalankan:

```sql
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

-- Create index for faster queries
CREATE INDEX idx_pelanggaran_timestamp ON pelanggaran(timestamp DESC);
CREATE INDEX idx_pelanggaran_exam_id ON pelanggaran(exam_id);
CREATE INDEX idx_pelanggaran_user_id ON pelanggaran(user_id);
```

### 3. Update Configuration in script.js

Replace `YOUR_SUPABASE_URL` dan `YOUR_SUPABASE_ANON_KEY` di `handleCheatDetection()` function:

```javascript
// In script.js, line ~465
const response = await fetch(
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/sync-violations',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
    },
    body: JSON.stringify({ violations: [violationData] })
  }
);
```

Get these values from Supabase:
- **Project URL**: Settings → General → Project URL
- **Anon Key**: Settings → API → Project API keys → anon (public)

### 4. Update public/script.js

Same configuration as above.

### 5. Test Edge Function

```bash
# Test locally
supabase functions serve

# In another terminal, test the function
curl -X POST http://localhost:54321/functions/v1/sync-violations \
  -H "Content-Type: application/json" \
  -d '{
    "violations": [{
      "timestamp": "2026-05-09T10:30:00Z",
      "nama": "John Doe",
      "kelas": "XII-A",
      "exam_id": "exam-001",
      "tipe": "Keluar Layar/Ganti Tab",
      "user_id": "student-001",
      "waktu": "09/05/2026 10:30"
    }]
  }'
```

## How It Works

1. **Student violates rules** → `handleCheatDetection()` triggered
2. **Violation recorded** → Saved to Firebase `/pelanggaran`
3. **Sync to Supabase** → Edge Function called with violation data
4. **Upsert to table** → Violation inserted/updated in `pelanggaran` table
5. **Admin views** → Reads from Supabase via `getAdminLaporanLengkap()`

## Data Flow

```
Student Exam
    ↓
handleCheatDetection()
    ↓
Firebase /pelanggaran (immediate)
    ↓
Edge Function sync-violations (async)
    ↓
Supabase pelanggaran table
    ↓
Admin Dashboard (reads from Supabase)
```

## Troubleshooting

### Edge Function returns 401 Unauthorized
- Check Anon Key is correct
- Verify RLS policies allow inserts

### Violations not appearing in admin dashboard
- Check Supabase table `pelanggaran` has data
- Verify Edge Function logs: `supabase functions logs sync-violations`
- Check browser console for fetch errors

### RLS Policy Error
If you get RLS policy error, update table policy:

```sql
-- Allow anonymous inserts
ALTER TABLE pelanggaran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON pelanggaran
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous reads" ON pelanggaran
  FOR SELECT
  USING (true);
```

## Performance Notes

- Edge Function is **async** - violations sync in background
- Firebase write is **immediate** - no delay for student
- Supabase sync is **fire-and-forget** - errors logged but don't block
- Upsert uses `(user_id, exam_id, timestamp)` to prevent duplicates

## Future Improvements

- [ ] Batch sync violations (collect 10 violations, then sync)
- [ ] Retry logic for failed syncs
- [ ] Webhook to notify admin of violations
- [ ] Real-time subscription to violations table
