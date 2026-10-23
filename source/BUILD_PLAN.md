# 建造次序 — Family Calendar System MVP

> 逐個 task 做，每個 task 一至幾個檔案；每個階段嘅測試項目過晒先好去下一階段。
> 測試用 authenticated 身份模擬（唔係 service role）。

## 階段 0：開工前

- [ ] 讀晒 `source/` 全部文件（包括 REFERENCES.md）；發現衝突即刻報告
- [ ] 確認 Supabase test project 已開（雲端或本地 stack 皆可），全部用假資料

## 階段 1：Project Skeleton

- [ ] 起 `server/`（Express）＋ `public/`（靜態前台）＋ `.env.example` ＋ `.gitignore`（含 .env）
- [ ] 健康檢查 endpoint（GET /api/health 回 `{ success, data, message }`）
- [ ] 測試：health endpoint 回 200；`.env` 唔會入 Git

## 階段 2：Schema + 種子資料

- [ ] 將 `source/DB_SCHEMA_DRAFT.sql` 轉做 migration（supabase/migrations/）
- [ ] 建立 Storage bucket（private）同 object 存取政策（跟 DB_DESIGN.md 規格）
- [ ] 虛構測試帳戶（Supabase Auth）＋對應 JWT，準備俾 13 項測試用
- [ ] 種子腳本（service_role，受控場景）：虛構家庭「Test Family」＋虛構成員（爸爸 master active、太太 master active、工人姐姐 worker active、兩個小朋友冇帳戶、一個 pending 申請）
- [ ] 測試：表結構同 `DB_SCHEMA_DRAFT.sql` 一致；種子資料入到去

## 階段 3：RLS 政策（核心安全）

- [ ] 按 `DB_DESIGN.md` 第 4 節規格實作 `can_read_record` / `can_edit_record` ＋ 各表 RLS 政策 ＋ `approve_schedule_change()`
- [ ] 一次過跑晒 `DB_DESIGN.md` 第 7 節全部 13 項測試（重點：私人日記隔離、姐姐唔可以改行程、pending/disabled 全拒、姐姐只讀獲 grant 行程）
- [ ] 測試：**全部 13 項通過先准去階段 4**；有一項唔過就修

## 階段 4：Auth（FR001/FR002）

- [ ] 前端「Sign in with Google」→ Supabase Auth
- [ ] 新用戶自動有 profile；自提 pending 角色申請畫面
- [ ] Admin 審批畫面（沿用操作者 JWT，驗證 Admin 權限後經 RLS 更新）批准角色
- [ ] 登出
- [ ] 測試：新用戶註冊 → pending 冇權限 → Admin 批准 → 有權限；pending／disabled 用戶 API 全拒

## 階段 5：Records CRUD（FR005 部分）

- [ ] 新增行程（plan）、寫日記／補記（experience）、上載相片（private bucket）
- [ ] 關聯經歷到計劃（linked_plan_id）
- [ ] 編輯／刪除：後端仍要驗證身份同操作權限，RLS 負責最後資料存取限制
- [ ] 測試：master 同 worker 各自新增、編輯，行為符合 PRD 第 5 節權限摘要

## 階段 6：Calendar / Timeline View（FR005 簡化版）

- [ ] 月曆：每日顯示記錄數量／摘要
- [ ] 撳一日展開時間軸（按 event_start 排序）
- [ ] 篩選：按成員、按 kind（plan/experience）
- [ ] 「未來 7 日事項」側欄列表：查未來 7 日 active plan（按 event_start 排序；RLS 自然過濾權限）
- [ ] 測試：主流程走一次 —— 新增行程 → 補記經歷連相 → 月曆睇返 → 按成員篩返
- [ ] 測試：7 日列表顯示正確；過期／超過 7 日嘅唔顯示；姐姐只見獲授權行程

## 階段 7：Helper Workflow（FR011，全套英文介面）

- [ ] 姐姐版介面：獲授權行程列表（record_audience grant 嘅 plan）
- [ ] 加生活紀錄（diary/photo）、改自己嘅紀錄
- [ ] 提交改行程請求（schedule_change_requests）
- [ ] Master 收到請求通知 → approve_schedule_change() 審批畫面
- [ ] Master 授權行程俾姐姐（record_audience 管理）畫面
- [ ] 測試：姐姐只見獲授權行程；請求批准前後行程內容正確變化；版本不符時被拒

## 階段 8：收尾

- [ ] PRD 第 7 節驗收準則逐項核對
- [ ] README（點 run、點 seed）
- [ ] 遺留 TODO 註解清單（私人日記加密、MFA 等待決項）
