# ============================================
# Deploy all Supabase Edge Functions (CBTMO)
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\deploy-supabase-functions.ps1
# Optional:
#   powershell -ExecutionPolicy Bypass -File .\deploy-supabase-functions.ps1 -ProjectRef "your_project_ref"
# ============================================

param(
  [string]$ProjectRef = "dmydinmosdxazypdwbed"
)

$ErrorActionPreference = "Stop"

Write-Host "== Supabase Functions Deploy ==" -ForegroundColor Cyan
Write-Host "Project Ref: $ProjectRef" -ForegroundColor DarkCyan
Write-Host "Working Dir: $(Get-Location)" -ForegroundColor DarkCyan

function Assert-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Command '$name' tidak ditemukan. Install dulu lalu ulangi."
  }
}

Assert-Command "supabase"

Write-Host "`n[1/3] Link project..." -ForegroundColor Yellow
supabase link --project-ref $ProjectRef

$functions = @(
  "submit_exam",
  "sync_answer_delta",
  "set_student_online",
  "set_status_sync",
  "admin_jadwal",
  "admin_config",
  "admin_peserta",
  "admin_banksoal"
)

Write-Host "`n[2/3] Deploy functions..." -ForegroundColor Yellow
foreach ($fn in $functions) {
  Write-Host "-> Deploy $fn" -ForegroundColor Green
  supabase functions deploy $fn --no-verify-jwt
}

Write-Host "`n[3/3] Verify deployed functions..." -ForegroundColor Yellow
supabase functions list

Write-Host "`nSelesai. Semua function sudah dicoba deploy." -ForegroundColor Cyan
