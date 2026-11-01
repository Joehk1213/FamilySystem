Set-Location "C:\Project\Family\FamilySystem"
Write-Host "[1] Make bottom drawer faint and topbar hold login info - CSS only fix"

Copy-Item public\styles\home.css public\styles\home.css.patch -Force
$css = Get-Content public\styles\home.css.patch -Raw

# Bottom drawer: 0.98 -> 0.60 faint, so layer one (photos) shows through
$css = $css -replace '0\.98', '0.60'
$css = $css -replace '0\.94', '0.60'

# Topbar: make it 0.92 solid to hold login info, not hidden
$css = $css -replace 'living-photo-wall-topbar', 'living-photo-wall-topbar /* top bar holds all login info: FAMILY CALENDAR MVP | login | account | Master */'

# Ensure #app and page-shell are fully transparent (layer one visible)
$css = $css + "`r`n/* 80->95 fix: keep middle input as only solid, everything else faint */`r`nbody.living-wall-active #app { background: transparent !important; }`r`n.living-wall-functions { background: rgba(255,255,255,0.60) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; border: 1px solid rgba(255,255,255,0.5) !important; }`r`n.living-photo-wall-topbar { background: rgba(255,255,255,0.92) !important; backdrop-filter: blur(16px) !important; }`r`n"

Set-Content public\styles\home.css.patch -Value $css -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\styles\home.css.patch).Path, (Resolve-Path public\styles\home.css).Path, (Join-Path (Resolve-Path public\styles).Path 'home.css.bak'))
Remove-Item public\styles\home.css.bak -Force -ErrorAction SilentlyContinue
Write-Host "[OK] home.css faint drawer 0.60"

git diff --stat
Write-Host "Next: npm start -> http://127.0.0.1:3002/?v=80to95"
