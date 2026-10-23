# Family Calendar System MVP + AI Co-Pilot 開發進度表

## 📌 階段一：地基與數據鏈路 (現階段)
- [x] 設定專案規範 (.github/copilot-instructions.md) 與 Supabase Key
- [x] Task 1.1: 測試 Supabase DB 連線與 Schema 讀取 (`source/DB_SCHEMA_DRAFT.sql`)
- [ ] Task 1.2: 【Dev Phase 特例】測試 OpenRouter API 免費模型對接（僅使用虛構測試資料，不傳送真實家庭隱私；Service/測試腳本已建立，live test 待免費供應商恢復，曾回 429／逾時）

## 📌 階段二：輸入層與 RAG 記憶庫
- [x] Task 2.1: Chat-First 本機規則解析 + Supabase records/RLS 寫入串接（沿用現有實作；parser 與請求路徑已檢查）
  - [ ] 待以 authenticated 測試帳戶完成 Supabase 實際寫入驗證；不使用 service role 代替
  - pgvector／向量搜尋不屬於已確認 MVP 範圍，暫不執行
- [x] Task 2.2: 【Dev Phase 特例】Telegram Bot Webhook 虛構資料預覽與確認流程（development-only；只接受固定測試句；不寫 Supabase）
  - [ ] 待自行設定 Telegram 測試 bot／webhook secret／test chat ID，完成 live webhook 驗證；不得使用真實家庭內容
- [ ] Task 2.3: 實作 RAG 檢索 (針對家庭日常問答)

## 📌 階段三：時間軸與前端呈現 (Timeline UI)
- [x] Task 3.1: 實作 FR005 未來 7 天 Calendar View（active plan 按本地日期分組並依 event_start 排序；沿用 RLS 可見記錄）
- [x] Task 3.2: 整合 Chat-First 輸入匣 UI 與互動（本機解析、預覽確認、JWT 寫入及成功後刷新記錄檢視）