$ErrorActionPreference = 'Stop'
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$DB_CONTAINER_NAME = 'supabase_db_Family_Calendar_System_MVP'
$LOG_PATH = 'C:\Logs\supabase-keepalive.log'
$AUTH_HEALTH_URL = 'http://127.0.0.1:54321/auth/v1/health'

function Write-SupabaseLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  $logDirectory = Split-Path -Parent $LOG_PATH
  if (-not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  }

  $timestamp = [DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss')
  Add-Content -LiteralPath $LOG_PATH -Value "[$timestamp] $Message" -Encoding UTF8
}

function Get-DockerPath {
  $dockerCommand = Get-Command 'docker.exe' -ErrorAction Stop
  return $dockerCommand.Source
}

function Get-NpxPath {
  $npxCommand = Get-Command 'npx.cmd' -ErrorAction Stop
  return $npxCommand.Source
}

function Invoke-Docker {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = & $script:DOCKER_PATH @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "docker $($Arguments -join ' ') failed with exit code $exitCode."
  }
  return $output
}

function Invoke-SupabaseCli {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $previousLocation = Get-Location
  try {
    Set-Location -LiteralPath $PROJECT_ROOT
    $output = & $script:NPX_PATH supabase @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      throw "npx supabase $($Arguments -join ' ') failed with exit code $exitCode."
    }
  } finally {
    Set-Location -LiteralPath $previousLocation
  }
}

function Test-AuthHealth {
  try {
    $response = Invoke-WebRequest `
      -Uri $AUTH_HEALTH_URL `
      -TimeoutSec 5 `
      -UseBasicParsing
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-ForAuthHealth {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    if (Test-AuthHealth) {
      return $true
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Get-RunningContainerNames {
  return @(Invoke-Docker -Arguments @('ps', '--format', '{{.Names}}'))
}

function Start-Supabase {
  Write-SupabaseLog 'Starting the local Supabase stack.'
  Invoke-SupabaseCli -Arguments @('start')

  $containers = Get-RunningContainerNames
  if ($DB_CONTAINER_NAME -notin $containers) {
    throw "Supabase start returned successfully, but $DB_CONTAINER_NAME is not running."
  }
  if (-not (Wait-ForAuthHealth)) {
    throw "Supabase Auth health check did not return HTTP 200 after startup."
  }
  Write-SupabaseLog 'Local Supabase is healthy.'
}

try {
  if (-not (Test-Path -LiteralPath (Join-Path $PROJECT_ROOT 'supabase\config.toml'))) {
    throw "Supabase project configuration was not found under $PROJECT_ROOT."
  }

  $script:DOCKER_PATH = Get-DockerPath
  $script:NPX_PATH = Get-NpxPath
  $containers = Get-RunningContainerNames

  if ($DB_CONTAINER_NAME -notin $containers) {
    Write-SupabaseLog "$DB_CONTAINER_NAME is not running."
    Start-Supabase
    exit 0
  }

  if (Test-AuthHealth) {
    Write-SupabaseLog 'Supabase DB container is running and Auth health returned HTTP 200.'
    exit 0
  }

  Write-SupabaseLog 'Supabase Auth health did not return HTTP 200; restarting the local stack.'
  Invoke-SupabaseCli -Arguments @('stop')
  Start-Supabase
} catch {
  try {
    Write-SupabaseLog "Supabase keep-alive failed: $($_.Exception.Message)"
  } catch {
    Write-Error "Supabase keep-alive failed and could not write its log: $($_.Exception.Message)"
  }
  exit 1
}
