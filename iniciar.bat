@echo off
chcp 65001 > nul
cd /d "%~dp0"
title Vinttea - Control Remoto para PC

echo ========================================================
echo          🍿 VINTTEA - CONTROL REMOTO PARA PC 📱          
echo ========================================================
echo.

:: Verificar que Node.js esté instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado o no se encuentra en el PATH.
    echo Por favor descarga e instala Node.js desde https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Verificar si el servidor está compilado
if not exist "packages\server\dist\index.js" (
    echo [INFO] Compilando paquetes de Vinttea por primera vez...
    where pnpm >nul 2>nul
    if %errorlevel% equ 0 (
        call pnpm -r run build
    ) else (
        call npx pnpm -r run build
    )
    if %errorlevel% neq 0 (
        echo [ERROR] Hubo un problema al compilar los paquetes.
        pause
        exit /b 1
    )
)

echo Iniciando servidor Vinttea...
echo.

:: Abrir navegador en segundo plano después de 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:9876"

:: Iniciar el servidor Fastify + WebSockets
node packages\server\dist\index.js

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El servidor se ha detenido con código de error.
    pause
)
