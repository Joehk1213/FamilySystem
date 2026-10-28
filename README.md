# Family Calendar System MVP

> 日期：2026-10-21
> 用途：放入 VS Code + GitHub Copilot 嘅 project repo，作為生成 project 基礎嘅依據

## 專案使用方式

1. 喺 VS Code 開啟 `Family Calendar System MVP` 專案資料夾作為 repo 根目錄
2. 開 VS Code，Copilot 會自動讀取 `.github/copilot-instructions.md`（repo 級指令，適用所有 chat 請求）
3. 叫 Copilot 按 `source/BUILD_PLAN.md` 順序逐個 task 做，每個 task 開始前先讀 `source/` 入面嘅文件

## 閱讀次序

1. `source/PRD_MVP.md` — MVP 做乜、唔做乜
2. `source/DB_SCHEMA_DRAFT.sql` + `source/DB_DESIGN.md` — 資料庫結構同權限規格
3. `source/CONVENTIONS.md` — 代碼規範
4. `source/REFERENCES.md` — 參考項目（tutorial repo）可借鏡嘅結構模式
5. `source/BUILD_PLAN.md` — 生成次序

## 狀態標示

- 【已確認】：用戶已拍板嘅需求
- 【建議方案】：基於已確認答案整理嘅建議
- 【沿用草案】：Excel v2 原有嘅技術選擇，未重新確認
- 【待確認】：未決定（例如：私人日記私隱層次、MFA 實作）

## 重要提醒

