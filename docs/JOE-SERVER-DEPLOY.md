# JOE-SERVER 離線部署與 Docker image 匯入

此文件描述 JOE-SERVER Self-Host stack 的部署流程。按最新部署回報，`D:\docker-data\family-system` 仍未匯入 application data；本機 BGE 權重已另行放在 `D:\docker-data\family-rag\models`。DESKTOP 的 `C:\docker-data\family-system` 保持獨立，不會因部署而搬移。Compose image archive 只包含容器 images，不包含 `.env.docker`、key、database、Storage objects 或任何家庭資料。全程只用虛構 `@family-calendar.test` 帳戶；不要把 `.env.docker` 或真實家庭資料搬到 server。

## DESKTOP 與 JOE-SERVER：磁碟及資料庫用途

- **DESKTOP 沒有 D: 是預期配置。** 現階段 DESKTOP 開發使用 Cloud Supabase，桌面工作資料及本機工具使用 C:；如需本機 disposable stack，其資料根目錄亦使用 `C:\docker-data\family-system`。`SUPABASE_URL` 決定 app 連接 Cloud 或本機 Supabase；`FAMILY_DATA_ROOT` 只控制本機 Docker Compose self-hosted stack 的 bind mounts，不會改變 Cloud 資料位置。
- `FAMILY_DATA_ROOT` 只指定本機 Docker Compose self-hosted stack 的 bind-mount 根目錄。DESKTOP 上把它設成 D: 並執行 `export-images.ps1 -DryRun`，只會驗證 Compose image 清單和設定路徑；腳本不檢查 D: 是否存在，也不建立目錄、不搬移資料。DESKTOP 的 D: 不存在屬正常，不要為 dry-run 建立 D:。
- **JOE-SERVER D: application data 尚未匯入。** `D:\docker-data\family-system` 為目標 database/storage 根目錄；本機 `bge-small-zh-v1.5` 權重則位於獨立的 `D:\docker-data\family-rag\models`。模型檔準備不代表 Cloud/C: 資料已搬移，也不代表資料庫已有家庭資料。切換 `FAMILY_DATA_ROOT` 只改變 bind mount，不會遷移資料。

## 1. 在有 Docker images 的工作站匯出

`.env.docker` 必須已按本機範本設定，而且不要把 secrets 複製到 archive。預設由 `.env.docker` 讀取 `FAMILY_DATA_ROOT`；亦可由 process environment 明確切換兩個受支援的本機資料路徑：

```powershell
# 在 C: disposable test stack
$env:FAMILY_DATA_ROOT = 'C:\docker-data\family-system'
.\scripts\export-images.ps1

# 若此工作站有 D:，可改用 server-style data root
$env:FAMILY_DATA_ROOT = 'D:\docker-data\family-system'
.\scripts\export-images.ps1

# 先只驗證路徑、Compose image 清單和本機 image 是否齊全
.\scripts\export-images.ps1 -DryRun
```

腳本會從 `docker-compose.prod.yml` 取得固定版本 image 清單，只匯出已存在的 images，並在資料目錄下建立 `image-export\family-system-images-<timestamp>.tar`，最後顯示 SHA-256。若某個 pinned image 尚未下載，先執行：

```powershell
docker compose --env-file .env.docker -f docker-compose.prod.yml pull
```

透過受控的 LAN、加密 removable media 或其他已批准傳輸方式把 archive 傳到 JOE-SERVER；**不要用 OneDrive**。傳輸前後核對 SHA-256。不得把 archive、database volume 或 Storage volume 放到 OneDrive 同步目錄。

## 2. JOE-SERVER 準備與解綁 OneDrive

1. 在 JOE-SERVER 的 OneDrive client 開啟 **Settings → Account → Unlink this PC**。確認 Docker data、image archive 和本 repository 不受 OneDrive／Files On-Demand 同步。
2. 確認 `D:` 是本機持久磁碟，並建立資料根目錄：

   ```powershell
   New-Item -ItemType Directory -Force -Path 'D:\docker-data\family-system' | Out-Null
   ```

3. 把 repository 放在本機非同步目錄；不要放在 OneDrive。切換 Compose bind mount 路徑：

   ```powershell
   $env:FAMILY_DATA_ROOT = 'D:\docker-data\family-system'
   ```

