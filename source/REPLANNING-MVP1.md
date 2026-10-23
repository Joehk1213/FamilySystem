# REPLANNING — Family Calendar System MVP 1.0 落地版
> 日期：2026-10-23
> 基準：Family_Calendar_System_Requirements_v3.docx (最新) + v2.xlsx + 手稿xlsx + GitHub repo 現狀
> 目標：由「諗到」變「屋企人下星期用得到」嘅制成品

## 0. 點解要 Replanning
- Vector 太早：v2 想一開始就做 Vector DB + Chat Box，但 v3 已修正為第三階段先做。GitHub 現狀若經 OpenRouter 做 embedding，會將家庭相送去第三方，違反 v3 私隱鐵則同 README「只用假資料」原則。
- 私隱未拍板：私人日記 Level1/Level2 未定，導致 RLS / Storage 政策寫唔落去，migration 停留草稿。
- 一次過做晒：FR001-011 + AI + Batch 想一次過起，結果本地 `npx supabase start` 跑唔起，無可交付。

本次 Replanning 核心：**砍功能，鎖私隱，定主機，先出一個真係用到嘅 MVP 1.0**

## 1. 制成品定義
一個網址，屋企人真實可用，唔係 Demo。

**做到：**
- 爸爸/太太 (Master) Google 登入 → 新增行程(狀態=計劃中) → 補記實際發生(另開記錄關聯原計劃+相片) → 日曆/時間軸按日期/成員搵返
- 工人姐姐 (Worker) 英文介面：只睇到獲授權行程(返學/興趣班)，可新增生活紀錄(買咗乜/小朋友情況)，想改行程要提申請 → 父母確認先生效
- 附件：每張 10MB 內，路徑 `{family_id}/{record_id}/{filename}`，private bucket，唔經第三方 AI
- 登入/登出、角色申請 Pending → Admin 批准

**唔做 (明確砍掉，入 Phase 2/3)：**
- 向量搜尋、自然語言搜尋 (FR003/FR009)
- 收據/供應商分析 (FR007)、智能提醒 (FR008)
- Batch 上傳、自動相簿、一年前今日、Memory Album (FR006)
- 私人日記 Level2 用戶端加密 (留待 v2.0)

## 2. 兩個即刻要拍板嘅決定

### 2.1 私人日記私隱層次
- **MVP 1.0 建議：層次一 應用層隔離**
  - `records.private = true` + RLS：只有 `created_by = auth.uid()` 先讀到
  - Master/Admin App 正常使用睇唔到
  - 後端 service_role 技術上仲睇到，但文件要寫明係應用層私隱，非絕對
  - 好處：開發快，唔使搞 recovery key
- **v2.0 先做層次二 用戶端加密**
  - 裝置加密先上傳，密碼唔上 server，server 只存密文
  - 需要 recovery key 機制，忘記+無 key = 救唔返，要另行設計

鐵則 (v3 已確認，沿用)：
- 私人日記唔會因 Master/Admin 身份開放
- 私人日記唔會送去審批 (同 FR004 分流切開)
- 私人內容預設唔入共享搜尋、向量索引、回憶錄、外部 AI

### 2.2 跑喺邊 (主機)
- **開發：你部 Notebook**
  - 跑 `npx supabase start` (含 Postgres + pgvector + Storage + Auth)
  - Ubuntu / WSL2 + Docker，BIOS 設閂蓋唔瞓覺，插 LAN，限充 80%，最好拆電
  - 唔係長期方案，係方便你開發
- **制成品 (建議)：MiniPC / NAS (N100 或以上)**
  - Ubuntu Server + Docker Compose：supabase-postgres + 你的 Node server
  - 全盤加密 (LUKS)，RAID1 或外置碟每日備份
  - 唔開 port，用 Tailscale / Cloudflare Tunnel 連入，唔用 port forward
  - Supabase Cloud 專案 (region ap-southeast-1 新加坡) 只做 Auth 中轉 + 測試，唔存原相，正式相只留 MiniPC
- **唔建議：Notebook 24/7 長著做 Production** - 電池鼓脹、瞓覺斷線、無 RAID

## 3. 技術方向
- 結構化優先：日期、成員、status、private flag 等結構化資料 + 原相/文字先係家庭史料
- 記錄係 source of truth，日曆係 view
- 計劃 ≠ 已發生：用 `linked_plan_id` 關聯，唔可以改狀態當歷史
- AI 唔補作歷史：MVP 1.0 根本唔引入 AI，所有事實要有記錄，之後 Phase 3 先按 FR010 規則做 grounded + citation
- 後端執行唔係齋收埋掣：Worker 改行程限制喺 DB function 執行

## 4. DB Schema 鎖死 (MVP 1.0)
以你 GitHub `source/DB_SCHEMA_DRAFT.sql` + v3 第7節為準，MVP 1.0 只保留：

- `families` (id, name)
- `profiles` (id=auth.users.id, display_name)
- `family_members` (family_id, user_id, role: admin/master/worker/guest/pending/disabled, status, requested_role, row_version)
- `records` (id, family_id, created_by, title, content, event_start, event_end, is_all_day, status: planned/happened, private: bool, linked_plan_id nullable, row_version, created_at)
- `attachments` (id, record_id, family_id, file_path: {family_id}/{record_id}/{filename}, mime, size, created_by)
- `schedule_change_requests` (id, family_id, plan_id, requested_by, requested_fields jsonb 白名單 title/content/event_start/event_end/is_all_day/status, base_row_version, status: pending/approved/rejected, created_at)

