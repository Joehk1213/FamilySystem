[CmdletBinding()]
param(
  [ValidateSet('Backup', 'RestoreIfEmpty')]
  [string]$Mode = 'Backup'
)

$ErrorActionPreference = 'Stop'
$HOME_MACHINE_NAME = 'JOE-Desktop'
$CMS_CERT_THUMBPRINT = '82834C3444AD924A67ECD735B79DDFB69E604EA6'
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$DB_CONTAINER_NAME = 'supabase_db_Family_Calendar_System_MVP'
$STORAGE_CONTAINER_NAME = 'supabase_storage_Family_Calendar_System_MVP'
$LOG_PATH = 'C:\Logs\family-calendar-backup.log'
$BACKUP_FOLDER_NAME = 'FamilyCalendarBackup'

function Write-BackupLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  $logDirectory = Split-Path -Parent $LOG_PATH
  if (-not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  }

  $timestamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
  Add-Content -LiteralPath $LOG_PATH -Value "[$timestamp] $Message" -Encoding UTF8
}

function Get-OneDriveBackupDirectory {
  $oneDriveRoot = $env:OneDrive
  if ([string]::IsNullOrWhiteSpace($oneDriveRoot)) {
    $oneDriveRoot = $env:OneDriveCommercial
  }
  if ([string]::IsNullOrWhiteSpace($oneDriveRoot)) {
    throw 'OneDrive is not available in this user session; run this task as the OneDrive account owner.'
  }

  $backupDirectory = Join-Path $oneDriveRoot $BACKUP_FOLDER_NAME
  if (-not (Test-Path -LiteralPath $backupDirectory)) {
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
  }
  return $backupDirectory
}

