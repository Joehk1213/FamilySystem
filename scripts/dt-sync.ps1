# PJ2 ONLY - DT one-click sync (docs/obsidian + scripts + public + server)
# 用法: .\scripts\dt-sync.ps1 -Mode push/pull -Msg "xxx"
param(
  [ValidateSet('push','pull')][string]$Mode = 'push',
  [string]$Msg = "docs(obsidian): sync DT $(Get-Date -Format 'yyyyMMdd-HHmm')"
)

Set-Location 'C:\Project\Family\FamilySystem'
Write-Host "=== DT SYNC Mode=$Mode ===" -ForegroundColor Cyan
Write-Host "HEAD before: $((git rev-parse --short HEAD).Trim())"

git pull origin main
if ($Mode -eq 'pull') {
  Write-Host "Pulled only" -ForegroundColor Green
  dir docs\obsidian
  dir scripts\*.ps1 | Select Name,Length
  exit
}

# copy D:\backup if exists (DT usually no D:, but safe)
if (Test-Path 'D:\backup') {
  Copy-Item 'D:\backup\*.md' 'docs\obsidian\' -Force -ErrorAction SilentlyContinue
}

Remove-Item 'dt.log','dt-npm-start.log','docs\obsidian\dt.log','docs\obsidian\dt-npm-start.log' -Force -ErrorAction SilentlyContinue

git add docs/obsidian/
git add scripts/
git add .gitignore
git add public/ server/ -ErrorAction SilentlyContinue

$porcelain = git status --porcelain
if ($porcelain) {
  Write-Host $porcelain
  git commit -m $Msg
  git push origin main
  Write-Host "PUSHED: $Msg" -ForegroundColor Green
} else {
  Write-Host "No changes, skip push" -ForegroundColor Yellow
}

Write-Host "HEAD after: $((git rev-parse --short HEAD).Trim())"
git log --oneline -3