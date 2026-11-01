Set-Location "C:\Project\Family\FamilySystem"
Write-Host "[1] Stop locking processes"
Get-Process node,python,msedge,chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

Write-Host "[2] Fix mvp-pages.js with force"
Copy-Item public\mvp-pages.js public\mvp-pages.js.patch -Force
$js = Get-Content public\mvp-pages.js.patch -Raw

# Default closed
$js = $js -replace 'functions\.open = true;', 'functions.open = false;'

# Ensure toggle adds body class
if ($js -notmatch 'functions-open') {
  $js = $js -replace 'functions\.open = !functions\.open;', 'functions.open = !functions.open; document.body.classList.toggle(''functions-open'', functions.open);'
  $js = $js -replace 'functions\.open = false;', 'functions.open = false; document.body.classList.remove(''functions-open'');'
}

Set-Content public\mvp-pages.js.patch -Value $js -Encoding utf8

# Try Replace, if fails use Move
try {
  [System.IO.File]::Replace((Resolve-Path public\mvp-pages.js.patch).Path, (Resolve-Path public\mvp-pages.js).Path, (Join-Path (Resolve-Path public).Path 'mvp-pages.js.bak'))
  Remove-Item public\mvp-pages.js.bak -Force -ErrorAction SilentlyContinue
  Write-Host "[OK] JS replaced via File::Replace"
} catch {
  Write-Host "[WARN] Replace failed, trying Remove + Move: $($_.Exception.Message)"
  Remove-Item public\mvp-pages.js -Force -ErrorAction SilentlyContinue
  Move-Item public\mvp-pages.js.patch public\mvp-pages.js -Force
  Write-Host "[OK] JS replaced via Move"
}
if (Test-Path public\mvp-pages.js.patch) { Remove-Item public\mvp-pages.js.patch -Force -ErrorAction SilentlyContinue }

Write-Host "[3] Verify CSS already faint"
if (!(Get-Content public\styles\home.css -Raw | Select-String 'functions-open')) {
  Write-Host "[INFO] CSS needs faint fix, run fix-ultrafaint.ps1 first, then re-run this"
}

git diff --stat
Write-Host "Next: npm start -> http://127.0.0.1:3002/?v=3things"