- `DB_SCHEMA_DRAFT.sql` 係**未驗證草稿，唔係正式 migration**：RLS 政策同審批函式仲未實作，要按 `DB_DESIGN.md` 第 7 節測試清單實作並通過
- 開發全程只用**假資料**；唔好放真實個人資料（相片、地址、證件）入開發環境
- 已核實嘅原生 Copilot 指令入口係 `.github/copilot-instructions.md`（見 [VS Code 官方文件](https://code.visualstudio.com/docs/agent-customization/custom-instructions)）；原本嘅 `system-prompt.json`、`gpt-6luna` 型號同入面嘅參數係咪受你用緊嘅擴充套件支援，仍須自行確認 —— 規則已經搬晒入 `.github/copilot-instructions.md`，原 JSON 可以留俾其他工具用

## 階段 2：本地資料庫與測試種子

Migration `supabase/migrations/20261022000000_initial_schema.sql` 由未驗證草稿複製而來，只可先套用到本地或測試 Supabase project。它會啟用 schema 草稿指定的 RLS，並建立 private `family-attachments` bucket；目前沒有 `storage.objects` 放行政策，所以物件讀寫預設全部拒絕。待階段 3 建立 `can_read_record` 並通過權限測試後，才加入按記錄權限和 object path 驗證的 Storage 政策。此 migration 不可視為已驗證的正式 schema。

1. 安裝 Supabase CLI，並在 repo 根目錄執行 `npx supabase init` 建立 CLI 設定檔；若已有 `supabase/config.toml`，毋須重複初始化。
2. 使用本地 Supabase 時，執行 `npx supabase start`，再執行 `npx supabase db reset` 套用 migrations。只用測試 project 時，先執行 `npx supabase login`，再執行 `npx supabase link --project-ref PROJECT_REF`，將 `PROJECT_REF` 換成測試 project ref，最後執行 `npx supabase db push`。
3. 複製 `.env.example` 為 `.env`，填入測試 project 的 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`，並設定只供虛構測試帳戶使用的 `SEED_TEST_USER_PASSWORD`。不可使用真實帳戶密碼；`.env` 已加入 `.gitignore`。
4. 在 repo 根目錄執行 `npm run seed`。腳本只會建立或更新固定的 `@family-calendar.test` Auth 帳戶、profiles、Test Family 和六位成員，不會刪除資料。每次重跑會把四個測試帳戶密碼重設為 `SEED_TEST_USER_PASSWORD`。

種子腳本只在手動執行時使用 `SUPABASE_SERVICE_ROLE_KEY`，不得放入前端或一般伺服器請求。執行前必須先套用 migration；migration 和種子資料尚未連接 Supabase project 實測。

## 階段 3：RLS 權限驗證

Migration `supabase/migrations/20261022000100_rls_policies.sql` 實作記錄讀寫判斷、核心資料表 RLS、跨家庭關聯防護、私有 Storage 物件政策，以及受控 `approve_schedule_change` 函式。沒有明確放行政策的操作（例如一般用戶刪除 family member、直接更新/刪除改行程請求）會被 RLS 預設拒絕；受控 service-role 管理不屬一般用戶請求。先在隔離的本地或測試 project 套用全部 migrations；不要把未完成測試的權限規則部署到正式資料。

角色初始化注意：`DB_DESIGN.md` 指定初始 Admin 需由 service role 建立，但階段 2 測試家庭只建立 Master/Worker/Pending 成員。不要自行把 Master 改成 Admin；正式測試流程要先按核准的帳戶安排建立一位 Admin，否則沒有 authenticated 使用者可以審批 `family_members`。

在 `.env` 設定上述測試 project 的 URL/key，另設只供虛構測試帳戶使用的 `RLS_TEST_PASSWORD`，並把 `RLS_TEST_PROJECT_CONFIRM` 設為 `I_AM_USING_A_DISPOSABLE_TEST_PROJECT`，然後執行 `node scripts/test-rls.js`。腳本以 service role 建立固定虛構測試家庭、身份及 fixture；所有權限斷言都使用各測試帳戶登入後取得的 authenticated client。測試會建立測試帳戶和資料，請只在可丟棄的本機／測試 project 執行。RLS 測試目前有 15 項檢查，包括 Guest 唯讀、私密日記隔離、不可讀行程的 Worker 申請及附件 10 MiB 限制；Guest 修改請求權限缺口會令測試失敗，須先修正 RLS migration 才可視為全綠。

## MVP 1.0 雙 Notebook 快速開始

JOE-SERVER 自託管 Supabase（Postgres、Auth、Storage、PostgREST）設定及安全部署步驟見 [自託管部署指南](docs/SUPABASE-SELFHOST.md)；無網路映像匯出／匯入流程見 [JOE-SERVER 部署指南](docs/JOE-SERVER-DEPLOY.md)。此部署使用獨立的 `.env.docker`；不要覆寫現有 `.env`。

## 已批准擴展：Family Memory 原型

登入後可由 `/chat` 開啟家庭記憶介面；文字、`.txt`／`.md` 及 PDF 只會送到本機 Family Calendar API 和目前設定的 Supabase，不會呼叫 OpenRouter 或其他 AI 服務。檔案在瀏覽器本機讀取，`.txt`／`.md` 上限為 64 KB，PDF 上限為 5 MB；本機 vendored PDF.js 只擷取 PDF 內嵌文字，不做 OCR，原始檔不會上載至 Storage。非空文字按每段 1,000 字元、重疊 200 字元分段後寫入。日曆記錄及私人日記不會自動匯入；日曆、未來 7 日行程及管家提醒仍在 `/today`。

Migrations `20261028000001_family_memories.sql` 至 `20261028000003_family_memory_metrics.sql` 建立 pgvector `family_memories`、家庭提醒及 cosine/L2/inner-product 搜尋；`20261028000002_reminders.sql` 使用既有 active-family RLS helper，並拒絕跨家庭 MEMORY 關聯。`/today` 顯示未來 7 日可讀行程、按到期時間排序的未完成管家提醒（含剩餘時間及可用的來源引用），以及最近 5 條 MEMORY（含來源、建立時間；只有實際搜尋結果才有距離）。Embedding 會嘗試由本機 `FAMILY_RAG_MODEL_PATH`（未設定時按 `FAMILY_DATA_ROOT` 推導，C: 預設 `C:\docker-data\family-rag\models`，JOE-SERVER D: 為 `D:\docker-data\family-rag\models`）載入 bge-small-zh-v1.5；不會連外下載模型或呼叫 AI API。模型缺失、載入失敗或輸出維度不符時，會記錄 `using placeholder` 並回退至 384 維 normalized feature-hash；提醒 scheduler 每 15 分鐘只記錄本機 log，不發送外網通知。不得聲稱已載入權重。資料只有 RLS 隔離、沒有端對端或資料庫加密；只准用虛構 `@family-calendar.test` 資料。

在本機 disposable stack 啟動應用後，可用 `$env:DOTENV_CONFIG_PATH='.env.docker'; npm run test:family-memories` 驗證 authenticated API、同家庭 Worker、pending 隔離及搜尋；測試只建立並清除虛構 fixture。Gateway 的 `CORS_ALLOWED_ORIGIN` 必須設定成唯一的瀏覽器前端 origin，不可設成 `*`。

本文按**公司 Notebook 為 Primary、屋企 `JOE-Desktop` 為 recovery node**。兩部機各自運行本機 Supabase；OneDrive 傳送 CMS 加密備份，唔係即時複寫。完整架構、Tailscale 限制、憑證安裝及 Only-if-empty 還原流程見 [雙 Notebook 設定](docs/DUAL_NB_SETUP.md)。

Primary 本機開發：

```powershell
npm ci
npx supabase start
# 以 npx supabase status -o env 取得本機設定，存入本機 .env；唔好提交或分享 key。
npm run seed
npm run dev
```

本機帳戶及測試密碼見 [家庭使用指南](docs/FAMILY_USER_GUIDE.md)。確認本機 Supabase 測試環境後，執行：

```powershell
node scripts/test-rls.js
node scripts/test-approve.js
```

GitHub Actions 的 [MVP CI](.github/workflows/mvp-ci.yml) 會在 runner 啟動本機 Supabase、seed 虛構帳戶，再執行兩個 Node 測試；不使用 Playwright。

## 工作排程器身份分工

| 工作 | 身份 |
|---|---|
| Wi‑Fi 啟動／每 5 分鐘檢查 | 已登入的互動式使用者，Captive Portal 才可開瀏覽器 |
| Supabase watchdog | SYSTEM；若 Docker Desktop 是 per-user，SYSTEM 可能無法連 Docker daemon |
| OneDrive 備份（每 4 小時） | 已登入 OneDrive 的使用者，需 Docker、Node/npm 及 CMS 公鑰 |
| `JOE-Desktop` 還原 | 屋企使用者登入後延遲執行，需 OneDrive 與 `CurrentUser\My` 私鑰；先還原再跑該機首次備份 |

Wi‑Fi profile 保持 `PENDING_CONFIRM HKG_Airport_Public`，本次沒有更改 profile 或 PowerShell 核心腳本。工作排程器詳細設定見 [Wi‑Fi 與備份排程文件](docs/WIFI_AUTORECONNECT.md)。

目前環境沒有 `.env`、Supabase CLI 或資料庫連線，因此 migration/RLS 測試尚未連線執行；JavaScript 語法檢查不代表資料庫權限已通過。

## 階段 4：登入與角色申請

1. 在 `.env` 設定 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`FAMILY_ID` 及 `PORT`。`FAMILY_ID` 必須是這個單家庭應用所屬的 `families.id`；`/api/config` 只會回傳 Supabase URL、anon key 和 family UUID，不會回傳 service-role key。靜態頁面以 esm.sh 載入固定版本 `@supabase/supabase-js`，瀏覽器需能連線至該 CDN。
2. 在 Supabase Auth 啟用 Google provider，並按 Supabase/Google OAuth 設定填妥 OAuth client；把本機 `http://localhost:3000`（部署時用實際 HTTPS 網址）加入 Auth redirect URLs，Google OAuth callback 使用 Supabase 專案提供的 callback URL。
3. 執行 `npm start`，開啟 `http://localhost:3000`。登入後前端會以 authenticated client 查詢 `profiles` 和 `family_members`。沒有成員申請的用戶可提交 master、worker 或 guest 申請；資料庫註冊 trigger 負責自動建立 profile。
4. `pending` 只顯示申請狀態，`disabled` 只顯示停用狀態；兩者均不呈現系統功能。Admin 可批准（`status=active`、`role=requested_role`）或拒絕（因 schema 沒有 rejected 狀態，設為 `disabled`）。按 DB_DESIGN 的 family_members UPDATE RLS，Master 可檢視申請但不可批准或拒絕；審批保留登入者 JWT，沒有使用 service role。
5. 所有登入狀態均可登出；成功登出後導回 `/`。Worker（包括正在申請 Worker 的用戶）介面使用英文，其餘使用繁體中文（香港）。

Admin 初始化仍需先以受控 service-role 初始化程序建立；階段 2 的虛構 seed 依建造計劃只建立 Master/Worker/Pending 成員，並不會自動提供可登入審批的 Admin。不得把 service-role key 放入瀏覽器。

## 階段 5：Records CRUD

1. 確認已套用 Schema 和 RLS migrations，並在 `.env` 設定 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`FAMILY_ID`；一般伺服器請求不讀取或使用 `SUPABASE_SERVICE_ROLE_KEY`。
2. 啟動 `npm start` 並以已批准的 Google 帳戶登入。記錄 API 會驗證 `Authorization: Bearer <user JWT>`，再用 Supabase anon key 加使用者 JWT 查詢資料；資料庫 RLS 仍是最終權限檢查。
3. `GET /api/records` 依 RLS 載入可見記錄及附件資料；`POST /api/records` 新增記錄；`PATCH /api/records/:recordId` 編輯；`DELETE /api/records/:recordId` 刪除記錄及 private Storage 物件；`POST /api/records/:recordId/attachments` 上載附件。所有端點均回傳 `{ success, data, message }`。
4. Master/Admin 可建立有效的 plan/schedule 或 experience 類型；Worker 僅可建立 experience/diary 或 experience/photo，並只可編輯自己建立且可編輯的記錄。可關聯計劃必須是同家庭、且目前使用者可讀取的 plan。Guest 不可新增或修改記錄。
5. 附件每個最多 10 MB，存放路徑為 `{family_id}/{record_id}/{filename}`，bucket `family-attachments` 維持 private。上載後同時寫入 `attachments` metadata；Metadata 寫入失敗時會嘗試移除剛上載的 Storage object。

私人記錄仍只依現有 RLS 限制讀取；私人日記的應用層隔離／用戶端加密方案未決，相關程式保留 TODO，未視為安全方案已驗收。記錄刪除涉及 Storage 與 Postgres 兩個服務，非單一 transaction；若 Storage object 已移除但資料列刪除失敗，需檢視伺服器錯誤並重新上載附件。此階段目前未連線 Supabase project，因此真實 RLS/Auth/Storage 行為仍需在 disposable test project 驗證。

## FR011：行程修改申請與審批

> `BUILD_PLAN.md` 將 FR011 列於階段 7；以下按功能名稱記錄，不更改該計劃文件。

1. Worker 只會在自己可讀取的非私人 plan 上看到「申請修改行程」。表單只送出勾選欄位，白名單為 `title`、`content`、`event_start`、`event_end`、`is_all_day`、`status`。
2. 前端使用登入者 Supabase client 插入 `schedule_change_requests`，傳入當前 plan 的 `row_version` 及登入者 ID。RLS/trigger 仍會驗證身份、家庭、plan、可見性、白名單與版本；版本已變更時會拒絕舊請求。
3. Admin/Master 以 authenticated client 查詢本家庭 pending queue。批准及拒絕都只呼叫 `approve_schedule_change(request_id, approve, note)`；不會直接更新 `schedule_change_requests` 或 `records`。函式負責鎖定、權限、版本核對及白名單套用。
4. Queue 可手動重新載入。現有 Schema 沒有通知表／通知服務，因此提供佇列但不發送推播或電郵。Supabase OAuth/RLS/RPC 尚未在本機測試 project 實測。

## FR011：行程修改申請與審批

> `BUILD_PLAN.md` 將 FR011 列於階段 7；以下按功能名稱記錄，不更改該計劃文件。

1. Worker 只會在自己可讀取的非私人 plan 上看到「申請修改行程」。表單只提交使用者勾選的欄位，白名單為 `title`、`content`、`event_start`、`event_end`、`is_all_day`、`status`；其他欄位不會寫入。
2. 前端以登入者 Supabase client 插入 `schedule_change_requests`，記錄當前 plan 的 `row_version` 及 `requested_by`。資料庫 trigger/RLS 仍會驗證家庭、plan、可見性、身份、白名單與版本；版本已變更時需重新載入最新行程再申請。
3. Admin/Master 以 authenticated client 查詢本家庭的 pending queue。批准及拒絕都只呼叫 `approve_schedule_change(request_id, approve, note)`；不會直接更新 `schedule_change_requests` 或 `records`。資料庫函式負責鎖定、權限、版本核對及白名單套用。
4. Queue 可手動重新載入。現有 Schema 沒有通知表／通知服務，因此本階段提供佇列而不發送推播或電郵；Supabase OAuth/RLS/RPC 尚未在本機測試 project 實測。
