# Script para compilar Vinttea.exe de forma nativa sin dependencias externas
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $csc)) {
    $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path $csc)) {
    Write-Error "No se encontro el compilador csc.exe de .NET Framework en Windows."
    exit 1
}

$iconPath = Join-Path $root "Vinttea.ico"
if (-not (Test-Path $iconPath)) {
    Write-Host "Generando Vinttea.ico..."
    & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "generate-icon.ps1")
}

$sourceFile = Join-Path $root "packages\launcher\Program.cs"
$outFile = Join-Path $root "Vinttea.exe"

# The launcher must be closed before rebuilding so no backup executable is left behind.
if (Test-Path $outFile) {
    try {
        Remove-Item $outFile -Force -ErrorAction Stop
    } catch {
        Write-Error "No se pudo reemplazar Vinttea.exe. Cierra Vinttea y vuelve a compilar."
        exit 1
    }
}

$refs = @(
    "System.dll",
    "System.Windows.Forms.dll",
    "System.Drawing.dll",
    "System.IO.Compression.dll",
    "System.IO.Compression.FileSystem.dll",
    "System.Web.Extensions.dll",
    "Microsoft.CSharp.dll"
) -join ","

$argsList = @(
    "/target:winexe",
    "/optimize+",
    "/nologo",
    "/out:$outFile",
    "/win32icon:$iconPath",
    "/r:$refs",
    "$sourceFile"
)

Write-Host "Compilando Vinttea.exe..."
$proc = Start-Process -FilePath $csc -ArgumentList $argsList -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -eq 0 -and (Test-Path $outFile)) {
    $len = (Get-Item $outFile).Length
    Write-Host "Vinttea.exe compilado exitosamente ($len bytes) en:"
    Write-Host "  $outFile"
} else {
    Write-Error "Error al compilar Vinttea.exe (Codigo de salida: $($proc.ExitCode))"
    exit 1
}
