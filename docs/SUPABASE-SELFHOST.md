# JOE-SERVER 自託管 Supabase

本部署只包含 Supabase Postgres、Auth、Storage、PostgREST，以及只綁定 loopback 的 API gateway。資料存放在伺服器本機 `D:\docker-data\family-system`；資料庫、Auth、Storage API 不直接 publish 到外網。TLS 必須由伺服器上受控的 HTTPS reverse proxy 終止。

> 全程只使用 `@family-calendar.test` 虛構帳戶及虛構資料。不要複製真實家庭資料到此測試環境。

## 1. 伺服器準備

1. 在 JOE-SERVER 的 OneDrive 用戶端選擇 **Settings → Account → Unlink this PC**，再確認此專案和 Docker data directory 均不受 OneDrive 同步、Files On-Demand 或同步備份管理。不要把 Docker volume 放在任何同步資料夾。
2. 確認 Docker Engine／Docker Desktop 正在執行，並確認 `D:\docker-data` 位於本機磁碟且有足夠空間。
3. 在 repository 根目錄複製環境範本；保留原本 `.env` 不動：

   ```powershell
   Copy-Item .env.docker.example .env.docker
   node scripts/generate-supabase-keys.js
   ```

4. 將 key generator 輸出的 `POSTGRES_PASSWORD`、`JWT_SECRET`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 寫入 `.env.docker`。所有值都要保存在伺服器本機，切勿貼到對話、提交 Git 或寫入前端。
5. 確認 `FAMILY_DATA_ROOT=D:/docker-data/family-system`。將 `SUPABASE_PUBLIC_URL` 改為實際 HTTPS API base URL；`API_EXTERNAL_URL` 必須是同一網址加 `/auth/v1`，`SITE_URL` 是前端 HTTPS URL。`CORS_ALLOWED_ORIGIN` 設為前端精確 origin（scheme、host、port），不要用 `*`；按部署網址收窄 `ADDITIONAL_REDIRECT_URLS`。Google OAuth callback 為 `${API_EXTERNAL_URL}/callback`；只在已於 Google Console 設妥 callback URL 後，才填入本機 `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`、`GOTRUE_EXTERNAL_GOOGLE_SECRET` 並啟用 `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true`。不可使用 `.invalid` 範例網址投入使用。

`.env.docker` 已被 Git 忽略。Docker Compose gateway 只會在 `127.0.0.1:8000` 提供 HTTP；HTTPS reverse proxy 應在伺服器本機轉送 `/auth/v1/`、`/rest/v1/`、`/storage/v1/` 至該位址，並保留路徑、傳遞標準 `X-Forwarded-*` headers。不要把 8000、5432、9999、3000 或 5000 直接開放至 Internet。正式應用的 `SUPABASE_URL` 要設定成瀏覽器可到達的 HTTPS URL，而不是 `.env.docker` 內供伺服器端 seed／測試使用的 loopback URL。

## 2. 啟動服務與初始化 schema

首次部署請先確認資料目錄是全新、沒有需要保留的 database 或 Storage 資料。Postgres 首次啟動會先以 `scripts/set-docker-role-passwords.sql` 將唯一資料庫密碼設給 Auth、Storage、PostgREST 登入角色。Compose 初始化 SQL 會在 Auth 建立 `auth.users`、Storage 建立 `storage.objects` 後，依檔名次序一次套用全部現有 migrations；其中包括 Stage 3 各表 RLS、private Storage policies、審批 RPC 及後續修正。初始化 SQL 以單一 transaction 執行，失敗會 rollback。

```powershell
docker compose --env-file .env.docker -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.docker -f docker-compose.prod.yml up -d --wait
docker compose --env-file .env.docker -f docker-compose.prod.yml ps -a
docker compose --env-file .env.docker -f docker-compose.prod.yml --profile init run --rm family-init
```

必須確認 `db`、`auth`、`rest`、`storage`、`gateway` 全部健康，再確認 `family-init` 一次性命令成功。初始化服務等待 Auth/Storage/PostgREST healthcheck，避免資料庫 migrations 與 Supabase service migrations 同時執行；它只在 `public.families` 尚未建立時執行，不要用此流程覆蓋既有資料庫。後續 schema 變更要先審閱 migration、備份，再按變更程序執行，不要刪除或重建 production data volume。

Storage bucket `family-attachments` 維持 private，單一檔案上限 10 MiB；records 和 Storage 物件存取套用既有 RLS／路徑 policies。`row_version` 仍由資料庫 trigger 管理。

## 3. 虛構測試帳戶、seed 與驗證

先只在可丟棄的空白測試環境執行。設定 `.env.docker` 內兩個不同的強隨機 disposable 密碼，並保留：

```text
RLS_TEST_PROJECT_CONFIRM=I_AM_USING_A_DISPOSABLE_TEST_PROJECT
```

`npm run seed` 建立四個固定 `@family-calendar.test` Auth 帳戶（Master、Master、Worker、Pending）及兩個虛構 child profiles；重跑會重設這些測試帳戶密碼。載入 `.env.docker` 執行：

```powershell
$env:DOTENV_CONFIG_PATH = '.env.docker'
npm run seed
```

RLS 與 approval scripts 會建立／更新／刪除固定測試 fixtures，只能針對 disposable 測試資料庫執行。RLS 所有權限斷言使用 authenticated account；service role 只用於建立 fixtures，不會代替 authenticated 權限檢查。測試 URL 必須保持 `http://127.0.0.1:8000`，approval test 會拒絕非 loopback URL：

```powershell
$env:DOTENV_CONFIG_PATH = '.env.docker'
npm run test:rls
node scripts/test-approve.js
Remove-Item Env:DOTENV_CONFIG_PATH
```

不要在含有真實家庭資料的資料庫執行 seed 或測試。若測試失敗，先查 `family-init`、Auth、Storage logs；不要為了讓測試通過而停用 RLS 或使用 service role 代替 authenticated user。

## 4. 備份與日常維護

- 將 `D:\docker-data\family-system` 納入伺服器受控、加密、離線可還原的備份計劃；不要以 OneDrive 同步代替 database-aware backup。
- 部署前先備份，並定期在隔離環境實測還原；本 Compose 不會自動建立或驗證備份。
- 更新 image tag 或 schema 前先在 disposable stack 驗證 migrations、`npm run test:rls` 及 approval test；不可直接升級 PostgreSQL major version。
- `.env.docker`、key generator 輸出和備份解密材料必須分開保管。若任何 key 外洩，立即輪替 JWT secret、API keys 及資料庫密碼，並評估使舊 session 失效。

參考：[Supabase 官方 Docker 自託管指南](https://supabase.com/docs/guides/self-hosting/docker)。
