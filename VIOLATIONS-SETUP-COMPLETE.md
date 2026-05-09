# Violations Tracking Setup - Complete Status

## ✅ Completed Steps

### 1. Edge Function Deployed ✅
- **Status**: Successfully deployed to Supabase
- **Function**: `sync-violations`
- **URL**: `https://dmydinmosdxazypwdbed.supabase.co/functions/v1/sync-violations`
- **Deployment**: `supabase functions deploy sync-violations`

### 2. Code Updated ✅
- **script.js**: Updated with Supabase credentials and sync logic
- **public/script.js**: Same updates
- **supabase-patch.js**: Updated to include `kelas` field
- **admin-core.js**: Display logic with styling
- **admin.html**: Table header updated

### 3. SQL Setup Ready ✅
- **File**: `supabase-setup.sql`
- **Table**: `pelanggaran`
- **Columns**: id, timestamp, nama, kelas, exam_id, tipe, user_id, waktu, created_at
- **Indexes**: timestamp, exam_id, user_id
- **RLS**: Enabled with anonymous insert/read policies
- **Permissions**: Granted to anon role

## 📋 Manual Step Required

### Create Table in Supabase

1. **Open Supabase Dashboard**
   - URL: https://app.supabase.com
   - Project: dmydinmosdxazypwdbed

2. **Go to SQL Editor**
   - Click: SQL Editor → New Query

3. **Copy SQL**
   - Copy all SQL from `supabase-setup.sql`
   - Or use the SQL below:

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

4. **Execute**
   - Click: Run (or Ctrl+Enter)
   - Wait for success message

5. **Verify**
   - Go to Table Editor
   - Look for `pelanggaran` table
   - Should see columns: id, timestamp, nama, kelas, exam_id, tipe, user_id, waktu, created_at

## 🧪 Testing

### Test 1: Edge Function
```bash
curl -X POST https://dmydinmosdxazypwdbed.supabase.co/functions/v1/sync-violations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8" \
  -d '{
    "violations": [{
      "timestamp": "2026-05-09T10:30:00Z",
      "nama": "Test Student",
      "kelas": "XII-A",
      "exam_id": "exam-test-001",
      "tipe": "Keluar Layar/Ganti Tab",
      "user_id": "student-test-001",
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

### Test 2: Admin Dashboard
1. Open: https://examcbt.netlify.app/admin.html
2. Login with admin account
3. Click tab: **Hasil**
4. Look for section: **Log Pelanggaran**
5. Should see test violation with:
   - ✅ Waktu (timestamp)
   - ✅ Nama (student name with ⚠️ icon, bold red)
   - ✅ Kelas (student class)
   - ✅ Ujian (exam name)
   - ✅ Tipe (violation type badge)

## 🔄 How It Works

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

## 📊 Data Flow

1. **Student violates** → `handleCheatDetection()` triggered
2. **Firebase write** → Saved to `/pelanggaran` (immediate, no delay)
3. **Supabase sync** → Edge Function called with violation data (async)
4. **Table insert** → Upserted to `pelanggaran` table
5. **Admin reads** → Fetches from Supabase via `getAdminLaporanLengkap()`
6. **Display** → Shows in admin dashboard with styling

## ⚙️ Configuration

- **Supabase Project**: dmydinmosdxazypwdbed
- **Supabase URL**: https://dmydinmosdxazypwdbed.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8
- **Edge Function**: sync-violations
- **Table**: pelanggaran
- **Netlify**: examcbt.netlify.app

## 🚀 Deployment Status

- ✅ Code committed to GitHub
- ✅ Auto-deployed to Netlify
- ✅ Edge Function deployed to Supabase
- ⏳ Waiting for table creation (manual SQL execution)

## ✅ Checklist

- [x] Edge Function code created
- [x] Edge Function deployed
- [x] script.js updated with Supabase credentials
- [x] admin-core.js display logic updated
- [x] admin.html table header updated
- [x] SQL setup script created
- [x] Documentation created
- [ ] **TODO**: Create table `pelanggaran` in Supabase (manual SQL execution)
- [ ] **TODO**: Test Edge Function
- [ ] **TODO**: Test admin dashboard

## 🎯 Next Steps

1. **Execute SQL** in Supabase Dashboard (see instructions above)
2. **Test Edge Function** (see testing section)
3. **Test Admin Dashboard** (see testing section)
4. **Monitor** violations in real-time

## 📞 Troubleshooting

### Edge Function returns 401 Unauthorized
- Verify Anon Key is correct
- Check RLS policies are created

### Violations not appearing in admin dashboard
- Check Supabase table `pelanggaran` has data
- Verify Edge Function logs: `supabase functions logs sync-violations`
- Check browser console (F12) for fetch errors

### RLS Policy Error
If you get error "new row violates row-level security policy":
```sql
ALTER TABLE pelanggaran DISABLE ROW LEVEL SECURITY;
```

Then re-enable with correct policies.

### Table doesn't exist
Run the SQL setup script again.

## 📝 Files

- `supabase/functions/sync-violations/index.ts` - Edge Function code
- `supabase-setup.sql` - SQL for table creation
- `SETUP-VIOLATIONS-TRACKING.md` - Setup guide
- `EDGE-FUNCTION-SETUP.md` - Edge Function details
- `script.js` - Updated with sync logic
- `admin-core.js` - Display logic
- `admin.html` - Table header

---

**Status**: Ready for table creation and testing ✅
**Last Updated**: May 9, 2026
