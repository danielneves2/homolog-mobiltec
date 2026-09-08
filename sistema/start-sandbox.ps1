#!/usr/bin/env pwsh
# start-sandbox.ps1 — Sobe o ambiente de Sandbox com isolamento total de dados

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$ENV_FILE = Join-Path $SCRIPT_DIR ".env.sandbox"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Ambiente de Sandbox (Homologação Mobiltec)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Verificar se o arquivo .env.sandbox existe
if (!(Test-Path $ENV_FILE)) {
    Write-Host "`n[ERRO] Arquivo .env.sandbox não encontrado!" -ForegroundColor Red
    Write-Host "  Copie .env.sandbox.example para .env.sandbox e preencha suas credenciais:" -ForegroundColor Yellow
    Write-Host "    cp $SCRIPT_DIR/.env.sandbox.example $ENV_FILE" -ForegroundColor Yellow
    exit 1
}

# Carregar variáveis do .env.sandbox
$envVars = @{}
Get-Content $ENV_FILE | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith('#')) {
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $envVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
}

$pgUser = $envVars['POSTGRES_USER'] ?? 'homolog_sandbox'
$pgPassword = $envVars['POSTGRES_PASSWORD'] ?? ''
$pgDb = $envVars['POSTGRES_DB'] ?? 'homologacao_sandbox'

if (!$pgPassword -or $pgPassword -eq '<ALTERE_AQUI_COM_UMA_SENHA_SEGURA>') {
    Write-Host "`n[ERRO] POSTGRES_PASSWORD não configurado no .env.sandbox!" -ForegroundColor Red
    Write-Host "  Edite o arquivo $ENV_FILE e defina uma senha segura." -ForegroundColor Yellow
    exit 1
}

# 1. Sobe container Postgres do Sandbox na porta 5433
Write-Host "`n[1/3] Subindo PostgreSQL isolado do Sandbox (porta 5433)..." -ForegroundColor Yellow
docker compose -f "$SCRIPT_DIR/docker-compose.sandbox.yml" up -d

# 2. Configura variáveis de ambiente isoladas
$env:DATABASE_URL = "postgresql://${pgUser}:${pgPassword}@localhost:5433/${pgDb}"
$env:PORT = "3002"
$env:NODE_ENV = "test"
$env:UPLOAD_DIR = "./uploads-sandbox"
$env:VITE_AMBIENTE = "sandbox"

Write-Host "`n[2/3] Variáveis de ambiente configuradas para Sandbox:" -ForegroundColor Green
Write-Host "  - DATABASE_URL: postgresql://${pgUser}:****@localhost:5433/${pgDb}"
Write-Host "  - Backend Port: 3002"
Write-Host "  - Uploads: ./uploads-sandbox"
Write-Host "  - Flag visual: VITE_AMBIENTE=sandbox"

Write-Host "`n[3/3] Para rodar as migrations e o backend do Sandbox:" -ForegroundColor Yellow
Write-Host "  cd backend"
Write-Host "  npx prisma db push"
Write-Host "  npx prisma db seed"
Write-Host "  npm run dev"

Write-Host "`nPara iniciar o frontend em modo Sandbox:" -ForegroundColor Yellow
Write-Host "  cd ../frontend"
Write-Host "  `$env:VITE_AMBIENTE='sandbox'"
Write-Host "  npm run dev"
