Set-Location C:\Project\Family\FamilySystem
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$dir = "C:\backup\PJ2-FamilySystem"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$patch = "$dir\DT-LIVING-WALL-BACKUP-$stamp.patch"
git diff public/ > $patch
$len = (Get-Item $patch).Length
Write-Host "patch: $patch len=$len"
git diff --stat
