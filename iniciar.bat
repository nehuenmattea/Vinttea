@echo off
chcp 65001 > nul
title Vinttea - Control Remoto de Streaming

echo ========================================================
echo          🍿 VINTTEA - CONTROL REMOTO PARA PC 📱          
echo ========================================================
echo.
echo Iniciando el servidor y preparando el entorno...
echo.

:: Verificar que Node.js esté instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

:: Abrir navegador en segundo plano después de 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:9876/test"

:: Iniciar el servidor
node packages/server/dist/index.js

pause
