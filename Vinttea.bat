@echo off
chcp 65001 > nul
cd /d "%~dp0"
title Vinttea - Control Remoto para PC

echo ========================================================
echo          🍿 VINTTEA - CONTROL REMOTO PARA PC 📱          
echo ========================================================
echo.

:: 1. Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ========================================================
    echo   [!] Node.js no está instalado en tu computadora.
    echo   Vinttea necesita Node.js para poder funcionar.
    echo ========================================================
    echo.
    set /p INSTALAR="¿Deseas descargar e instalar Node.js automáticamente ahora? (S/N): "
    if /i "%INSTALAR%"=="S" (
        echo.
        echo [1/2] Intentando instalar Node.js LTS con Windows Package Manager (winget)...
        where winget >nul 2>nul
        if %errorlevel% equ 0 (
            winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            if %errorlevel% equ 0 (
                echo.
                echo [✔] Node.js se instaló con éxito.
                echo Por favor cierra y vuelve a abrir Vinttea.bat para continuar.
                echo.
                pause
                exit /b 0
            )
        )
        echo.
        echo [INFO] Abriendo la página oficial de descarga de Node.js en tu navegador...
        start https://nodejs.org/en/download
        echo Por favor instala el archivo descargado y luego vuelve a abrir Vinttea.bat.
        echo.
        pause
        exit /b 1
    ) else (
        echo.
        echo Para usar Vinttea debes tener Node.js instalado.
        echo Puedes descargarlo gratis cuando quieras en: https://nodejs.org
        echo.
        pause
        exit /b 1
    )
)

:: 2. Verificar si el servidor ya está compilado
if not exist "packages\server\dist\index.js" (
    echo.
    echo [INFO] Compilando paquetes de Vinttea por primera vez...
    echo Esto solo tardará unos segundos.
    echo.
    where pnpm >nul 2>nul
    if %errorlevel% equ 0 (
        call pnpm -r run build
    ) else (
        call npx pnpm -r run build
    )
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Hubo un problema al compilar los paquetes de Vinttea.
        echo Verifica tu conexión a internet o ejecuta: npm run build
        echo.
        pause
        exit /b 1
    )
)

echo Iniciando servidor Vinttea...
echo.

:: 3. Abrir la interfaz web en el navegador automáticamente después de 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:9876"

:: 4. Ejecutar el servidor Fastify + WebSockets
node packages\server\dist\index.js

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El servidor se ha detenido con código de error.
    pause
)
