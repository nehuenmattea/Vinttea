# Script para empaquetar una Release de Vinttea lista para GitHub
param(
    [string]$Version = "",
    [string]$OutputDirectory = "",
    [switch]$SkipBuild
)

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location $root

# Read version from package.json if not specified
if ([string]::IsNullOrEmpty($Version)) {
    if ($env:GITHUB_REF_TYPE -eq "tag" -and $env:GITHUB_REF_NAME -match "^v?(\d+\.\d+\.\d+)$") {
        $Version = $Matches[1]
    } else {
        $pkgJson = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
        $Version = $pkgJson.version
    }
}

$Version = $Version -replace "^[vV]", ""
if ($Version -notmatch "^\d+\.\d+\.\d+$") {
    throw "La versión '$Version' no tiene formato SemVer X.Y.Z."
}

Write-Host "========================================="
Write-Host "  Empaquetando Vinttea Release v$Version"
Write-Host "========================================="

# 1. Compilar paquetes de TypeScript / Vite / WXT
if ($SkipBuild) {
    Write-Host "[1/4] Usando paquetes ya compilados por el workflow..."
} else {
    Write-Host "[1/4] Compilando paquetes de Vinttea..."
    $hasPnpm = (Get-Command pnpm -ErrorAction SilentlyContinue) -ne $null
    if ($hasPnpm) {
        pnpm -r run build
    } else {
        npx pnpm -r run build
    }
    if ($LASTEXITCODE -ne 0) {
        throw "La compilación de paquetes terminó con el código $LASTEXITCODE."
    }
}

# 2. Generar Icono y compilar Vinttea.exe
Write-Host "[2/4] Generando icono y compilando Vinttea.exe..."
& powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts\generate-icon.ps1")
& powershell -ExecutionPolicy Bypass -File (Join-Path $root "scripts\build-launcher.ps1")

# 3. Preparar carpeta temporal para release
Write-Host "[3/4] Preparando estructura de archivos..."
$distDir = if ([string]::IsNullOrEmpty($OutputDirectory)) {
    Join-Path $root "dist-release"
} else {
    [System.IO.Path]::GetFullPath($OutputDirectory)
}
$stageDir = Join-Path $distDir "Vinttea"

