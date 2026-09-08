#!/usr/bin/env pwsh
# start-postgres.ps1 — Inicia o PostgreSQL portátil

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PG_BIN = Join-Path $SCRIPT_DIR "pgsql\bin"
$DATA_DIR = Join-Path $SCRIPT_DIR "pgdata"
$LOG_FILE = Join-Path $SCRIPT_DIR "postgres.log"
$PG_CTL = Join-Path $PG_BIN "pg_ctl.exe"

if (-not (Test-Path $DATA_DIR)) {
    Write-Error "Banco não inicializado. Execute setup-postgres.ps1 primeiro."
    exit 1
}

Write-Host "Iniciando PostgreSQL..." -ForegroundColor Yellow
& $PG_CTL start -D $DATA_DIR -l $LOG_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL iniciado! Porta: 5432" -ForegroundColor Green
    Write-Host "Log: $LOG_FILE"
} else {
    Write-Host "Verifique o log: $LOG_FILE" -ForegroundColor Red
}