4. 匯入 images。將 `-i` 參數換成實際傳送到 server 的檔案路徑：

   ```powershell
   docker image load -i 'C:\transfer\family-system-images-YYYYMMDD-HHMMSS.tar'
   Get-FileHash 'C:\transfer\family-system-images-YYYYMMDD-HHMMSS.tar' -Algorithm SHA256
   ```

5. 確認 image archive SHA-256 與匯出端一致，再移除 transfer copy；勿把 key 或 env file 放進 archive。

## 3. 建立 server 專用 secrets 與 `.env.docker`

在 repository 根目錄以 `.env.docker.example` 建立 server 專用 `.env.docker`。不要複製本機 C: 測試用 `.env.docker`：

```powershell
Copy-Item .env.docker.example .env.docker
node scripts/generate-supabase-keys.js
```

把 generator 輸出的 `POSTGRES_PASSWORD`、`JWT_SECRET`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 寫入 `.env.docker` 對應欄位。另設定兩個新的、強隨機且僅供 disposable fake accounts 的 `SEED_TEST_USER_PASSWORD` 及 `RLS_TEST_PASSWORD`。不要沿用 C: 本機測試的 key/password，不要把任何值貼到 terminal logs、聊天或 Git。

最少必須確認：

```text
FAMILY_DATA_ROOT=D:/docker-data/family-system
SUPABASE_URL=http://127.0.0.1:8000
SUPABASE_PUBLIC_URL=https://<實際 API 網址>
API_EXTERNAL_URL=https://<實際 API 網址>/auth/v1
SITE_URL=https://<實際前端網址>
CORS_ALLOWED_ORIGIN=https://<實際前端 origin>
RLS_TEST_PROJECT_CONFIRM=I_AM_USING_A_DISPOSABLE_TEST_PROJECT
```

編輯 `API_EXTERNAL_URL`、`SITE_URL`、`CORS_ALLOWED_ORIGIN` 和 redirect allow list 為真實 HTTPS 網址；`CORS_ALLOWED_ORIGIN` 必須只填瀏覽器前端的精確 origin（scheme、host、port），不可設成 `*`。不要使用範例 `.invalid` 網域。`SUPABASE_PUBLIC_URL` 必須是 browser 可到達的公開 HTTPS Supabase base URL。只有在 Google OAuth callback 已設定為 `${API_EXTERNAL_URL}/callback` 後，才啟用 Google OAuth 並設定 provider secrets。

## 4. 啟動 stack、初始化、seed 與驗證

僅限新建、可丟棄的空白測試資料目錄。這些測試會建立和修改虛構帳戶與 fixtures。

```powershell
$env:FAMILY_DATA_ROOT = 'D:\docker-data\family-system'
docker compose --env-file .env.docker -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.docker -f docker-compose.prod.yml up -d --wait
docker compose --env-file .env.docker -f docker-compose.prod.yml ps
docker compose --env-file .env.docker -f docker-compose.prod.yml --profile init run --rm family-init

$env:SUPABASE_URL = 'http://127.0.0.1:8000'
$env:DOTENV_CONFIG_PATH = '.env.docker'
Remove-Item Env:SUPABASE_ANON_KEY, Env:SUPABASE_SERVICE_ROLE_KEY, Env:SEED_TEST_USER_PASSWORD, Env:RLS_TEST_PASSWORD, Env:RLS_TEST_PROJECT_CONFIRM, Env:FAMILY_ID -ErrorAction SilentlyContinue
npm ci
npm run seed
node scripts/test-rls.js
node scripts/test-approve.js
```

RLS 測試必須顯示 `All 15 DB_DESIGN.md RLS security tests passed.`；approval test 必須顯示三項 passed。service role 僅負責 fixture setup，RLS 權限斷言使用 authenticated identities。

`family-init` 只在 `public.families` 尚未建立時套用 `scripts/init-family.sql`。已初始化資料庫不得重播非 idempotent migrations；production schema update 必須使用經審查的 migration 及事前備份，不能刪除／重建 data directory。

本機驗證時可直接以 `.env.docker` 啟動，`PORT=3002`。正式部署時，瀏覽器無法使用 server 上的 loopback `SUPABASE_URL`；在 server 上以 HTTPS reverse proxy 的公開 base URL 覆寫該變數，再啟動 app：

```powershell
$env:DOTENV_CONFIG_PATH = '.env.docker'
$env:SUPABASE_URL = 'https://<公開 Supabase base URL>'
npm start
```

