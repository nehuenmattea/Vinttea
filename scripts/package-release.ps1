# Script para empaquetar una Release de Vinttea lista para GitHub
param(
    [string]$Version = ""
)

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location $root

# Read version from package.json if not specified
if ([string]::IsNullOrEmpty($Version)) {
    $pkgJson = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
    $Version = $pkgJson.version
}

Write-Host "========================================="
Write-Host "  Empaquetando Vinttea Release v$Version"
Write-Host "========================================="

# 1. Compilar paquetes de TypeScript / Vite / WXT
Write-Host "[1/4] Compilando paquetes de Vinttea..."
$hasPnpm = (Get-Command pnpm -ErrorAction SilentlyContinue) -ne $null
if ($hasPnpm) {
    pnpm -r run build
} else {
    npx pnpm -r run build
}

# 2. Generar Icono y compilar Vinttea.exe
Write-Host "[2/4] Generando icono y compilando Vinttea.exe..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts\generate-icon.ps1")
& powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts\build-launcher.ps1")

# 3. Preparar carpeta temporal para release
Write-Host "[3/4] Preparando estructura de archivos..."
$distDir = Join-Path $root "dist-release"
$stageDir = Join-Path $distDir "Vinttea"

if (Test-Path $distDir) {
    Remove-Item $distDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

# Copiar archivos raíz
$rootFiles = @(
    "Vinttea.exe",
    "Vinttea.ico",
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "LICENSE",
    "README.md"
)
foreach ($f in $rootFiles) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $stageDir -Force
    }
}

# Copiar paquetes compilados
$pkgFolders = @(
    @{ Src = "packages\server\dist"; Dest = "packages\server\dist" },
    @{ Src = "packages\server\package.json"; Dest = "packages\server\package.json" },
    @{ Src = "packages\remote\dist"; Dest = "packages\remote\dist" },
    @{ Src = "packages\remote\package.json"; Dest = "packages\remote\package.json" },
    @{ Src = "packages\shared\dist"; Dest = "packages\shared\dist" },
    @{ Src = "packages\shared\package.json"; Dest = "packages\shared\package.json" },
    @{ Src = "packages\extension\.output\chrome-mv3"; Dest = "packages\extension\.output\chrome-mv3" },
    @{ Src = "packages\extension\package.json"; Dest = "packages\extension\package.json" },
    @{ Src = "packages\launcher"; Dest = "packages\launcher" },
    @{ Src = "scripts"; Dest = "scripts" }
)

foreach ($item in $pkgFolders) {
    $srcPath = Join-Path $root $item.Src
    $destPath = Join-Path $stageDir $item.Dest
    if (Test-Path $srcPath) {
        $destParent = Split-Path $destPath -Parent
        if (-not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }
        Copy-Item -Path $srcPath -Destination $destPath -Recurse -Force
    }
}

# 4. Crear archivo ZIP
$zipName = "Vinttea-v$Version-Windows.zip"
$zipPath = Join-Path $distDir $zipName
Write-Host "[4/4] Comprimiendo en $zipName..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $zipPath)

$zipBytes = (Get-Item $zipPath).Length
$zipMb = [Math]::Round(($zipBytes / (1024 * 1024)), 2)
Write-Host ""
Write-Host "========================================="
Write-Host "Release empaquetada con exito!"
Write-Host "Archivo: $zipPath ($zipMb Megabytes)"
Write-Host "Listo para subir a GitHub Releases."
Write-Host "========================================="
