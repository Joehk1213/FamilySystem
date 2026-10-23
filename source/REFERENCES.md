# 參考項目 — gen-ai-reading-app

> 來源：https://github.com/bocyslamventurenixlab/gen-ai-reading-app
> 關係：用戶上 course 阿 Sir 教嘅 tutorial project，技術棧同本項目 v2 草案完全一致（React → Express gateway → FastAPI → Supabase → OpenRouter → Docker/Railway）。本項目嘅 idea 來源：阿囡放完長假唔記得有呈分中文默書，冇溫習去考天才波 —— 所以想整一個集回憶錄、日記、月曆、提醒事項於一身嘅家庭 app。
> 用法：呢份係參考，唔係照抄 —— 我哋 MVP 冇 FastAPI backend、冇 AI。參考佢嘅**結構同模式**。

## 1. 資料夾結構（值得參考）

```
frontend/    # React + Vite（我哋 MVP 用靜態前台，結構可參考）
gateway/     # Node.js Express：src/index.js、middleware/（auth、logging、errors）、routes/、services/
backend/     # Python FastAPI —— 我哋 MVP 唔做，第三階段 AI 功能先參考
database/migrations/   # SQL schema 檔案（同我哋 supabase/migrations/ 一樣做法）
docker-compose.yml
.env.example（repo 根目錄）
```

對應我哋 CONVENTIONS.md 嘅結構：佢 `gateway/middleware/` 分 auth／logging／errors，值得照搬呢個分法。

## 2. Gateway 模式（BUILD_PLAN 階段 1、4 參考）

- Express 做唯一入口：JWT 驗證 middleware → 路由 → 轉發
- 錯誤處理集中喺 middleware/errors
- 有 `GET /health` endpoint（同我哋 BUILD_PLAN 階段 1 一樣）

參考檔案：`gateway/src/index.js`、`gateway/src/middleware/`

## 3. Docker Compose 模式（BUILD_PLAN 階段 8 參考）

佢個 docker-compose.yml 嘅模式：

- 三個 service（frontend 3000／gateway 3001／backend 8000）用 bridge network 連接
- Frontend build 時用 build args 傳 `VITE_*` 環境變數（Vite 嘅慣例：前端變數要 VITE_ 開頭先會入 bundle）
- 各 service 用自己嘅 env_file，熱重載用 volumes mount src/
- 我哋 MVP 只需要兩個 service（前台＋gateway），做法照抄但刪走 backend

## 4. 環境變數模式（CONVENTIONS 參考）

佢個 `.env.example`：`NODE_ENV`、`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_GATEWAY_URL`。
我哋嘅 .env.example 結構一樣，加 `SUPABASE_SERVICE_ROLE_KEY`（後端專用，唔可以出現喺前端 bundle —— 所以佢**唔可以有 VITE_ 開頭版本**）。

## 5. 第三階段先參考嘅部分（MVP 唔做）

- **Vector search**：文件切成 ~1000 字元 chunk → embedding → cosine similarity 搵 top 5（對應我哋 FR003/FR009，Supabase pgvector）
- **Multi-agent**：SecurityAgent（防 injection）→ LibrarianAgent（語義搜尋）→ AnalystAgent（LLM 推理）→ EditorAgent（防幻覺格式化）—— 呢個分層對我哋第三階段 AI 規則（事實唔作、建議標示）好有參考價值，尤其 SecurityAgent 同 EditorAgent 嘅角色
- **部署**：Railway（同我哋 v2 草案一樣）

## 6. 由痛點到功能嘅提醒

源頭故事（呈分默書冇溫書）對應：

- `record_type='notice'`（學校通告）—— schema 已支援，家長收到通告拍照／記低，記埋呈分日期
- 呈分默書／測驗日期 → 開一條 `plan`（schedule）記錄，月曆見到
- **主動提醒**（FR008）係第三階段；MVP 輕量版已確認加入：月曆旁邊「未來 7 日事項」列表（純查詢，冇 AI、冇推送）
