# 代碼規範 — Family Calendar System MVP

## 技術棧【沿用草案】

- 後端：Node.js + Express（JWT 由 Supabase Auth 處理）
- 資料庫／Auth／Storage：Supabase（Postgres）
- 前端：靜態前台（建議 React + Tailwind CSS，未最終確認）
- 語言：後端 JavaScript（CommonJS 或 ESM 擇一，全項目統一）；前端 JavaScript

## 資料夾結構

```
/
├── .github/copilot-instructions.md
├── source/                  # 需求文件（唯讀，唔好改）
├── server/                  # Express 後端
│   ├── routes/
│   ├── middleware/
│   └── index.js
├── public/                  # 靜態前台
├── supabase/
│   └── migrations/          # schema 變更（由 source/DB_SCHEMA_DRAFT.sql 開始）
├── .env.example
└── .gitignore               # 必須包含 .env
```

## 環境變數

`.env.example` 模板：

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 只可以喺後端受控場景用
PORT=3000
```

規則：所有機密經 `process.env` 讀；`.env` 永遠唔入 Git。

## API 規範

- 回應統一結構：

```js
{ "success": true|false, "data": <payload|null>, "message": "<人類可讀訊息>" }
```

- 錯誤：HTTP 狀態碼正確（400/401/403/404/500），`success: false`，`message` 講清楚原因
- 前端調用一律 try...catch／錯誤狀態提示
- 後端每個 handler：`try...catch` + 檢查 Supabase 回傳嘅 `error`

## Supabase 使用規則

- 一般用戶請求：帶用戶 JWT（由前端傳），接受 RLS 權限檢查 —— **唔准用 service_role 令讀寫成功**
- Admin 審批等管理操作：沿用操作者 JWT，後端驗證有效登入、同家庭、已批准 Admin 權限，再交 RLS／受控函式檢查（唔好預設用 service_role）
- service_role 只用於：項目初始化、種子腳本呢類冇用戶身份嘅場景
- 欄位名嚴格對齊 `source/DB_SCHEMA_DRAFT.sql`
- Storage：bucket 一律 private；object path 慣例 `{family_id}/{record_id}/{filename}`
- `row_version`：修改記錄時靠 trigger 自動遞增，應用代碼唔好手動 set

## 測試

- 每個階段按 `source/BUILD_PLAN.md` 嘅測試項目驗證（用 authenticated 身份模擬，唔係 service role）
- 測試資料一律虛構

## 介面語言

- 工人姐姐相關畫面：**全套英文**（表單、提示、通知、按鈕）
- 其他畫面：繁體中文（香港習慣）
