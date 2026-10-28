# Family System Overnight Progress

## 2026-10-28
- 02:53 HKT — 開始 JOE-SERVER 自託管 Supabase 部署工作；已確認工作樹原先乾淨、現有 migrations 包含 Stage 3 RLS/Storage policies。發現 repo `.env` 指向既有遠端 Supabase；本次不讀取其憑證、不會用該資料庫執行 seed 或測試。
- 03:09 HKT — 完成 pinned Supabase Compose 設定、loopback API gateway、首次啟動角色密碼初始化、9 個 migrations 合併 SQL、環境範本及部署指南。`npm ci`、Compose config、Node syntax、key/JWT 驗證和 production npm audit 均通過。Docker daemon 未啟動，故未執行 `npm run seed`、RLS 或 approval integration tests；亦未在此工作站解除 JOE-SERVER 的 OneDrive。
- 03:25 HKT — Docker daemon 現已可用並開始啟動 stack，但 bind volume 建立失敗，因目前 Windows 主機沒有 D: 磁碟（此工作區只有 C:）。為繼續完成 disposable 整合測試，暫用本機非同步目錄 `C:\docker-data\family-system`，不改部署範本內 JOE-SERVER 的 D: 路徑、不使用 OneDrive。按需求補上 server 對 `DOTENV_CONFIG_PATH` 的支援；seed/RLS/approval 測試僅會打 loopback 測試 stack。
- 03:31 HKT — 本機 Supabase Compose 全部健康，9 個 migrations 初始化成功；虛構 seed 完成，`test-rls.js` 全部 15 項通過，`test-approve.js` 3 項通過。`npm start` 已以 `.env.docker` 在 3002 運行；health、config、login 頁回 200，Master 假帳戶的 Auth password login 成功（token 未輸出）。D: 不存在，因此以上為 C: disposable stack 驗證，不代表已部署到 JOE-SERVER。

- 03:48 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 04:03 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 04:18 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 04:33 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 04:48 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 05:03 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 05:18 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 05:33 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 05:48 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 06:03 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 06:18 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 06:33 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 06:48 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 07:03 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 07:18 HKT — 15 分鐘 健康檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。

