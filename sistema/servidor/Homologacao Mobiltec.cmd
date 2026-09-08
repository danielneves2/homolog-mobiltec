@echo off
chcp 65001 >nul
title Homologacao Mobiltec - servidor
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Iniciar.ps1"
if errorlevel 1 (
  echo.
  echo   O servidor terminou com erro. Registros em: %~dp0logs
  pause
)