function Get-BackupCertificate {
  $thumbprint = ($CMS_CERT_THUMBPRINT -replace '\s', '').ToUpperInvariant()
  if ($thumbprint -notmatch '^[A-F0-9]{40}$') {
    throw 'Set $CMS_CERT_THUMBPRINT to the certificate thumbprint in Cert:\CurrentUser\My.'
  }

  $certificatePath = "Cert:\CurrentUser\My\$thumbprint"
  $certificate = Get-Item -LiteralPath $certificatePath -ErrorAction Stop
  if ($Mode -eq 'RestoreIfEmpty' -and -not $certificate.HasPrivateKey) {
    throw 'The restore task requires the CMS certificate private key in the current user certificate store.'
  }
  return $certificate
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

function Get-RunningContainerNames {
  return @(Invoke-Docker -Arguments @('ps', '--format', '{{.Names}}'))
}

function Test-AuthHealth {
  try {
    $response = Invoke-WebRequest `
      -Uri 'http://127.0.0.1:54321/auth/v1/health' `
      -TimeoutSec 5 `
      -UseBasicParsing
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Ensure-SupabaseRunning {
  $containers = Get-RunningContainerNames
  if ($DB_CONTAINER_NAME -notin $containers -or $STORAGE_CONTAINER_NAME -notin $containers) {
    Write-BackupLog 'Starting local Supabase because a required container is not running.'
    Invoke-SupabaseCli -Arguments @('start')
  }

  $containers = Get-RunningContainerNames
  if ($DB_CONTAINER_NAME -notin $containers -or $STORAGE_CONTAINER_NAME -notin $containers) {
    throw 'The local Supabase database or storage container is not running.'
  }
  if (-not (Test-AuthHealth)) {
    throw 'Supabase Auth health did not return HTTP 200.'
  }
}

function Test-DatabaseEmpty {
  $sql = @'
SELECT (
  EXISTS (SELECT 1 FROM public.families)
  OR EXISTS (SELECT 1 FROM public.profiles)
  OR EXISTS (SELECT 1 FROM public.family_members)
  OR EXISTS (SELECT 1 FROM public.records)
  OR EXISTS (SELECT 1 FROM public.attachments)
  OR EXISTS (SELECT 1 FROM auth.users)
);
'@
  $result = Invoke-Docker -Arguments @(
    'exec',
    $DB_CONTAINER_NAME,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-qAt',
    '-c',
    $sql
  )
  return (($result -join '').Trim() -eq 'f')
}

function Test-StorageEmpty {
  $files = Invoke-Docker -Arguments @(
    'exec',
    $STORAGE_CONTAINER_NAME,
    'sh',
    '-c',
    'find /mnt -type f -print -quit'
  )
  return [string]::IsNullOrWhiteSpace(($files -join '').Trim())
}

function Invoke-Backup {
  param([Parameter(Mandatory = $true)][string]$BackupDirectory)

  $workspace = Join-Path $env:TEMP ("family-calendar-backup-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $workspace | Out-Null
  $containerDumpPath = '/tmp/family-calendar-' + [Guid]::NewGuid().ToString('N') + '.dump'
  $pendingEncryptedPath = $null

  try {
    $dumpPath = Join-Path $workspace 'database.dump'
    $storagePath = Join-Path $workspace 'storage'
    $manifestPath = Join-Path $workspace 'manifest.json'
    $archivePath = Join-Path $workspace 'backup.zip'
    $pendingEncryptedPath = Join-Path $BackupDirectory ('family-calendar-' + [Guid]::NewGuid().ToString('N') + '.cms.pending')
    $createdUtc = [DateTime]::UtcNow

    New-Item -ItemType Directory -Path $storagePath | Out-Null
    Invoke-Docker -Arguments @(
      'exec',
      $DB_CONTAINER_NAME,
      'pg_dump',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-Fc',
      '-f',
      $containerDumpPath
    ) | Out-Null
    Invoke-Docker -Arguments @('cp', "${DB_CONTAINER_NAME}:$containerDumpPath", $dumpPath) | Out-Null
    Invoke-Docker -Arguments @('exec', $DB_CONTAINER_NAME, 'rm', '-f', $containerDumpPath) | Out-Null
    Invoke-Docker -Arguments @('cp', "${STORAGE_CONTAINER_NAME}:/mnt/.", $storagePath) | Out-Null

    [PSCustomObject]@{
      format = 1
      createdUtc = $createdUtc.ToString('o')
      sourceMachine = $env:COMPUTERNAME
      databaseFile = 'database.dump'
      storageDirectory = 'storage'
    } | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    Compress-Archive `
      -Path @($dumpPath, $storagePath, $manifestPath) `
      -DestinationPath $archivePath `
      -CompressionLevel Optimal

    $archiveBytes = [System.IO.File]::ReadAllBytes($archivePath)
    $encodedArchive = [Convert]::ToBase64String($archiveBytes)
    Protect-CmsMessage `
      -To $script:CERTIFICATE.Subject `
      -Content $encodedArchive `
      -OutFile $pendingEncryptedPath `
      -ErrorAction Stop | Out-Null

    $timestamp = $createdUtc.ToString('yyyyMMdd-HHmmss')
    $finalPath = Join-Path $BackupDirectory (
      "family-calendar-$timestamp-$($env:COMPUTERNAME)-$([Guid]::NewGuid().ToString('N')).cms"
    )
    Move-Item -LiteralPath $pendingEncryptedPath -Destination $finalPath
    Write-BackupLog "Encrypted database and storage backup created: $(Split-Path -Leaf $finalPath)"
  } finally {
    try {
      Invoke-Docker -Arguments @('exec', $DB_CONTAINER_NAME, 'rm', '-f', $containerDumpPath) | Out-Null
    } catch {
      Write-BackupLog "Could not remove the temporary database dump from the container: $($_.Exception.Message)"
    }
    if ($pendingEncryptedPath -and (Test-Path -LiteralPath $pendingEncryptedPath)) {
      Remove-Item -LiteralPath $pendingEncryptedPath -Force
    }
    if (Test-Path -LiteralPath $workspace) {
      Remove-Item -LiteralPath $workspace -Recurse -Force
    }
  }
}

function Invoke-RestoreIfEmpty {
  param([Parameter(Mandatory = $true)][string]$BackupDirectory)

  if ($env:COMPUTERNAME -ine $HOME_MACHINE_NAME) {
    Write-BackupLog "Restore skipped; this is not the configured home machine '$HOME_MACHINE_NAME'."
    return
  }

  Ensure-SupabaseRunning
  if (-not (Test-DatabaseEmpty) -or -not (Test-StorageEmpty)) {
    Write-BackupLog 'Restore skipped because the local database or storage already contains data.'
    return
  }

  $latestBackup = Get-ChildItem -LiteralPath $BackupDirectory -Filter 'family-calendar-*.cms' -File |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
  if (-not $latestBackup) {
    throw "No encrypted Family Calendar backup was found in $BackupDirectory."
  }

  $workspace = Join-Path $env:TEMP ("family-calendar-restore-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $workspace | Out-Null
  $containerDumpPath = '/tmp/family-calendar-restore-' + [Guid]::NewGuid().ToString('N') + '.dump'

  try {
    $archivePath = Join-Path $workspace 'backup.zip'
    $restorePath = Join-Path $workspace 'expanded'
    $encodedArchive = Unprotect-CmsMessage -Path $latestBackup.FullName -ErrorAction Stop
    $archiveBytes = [Convert]::FromBase64String([string]$encodedArchive)
    [System.IO.File]::WriteAllBytes($archivePath, $archiveBytes)
    Expand-Archive -LiteralPath $archivePath -DestinationPath $restorePath -ErrorAction Stop

    $manifestPath = Join-Path $restorePath 'manifest.json'
    $dumpPath = Join-Path $restorePath 'database.dump'
    $storagePath = Join-Path $restorePath 'storage'
    if (-not (Test-Path -LiteralPath $manifestPath) -or -not (Test-Path -LiteralPath $dumpPath) -or -not (Test-Path -LiteralPath $storagePath)) {
      throw 'The decrypted backup archive is missing a required database, storage, or manifest file.'
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.format -ne 1) {
      throw "Unsupported backup format: $($manifest.format)."
    }

    Invoke-Docker -Arguments @('cp', $dumpPath, "${DB_CONTAINER_NAME}:$containerDumpPath") | Out-Null
    Invoke-Docker -Arguments @(
      'exec',
      $DB_CONTAINER_NAME,
      'pg_restore',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      $containerDumpPath
    ) | Out-Null
    Invoke-Docker -Arguments @(
      'cp',
      (Join-Path $storagePath '.'),
      "${STORAGE_CONTAINER_NAME}:/mnt"
    ) | Out-Null
    if (-not (Test-AuthHealth)) {
      throw 'Restore finished, but Supabase Auth health did not return HTTP 200.'
    }
    Write-BackupLog "Restored the latest encrypted backup on ${HOME_MACHINE_NAME}: $(Split-Path -Leaf $latestBackup.FullName)"
  } finally {
    try {
      Invoke-Docker -Arguments @('exec', $DB_CONTAINER_NAME, 'rm', '-f', $containerDumpPath) | Out-Null
    } catch {
      Write-BackupLog "Could not remove the temporary restore dump from the container: $($_.Exception.Message)"
    }
    if (Test-Path -LiteralPath $workspace) {
      Remove-Item -LiteralPath $workspace -Recurse -Force
    }
  }
}

$exitCode = 0
try {
  if (-not (Test-Path -LiteralPath (Join-Path $PROJECT_ROOT 'supabase\config.toml'))) {
    throw "Supabase project configuration was not found under $PROJECT_ROOT."
  }

  $script:DOCKER_PATH = Get-DockerPath
  $script:NPX_PATH = Get-NpxPath
  $script:CERTIFICATE = Get-BackupCertificate
  $backupDirectory = Get-OneDriveBackupDirectory
  Ensure-SupabaseRunning

  if ($Mode -eq 'Backup') {
    Invoke-Backup -BackupDirectory $backupDirectory
  } else {
    Invoke-RestoreIfEmpty -BackupDirectory $backupDirectory
  }
} catch {
  $exitCode = 1
  try {
    Write-BackupLog "Encrypted backup task failed: $($_.Exception.Message)"
  } catch {
    Write-Error "Encrypted backup task failed and could not write its log: $($_.Exception.Message)"
  }
}

if ($exitCode -ne 0) {
  exit $exitCode
}
