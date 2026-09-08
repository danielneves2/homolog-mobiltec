#!/usr/bin/env pwsh
# start-sandbox.ps1 — Sobe o ambiente de Sandbox com isolamento total de dados

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Ambiente de Sandbox (Homologação Mobiltec)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Sobe container Postgres do Sandbox na porta 5433
Write-Host "`n[1/3] Subindo PostgreSQL isolado do Sandbox (porta 5433)..." -ForegroundColor Yellow
docker compose -f "$SCRIPT_DIR/docker-compose.sandbox.yml" up -d

# 2. Configura variáveis de ambiente isoladas
$env:DATABASE_URL = "postgresql://homolog_sandbox:sandbox_secret_123@localhost:5433/homologacao_sandbox"
$env:PORT = "3002"
$env:NODE_ENV = "test"
$env:UPLOAD_DIR = "./uploads-sandbox"
$env:VITE_AMBIENTE = "sandbox"

Write-Host "`n[2/3] Variáveis de ambiente configuradas para Sandbox:" -ForegroundColor Green
Write-Host "  - DATABASE_URL: $env:DATABASE_URL"
Write-Host "  - Backend Port: 3002"
Write-Host "  - Uploads: ./uploads-sandbox"
Write-Host "  - Flag visual: VITE_AMBIENTE=sandbox"

Write-Host "`n[3/3] Para rodar as migrations e o backend do Sandbox:" -ForegroundColor Yellow
Write-Host "  cd backend"
Write-Host "  `$env:DATABASE_URL='$env:DATABASE_URL'"
Write-Host "  npx prisma db push"
Write-Host "  npx prisma db seed"
Write-Host "  `$env:PORT='3002'"
Write-Host "  npm run dev"

Write-Host "`nPara iniciar o frontend em modo Sandbox:" -ForegroundColor Yellow
Write-Host "  cd ../frontend"
Write-Host "  `$env:VITE_AMBIENTE='sandbox'"
Write-Host "  npm run dev"
