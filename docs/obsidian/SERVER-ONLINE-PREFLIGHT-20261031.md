# JOE-SERVER SERVER ONLINE PREFLIGHT

**結果：HOLD — 本次執行環境未能確認 SERVER online。** 這是一份唯讀 preflight；未修復或啟動服務，未改 code、DB、ACL 或資料檔。

- 檢查時間：2026-10-31 13:10-13:13 (+08:00)
- 工作目錄：`C:\Project\Family\FamilySystem`
- 實際 checkout：`main` / `3b1422a` / `v1.0-encrypted-real`，working tree clean。
- **版本不一致：**任務描述預期 `da0b6b2`、`423fdc0`，但此工作目錄 HEAD 是 `3b1422a`。沒有 fetch、pull、checkout 或改動版本。

## 線上狀態與 acceptance

| 檢查 | 結果 | 證據 / 限制 |
|---|---|---|
| Compose 五服務 healthy | **FAIL / unavailable** | 指定 `--env-file .env.docker` 執行 `docker compose ... ps`；Docker Desktop Linux engine named pipe 不存在，無法連 daemon。沒有容器健康資料。 |
| PM2 `family-prod` online | **FAIL / not present in current PM2 home** | `pm2 list` 啟動了一個空 daemon，沒有 app entry；預期 PID 9732 亦不在此 session 運行。未執行 `pm2 resurrect` 或 stop。 |
| `http://127.0.0.1:3002/health` | **FAIL** | `curl.exe` 回連線失敗，HTTP status 000。 |
| Postgres extensions / policies / trigger / column | **HOLD / not verified live** | DB catalog 查詢因 Docker daemon 不可用而失敗。先前報告不代替本次 live SERVER 驗證。 |
| Local real BGE 512D | **PASS** | 模型來自 `D:\docker-data\family-rag\models`，六個檔案；載入 log 顯示 real BGE；100 次、512D、`isPlaceholder=false`。 |
| RAG mean latency | **PASS dimension; variance noted** | 本次 100 次 mean **5.830 ms**, p50 5.356 ms, p95 8.297 ms；與歷史約 3.57 ms 的觀察不同。單次 benchmark，不可作 SLA 或性能回歸定論。 |
| Threshold / vector columns | **PASS source inspection** | Agent threshold 是 0.4。`source/rag/search.js` 按 384/512 維度選擇 placeholder/real RPC，不把兩種維度合併；384D 使用 `embedding`，512D 使用 `embedding_bge`。 |
| Production env ACL | **P0 finding** | `D:\backup\.env.docker.prod-backup` ACL 繼承開啟；Authenticated Users 有 Modify，Users 有 Read/Execute。未修改 ACL。 |
| C: recovery path | **CONFIRMED ABSENT** | `C:\backup` 不存在。不得把 `D:\backup` 當作 C: restore source。 |
| Secrets | **PASS handling** | 沒有輸出 key/token/password 值。`.env` Cloud host 為 Supabase cloud host、`.env.docker` 指向 loopback；兩個 key 只驗證為 32-byte base64 shape。兩個 env 檔已被 Git ignore；`.env.example` 是 placeholder。 |

## 額外版本 / CORS 注意

此 checkout 的 `server/index.js` 第 22 行仍是 `app.use(cors())`，沒有找到明確 allowlist；與任務提供的 da0b6b2 allowlist 描述不符。由於 checkout 版本本身已不一致，**不得據此宣稱預期 CORS allowlist 已部署，也不得將任何 origin 當 production origin**。先由維護者確認正確 commit/checkout，再做 SERVER 上線核驗；本次沒有改 code。

## DB 安全規則核對狀態

- 授權原則仍以 `family_members.profile_id` + `status='active'` 為準；不得以 `user_id` 取代，`profiles.id` 對應 `auth.users.id`。
- 加密範圍只應是 private `records.content` → `encrypted_content BYTEA`，經 SECURITY INVOKER pgcrypto RPC（AES-256）及 authenticated grant；不涵蓋 title/metadata/attachments/family_memories/reminders/RAG vectors。Node 不使用 AES-GCM，缺 key 必須 fail closed。
- 本次因 DB 不可連而**沒有** live 驗證上述 extension/version、column、4 policies 或 `trg_records_guard_private_plaintext`；需要 Docker/Postgres online 後重跑唯讀 catalog 查詢。
- 未執行 Cloud migration、fixture-mutating tests、Docker prune、資料刪除或 raw PG data copy；未觸碰 PJ1 `D:\docker-data\littleplanet\images.tar`。

## 要解除 HOLD 的下一步

1. 在確認是 JOE-SERVER 正確 Windows 使用者/PM2 home 後，先讓 Docker Desktop Linux engine 正常運行，再重新跑 Compose `ps` 和 DB catalog checks；不要改資料 volume。
2. 找回預期的 PM2 process-list context，確認 `family-prod` 是否由另一 Windows 帳戶/PM2_HOME 管理；只有獲授權後才執行 restore/start。此 preflight 沒有重啟服務。
3. 確認 checkout 是否應為 `da0b6b2` + `423fdc0`，並重新核對 CORS allowlist；本報告觀察到的 `3b1422a` 不符合任務指定狀態。
4. 服務恢復後再確認五個 containers healthy、PM2 online、health 200、DB extension/policies/trigger/column。確認前不應將 SERVER 標記 ONLINE。
5. 由 owner 在身份驗證後收窄 production env ACL；本次只記錄風險，沒有更改權限。