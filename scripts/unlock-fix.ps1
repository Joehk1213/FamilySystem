Set-Location C:\Project\Family\FamilySystem
Write-Host "=== unlock ==="
Get-Process Code,msedge,chrome,node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 1
takeown /F public\index.html /A
icacls public\index.html /grant Administrators:F
Remove-Item -Force public\index.html -ErrorAction SilentlyContinue
git checkout -- public/index.html public/mvp-pages.js public/styles/home.css source/CONVENTIONS.md
Remove-Item dt.log -ErrorAction SilentlyContinue
git diff --stat
Write-Host "unlock done"
