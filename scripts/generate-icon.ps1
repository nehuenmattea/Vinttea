Add-Type -AssemblyName System.Drawing

$outputPath = Join-Path $PSScriptRoot "..\Vinttea.ico"
if ($args.Count -gt 0) {
    $outputPath = $args[0]
}

$sizes = @(256, 48, 32, 16)
$images = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark Squircle background
    $rect = New-Object System.Drawing.Rectangle 1, 1, ($size - 2), ($size - 2)
    $radius = [int]($size * 0.22)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    # Background gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 24, 28, 43),
        [System.Drawing.Color]::FromArgb(255, 10, 12, 19),
        45
    )
    $g.FillPath($bgBrush, $path)

    # Border gradient
    $borderPen = New-Object System.Drawing.Pen(
        [System.Drawing.Color]::FromArgb(255, 129, 140, 248),
        [Math]::Max(1.0, [float]($size * 0.035))
    )
    $g.DrawPath($borderPen, $path)

    # Stylized V
    $vBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 255, 51, 102),
        [System.Drawing.Color]::FromArgb(255, 168, 85, 247),
        90
    )
    
    $vPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $s = [float]$size / 100.0
    $p1 = New-Object System.Drawing.PointF (28 * $s), (35 * $s)
    $p2 = New-Object System.Drawing.PointF (50 * $s), (78 * $s)
    $p3 = New-Object System.Drawing.PointF (72 * $s), (35 * $s)
    $p4 = New-Object System.Drawing.PointF (61 * $s), (35 * $s)
    $p5 = New-Object System.Drawing.PointF (50 * $s), (60 * $s)
    $p6 = New-Object System.Drawing.PointF (39 * $s), (35 * $s)
    $vPath.AddPolygon(@($p1, $p2, $p3, $p4, $p5, $p6))
    $g.FillPath($vBrush, $vPath)

    # White play triangle in center
    $playBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
    $t1 = New-Object System.Drawing.PointF (47 * $s), (44 * $s)
    $t2 = New-Object System.Drawing.PointF (47 * $s), (54 * $s)
    $t3 = New-Object System.Drawing.PointF (56 * $s), (49 * $s)
    $g.FillPolygon($playBrush, @($t1, $t2, $t3))

    $g.Dispose()
    $images += $bmp
}

# Encode into Windows .ICO
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms

# ICO Header
$bw.Write([int16]0) # Reserved
$bw.Write([int16]1) # Type 1 = ICO
$bw.Write([int16]$images.Count) # Image count

$imageDataList = @()
foreach ($img in $images) {
    $imgMs = New-Object System.IO.MemoryStream
    $img.Save($imgMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $imgMs.ToArray()
    $imageDataList += ,$bytes
    $imgMs.Dispose()
}

$offset = 6 + (16 * $images.Count)
for ($i = 0; $i -lt $images.Count; $i++) {
    $w = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
    $h = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
    $bytes = $imageDataList[$i]

    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)   # Colors
    $bw.Write([byte]0)   # Reserved
    $bw.Write([int16]1)  # Color planes
    $bw.Write([int16]32) # Bits per pixel
    $bw.Write([int32]$bytes.Length) # Image data size
    $bw.Write([int32]$offset)       # Image data offset
    $offset += $bytes.Length
}

for ($i = 0; $i -lt $images.Count; $i++) {
    $bw.Write($imageDataList[$i])
    $images[$i].Dispose()
}

$fullOutPath = [System.IO.Path]::GetFullPath($outputPath)
[System.IO.File]::WriteAllBytes($fullOutPath, $ms.ToArray())
$bw.Dispose()
$ms.Dispose()
Write-Output "ICO successfully created at $fullOutPath"
