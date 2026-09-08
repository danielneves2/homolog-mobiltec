#!/usr/bin/env pwsh
# init-db.ps1 — Cria o banco 'homologacao' e o usuário 'homolog'
# Execute após start-postgres.ps1

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PG_BIN = Join-Path $SCRIPT_DIR "pgsql\bin"
$PSQL = Join-Path $PG_BIN "psql.exe"

Write-Host "Criando banco e usuário..." -ForegroundColor Yellow

$sql = @"
CREATE USER homolog WITH PASSWORD 'homolog_secret';
CREATE DATABASE homologacao OWNER homolog ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE homologacao TO homolog;
"@

$sql | & $PSQL -U postgres -h localhost -p 5432

Write-Host "Banco 'homologacao' criado com usuário 'homolog'!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "  cd backend"
Write-Host "  npx prisma migrate dev --name init"
Write-Host "  npx prisma db seed"
