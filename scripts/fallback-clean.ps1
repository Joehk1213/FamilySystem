Set-Location C:\Project\Family\FamilySystem
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
git checkout -- public/index.html public/mvp-pages.js public/styles/home.css
git diff --stat
Write-Host "fallback to clean 70 score"