- 07:30–08:51 HKT — 按用戶回報記錄為離線移動／session 中斷；該時段沒有健康檢查或連續監視記錄，08:51 重新連線。
- 08:51 HKT — 重新連線檢查：Family Calendar HTTP 200；Supabase /familysystem-db-1=healthy, /familysystem-auth-1=healthy, /familysystem-rest-1=healthy, /familysystem-storage-1=healthy, /familysystem-gateway-1=running。
- 09:32–09:38 HKT — 驗證 `C:\docker-data\family-system` 持續存在，`.env.docker` 仍指向 C: loopback disposable stack。五個 containers 全部 healthy；logs 中的 RLS/Storage 拒絕屬負向安全測試預期結果，HTTP-only gateway 警告符合 reverse proxy 終止 TLS 設計。重跑 RLS 15/15、approval 3/3 通過；新增 `/health` 相容 alias 後 `/health`、`/api/health`、`/login` 均 HTTP 200。新增 JOE-SERVER 部署指南與 image exporter，C:、D: dry-run 均列出 5 個固定 images；Compose、PowerShell parse、git diff checks 通過，README 已連結相關指南。
- 09:53 HKT — RAG/private vector-search request deferred pending scope approval: PRD excludes vector search, TODO says pgvector is outside confirmed MVP, BUILD_PLAN has no RAG phase, and DB_SCHEMA_DRAFT.sql contains no `family_memories`. No extension, table, migration, embeddings, or search code was applied. Updated Task 2.3 to remain deferred until the scope and schema change are explicitly approved.
- 10:29 HKT — User explicitly approved the PJ2 non-MVP Family Memory expansion. Added independent `20261028000001_family_memories.sql` without changing `source/DB_SCHEMA_DRAFT.sql`; enabled pgvector 0.8.2 in the C: disposable DB and applied the six-column table, HNSW index, same-family active-member RLS and invoker search function. Added local-only 384D feature-hash placeholder (not actual BGE weights) with model target resolved to `C:\docker-data\family-rag\models`; no content is sent to external AI.
- 10:29 HKT — Added authenticated `/api/memories` history/save/search and `/chat` with explicit memory saving, local text-file selection/drop (`.txt/.md/.csv/.json`), left history and search results. Calendar/7-day view remains at `/today`; private records are not auto-indexed. UI warns that this prototype uses RLS but has no end-to-end/database encryption and accepts fictional test data only. Worker chat labels were checked in English.
- 10:29 HKT — Browser validation exposed missing CORS support in the local gateway; Caddy now permits one configured exact `CORS_ALLOWED_ORIGIN` (no wildcard), including the Supabase/PostgREST request headers. Caddy/Compose validation and browser login, memory save/search, and Worker UI checks passed.
- 10:29 HKT — Verification: `test-rls.js` 15/15, `test-approve.js` 3/3, and `npm run test:family-memories` 6/6; `/health` and `/chat` HTTP 200; Compose config and JavaScript syntax checks passed. Test memory fixtures were removed, fake account passwords restored, temporary container files removed, and the background `npm start` shell stopped. C: disposable Supabase containers remain running; JOE-SERVER D: deployment is still pending.
- Lunch-time HKT — 完成已批准 PJ2 Family Memory 延伸：新增 reminders migration/API 及 active-family RLS；source MEMORY 只可連結同家庭 active member 建立的記憶；`/today` 加入未來 7 日行程、未完成提醒、最近 5 條 MEMORY 及提醒表單；`/chat` 顯示 MEMORY 引用、來源、建立者、建立時間、距離及搜尋 metric。`source/DB_SCHEMA_DRAFT.sql` 未修改。
- Lunch-time HKT — `embed.js` 已加入本機 Transformers 載入嘗試，禁止遠端模型；`C:\docker-data\family-rag\models` 目前不存在，因此 log 明確顯示 `using placeholder` 並回退至 384 維 normalized feature-hash。`藍色風箏` 384 維／norm=1 驗證通過；沒有聲稱已載入 BGE 權重。pgvector 距離按正確語義實作：cosine `<=>`、L2 `<->`、inner product `<#>`。
- Lunch-time HKT — 驗證通過：`npm ci`、`npm audit --omit=dev`（0 vulnerabilities）、Compose config、`git diff --check`；RLS 15/15、approval 3/3、Family Memory 6/6、提醒隔離 5/5。`/health`、`/chat`、`/today` 均 HTTP 200；5 個 `familysystem` Supabase containers healthy。
- Lunch-time HKT — 清理後 `familyMemoryRows=0`、`reminderRows=0`、臨時隔離家庭=0；測試期間只用虛構 `@family-calendar.test` 帳戶，沒有更改 seed 帳戶密碼。已刪除本輪建立的容器暫存 SQL、停止臨時 Node server，`port3002Listeners=0`。JOE-SERVER D: 部署仍待執行。
- 2026-10-28 Cloud/Local compatibility — 新增 `security_logs` RLS migration 及 security/librarian/analyst/editor/orchestrator 五個本機 Agent；搜尋 API 已接 orchestrator，保留登入限制、舊 `matches` 回應及 history/save 路徑。Chat 顯示 security status、citation、距離及 metadata；`FAMILY_MEMORIES_TABLE` 可配置，init SQL 按 17 個 migration 檔名排序重建。`source/DB_SCHEMA_DRAFT.sql` 未修改，沒有外部 AI 呼叫。
- 2026-10-28 Cloud/Local verification — 本機 C: disposable DB 套用 security log、384D placeholder search/threshold migrations；RLS 15/15、approval 3/3、family memories 8/8、reminders 5/5、agents 3/3 通過。未登入 `/api/memories/search` 回 401；以虛構 injection 查詢驗證 `security_logs` 可寫入並即時清理。`/health`、`/chat`、`/today` HTTP 200，暫用 3003 server 已停止。Cloud Auth health HTTP 200；因 Supabase CLI 未安裝／未 link、Cloud DB password 未配置，沒有執行或推送 Cloud migrations。
- Final cleanup — `familyMemoryRows=0`、`reminderRows=0`、`securityLogRows=0`；清除已核實的 container `/tmp` SQL 暫存檔；停止原有 3002 app process，`port3002Listeners=0`、`port3003Listeners=0`。17/17 migrations 已在 `scripts/init-family.sql` 中按檔名排序，外層只有一組 BEGIN/COMMIT；schema draft unchanged。
- 2026-10-28 最終交接驗證 — LittlePlanet `/health`=200、`/api/products`=27、`npm test`=167/167；handover ZIP 可讀，1,074 files／27 directories／5,961,824 bytes。Family 本機 DB 的 reminders、family_members、family_memories 均存在並啟用 RLS；`is_active` 為 `status='active'` generated boolean、`embedding_bge` 為 `vector(512)`、`source_file_name` 存在；兩個搜尋 RPC 均用 cosine distance `<=0.75` 並封頂 12。RLS 15/15、approval 3/3、memory 8/8、reminders 5/5 均通過；`/health`、`/today`、`/chat` 均 HTTP 200。17 個 migration timestamp 唯一且全部包含於 `scripts/init-family.sql`；`source/DB_SCHEMA_DRAFT.sql` 未修改。指定 BGE model 目錄不存在，測試明確使用 feature-hash placeholder，未聲稱載入真實權重；LittlePlanet Compose 設定有效，但目前 `docker compose ps` 無服務容器。C: 尚有 318.92 GB；沒有獨立 `monitor-local-db.ps1` process，臨時 Family app 已停止。另一個 PJ2 session 仍為 `inProgress`（30 個未提交檔案），已保留未停止。
