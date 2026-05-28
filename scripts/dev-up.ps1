# dev-up.ps1 — sobe stack PulsePass completo pra testar localmente
# Abre 5 janelas do Windows Terminal (ou PowerShell) com cada processo.
# Pré-requisito: Docker Desktop rodando + Postgres + Redis healthy.
#
# Uso:
#   .\scripts\dev-up.ps1              # sobe tudo
#   .\scripts\dev-up.ps1 -SkipSeed    # sem aplicar migrations/seed
#   .\scripts\dev-up.ps1 -SkipMobile  # sem subir Metro/Expo

param(
  [switch]$SkipSeed,
  [switch]$SkipMobile
)

$ErrorActionPreference = 'Stop'
$repo = "C:\Users\erick\ticket-real"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ticketeria?schema=public"

Write-Host "`n🚀 PulsePass dev stack up`n" -ForegroundColor Cyan

# ============================================================
# 1. Sanity check — Docker + containers
# ============================================================
Write-Host "1/6 → Verificando Docker + Postgres + Redis..." -ForegroundColor Yellow
$dockerPing = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Docker Desktop não está rodando. Abra o Docker Desktop e tente de novo." -ForegroundColor Red
  exit 1
}
$pg = docker ps --filter "name=ticketeria-postgres" --format "{{.Names}}"
$rd = docker ps --filter "name=ticketeria-redis" --format "{{.Names}}"
if (-not $pg -or -not $rd) {
  Write-Host "  → Subindo postgres + redis via docker-compose..." -ForegroundColor Yellow
  Push-Location $repo
  docker-compose up -d postgres redis
  Pop-Location
  Start-Sleep -Seconds 5
}
Write-Host "✅ Containers OK`n" -ForegroundColor Green

# ============================================================
# 2. Migrations + seed
# ============================================================
if (-not $SkipSeed) {
  Write-Host "2/6 → Aplicando migrations + seed..." -ForegroundColor Yellow
  Push-Location "$repo\ticketeria-api"
  npm run db:generate
  npm run db:migrate
  npx tsx prisma/seed.ts
  Pop-Location
  Write-Host "✅ DB pronto`n" -ForegroundColor Green
} else {
  Write-Host "2/6 → Pulado seed (--SkipSeed)`n" -ForegroundColor DarkGray
}

# ============================================================
# 3-6. Abrir 4 terminais (5 se mobile)
# ============================================================
function Start-WT {
  param([string]$title, [string]$cwd, [string]$cmd)
  # Tenta Windows Terminal primeiro, fallback pra PowerShell
  $wt = Get-Command wt -ErrorAction SilentlyContinue
  if ($wt) {
    Start-Process wt -ArgumentList "new-tab", "--title", "`"$title`"", "-d", "`"$cwd`"", "powershell", "-NoExit", "-Command", $cmd
  } else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$cwd'; Write-Host '== $title ==' -ForegroundColor Cyan; $cmd"
  }
  Start-Sleep -Milliseconds 800
}

Write-Host "3/6 → API (porta 3333)..." -ForegroundColor Yellow
Start-WT "API" "$repo\ticketeria-api" "npm run dev"

Write-Host "4/6 → Worker BullMQ..." -ForegroundColor Yellow
Start-WT "Worker" "$repo\ticketeria-api" "npm run dev:worker"

Write-Host "5/6 → Web (porta 5173)..." -ForegroundColor Yellow
Start-WT "Web" "$repo\ticketeria-web" "npm run dev"

Write-Host "6/6 → Admin SPA (porta 5174)..." -ForegroundColor Yellow
Start-WT "Admin" "$repo\ticketeria-admin" "npm run dev"

if (-not $SkipMobile) {
  Write-Host "7/6 → Mobile (Expo Metro)..." -ForegroundColor Yellow
  Start-WT "Mobile" "$repo\ticketeria-mobile" "npm start"
} else {
  Write-Host "7/6 → Pulado mobile (--SkipMobile)" -ForegroundColor DarkGray
}

Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  PulsePass dev stack UP" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Health check:  http://localhost:3333/health" -ForegroundColor White
Write-Host "  Web:           http://localhost:5173" -ForegroundColor White
Write-Host "  Admin:         http://localhost:5174" -ForegroundColor White
if (-not $SkipMobile) {
  Write-Host "  Mobile:        scaneie o QR do Expo Metro na janela 'Mobile'" -ForegroundColor White
}
Write-Host ""
Write-Host "  Credenciais (impressas pelo seed acima)" -ForegroundColor White
Write-Host "    admin@pulsepass.com.br / Admin@123456" -ForegroundColor White
Write-Host "    produtor@example.com    / Producer@123456" -ForegroundColor White
Write-Host "    usuario@example.com     / Consumer@123456" -ForegroundColor White
Write-Host ""
Write-Host "  Pra parar: fecha as janelas de terminal abertas" -ForegroundColor DarkGray
Write-Host ""
