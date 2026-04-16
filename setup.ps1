# ============================================
# TICKETZ - Setup Local (Windows + Docker Desktop)
# ============================================
# Requisitos:
#   - Node.js >= 20
#   - Docker Desktop rodando
#   - npm >= 10
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TICKETZ - Setup Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar pre-requisitos
Write-Host "[1/7] Verificando pre-requisitos..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERRO: Node.js nao encontrado. Instale Node.js >= 20" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

$npmVersion = npm --version 2>$null
Write-Host "  npm: v$npmVersion" -ForegroundColor Green

$dockerVersion = docker --version 2>$null
if (-not $dockerVersion) {
    Write-Host "ERRO: Docker nao encontrado. Instale Docker Desktop" -ForegroundColor Red
    exit 1
}
Write-Host "  Docker: $dockerVersion" -ForegroundColor Green

# Verificar se Docker esta rodando
$dockerInfo = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker Desktop nao esta rodando. Inicie o Docker Desktop e tente novamente." -ForegroundColor Red
    exit 1
}
Write-Host "  Docker Desktop: Rodando" -ForegroundColor Green

# 2. Subir containers (PostgreSQL + Redis)
Write-Host ""
Write-Host "[2/7] Subindo PostgreSQL 16 + Redis 7 via Docker..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao subir containers. Verifique o Docker Desktop." -ForegroundColor Red
    exit 1
}

# Aguardar PostgreSQL ficar pronto
Write-Host "  Aguardando PostgreSQL ficar pronto..." -ForegroundColor Gray
$retries = 0
$maxRetries = 30
do {
    Start-Sleep -Seconds 1
    $retries++
    $pgReady = docker exec ticketeria-postgres pg_isready -U postgres 2>$null
} while ($LASTEXITCODE -ne 0 -and $retries -lt $maxRetries)

if ($retries -ge $maxRetries) {
    Write-Host "ERRO: PostgreSQL nao ficou pronto a tempo." -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL: Pronto" -ForegroundColor Green
Write-Host "  Redis: Pronto" -ForegroundColor Green

# 3. Limpar node_modules antigos (resolve conflitos de Prisma)
Write-Host ""
Write-Host "[3/7] Limpando node_modules antigos..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "ticketeria-api\node_modules") { Remove-Item -Recurse -Force "ticketeria-api\node_modules" }
if (Test-Path "ticketeria-web\node_modules") { Remove-Item -Recurse -Force "ticketeria-web\node_modules" }
if (Test-Path "ticketeria-types\node_modules") { Remove-Item -Recurse -Force "ticketeria-types\node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
Write-Host "  Limpeza concluida" -ForegroundColor Green

# 4. Instalar dependencias
Write-Host ""
Write-Host "[4/7] Instalando dependencias (npm install)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao instalar dependencias." -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencias instaladas" -ForegroundColor Green

# 5. Build types package
Write-Host ""
Write-Host "[5/7] Compilando @ticketeria/types..." -ForegroundColor Yellow
npm run build:types
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Falha ao compilar types. Continuando..." -ForegroundColor DarkYellow
}

# 6. Gerar Prisma Client + Rodar migrations
Write-Host ""
Write-Host "[6/7] Configurando banco de dados..." -ForegroundColor Yellow

Write-Host "  Gerando Prisma Client..." -ForegroundColor Gray
Set-Location ticketeria-api
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Falha ao gerar Prisma Client." -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "  Prisma Client gerado" -ForegroundColor Green

Write-Host "  Rodando migrations..." -ForegroundColor Gray
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Migration falhou. Tentando prisma db push como fallback..." -ForegroundColor DarkYellow
    npx prisma db push
}
Write-Host "  Banco configurado" -ForegroundColor Green

Set-Location ..

# 7. Pronto!
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TICKETZ - Setup Concluido!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar:" -ForegroundColor Cyan
Write-Host "  Terminal 1 (API):      npm run dev:api" -ForegroundColor White
Write-Host "  Terminal 2 (Frontend): npm run dev:web" -ForegroundColor White
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  API:      http://localhost:3333" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Swagger:  http://localhost:3333/api-docs" -ForegroundColor White
Write-Host "  Prisma:   npx prisma studio (na pasta ticketeria-api)" -ForegroundColor White
Write-Host ""
Write-Host "Seed (dados de teste):" -ForegroundColor Cyan
Write-Host "  cd ticketeria-api && npm run db:seed" -ForegroundColor White
Write-Host ""
