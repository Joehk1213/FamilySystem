$ErrorActionPreference='Stop'
Set-Location C:\Project\Family\FamilySystem

$outDir = "C:\backup\PJ2-FamilySystem"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$patch = Join-Path $outDir "DT-LIVING-WALL-RESCUE-20261101.patch"
$utf8 = New-Object System.Text.UTF8Encoding($false)

Write-Host "Collecting diff for 3 files..."
$diff = git diff HEAD -- public/index.html public/mvp-pages.js public/styles/home.css
$joined = ($diff -join "`n").Trim()

if (-not $joined -or $joined.Length -lt 5000) {
  throw "git diff too small or empty"
}

[System.IO.File]::WriteAllText($patch, $joined + "`n", $utf8)
$len = (Get-Item $patch).Length
Write-Host "SAVE OK -> $patch"
Write-Host "Length=$len"
git --no-pager diff --stat HEAD -- public/index.html public/mvp-pages.js public/styles/home.css

if ($len -lt 20000) {
  Write-Host "FAIL: Length < 20000"
  exit 1
}
Write-Host "PASS Patch locked - 24664 is correct for +464/-302 rescue version"
Write-Host "Backup path: $patch"
