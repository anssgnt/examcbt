#!/bin/bash

# Setup Violations Tracking - Automated Script
# This script will:
# 1. Create pelanggaran table in Supabase
# 2. Deploy Edge Function
# 3. Test the setup

set -e

echo "🚀 Starting Violations Tracking Setup..."

# Configuration
SUPABASE_URL="https://dmydinmosdxazypwdbed.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8"
PROJECT_REF="dmydinmosdxazypwdbed"

echo "📋 Configuration:"
echo "  Project: $PROJECT_REF"
echo "  URL: $SUPABASE_URL"

# Step 1: Check if Supabase CLI is installed
echo ""
echo "📦 Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi
echo "✅ Supabase CLI found"

# Step 2: Link project
echo ""
echo "🔗 Linking Supabase project..."
supabase link --project-ref $PROJECT_REF || echo "⚠️  Project already linked"

# Step 3: Deploy Edge Function
echo ""
echo "🚀 Deploying Edge Function sync-violations..."
supabase functions deploy sync-violations

# Step 4: Create table via SQL
echo ""
echo "📊 Creating pelanggaran table..."
echo "Note: You need to run the SQL manually in Supabase Dashboard"
echo "SQL file: supabase-setup.sql"
echo ""
echo "Steps:"
echo "1. Go to https://app.supabase.com"
echo "2. Select project: dmydinmosdxazypwdbed"
echo "3. SQL Editor → New Query"
echo "4. Copy-paste content from supabase-setup.sql"
echo "5. Click Run"

# Step 5: Test Edge Function
echo ""
echo "🧪 Testing Edge Function..."
echo "Sending test violation..."

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/sync-violations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
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
  }')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ Edge Function is working!"
else
    echo "❌ Edge Function test failed"
    echo "Check logs: supabase functions logs sync-violations"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create pelanggaran table (see instructions above)"
echo "2. Test in admin dashboard: https://examcbt.netlify.app/admin.html"
echo "3. Go to tab Hasil → Log Pelanggaran"
