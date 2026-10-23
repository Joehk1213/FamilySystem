# Family Calendar MVP 1.0 使用指南

## 登入測試

本指南對應目前的靜態前台路由：`/login`、`/today`、`/record/new`、`/approve`。登入使用本機 Supabase Auth 的 email/password。以下帳戶由 `npm run seed` 建立，密碼相同：

| 角色／狀態 | 帳戶 | 密碼 |
|---|---|---|
| Master | `test.dad@family-calendar.test` | `MvpLocal-Demo-2026!` |
| Master | `test.mom@family-calendar.test` | `MvpLocal-Demo-2026!` |
| Worker | `test.helper@family-calendar.test` | `MvpLocal-Demo-2026!` |
| Pending | `test.pending@family-calendar.test` | `MvpLocal-Demo-2026!` |

以上是虛構的本機測試帳戶，只可用於 disposable local Supabase。不可用於正式家庭資料、雲端 project 或真實登入。種子腳本每次執行都會把這四個帳戶的密碼重設為 `SEED_TEST_USER_PASSWORD`。

目前沒有預設 Guest demo 帳戶；Guest 需先由家庭管理流程建立 active membership。實際資料庫以 `family_members.profile_id`、`role`、`status` 表示成員；Pending 是 `status='pending'` 且 `role` 為 null，並非一個可用的 active role。

## 角色與頁面

| 角色／狀態 | `/today` | `/record/new` | `/approve` |
|---|---|---|---|
| Admin | 查看家庭內有權讀取的非私人記錄 | 建立行程及日記／相片記錄 | 批准或拒絕待處理的行程修改請求 |
| Master | 查看家庭內非私人記錄 | 建立行程及日記／相片記錄 | 批准或拒絕待處理的行程修改請求 |
| Worker | 查看自己建立或獲明確授權的記錄 | 只可新增日記／相片類 experience | 無權進入 |
| Guest | 只可查看自己建立或獲明確授權的記錄 | 無權進入 | 無權進入 |
| Pending | 只會看到待批准狀態；不可使用資料頁 | 不可使用 | 不可使用 |

`/today` 顯示今日起而且符合 RLS 權限的記錄；家庭可見度不代表 Worker 或 Guest 自動獲得讀取權，需有明確授權。`visibility='public'` 在 MVP 1.0 不開放讀取。

`/approve` 只處理 `schedule_change_requests`，不是成員申請審批頁。此版本沒有 Pending 成員管理介面；Pending 使用者需由已核准的管理流程處理後，才能成為 active member。

> **Guest 唯讀待修正：**前端不會向 Guest 顯示新增或審批控制；但目前 RLS 的 schedule request INSERT policy 只檢查 active membership，沒有把角色限制為 Worker。直接以 Guest 身份呼叫 API 可能仍可建立修改請求。新增的 RLS 測試會捕捉這項缺口；在後續 RLS migration 修正並通過測試前，不應把 Guest 當作已由資料庫強制唯讀。

## 私人日記：Level 1

新增日記時選擇 `Private (creator only)`。MVP 1.0 使用 RLS／應用層隔離：只有 active family member 中的建立者可讀取；其他 Master 或 Admin 不會因角色較高而看到內容。私人記錄不可授權分享或提交行程修改申請。

Level 1 **不是用戶端加密**。具 `service_role` 的受控後端／種子操作在技術上可繞過 RLS，因此不可把它描述成端對端或絕對私隱。私人內容不會送往外部 AI；MVP 1.0 不接入 AI。

## 附件限制

- 每個附件上限為 **10 MiB（10,485,760 bytes）**；多個檔案是逐檔計算，不是整張表單合計。
- 前端、Node upload route 及 private `family-attachments` bucket 都會限制大小；超限檔案會被拒絕。
- Storage object 路徑為 `{family_id}/{record_id}/{filename}`，不要把 private bucket 改成 public。

## 行程修改與 row_version 衝突

Worker 只能在 `/today` 對自己可讀取的 active plan 提交修改申請；不能直接改行程。Admin／Master 在 `/approve` 查看當時的 request version 和記錄版本，再選擇批准或拒絕。

每次記錄更新都由資料庫 trigger 遞增 `row_version`。例如 Worker 以版本 1 提交申請，而記錄在審批前已由版本 1 變成版本 3，批准會因版本過期而失敗；不可重複批准舊 request。請重新載入 `/today` 核對最新內容，由 Admin／Master 拒絕舊申請，再由 Worker 根據最新行程重新提交。

目前批准介面會標示版本不一致，但最終防線是資料庫函式；即使畫面仍顯示批准按鈕，過期版本仍應由資料庫拒絕。

## 本機啟動

在 repo 根目錄啟動本機 Supabase、套用 migrations 並設定本機 `.env` 後：

```powershell
npm run seed
npm run dev
```

開啟 `http://127.0.0.1:3000/login`。測試資料與密碼只限本機 disposable project；請勿把 `.env` 或任何 service-role key 加入 Git。
