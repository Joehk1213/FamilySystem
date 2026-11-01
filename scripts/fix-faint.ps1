Set-Location "C:\Project\Family\FamilySystem"
Write-Host "[1] Make layer 2 and 3 faint, layer 1 first visible"

Copy-Item public\styles\home.css public\styles\home.css.patch -Force
$css = Get-Content public\styles\home.css.patch -Raw

# Top bar: 0.92 -> 0.45 faint
$css = $css -replace '0\.92', '0.45'
$css = $css -replace '0\.98', '0.45'
$css = $css -replace '0\.85', '0.45'
$css = $css -replace '0\.60', '0.35'

# Append final override to ensure faint
$override = @"
`r`n/* 80->95 faint fix: layer 1 first, layer 2/3 faint */
body.living-wall-active .living-photo-wall-topbar {
  background: rgba(255,255,255,0.42) !important;
  backdrop-filter: blur(18px) saturate(1.2) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.2) !important;
  border-bottom: 1px solid rgba(255,255,255,0.35) !important;
  box-shadow: none !important;
}
body.living-wall-active .living-wall-functions {
  background: rgba(255,255,255,0.38) !important;
  backdrop-filter: blur(20px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.3) !important;
  border: 1px solid rgba(255,255,255,0.40) !important;
  box-shadow: 0 8px 32px rgba(22,34,31,0.10) !important;
  opacity: 0.88;
}
body.living-wall-active .living-wall-functions:hover {
  background: rgba(255,255,255,0.58) !important;
  opacity: 1;
}
body.living-wall-active #app,
body.living-wall-active .page-shell {
  background: transparent !important;
  box-shadow: none !important;
}
/* Keep center input solid as only focus */
body.living-wall-active #record-editor {
  background: rgba(255,255,255,0.96) !important;
  backdrop-filter: blur(20px) !important;
}
"@

$css = $css + $override

Set-Content public\styles\home.css.patch -Value $css -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\styles\home.css.patch).Path, (Resolve-Path public\styles\home.css).Path, (Join-Path (Resolve-Path public\styles).Path 'home.css.bak'))
Remove-Item public\styles\home.css.bak -Force -ErrorAction SilentlyContinue
Write-Host "[OK] topbar 0.42 faint, drawer 0.38 faint + hover 0.58, center still solid"

git diff --stat
Write-Host "Next: npm start -> http://127.0.0.1:3002/?v=faint"
