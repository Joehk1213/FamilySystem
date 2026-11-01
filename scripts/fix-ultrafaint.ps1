Set-Location "C:\Project\Family\FamilySystem"
Write-Host "[1] Ultra faint - background layer one first, all UI faint"

Copy-Item public\styles\home.css public\styles\home.css.patch -Force
$css = Get-Content public\styles\home.css.patch -Raw

# Remove previous overrides to avoid stacking
$css = [System.Text.RegularExpressions.Regex]::Replace($css, "(?s)/\* 80->95 faint fix.*", "")
$css = [System.Text.RegularExpressions.Regex]::Replace($css, "(?s)/\* 80->95 faint.*", "")

$override = @"
`r`n/* Ultra faint: background first, UI 0.20-0.25 faint but still see block */
body.living-wall-active .living-photo-wall-topbar {
  background: rgba(255,255,255,0.22) !important;
  backdrop-filter: blur(22px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(22px) saturate(1.4) !important;
  border-bottom: 1px solid rgba(255,255,255,0.25) !important;
  box-shadow: none !important;
  opacity: 0.92;
}
body.living-wall-active .living-wall-functions {
  background: rgba(255,255,255,0.20) !important;
  backdrop-filter: blur(24px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.4) !important;
  border: 1px solid rgba(255,255,255,0.30) !important;
  box-shadow: 0 4px 24px rgba(22,34,31,0.06) !important;
  opacity: 0.85;
}
body.living-wall-active .living-wall-functions:hover {
  background: rgba(255,255,255,0.38) !important;
  opacity: 1;
}
body.living-wall-active #app,
body.living-wall-active .page-shell,
body.living-wall-active main {
  background: transparent !important;
  box-shadow: none !important;
}
/* Middle main also faint - background first */
body.living-wall-active #record-editor {
  background: rgba(255,255,255,0.62) !important;
  backdrop-filter: blur(24px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.3) !important;
  border: 1px solid rgba(255,255,255,0.55) !important;
  box-shadow: 0 16px 48px rgba(22,34,31,0.12) !important;
}
body.living-wall-active #record-editor:hover,
body.living-wall-active #record-editor:focus-within {
  background: rgba(255,255,255,0.82) !important;
}
/* Photos more visible */
.living-photo-wall img {
  opacity: 0.52 !important;
}
"@

$css = $css + $override

Set-Content public\styles\home.css.patch -Value $css -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\styles\home.css.patch).Path, (Resolve-Path public\styles\home.css).Path, (Join-Path (Resolve-Path public\styles).Path 'home.css.bak'))
Remove-Item public\styles\home.css.bak -Force -ErrorAction SilentlyContinue
Write-Host "[OK] ultra faint: topbar 0.22, drawer 0.20, center 0.62, photos 0.52"

git diff --stat
Write-Host "Next: npm start -> http://127.0.0.1:3002/?v=ultrafaint"
