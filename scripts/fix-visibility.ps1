Set-Location "C:\Project\Family\FamilySystem"
Write-Host "[1] Fix home.css transparency 0.65->0.35, 0.92->0.98"
Copy-Item public\styles\home.css public\styles\home.css.patch -Force
$content = Get-Content public\styles\home.css.patch -Raw
$content = $content -replace 'opacity: 0\.65', 'opacity: 0.35'
$content = $content -replace 'background: rgb\(255 255 255 / 92%\)', 'background: rgb(255 255 255 / 98%)'
$content = $content -replace 'background: rgb\(255 255 255 / 94%\)', 'background: rgb(255 255 255 / 98%)'
Set-Content public\styles\home.css.patch -Value $content -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\styles\home.css.patch).Path, (Resolve-Path public\styles\home.css).Path, (Join-Path (Resolve-Path public\styles).Path 'home.css.acl-backup'))
Remove-Item public\styles\home.css.acl-backup -Force -ErrorAction SilentlyContinue
Write-Host "[OK] home.css fixed"

Write-Host "[2] Fix mvp-pages.js open by default"
Copy-Item public\mvp-pages.js public\mvp-pages.js.patch -Force
$content2 = Get-Content public\mvp-pages.js.patch -Raw
$content2 = $content2 -replace "functions\.className = 'living-wall-functions';", "functions.className = 'living-wall-functions'; functions.open = true;"
Set-Content public\mvp-pages.js.patch -Value $content2 -Encoding utf8
[System.IO.File]::Replace((Resolve-Path public\mvp-pages.js.patch).Path, (Resolve-Path public\mvp-pages.js).Path, (Join-Path (Resolve-Path public).Path 'mvp-pages.js.acl-backup'))
Remove-Item public\mvp-pages.js.acl-backup -Force -ErrorAction SilentlyContinue
Write-Host "[OK] mvp-pages.js fixed"

git diff --stat
Write-Host "Next: npm start and open http://127.0.0.1:3002/?v=fix"
