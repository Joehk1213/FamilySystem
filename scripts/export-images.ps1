[CmdletBinding()]
param(
  [string]$OutputPath,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repositoryRoot 'docker-compose.prod.yml'
$envFile = Join-Path $repositoryRoot '.env.docker'

if (-not (Test-Path -LiteralPath $composeFile)) {
  throw "Compose file not found: $composeFile"
}
if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Environment file not found: $envFile. Copy .env.docker.example and configure local secrets first."
}

$configuredRoot = $env:FAMILY_DATA_ROOT
if ([string]::IsNullOrWhiteSpace($configuredRoot)) {
  $rootSetting = Get-Content -LiteralPath $envFile |
    Where-Object { $_ -match '^FAMILY_DATA_ROOT=' } |
    Select-Object -First 1
  if (-not $rootSetting) {
    throw 'FAMILY_DATA_ROOT is missing from .env.docker and the process environment.'
  }
  $configuredRoot = ($rootSetting -split '=', 2)[1].Trim()
}

$windowsRoot = $configuredRoot.Replace('/', '\')
try {
  $familyDataRoot = [System.IO.Path]::GetFullPath($windowsRoot).TrimEnd('\')
} catch {
  throw "FAMILY_DATA_ROOT is not a valid Windows path: $configuredRoot"
}

$allowedRoots = @(
  [System.IO.Path]::GetFullPath('C:\docker-data\family-system').TrimEnd('\'),
  [System.IO.Path]::GetFullPath('D:\docker-data\family-system').TrimEnd('\')
)
if ($allowedRoots -notcontains $familyDataRoot) {
  throw 'FAMILY_DATA_ROOT must be C:\docker-data\family-system or D:\docker-data\family-system.'
}

$env:FAMILY_DATA_ROOT = $familyDataRoot.Replace('\', '/')

$composeArguments = @(
  '--env-file', $envFile,
  '-f', $composeFile
)
$images = @(& docker compose @composeArguments config --images)
if ($LASTEXITCODE -ne 0) {
  throw 'Could not resolve the Compose image list.'
}
$images = @($images | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)
if ($images.Count -eq 0) {
  throw 'Compose returned no images to export.'
}

$missingImages = @()
foreach ($image in $images) {
  & docker image inspect $image *> $null
  if ($LASTEXITCODE -ne 0) {
    $missingImages += $image
  }
}
if ($missingImages.Count -gt 0) {
  throw "Pull these pinned Compose images before exporting: $($missingImages -join ', ')"
}

if ($DryRun) {
  Write-Output "FAMILY_DATA_ROOT: $env:FAMILY_DATA_ROOT"
  Write-Output "Images ready to export: $($images.Count)"
  $images | ForEach-Object { Write-Output "  $_" }
  return
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $exportDirectory = Join-Path $familyDataRoot 'image-export'
  if (-not (Test-Path -LiteralPath $exportDirectory)) {
    New-Item -ItemType Directory -Path $exportDirectory -Force | Out-Null
  }
  $OutputPath = Join-Path $exportDirectory (
    'family-system-images-{0}.tar' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
  )
} else {
  $OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
  $outputDirectory = Split-Path -Parent $OutputPath
  if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  }
}

& docker image save --output $OutputPath @images
if ($LASTEXITCODE -ne 0) {
  throw 'Docker image export failed.'
}

$archive = Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256
Write-Output "Exported $($images.Count) pinned Compose images."
Write-Output "Archive: $OutputPath"
Write-Output "SHA256: $($archive.Hash)"
Write-Output "Compose FAMILY_DATA_ROOT: $env:FAMILY_DATA_ROOT"
