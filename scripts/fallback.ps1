param([string]$PatchName="")
$project = "C:\Project\Family\FamilySystem"
$backupDir = "C:\backup\PJ2-FamilySystem"
Set-Location $project
Write-Host "[1] Stop background python/chrome/edge"
Get-Process python,msedge,chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "[2] Checkout clean public files from HEAD"
git checkout HEAD -- public/index.html public/mvp-pages.js public/styles/home.css 2>$null

if ($PatchName) {
  $patchPath = Join-Path $backupDir $PatchName
  if (!(Test-Path $patchPath)) { $patchPath = $PatchName }
  if (Test-Path $patchPath) {
    # Fix UTF-16 -> UTF-8 if needed (old backup-patch.ps1 bug)
    $bytes = [System.IO.File]::ReadAllBytes($patchPath)
    $isUtf16 = ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) -or ($bytes.Length -gt 0 -and (Get-Content $patchPath -TotalCount 1 -ErrorAction SilentlyContinue | Select-Object -First 1) -match "`0")
    $applyPath = $patchPath
    if ($isUtf16 -or ((Get-Item $patchPath).Length -gt 10000 -and (Select-String -Path $patchPath -Pattern "diff --git" -Quiet) -eq $false)) {
      Write-Host "[2b] Detected UTF-16 or invalid encoding, converting to UTF-8..."
      $fixedPath = Join-Path $backupDir ($PatchName + ".fixed-utf8.patch")
      Get-Content $patchPath | Out-File -Encoding utf8 $fixedPath
      $applyPath = $fixedPath
      Write-Host "[2b] Fixed file: $fixedPath Length $((Get-Item $fixedPath).Length)"
    }
    Write-Host "[3] Apply patch $applyPath"
    git apply --verbose $applyPath
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[3b] Try --3way"
      git apply --3way $applyPath
    }
    if ($LASTEXITCODE -eq 0) {
      Write-Host "[OK] Restored $PatchName"
    } else {
      Write-Host "[FAIL] Still failed, dumping first 10 lines for debug"
      Get-Content $applyPath -TotalCount 10 | Write-Host
    }
  } else {
    Write-Host "[FAIL] Patch not found $PatchName"
    Get-ChildItem $backupDir -Filter DT-*.patch | Sort LastWriteTime -Descending | Select-Object -First 10 Name,Length,LastWriteTime | Format-Table -AutoSize
    exit 1
  }
} else {
  Write-Host "[OK] Back to clean HEAD"
}
Write-Host ""
git status --short
git diff --stat
Write-Host "Next: npm start and open http://127.0.0.1:3002/?v=live"