if (Test-Path $distDir) {
    if (-not [string]::IsNullOrEmpty($OutputDirectory)) {
        throw "La carpeta de salida ya existe; elegí otra para preservar sus archivos: $distDir"
    }
    Remove-Item -LiteralPath $distDir -Recurse -Force
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

# Legacy launchers run `pnpm -r run build` after copying this prebuilt bundle.
# Recent pnpm versions otherwise try to install the omitted development
# dependencies before running those harmless compatibility scripts.
$workspaceManifest = Join-Path $stageDir "pnpm-workspace.yaml"
if (-not (Test-Path $workspaceManifest)) {
    throw "No se encontró pnpm-workspace.yaml en el paquete de release."
}
$workspaceText = [System.IO.File]::ReadAllText($workspaceManifest)
$verifyDepsSetting = [regex]::new('(?m)^verifyDepsBeforeRun\s*:')
if ($verifyDepsSetting.IsMatch($workspaceText)) {
    $workspaceText = $verifyDepsSetting.Replace($workspaceText, "verifyDepsBeforeRun: false", 1)
} else {
    $workspaceText = $workspaceText.TrimEnd() + "`r`n`r`nverifyDepsBeforeRun: false`r`n"
}
[System.IO.File]::WriteAllText(
    $workspaceManifest,
    $workspaceText,
    [System.Text.UTF8Encoding]::new($false)
)
Write-Host "Configurado pnpm para omitir instalaciones durante la actualización heredada."

# Use the Git tag as the release version in every manifest inside the ZIP.
# Keep build scripts harmless in the packaged app so older launchers that still
# invoke `pnpm -r run build` can complete their update from this prebuilt bundle.
$manifestPaths = @(
    (Join-Path $stageDir "package.json"),
    (Join-Path $stageDir "packages\server\package.json"),
    (Join-Path $stageDir "packages\remote\package.json"),
    (Join-Path $stageDir "packages\shared\package.json"),
    (Join-Path $stageDir "packages\extension\package.json")
)
$versionRegex = [regex]::new('(?m)^(\s*"version"\s*:\s*")[^"]+("\s*,?)')
$buildRegex = [regex]::new('(?m)^(\s*"build"\s*:\s*")[^"]+("\s*,?)')
$legacyBuildCommand = "echo Vinttea packages are prebuilt"
foreach ($manifestPath in $manifestPaths) {
    if (-not (Test-Path $manifestPath)) {
        throw "No se encontró el manifiesto esperado: $manifestPath"
    }

    $manifestText = [System.IO.File]::ReadAllText($manifestPath)
    if (-not $versionRegex.IsMatch($manifestText)) {
        throw "No se encontró el campo version en: $manifestPath"
    }
    $updatedManifest = $versionRegex.Replace(
        $manifestText,
        [System.Text.RegularExpressions.MatchEvaluator]{
            param($match)
            $match.Groups[1].Value + $Version + $match.Groups[2].Value
        },
        1
    )
    if ($manifestPath -ne (Join-Path $stageDir "package.json")) {
        if (-not $buildRegex.IsMatch($updatedManifest)) {
            throw "No se encontró el script build requerido para compatibilidad en: $manifestPath"
        }
        $updatedManifest = $buildRegex.Replace(
            $updatedManifest,
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($match)
                $match.Groups[1].Value + $legacyBuildCommand + $match.Groups[2].Value
            },
            1
        )
    }
    [System.IO.File]::WriteAllText(
        $manifestPath,
        $updatedManifest,
        [System.Text.UTF8Encoding]::new($false)
    )

    $validatedManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($validatedManifest.version -ne $Version) {
        throw "La versión empaquetada no coincide en: $manifestPath"
    }
    if ($manifestPath -ne (Join-Path $stageDir "package.json") -and
        $validatedManifest.scripts.build -ne $legacyBuildCommand) {
        throw "El script build no quedó preparado para actualizadores viejos en: $manifestPath"
    }
    Write-Host "Manifiesto listo: $($validatedManifest.name) v$($validatedManifest.version); build=$($validatedManifest.scripts.build)"
}

# 4. Crear archivo ZIP
$zipName = "Vinttea-v$Version-Windows.zip"
$zipPath = Join-Path $distDir $zipName
Write-Host "[4/4] Comprimiendo en $zipName..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $zipPath)

# Validate the actual ZIP so the compatibility fix cannot silently be omitted
# from a published release.
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    foreach ($relativePath in @(
        "pnpm-workspace.yaml",
        "package.json",
        "packages/server/package.json",
        "packages/remote/package.json",
        "packages/shared/package.json",
        "packages/extension/package.json"
    )) {
        $entry = $archive.Entries | Where-Object {
            $_.FullName.Replace('\', '/') -eq $relativePath
        } | Select-Object -First 1
        if ($null -eq $entry) {
            throw "Falta $relativePath dentro del ZIP de release."
        }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { $entryContents = $reader.ReadToEnd() }
        finally { $reader.Dispose() }

        if ($relativePath -eq "pnpm-workspace.yaml") {
            if (-not [regex]::IsMatch($entryContents, '(?m)^verifyDepsBeforeRun:\s*false\s*$')) {
                throw "El ZIP no desactiva la instalación automática de dependencias para el actualizador viejo."
            }
            continue
        }
        $packagedManifest = $entryContents | ConvertFrom-Json

        if ($packagedManifest.version -ne $Version) {
            throw "El ZIP contiene una versión inesperada en $relativePath."
        }
        if ($relativePath -ne "package.json" -and
            $packagedManifest.scripts.build -ne $legacyBuildCommand) {
            throw "El ZIP no contiene el build compatible en $relativePath."
        }
    }
}
finally {
    $archive.Dispose()
}
Write-Host "Validación del ZIP completada: versiones y scripts compatibles con actualizadores anteriores."

$zipBytes = (Get-Item $zipPath).Length
$zipMb = [Math]::Round(($zipBytes / (1024 * 1024)), 2)
Write-Host ""
Write-Host "========================================="
Write-Host "Release empaquetada con exito!"
Write-Host "Archivo: $zipPath ($zipMb Megabytes)"
Write-Host "Listo para subir a GitHub Releases."
Write-Host "========================================="
