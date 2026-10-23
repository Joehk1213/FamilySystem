# Windows Wi‑Fi、Supabase 及加密備份排程

本文件只說明如何在 Windows 工作排程器建立排程；腳本不會自行建立排程，也不應在未設定 Wi‑Fi profile 或 CMS 憑證前執行。

## 先設定

1. 在 [keep-wifi-alive.ps1](../scripts/keep-wifi-alive.ps1) 最頂部確認 `$WIFI_PROFILE_NAME`。目前值 `HKG_Airport_Public` 尚待核實；星期一可先執行 `netsh wlan show profiles`，再只改這一行。
2. 以已登入的 OneDrive 使用者設定 [backup-encrypted.ps1](../scripts/backup-encrypted.ps1) 最頂部 `$CMS_CERT_THUMBPRINT`。公司機及屋企機需安裝同一張 CMS 憑證的公鑰；屋企機 `JOE-Desktop` 必須保留私鑰。
3. OneDrive 需可在該使用者工作階段存取；備份放在 `%OneDrive%\FamilyCalendarBackup\` 或 `%OneDriveCommercial%\FamilyCalendarBackup\`。
4. 先手動確認 `docker ps`、`npx supabase start` 在目標 Windows 帳戶可用。Supabase watchdog 需要 `docker.exe`、`npx.cmd` 及 repo 的 `supabase\config.toml`。

## 建立 CMS 憑證

在屋企機 `JOE-Desktop` 以將執行備份工作的 Windows 帳戶開 PowerShell。`Protect-CmsMessage` 需要文件加密憑證；只設定 `DataEncipherment` 不足以明確設定 CMS 用途，因此建立憑證時指定 `DocumentEncryptionCert` 及兩種加密用途：

```powershell
$cert = New-SelfSignedCertificate `
  -Subject 'CN=FamilyCalendarBackup' `
  -Type DocumentEncryptionCert `
  -KeyUsage KeyEncipherment, DataEncipherment `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -KeyExportPolicy Exportable

$publicCertificatePath = Join-Path $env:USERPROFILE 'Desktop\FamilyCalendarBackup.cer'
Export-Certificate -Cert $cert -FilePath $publicCertificatePath
$cert.Thumbprint
```

此設定允許匯出私鑰；備份流程只需要 `.cer` 公開憑證，請勿匯出 PFX 或把私鑰搬到公司機。若要由 Windows 強制私鑰不可匯出，將 `-KeyExportPolicy Exportable` 改成 `NonExportable`；`Export-Certificate` 仍只會匯出公鑰。

把 `$publicCertificatePath` 的 `.cer` 檔複製到公司機，並把輸出的 thumbprint 設到兩部電腦的 `$CMS_CERT_THUMBPRINT`。公司機只需匯入公開憑證：

```powershell
Import-Certificate `
  -FilePath (Join-Path $env:USERPROFILE 'Desktop\FamilyCalendarBackup.cer') `
  -CertStoreLocation 'Cert:\CurrentUser\My'
```

私人金鑰只留在屋企機，不要匯出到 OneDrive、repo 或聊天。備份腳本先在 `%TEMP%` 建立暫存 dump/archive，完成後會清理；請在兩部電腦啟用 BitLocker，並確保 OneDrive 資料夾已設為「一律保留在此裝置上」。

## Wi‑Fi：兩個工作

`Start-Process http://captive.apple.com` 只會開啟 Captive Portal 檢查頁；如機場 Wi‑Fi 要求登入，仍需使用者完成登入。故 Wi‑Fi 工作必須使用可互動的已登入帳戶，不能設為 SYSTEM／「不論使用者是否登入」。

建立兩個工作，兩者都執行：

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\完整路徑\scripts\keep-wifi-alive.ps1"
```

1. **Family WiFi - Startup**：觸發條件選「啟動時」；安全性選「只在使用者登入時執行」，帳戶用目前連接機場 Wi‑Fi 的 Windows 使用者。
2. **Family WiFi - 5 min**：觸發條件選「啟動時」，進階設定勾選「重複工作間隔 5 分鐘」，持續時間選「無限期」；使用相同帳戶及「只在使用者登入時執行」。

使用者未登入時無法顯示 Captive Portal 登入頁。若只有一個 ping 目標無回應，腳本不會斷線重連；只有 `8.8.8.8` 和 `tailscale.com` 都無回應時才重連。Log：`C:\Logs\wifi-keepalive.log`。

## Supabase watchdog

建立 **Family Supabase - Startup** 工作，執行：

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\完整路徑\scripts\keep-supabase-alive.ps1"
```

觸發條件選「啟動時」，安全性選 SYSTEM／「以最高權限執行」。腳本會檢查 `supabase_db_Family_Calendar_System_MVP`；缺少時執行 `npx supabase start`，Auth health 非 HTTP 200 時執行 `npx supabase stop` 再 `npx supabase start`。如 Docker Desktop 是 per-user 安裝，SYSTEM 可能無法連上 Docker daemon；若測試失敗，請把此工作改為 Docker Desktop 所屬使用者並勾「以最高權限執行」。Log：`C:\Logs\supabase-keepalive.log`。

如需定期 watchdog，可在此工作加上重複觸發；先確認 Docker daemon、Node/npm 及 repo 路徑在該工作身份下都可用。

## 每 4 小時加密備份

在公司機及屋企機分別建立 **Family Calendar - Backup** 工作，執行：

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\完整路徑\scripts\backup-encrypted.ps1" -Mode Backup
```

觸發條件選「每天」，進階設定選「每 4 小時重複」，持續時間「無限期」。使用有 OneDrive 同 CMS 憑證的 Windows 帳戶執行，不要用 SYSTEM。腳本會以 CMS 加密 Postgres dump 及 `family-attachments` Storage volume，輸出 `.cms` 檔案到 `FamilyCalendarBackup`；不會自動刪除舊備份。請監察 OneDrive 空間。

資料庫 dump 與 Storage volume 不是同一個原子快照；備份時應避免新增／刪除記錄或附件。若資料庫已有家庭、帳戶、記錄或 Storage 物件，還原腳本會拒絕覆蓋。

## 屋企機開機還原

只在 `JOE-Desktop` 建立 **Family Calendar - Restore** 工作，執行：

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\完整路徑\scripts\backup-encrypted.ps1" -Mode RestoreIfEmpty
```

使用有 CMS 私鑰及 OneDrive 的同一個 Windows 帳戶；觸發條件選登入時，建議延遲 2 分鐘讓 OneDrive 同步最新備份。還原只會在本機資料庫及 Storage 都是空的情況執行。若已有資料，腳本只會寫 log 並跳過，不會覆蓋。Log：`C:\Logs\family-calendar-backup.log`。

所有腳本均只針對本機 Supabase；未驗證排程器身份、Docker 權限、CMS 憑證及 OneDrive 同步前，不要設定成自動執行。
