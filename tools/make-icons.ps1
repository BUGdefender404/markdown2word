# Generate add-in icons (16/32/64/80) with System.Drawing: indigo rounded square + "M" + down arrow.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'assets\icons'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing

foreach ($size in 16, 32, 64, 80, 256) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = [Math]::Max(1, [int]($size * 0.04))
  $side = $size - ($pad * 2)

  $c1 = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)
  $c2 = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)
  $bgRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $c1, $c2, 45)

  $r = [Math]::Max(2, [int]($size * 0.22))
  $rect = New-Object System.Drawing.Rectangle($pad, $pad, $side, $side)
  $d = $r * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc(($rect.Right - $d), $rect.Y, $d, $d, 270, 90)
  $path.AddArc(($rect.Right - $d), ($rect.Bottom - $d), $d, $d, 0, 90)
  $path.AddArc($rect.X, ($rect.Bottom - $d), $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)

  $white = [System.Drawing.Brushes]::White
  $fSize = $size * 0.42
  $fontM = New-Object System.Drawing.Font('Segoe UI', $fSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $mH = $size * 0.80
  $mW = $size * 0.78
  $mY = $size * 0.02
  $rectM = New-Object System.Drawing.RectangleF($pad, $mY, $mW, $mH)
  $g.DrawString('M', $fontM, $white, $rectM, $fmt)

  if ($size -ge 32) {
    $penW = [Math]::Max(1.5, $size * 0.05)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penW)
    $pen.StartCap = 'Round'
    $pen.EndCap = 'Round'
    $ax = $size * 0.80
    $ay1 = $size * 0.22
    $ay2 = $size * 0.72
    $aw = $size * 0.10
    $g.DrawLine($pen, $ax, $ay1, $ax, $ay2)
    $g.DrawLine($pen, ($ax - $aw), ($ay2 - $aw), $ax, $ay2)
    $g.DrawLine($pen, ($ax + $aw), ($ay2 - $aw), $ax, $ay2)
  }

  $out = Join-Path $outDir ("icon-$size.png")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  Write-Output "OK $out"
}
