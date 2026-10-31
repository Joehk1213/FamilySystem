# PJ2 ONLY - Check status
Set-Location 'C:\Project\Family\FamilySystem'
Write-Host "=== CHECK STATUS ===" -ForegroundColor Cyan
Write-Host "HEAD=$( (git rev-parse --short HEAD).Trim() )"
git status --short
Write-Host "`nListeners 3002:"
Get-NetTCPConnection -State Listen -LocalPort 3002 -ErrorAction SilentlyContinue | % {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)"
  Write-Host "PID=$($_.OwningProcess) NAME=$($proc.Name)"
}
Write-Host "`nHealth / app.js:"
$health = curl.exe -s http://localhost:3002/health
Write-Host "health: $health"
$app = curl.exe -s -o NUL -w "%{http_code}" -H "Origin: http://localhost:3002" http://localhost:3002/app.js
Write-Host "APP_JS_STATUS=$app (want 200)"
Write-Host "`ndocs/obsidian + scripts:"
dir docs\obsidian | ft Name,Length -AutoSize
dir scripts\*.ps1 | ft Name,Length -AutoSize