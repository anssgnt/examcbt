# Execute SQL setup untuk create pelanggaran table

Write-Host "Creating pelanggaran table in Supabase..." -ForegroundColor Cyan

# Read SQL file
$sqlContent = Get-Content "supabase-setup.sql" -Raw

Write-Host ""
Write-Host "Supabase CLI does not support direct SQL execution via API" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please execute SQL manually:" -ForegroundColor Cyan
Write-Host "1. Go to https://app.supabase.com/project/dmydinmosdxazypwdbed/sql/new"
Write-Host "2. Copy-paste the SQL below:"
Write-Host ""
Write-Host "---SQL START---" -ForegroundColor Green
Write-Host $sqlContent
Write-Host "---SQL END---" -ForegroundColor Green
Write-Host ""
Write-Host "3. Click Run button"
Write-Host ""
Write-Host "After SQL execution, the pelanggaran table will be created with:" -ForegroundColor Green
Write-Host "  - Columns: id, timestamp, nama, kelas, exam_id, tipe, user_id, waktu, created_at"
Write-Host "  - Indexes for fast queries"
Write-Host "  - RLS policies for anonymous access"
Write-Host "  - Permissions for anon role"