Storage：
- bucket `family-attachments` private，暫時無 `storage.objects` policy (預設 deny)，Phase 3 測試完 `can_read_record()` 先加 policy

## 5. 實作次序 (4步，每步都可交付)

### Step 1 - 本地起得郁 (半日)
- `npx supabase init` (若未有), `npx supabase start`, `npx supabase db reset`
- 套用 `20261022000000_initial_schema.sql`，確認 bucket 建立
- `.env.example` → `.env`，只填本地 key，`FAMILY_ID` 先用 seed 出嚟嗰個 Test Family
- `npm run seed`：只建 `@family-calendar.test` 假帳號，唔用真人相

### Step 2 - RLS 鎖死 (1-2日，最關鍵)
- 實作 `supabase/migrations/20261022000100_rls_policies.sql`：`can_read_record()`、`family_members`、`records`、`attachments` RLS
- 按你 README `DB_DESIGN.md 第7節` 13項測試 + `npm run test:rls` 用 disposable project 跑
- 重點測：Guest 唔可以寫、Worker 只能改自己嘅 experience/diary、Master 睇唔到他人 private、跨 family 唔可以串
- FR011：`approve_schedule_change(request_id, approve, note)` 要鎖行、驗權限、驗 row_version、白名單先套用

### Step 3 - Records CRUD + 上載 (2-3日)
- Backend：`server/` 用你現有 Express，全部 API 驗 `Authorization: Bearer <user JWT>`，用 anon key + user JWT 查 DB，RLS 係最終防線，唔用 service_role
- `GET /api/records` (按 RLS)、`POST /api/records`、`PATCH /api/records/:id`、`DELETE /api/records/:id` (刪 DB + Storage object，非 transaction 要處理失敗)、`POST /api/records/:id/attachments` (10MB limit，寫失敗要清 Storage)
- 前端：`/` 日曆 (簡化版月曆，切日見當日卡)、`/records/new`、`worker` 英文版
- 上載流程：前端選相 → 後端產生 signed URL → 直上 Supabase Storage private bucket → 寫 attachments metadata，**全程唔經 OpenRouter / 唔做 embedding**

### Step 4 - 登入角色 + 制成品部署 (1-2日)
- Supabase Auth 開 Google provider，redirect 設 `http://localhost:3000` + 你將來 MiniPC Tailscale 網址
- 前端登入後查 `profiles` + `family_members`，無申請可揀 master/worker/guest，pending/disabled 只顯示狀態
- Worker 介面全英文 (表單+提示+通知)
- 部署去 MiniPC：`docker compose up -d`，Tailscale 令屋企人喺出面都連到，開全盤加密+備份
- 真資料切換：先喺 disposable cloud project 測完 RLS，先至由假資料轉真家庭相，生產環境開 `auto_delete_at` 同刪除權 (PDPO)

## 6. 安全與私隱 Checklist (MVP 1.0 必須)
- [ ] 開發全程只用假資料，README 已寫，繼續遵守
- [ ] `.env` 有 service_role key 嘅只喺 `scripts/seed` 手動用，唔入前端/一般 server
- [ ] 前端→後端 HTTPS，圖片唔落地：唔寫 disk log，唔放 localStorage
- [ ] Storage private + RLS + object path 驗證 `{family_id}/{record_id}/{filename}`
- [ ] 私人日記：private flag + RLS，Master/Admin 睇唔到，唔入搜尋/回憶錄/外部 AI
- [ ] 同意框：若之後揀私人日記俾 AI 分析，要彈提示話明文會傳出，唔可以同時保證伺服器未見過
- [ ] 備份：MiniPC 每日備份去第二隻碟，測試還原
- [ ] 唔開 port，用 Tailscale/Cloudflare Tunnel

## 7. 明確唔做清單 (避免再發散)
- 唔做向量搜尋、唔做 OpenRouter embedding、唔做以圖搜圖 (Phase 3 先做，且用本地 clip/siglip)
- 唔做 Batch 上傳、OCR、語音轉文字 (FR009 Phase 3)
- 唔做收據分析、供應商 CP 值 (FR007 Phase 3)
- 唔做智能提醒、補貨提醒 (FR008 Phase 3)
- 唔做 Level2 用戶端加密 (v2.0)
- 唔做 MFA (待核實 Google/Supabase 官方文件)

## 8. 下一步行動 (你聽日就做得)
1. 喺 GitHub repo 開 branch `replanning/mvp1`
2. 將本文件放入 `source/REPLANNING_MVP1.md`，更新 `source/BUILD_PLAN.md` 次序為 Step1-4
3. 喺你 Notebook：`npx supabase start` + `db reset` + `npm run seed` 確認本地起得郁
4. 決定 MiniPC/NAS 型號 (建議 N100 + 16GB + 1TB SSD + 外置備份碟)
5. 開始 Step2 RLS 實作，跑 `npm run test:rls`

## 9. Timeline 建議
- Week 1：Step1+2 (本地+RLS 通過)
- Week 2：Step3 (Records + 上載 + 日曆)
- Week 3：Step4 (登入+角色+Worker 英文+部署去 MiniPC，屋企人試用)
- Week 4 後：根據試用，決定 Phase 2 回憶錄 / Phase 3 本地 embedding

---
備註：本文件係基於 v3.docx 獨立可讀版 + Family Calendar System MVP 專案文件 + 早前關於圖片私隱/Notebook 做 DB 嘅討論整理，目的係令 MVP 1.0 可落地成制成品，而非再加功能。