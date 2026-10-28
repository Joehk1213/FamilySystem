# Family Calendar System MVP + AI Co-Pilot 開發進度表

## 📌 階段一：地基與數據鏈路 (現階段)
- [x] 設定專案規範 (.github/copilot-instructions.md) 與 Supabase Key
- [x] Task 1.1: 測試 Supabase DB 連線與 Schema 讀取 (`source/DB_SCHEMA_DRAFT.sql`)
- [ ] Task 1.2: 【Dev Phase 特例】測試 OpenRouter API 免費模型對接（僅使用虛構測試資料，不傳送真實家庭隱私；Service/測試腳本已建立，live test 待免費供應商恢復，曾回 429／逾時）

## 📌 階段二：輸入層與 RAG 記憶庫
- [x] Task 2.1: Chat-First 本機規則解析 + Supabase records/RLS 寫入串接（沿用現有實作；parser 與請求路徑已檢查）
  - [ ] 待以 authenticated 測試帳戶完成 Supabase 實際寫入驗證；不使用 service role 代替
  - pgvector／向量搜尋屬已批准的非 MVP 擴展，實作追蹤於 Task 2.3
- [x] Task 2.2: 【Dev Phase 特例】Telegram Bot Webhook 虛構資料預覽與確認流程（development-only；只接受固定測試句；不寫 Supabase）
  - [ ] 待自行設定 Telegram 測試 bot／webhook secret／test chat ID，完成 live webhook 驗證；不得使用真實家庭內容
- [x] Task 2.3: 【用戶已批准非 MVP 擴展】Family Memory/RAG、家庭提醒及引用；新增獨立 migrations、同家庭 active-member RLS、`/chat` 及 `/today` 總覽。程式會嘗試由本機 `FAMILY_RAG_MODEL_PATH` 載入 bge-small-zh-v1.5，無權重或維度不符時明確記錄 `using placeholder` 並回退至 384D normalized feature-hash；不可視為已載入真實權重
  - [x] Reminder API、同家庭資料隔離、source memory 家庭範圍檢查及 cosine/L2/inner-product 搜尋
  - [x] family-file-ingestion-bge-housekeeper：本機 `.txt`／`.md` 以 1,000 字元、200 overlap 分段後逐段經登入 API 入庫；未安裝本機權重時保留 placeholder 並明確記錄；加入每 15 分鐘、只記 log 的提醒 scheduler。
  - [x] family-pdf-local-and-today-citations：用本機 vendored PDF.js 擷取 PDF 內嵌文字（不做 OCR、不上載原檔），沿用 1,000/200 分段；`/today` 顯示近期記憶來源及日期、管家提醒排序/剩餘時間/來源引用與完成切換。
  - [ ] 待提供並驗證相容的本機 bge-small-zh-v1.5 權重；目前只有 placeholder 可用，搜尋結果只供虛構測試資料原型使用
  - [ ] 記憶內容目前由 RLS 隔離但未加密；不得輸入真實家庭或敏感個人資料，端對端／資料庫加密仍待另行設計
- [x] Task 2.4: 【用戶已批准非 MVP 擴展】加入本機多代理記憶查詢流程：安全檢查及 `security_logs`、同家庭 RAG librarian、無外網 analyst、引用 editor 及 orchestrator；`/api/memories/search` 要求登入並回傳安全狀態、引用及 metadata；`/chat` 顯示安全 badge、回答及 MEMORY 引用。`source/DB_SCHEMA_DRAFT.sql` 未修改。
  - [x] family-4agent-loop: 按 Security → Librarian → Analyst → Editor 次序落地 Node 防幻覺流程；以 `family_members.profile_id/status='active'` 驗證同家庭權限，強制 cosine 門檻、引用檢查及安全事件記錄。
  - [x] Local disposable 驗證：RLS 15/15、approval 3/3、family memories 10/10、reminders 5/5、agents 3/3；未登入搜尋 401，injection log 寫入後已清理
  - [x] Cloud Supabase Auth health endpoint 回 200；只送 anon key，沒有送出用戶資料
  - [ ] Cloud migration dry-run 尚未執行：此工作區未 link Supabase CLI project，亦未配置 Cloud database password；沒有對 Cloud 套用 migrations

## 📌 階段三：時間軸與前端呈現 (Timeline UI)
- [x] Task 3.1: 實作 FR005 未來 7 天 Calendar View（active plan 按本地日期分組並依 event_start 排序；沿用 RLS 可見記錄），並加上日曆、提醒及最近 5 條家庭記憶總覽
- [x] Task 3.2: 整合 Chat-First 輸入匣 UI 與互動（本機解析、預覽確認、JWT 寫入及成功後刷新記錄檢視）

## 📌 自託管 Supabase 部署
- [x] 建立 JOE-SERVER Docker Compose stack 配置，目標持久化資料至 `D:\docker-data\family-system`
- [x] 在本機 disposable Docker stack 套用現有 migrations（包括 Stage 3 RLS/Storage policies）；JOE-SERVER D: 尚待部署
- [x] 本機 `@family-calendar.test` seed、15/15 RLS、3 項 approval 測試通過
- [x] 新增 JOE-SERVER 離線部署指南及支援 C:/D: `FAMILY_DATA_ROOT` 的 image exporter
- [ ] 完成 OneDrive 解綁、HTTPS reverse proxy 及備份/還原設定後，才可投入正式使用