`dotenv` 會從 `.env.docker` 載入 anon key、family ID 和 PORT，同時保留 process environment 已設定的公開 `SUPABASE_URL`。確認 `http://localhost:3002/health`、`http://localhost:3002/api/health` 和 `http://localhost:3002/login` 回應成功。`FAMILY_DATA_ROOT` 只控制 Docker bind mount；production browser 不可使用 loopback URL。執行測試時要把 URL 固定為 `http://127.0.0.1:8000`，並清除 shell 中可能繼承的 key，避免誤連非 disposable project。

## Family Memory 本機模型

Family Memory 的模型檔只從本機載入，不會由 runtime 連外下載。Node.js 預設模型目錄為 C: disposable 環境的 `C:\docker-data\family-rag\models`；JOE-SERVER 應在 `.env.docker` 設定 `FAMILY_RAG_MODEL_ROOT=D:\docker-data\family-rag\models`。此變數優先於舊的 `FAMILY_RAG_MODEL_PATH`；如兩者均未設定，程式回退至 C: 預設值。Node.js 使用 Transformers.js 本機 ONNX 模型；`scripts/rag/embed_worker.py` 提供 Python SentenceTransformers 批次工具，依賴安裝方式為 `python -m pip install -r requirements.txt`。

本機 BGE 輸出為正規化 512 維向量；只有指定目錄包含 `config.json` 時才會嘗試載入，Transformers.js 設定 `local_files_only: true` 並停用 remote models，不會下載模型。模型目錄或設定檔不存在、載入／推論失敗時，會清楚記錄 placeholder 並以舊 384 維本機 feature-hash 暫代；不可描述為 BGE 語義搜尋。DESKTOP C: 預設目錄目前未安裝模型，因此執行時預期為 placeholder；JOE-SERVER 的六個本機模型檔及 512 維載入狀態屬部署回報，應在 server 按 [JOE-SERVER-REAL-RAG.md](./JOE-SERVER-REAL-RAG.md) 重驗。程式分別使用 384 維 `embedding` 與 512 維 `embedding_bge`，不可混用。`/chat` 在瀏覽器本機讀取 `.txt`／`.md` 及 PDF 內嵌文字（不做 OCR、不上傳原檔），按 1,000 字元、200 字元重疊逐段送到登入保護的 `/api/memories/ingest`；不使用 Storage upload。提醒 scheduler 由後端每 15 分鐘檢查一小時內未完成提醒，只記錄提醒 ID、家庭 ID 及到期時間，不發送外部通知。批次上限 64 筆、每筆文字上限 12,000 字元；cosine search 使用 0.4 門檻、資料庫最多取 12 筆，`/chat` 最多顯示 5 張引用卡。`npm run test:family-memories` 覆蓋 64/65 筆及 12,000/12,001 字元邊界；`npm run test:reminders` 覆蓋到期排序與完成切換。`scripts/init-family.sql` 由所有 migrations 按檔名排序產生，只有一組外層 `BEGIN`／`COMMIT`；已初始化資料庫只可用於 schema 檢查，不可重播該 bundle。部署前只使用 `@family-calendar.test` 虛構資料。

私人記憶加密方案仍未決（見 `source/DB_DESIGN.md` 第 6 節）；目前資料只受既有 RLS 保護，未宣稱已加密。`pgcrypto` 只列為待評估候選，須先核准儲存、解鎖、搜尋與金鑰管理設計；現階段不新增加密欄位或改動既有 `content` 讀寫。

## 5. TLS、網路及持續運行

- Compose gateway 只綁 `127.0.0.1:8000`；Postgres、Auth、PostgREST、Storage 均不直接 publish 到 host。
- 在 JOE-SERVER 受控設定 HTTPS reverse proxy，僅代理 `/auth/v1/`、`/rest/v1/`、`/storage/v1/` 至 loopback gateway，保留路徑與 forwarded headers。不要對 Internet 開放 5432、8000、9999、3000、5000。
- Caddy gateway 內部只提供 HTTP；TLS 由已設定且測試過的 reverse proxy 終止。不可把 HTTP-only gateway 當作 public endpoint。
- 建立加密、獨立於 OneDrive 的 Postgres-aware backup 與 private Storage 備份／還原演練。images tar 不是資料備份。
- 定期確認 `docker compose ps` health、`http://localhost:3002/health`、disk space、backup freshness 和還原能力；不要把 service-role key 放入瀏覽器或一般 API request。
