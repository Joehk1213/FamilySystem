Set-Location "C:\Project\Family\FamilySystem"
Write-Host "[1] Fix 3 things: drawer default closed, input more faint, open drawer shrinks input"

# --- CSS ---
Copy-Item public\styles\home.css public\styles\home.css.patch -Force
$css = Get-Content public\styles\home.css.patch -Raw

# Remove previous ultra faint overrides to avoid stacking
$css = [System.Text.RegularExpressions.Regex]::Replace($css, "(?s)/\* Ultra faint.*", "")
$css = [System.Text.RegularExpressions.Regex]::Replace($css, "(?s)/\* 80->95 faint.*", "")

$override = @"
`r`n/* 3 things fix: default closed, both faint, open shrinks input */
body.living-wall-active .living-photo-wall-topbar {
  background: rgba(255,255,255,0.22) !important;
  backdrop-filter: blur(22px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(22px) saturate(1.4) !important;
  border-bottom: 1px solid rgba(255,255,255,0.25) !important;
}
body.living-wall-active .living-wall-functions {
  background: rgba(255,255,255,0.22) !important;
  backdrop-filter: blur(24px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.4) !important;
  border: 1px solid rgba(255,255,255,0.30) !important;
  box-shadow: 0 4px 24px rgba(22,34,31,0.06) !important;
  opacity: 0.90;
  transition: all 0.35s ease;
}
body.living-wall-active .living-wall-functions[open] {
  background: rgba(255,255,255,0.88) !important;
  opacity: 1;
  z-index: 20 !important;
}
body.living-wall-active #record-editor {
  background: rgba(255,255,255,0.38) !important;
  backdrop-filter: blur(24px) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.3) !important;
  border: 1px solid rgba(255,255,255,0.45) !important;
  box-shadow: 0 12px 36px rgba(22,34,31,0.10) !important;
  transition: all 0.35s ease;
}
body.living-wall-active #record-editor:hover,
body.living-wall-active #record-editor:focus-within {
  background: rgba(255,255,255,0.62) !important;
}
/* When drawer open, shrink input layer */
body.living-wall-active.functions-open #record-editor {
  transform: translate(-50%, -50%) scale(0.82) !important;
  opacity: 0.35;
  pointer-events: none;
}
body.living-wall-active.functions-open .living-photo-wall img {
  opacity: 0.32 !important;
}
.living-photo-wall img {
  opacity: 0.48 !important;
}
"@

$css = $css + $override
Set-Content public\styles\home.css.patch -Value $css -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\styles\home.css.patch).Path, (Resolve-Path public\styles\home.css).Path, (Join-Path (Resolve-Path public\styles).Path 'home.css.bak'))
Remove-Item public\styles\home.css.bak -Force -ErrorAction SilentlyContinue
Write-Host "[OK] CSS faint + shrink logic"

# --- JS: default closed and toggle shrinks ---
Copy-Item public\mvp-pages.js public\mvp-pages.js.patch -Force
$js = Get-Content public\mvp-pages.js.patch -Raw

# Ensure drawer default closed (remove open=true, set open=false)
$js = $js -replace 'functions\.open = true;', 'functions.open = false;'
# Ensure initial body does not have functions-open
$js = $js -replace 'functions\.className = ', 'functions.className = '

# Add logic: when functions toggles, add/remove body class and shrink input
if ($js -notlike "*functions-open*") {
  $js = $js -replace 'functions\.open = !functions\.open;', @'
functions.open = !functions.open;
    document.body.classList.toggle('functions-open', functions.open);
'@ -replace 'functions\.open = true;', @'
functions.open = true;
    document.body.classList.add('functions-open');
'@
  # Also handle summary click
  $js = $js -replace 'summary\.addEventListener', 'functions.addEventListener(''toggle'', () => { document.body.classList.toggle(''functions-open'', functions.open); }); summary.addEventListener'
}

Set-Content public\mvp-pages.js.patch -Value $js -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\mvp-pages.js.patch).Path, (Resolve-Path public\mvp-pages.js).Path, (Join-Path (Resolve-Path public\mvp-pages.js).Path 'mvp-pages.js.bak'))
Remove-Item public\mvp-pages.js.bak -Force -ErrorAction SilentlyContinue
Write-Host "[OK] JS default closed + shrink on open"

git diff --stat
Write-Host "Next: npm start -> http://127.0.0.1:3002/?v=3things"
