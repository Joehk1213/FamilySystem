# DT-LIVING-WALL WORKFLOW - 2026-11-01 FINAL LOCKED 繁體

## 0. 鐵律 (RULE 1-7)
- 只改 3 檔: public/index.html / public/mvp-pages.js / public/styles/home.css
- 永不讀取 D: / D:\docker-data / .env.docker / D:\backup\.env.docker.prod-backup
- profile_id active only，ownership，pgcrypto pgp_sym_encrypt aes256 SECURITY INVOKER
- 384D vs 512D threshold 0.4，anon+JWT+RLS 永不用 service_role
- CORS 白名單：localhost:3002、127.0.0.1:3002、joe-server:3002，no-Origin 200，未列入 403，永無 *

## 1. 防 DATA LOST 四寶
1. 絕不用 git checkout -- public/ 洗版，用 git stash
2. 改之前必備份：scripts\backup-living-wall-rescue.ps1
3. 檔案鎖死 EACCES 時：
   takeown /f public /r /d y
   icacls public /grant "%USERNAME%":F /t
   attrib -R public\*.* /S
4. ps1 被攔截：
   Unblock-File .\scripts\*.ps1
   powershell -ExecutionPolicy Bypass -File .\scripts\backup-living-wall-rescue.ps1

## 2. SAVE PATCH 標準流程（已修復純 ASCII 版）
cd C:\Project\Family\FamilySystem
Unblock-File .\scripts\backup-living-wall-rescue.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\backup-living-wall-rescue.ps1

預期結果：
SAVE OK -> C:\backup\PJ2-FamilySystem\DT-LIVING-WALL-RESCUE-20261101.patch
Length=24664（救援版 +464 -302 正確，不是 0）
3 files changed, 464 insertions(+), 302 deletions(-)

驗證 Patch 可還原：
git apply --check C:\backup\PJ2-FamilySystem\DT-LIVING-WALL-RESCUE-20261101.patch

鎖死為最終版：
Copy-Item C:\backup\PJ2-FamilySystem\DT-LIVING-WALL-RESCUE-20261101.patch C:\backup\PJ2-FamilySystem\DT-LIVING-WALL-FINAL-LOCKED-20261101.patch -Force

## 3. RESTORE 還原流程
cd C:\Project\Family\FamilySystem
git stash push -m "temp" --keep-index
git apply C:\backup\PJ2-FamilySystem\DT-LIVING-WALL-RESCUE-20261101.patch
# 或
git apply C:\backup\PJ2-FamilySystem\DT-LIVING-WALL-FINAL-LOCKED-20261101.patch

## 4. 驗收（每次改完必跑）
node --check public/mvp-pages.js
git diff --check -- public/index.html public/mvp-pages.js public/styles/home.css
# 啟動
$env:PORT='3002'; npm run dev
# 瀏覽器
http://127.0.0.1:3002/?v=rescue20261101  Ctrl+Shift+R
- 48px 頂欄 FAMILY CALENDAR 鈴鐺 1 Master
- 12 張 Unsplash 公開相 80-220px 0.35-0.65 8-15s 慢漂 pointer-events:none hover 0.65 輸入時 0.15
- 中心 520px 浮卡 white 0.92 blur 12px radius 24px
- 無 3 個 chips 無 checkbox，其他功能收於 <details> 更多功能
- CSS 200，CORS 3 個來源明確放行，無 *

## 5. 新 Session 起手 Prompt（直接複製貼上，繁體）
```
我會先確認工作樹及需求文件，再只改指定三個前台檔案；不會讀取 D: 或 .env.docker。
目標：背景係主層 12張公開家庭照 120-280px radius 20px opacity 0.35-0.65 8-15s drift Ken Burns 0.9->1.25 pointer-events:none，輸入係第二層 520px 置中浮層 white 0.92 blur 12px radius 24px。保留 公開•家庭成員可見 + placeholder 例如：呢個星期六全家去銅鑼灣食飯 + 加入相片或附件 10MB + 整理預覽，移除 3 個 quick chips + checkbox 確認非私人。頂欄 48px 鈴鐺1 Master，底部 <details> 收埋其他功能。/ 同 /# 共用同背景。
只改 public/index.html, public/mvp-pages.js, public/styles/home.css。先跑 scripts\backup-living-wall-rescue.ps1，確認 Length>20000 先改。
```

## 6. 當前已鎖定版本
- HEAD 7bcf0f8（唔係 4999a73，唔好 reset）
- DT-LIVING-WALL-RESCUE-20261101.patch 24664 bytes +464 -302 已鎖死，80分救援版
