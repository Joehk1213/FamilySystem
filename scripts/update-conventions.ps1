Set-Location "C:\Project\Family\FamilySystem"
$path = "source\CONVENTIONS.md"
$tmp = "source\CONVENTIONS.md.tmp"
$bak = "source\CONVENTIONS.md.bak"

Write-Host "[1] Read UTF8"
$content = [System.IO.File]::ReadAllText((Resolve-Path $path).Path, [System.Text.Encoding]::UTF8)

Write-Host "[2] Force remove old Section 6 (garbled or not)"
# Remove any ## 6. CSS... to end or next ## heading
$clean = [System.Text.RegularExpressions.Regex]::Replace($content, "(?s)\r?\n## 6\. CSS.*$", "`r`n", [System.Text.RegularExpressions.RegexOptions]::Singleline)
# Also try without newline at start
if ($clean -eq $content) {
  $clean = $content -replace "(?s)## 6\. CSS.*", ""
}

$add = @"
## 6. CSS Spec - Utility-First (2026-11-01, replaces Traditional CSS)

Traditional CSS is deprecated: no more hand-written .living-photo-wall in public/styles/home.css.

Use Utility-First (Tailwind CDN):
- Added https://cdn.tailwindcss.com in public/index.html
- Utility classes directly in index.html / mvp-pages.js: fixed inset-0 z-0 opacity-30 etc
- Keep only @keyframes living-photo-drift and radial-gradient in home.css
- New components must be utility only: e.g. #record-editor = fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,calc(100vw-32px))] bg-white/98 backdrop-blur-xl rounded-[24px] z-10
- Background wall uses only public Unsplash photos

Migration:
- Old home.css frozen, only keyframe + radial
- New features only utility classes
- Use File::Replace to bypass ACL
"@

$newContent = $clean.TrimEnd() + "`r`n`r`n" + $add + "`r`n"
[System.IO.File]::WriteAllText($tmp, $newContent, [System.Text.Encoding]::UTF8)

$srcFull = (Resolve-Path $tmp).Path
$dstFull = (Resolve-Path $path).Path
$bakFull = Join-Path (Get-Location).Path $bak
if (Test-Path $bakFull) { Remove-Item $bakFull -Force }
[System.IO.File]::Replace($srcFull, $dstFull, $bakFull)
Remove-Item $bakFull -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Rewritten Section 6 clean English"
Get-Content $path -Tail 25 -Encoding utf8
