# Setup Violations Tracking - Windows PowerShell Script
# This script will:
# 1. Create pelanggaran table in Supabase
# 2. Deploy Edge Function
# 3. Test the setup

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Violations Tracking Setup..." -ForegroundColor Green

# Configuration
$SUPABASE_URL = "https://dmydinmosdxazypwdbed.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteWRpbm1vc2R4YXp5cGR3YmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTIxNjMsImV4cCI6MjA5MzcyODE2M30.mKY-dQDf3_1_GjNOtCYfsXF0o6qazPpq2ncuvfuGfu8"
$PROJECT_REF = "dmydinmosdxazypwdbed"

Write-Host "📋 Configuration:" -ForegroundColor Cyan
Write-Host "  Project: $PROJECT_REF"
Write-Host "  URL: $SUPABASE_URL"

# Step 1: Check if Supabase CLI is installed
Write-Host ""
Write-Host "📦 Checking Supabase CLI..." -ForegroundColor Cyan
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

# Step 2: Link project
Write-Host ""
Write-Host "🔗 Linking Supabase project..." -ForegroundColor Cyan
try {
    supabase link --project-ref $PROJECT_REF
    Write-Host "✅ Project linked" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Project already linked or error occurred" -ForegroundColor Yellow
}

# Step 3: Deploy Edge Function
Write-Host ""
Write-Host "🚀 Deploying Edge Function sync-violations..." -ForegroundColor Cyan
try {
    supabase functions deploy sync-violations
    Write-Host "✅ Edge Function deployed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to deploy Edge Function" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Step 4: Create table via SQL
Write-Host ""
Write-Host "📊 Creating pelanggaran table..." -ForegroundColor Cyan
Write-Host "Note: You need to run the SQL manually in Supabase Dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://app.supabase.com"
Write-Host "2. Select project: dmydinmosdxazypwdbed"
Write-Host "3. SQL Editor → New Query"
Write-Host "4. Copy-paste content from supabase-setup.sql"
Write-Host "5. Click Run"

# Step 5: Test Edge Function
Write-Host ""
Write-Host "🧪 Testing Edge Function..." -ForegroundColor Cyan
Write-Host "Sending test violation..."

$testData = @{
    violations = @(
        @{
            timestamp = "2026-05-09T10:30:00Z"
            nama = "Test Student"
            kelas = "XII-A"
            exam_id = "exam-test-001"
            tipe = "Keluar Layar/Ganti Tab"
            user_id = "student-test-001"
            waktu = "09/05/2026 10:30"
        }
    )
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/functions/v1/sync-violations" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        } `
        -Body $testData

    Write-Host "Response: $($response.Content)" -ForegroundColor Green
    
    if ($response.Content -match "success") {
        Write-Host "✅ Edge Function is working!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Edge Function responded but check the output" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Edge Function test failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Check logs: supabase functions logs sync-violations"
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create pelanggaran table (see instructions above)"
Write-Host "2. Test in admin dashboard: https://examcbt.netlify.app/admin.html"
Write-Host "3. Go to tab Hasil → Log Pelanggaran"
