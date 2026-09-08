#!/usr/bin/env pwsh
# setup-postgres.ps1
# Configura PostgreSQL portátil sem necessidade de installer/UAC
# Execute uma vez após baixar o zip

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PG_DIR = Join-Path $SCRIPT_DIR "pgsql"
$DATA_DIR = Join-Path $SCRIPT_DIR "pgdata"
$LOG_FILE = Join-Path $SCRIPT_DIR "postgres.log"
$PG_BIN = Join-Path $PG_DIR "bin"
$PSQL = Join-Path $PG_BIN "psql.exe"
$INITDB = Join-Path $PG_BIN "initdb.exe"
$PG_CTL = Join-Path $PG_BIN "pg_ctl.exe"

Write-Host "=== Configurando PostgreSQL portátil ===" -ForegroundColor Cyan

# 1. Extrair zip se pgsql não existe
$ZIP_FILE = Join-Path $SCRIPT_DIR "postgres-portable.zip"
if (-not (Test-Path $PG_DIR)) {
    if (Test-Path $ZIP_FILE) {
        Write-Host "Extraindo PostgreSQL..." -ForegroundColor Yellow
        Expand-Archive -Path $ZIP_FILE -DestinationPath $SCRIPT_DIR -Force
        Write-Host "Extraído em: $PG_DIR" -ForegroundColor Green
    } else {
        Write-Error "Arquivo não encontrado: $ZIP_FILE"
        exit 1
    }
}

# 2. Inicializar cluster (só na primeira vez)
if (-not (Test-Path $DATA_DIR)) {
    Write-Host "Inicializando cluster PostgreSQL..." -ForegroundColor Yellow
    & $INITDB -D $DATA_DIR -U postgres -E UTF8 --locale=pt_BR.UTF-8 -A md5 --pwprompt
    if ($LASTEXITCODE -ne 0) {
        # Se locale pt_BR não disponível, usar C
        & $INITDB -D $DATA_DIR -U postgres -E UTF8 --locale=C -A md5 --pwprompt
    }
    Write-Host "Cluster inicializado!" -ForegroundColor Green
} else {
    Write-Host "Cluster já existe em: $DATA_DIR" -ForegroundColor Green
}

Write-Host "`nConfigurações:" -ForegroundColor Cyan
Write-Host "  PG_BIN:   $PG_BIN"
Write-Host "  DATA_DIR: $DATA_DIR"
Write-Host "  LOG:      $LOG_FILE"
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Yellow
Write-Host "  Iniciar:  .\start-postgres.ps1"
Write-Host "  Parar:    .\stop-postgres.ps1"
Write-Host "  psql:     $PSQL -U postgres -h localhost"
