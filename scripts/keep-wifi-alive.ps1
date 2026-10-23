# 機場 Wi-Fi 的 Windows profile 名稱；如名稱有異，請只修改這一行。
$WIFI_PROFILE_NAME = 'HKG_Airport_Public'

$ErrorActionPreference = 'Stop'
$LOG_PATH = 'C:\Logs\wifi-keepalive.log'
$NETSH_PATH = Join-Path $env:SystemRoot 'System32\netsh.exe'

function Write-WifiLog {
  param([Parameter(Mandatory = $true)][string]$Message)

  $logDirectory = Split-Path -Parent $LOG_PATH
  if (-not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  }

  $timestamp = [DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss')
  Add-Content -LiteralPath $LOG_PATH -Value "[$timestamp] $Message" -Encoding UTF8
}

function Test-HostReachable {
  param([Parameter(Mandatory = $true)][string]$Target)

  try {
    return [bool](Test-Connection -ComputerName $Target -Count 1 -Quiet -ErrorAction Stop)
  } catch {
    Write-WifiLog "Ping $Target failed: $($_.Exception.Message)"
    return $false
  }
}

function Test-CaptivePortal {
  try {
    $response = Invoke-WebRequest `
      -Uri 'http://captive.apple.com/hotspot-detect.html' `
      -MaximumRedirection 5 `
      -TimeoutSec 10 `
      -UseBasicParsing

    $responseHost = $response.BaseResponse.ResponseUri.Host
    return $responseHost -ne 'captive.apple.com' -or $response.Content -notmatch 'Success'
  } catch {
    Write-WifiLog "Could not verify the captive portal response: $($_.Exception.Message)"
    return $true
  }
}

function Invoke-Netsh {
  param(
    [Parameter(Mandatory = $true)][string]$Arguments,
    [Parameter(Mandatory = $true)][string]$Action
  )

  $process = Start-Process `
    -FilePath $NETSH_PATH `
    -ArgumentList $Arguments `
    -NoNewWindow `
    -Wait `
    -PassThru

  Write-WifiLog "$Action finished with exit code $($process.ExitCode)."
  return $process.ExitCode
}

try {
  if ([string]::IsNullOrWhiteSpace($WIFI_PROFILE_NAME) -or $WIFI_PROFILE_NAME -match '["\x00-\x1F]') {
    throw 'Set a valid Windows Wi-Fi profile name in $WIFI_PROFILE_NAME at the top of this script.'
  }

  $googleReachable = Test-HostReachable -Target '8.8.8.8'
  $tailscaleReachable = Test-HostReachable -Target 'tailscale.com'
  if ($googleReachable -or $tailscaleReachable) {
    Write-WifiLog "Connectivity is available (8.8.8.8=$googleReachable; tailscale.com=$tailscaleReachable)."
    exit 0
  }

  Write-WifiLog "Both connectivity checks failed; reconnecting Wi-Fi profile '$WIFI_PROFILE_NAME'."
  $disconnectExitCode = Invoke-Netsh -Arguments 'wlan disconnect' -Action 'Wi-Fi disconnect'
  if ($disconnectExitCode -ne 0) {
    Write-WifiLog 'Disconnect returned a non-zero exit code; continuing with the connect attempt.'
  }

  Start-Sleep -Seconds 3
  $connectArguments = 'wlan connect name="{0}"' -f $WIFI_PROFILE_NAME
  $connectExitCode = Invoke-Netsh -Arguments $connectArguments -Action 'Wi-Fi connect'
  Start-Sleep -Seconds 12

  $googleReachable = Test-HostReachable -Target '8.8.8.8'
  $tailscaleReachable = Test-HostReachable -Target 'tailscale.com'
  if ($googleReachable -or $tailscaleReachable) {
    Write-WifiLog "Connectivity recovered (8.8.8.8=$googleReachable; tailscale.com=$tailscaleReachable)."
    exit 0
  }

  if (Test-CaptivePortal) {
    Write-WifiLog 'A captive portal or network sign-in page may be required; opening the Apple captive portal check.'
    Start-Process -FilePath 'http://captive.apple.com'
  } elseif ($connectExitCode -ne 0) {
    Write-WifiLog 'Wi-Fi reconnect failed and no captive portal response was detected.'
    exit 1
  } else {
    Write-WifiLog 'Wi-Fi reconnected, but both connectivity checks remain unavailable.'
    exit 1
  }
} catch {
  try {
    Write-WifiLog "Wi-Fi keep-alive failed: $($_.Exception.Message)"
  } catch {
    Write-Error "Wi-Fi keep-alive failed and could not write its log: $($_.Exception.Message)"
  }
  exit 1
}
