# PRD — Family Calendar System MVP

> 狀態：核心需求已確認；部分細節係建議方案（文中標明）；技術選擇沿用草案
> 完整需求見 Family_Calendar_System_Requirements_v3.md；呢份係 MVP 濃縮版

## 1. 產品定位

**一個家庭生活記錄冊：未來用嚟安排，當日用嚟記低，過去用嚟回憶。**

核心：保存「邊個、幾時、做過乜、有咩相、有咩感受」。日曆只係一種睇法。

## 2. 核心設計原則

1. **記錄係 source of truth**：月曆／時間軸由記錄渲染
2. **計劃 ≠ 實際發生**：`plan` 同 `experience` 分開，互不覆蓋；完成計劃唔會自動生成歷史
3. **容許補記**：冇預先安排嘅生活小事可以直接寫入
4. **AI 唔補作歷史**（MVP 無 AI 功能，但資料結構要預留）

## 3. 用戶同角色【已確認】

| 成員 | 角色 | 使用情況 |
|---|---|---|
| 爸爸 | Master | 初期主力 update/edit |
| 太太 | Master | 後期加入 |
| 工人姐姐 | Worker | 只識英文（介面全套英文）；可以自加生活紀錄，**唔可以改行程**，想改就提請求等父母批 |
| 小朋友 (4歲/7歲) | 成員檔案 | 暫時唔開帳戶，只被標記為參與者 |

登入流程（FR001）：Google 登入 → 揀角色 → Admin 確認 → 有權限。pending／disabled 帳戶乜都做唔到。

## 4. MVP 功能

### FR001 Login
Google 登入（Supabase Auth），新用戶自動建 profile，自提 pending 角色申請，Admin 審批。

### FR002 Logout
登出 session。

### FR005 簡化版 Timeline & Calendar View
- 月曆顯示每日記錄；撳一日展開當日記錄（時間軸排序）
- 每條記錄：日期、參與成員、簡短內容、相片
- 狀態顯示：計劃中／已發生
- 篩選：按日期、按成員（**唔做向量搜尋**）
- 「未來 7 日事項」列表【已確認】：月曆旁邊顯示未來 7 日嘅 plan 記錄（默書、測驗、活動等），按 `event_start` 排序，狀態 active；純查詢，冇 AI、冇推送；權限跟 RLS（姐姐只見獲授權行程）
- 記錄操作：新增行程（plan）、寫日記／補記（experience）、上載相片、關聯經歷到計劃

### FR011 Helper Workflow（工人姐姐，英文介面）
- 查看獲授權行程（record_audience grant 過嘅 plan）
- 新增生活紀錄（experience 嘅 diary/photo）
- 改自己寫嘅紀錄【建議方案】
- 想改行程：提交 schedule_change_request → 通知父母 → 父母批准（approve_schedule_change）先生效
- 所有限制由後端 RLS／trigger 執行

## 5. 權限摘要

| 操作 | Master/Admin | Worker |
|---|---|---|
| 讀 family 記錄 | 可以 | 只有自己建立嘅 + 獲 grant 嘅 |
| 讀 private 記錄 | 唔得（只限本人） | 只限本人 |
| 新增記錄 | 任何（本人名義） | 只有 experience diary/photo |
| 改行程 | 可以 | 唔得，只可以提請求 |
| 審批請求 | 經 approve_schedule_change() | 唔得 |

詳細 RLS 政策規格見 `DB_DESIGN.md` 第 4 節。

## 6. 明確唔做（MVP 範圍外）

AI 功能、OCR／batch 上傳、財務／供應商分析、向量搜尋、Guest 公開搜尋（public 記錄唔建立、唔開放讀取）、審核分流、回憶錄自動生成。

## 7. 驗收準則

1. 一條主流程行得通：新增行程／寫日記 → 補記實際發生嘅事同相片 → 日曆／時間軸睇返 → 按日期或成員搵返
2. 工人姐姐流程行得通：睇獲授權行程 → 加生活紀錄 → 提改行程請求 → 父母批准生效
3. `DB_DESIGN.md` 第 7 節測試清單全部通過（用 authenticated 身份，唔係 service role）
4. 姐姐介面全套英文；其他繁體中文（香港）
5. 「未來 7 日事項」列表正確顯示未來 7 日 active plan；過期同超過 7 日嘅唔顯示；姐姐只見獲授權行程
6. 全程假資料

## 8. 待確認（唔阻住 MVP 開發，開發時留 TODO 註解）

- 私人日記私隱層次：應用層隔離 vs 用戶端加密（未決期間只可做假資料原型；留 TODO 唔代表私人日記安全方案已驗收）
- 系統 MFA 實作方式
- 前端框架確認：暫定靜態前台（React + Tailwind 為建議，沿用草案）
