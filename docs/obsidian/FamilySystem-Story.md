# FamilySystem：由家庭日曆走到生活記錄冊

> 呢頁係俾人閱讀嘅專案故事與導讀，不是即時系統狀態，也不取代需求文件或操作指南。日期、環境和驗證結果均以所連結文件當時記錄為準。

## 起點：讓家庭生活有跡可尋

FamilySystem 想把未來安排、當日生活和過去回憶放在同一個家庭記錄冊。日曆只是記錄的一種檢視方式；計劃和實際經歷要分開，不能把「安排了」當成「已發生」，也不能替家庭補作歷史。專案參考過一個教學 repo 的架構模式，但 FamilySystem 有自己的需求和範圍，並非照搬該專案。

需求和 MVP 邊界見 [PRD](../../source/PRD_MVP.md)；參考項目關係見 [REFERENCES](../../source/REFERENCES.md)。

## 第一章：先把家庭角色和界線說清楚

MVP 將登入／登出、簡化時間軸與月曆（包括未來 7 日事項），以及 Helper Workflow 列作核心。工人姐姐只看獲授權的行程、用英文介面新增生活紀錄；想改行程要先提交申請，由父母審批，不能直接改。這些是需求規格，不等於每項都已在真實環境驗收。

詳細要求和權限以 [PRD](../../source/PRD_MVP.md) 及 [DB 設計](../../source/DB_DESIGN.md) 為準；目前建置進度見 [TODO](../../TODO.md) 和 [PROGRESS-FAMILY](../../PROGRESS-FAMILY.md)。

## 第二章：由本機 MVP 走向更多嘗試

進度紀錄描述了本機 disposable Supabase、RLS 測試、登入後的記錄流程、時間軸和前台互動等工作。其後，Family Memory／RAG 被記錄為已批准的非 MVP 擴展；它不應被誤讀成原始 MVP 的要求，也不代表每個環境都使用同一模型或具有相同資料。

相關進度與限制見 [PROGRESS-FAMILY](../../PROGRESS-FAMILY.md)、[TODO](../../TODO.md) 和 [Family User Guide](../FAMILY_USER_GUIDE.md)。部署操作則見 [JOE-SERVER 部署指南](../JOE-SERVER-DEPLOY.md)。

## 第三章：不同機器、不同時間的快照

文件記錄了 DESKTOP 的 C: disposable 環境、JOE-SERVER 的 D: 部署目標，以及 Cloud development 等不同環境。10 月 30 日至 31 日的報告各自記錄不同時間、checkout 和檢查結果；例如 preflight 的 HOLD 與稍後的 online success 是先後快照，不應拼成同一時間的狀態。

可沿 [Night Shift Summary](./NIGHT-SHIFT-SUMMARY-20261030.md)、[Production Notes](./PRODUCTION-README.md)、[SERVER Online Preflight](./SERVER-ONLINE-PREFLIGHT-20261031.md)、[SERVER Online Success](./SERVER-ONLINE-SUCCESS-20261031.md)、[Cloud Migration Report](./CLOUD-MIGRATION-SUCCESS-20261031.md) 和 [SERVER/DT Sync Report](./SERVER-DT-SYNC-FIX-20261031.md) 閱讀當時紀錄。這些歷史報告不能單獨證明目前部署、Cloud、Git refs、加密或網絡狀態。

## 第四章：文件本身也要有路線圖

2026-11-01 的 Markdown 審查發現同一主題有重疊文件、README 有重複的 FR011 區段，以及歷史快照容易被誤認為現況。整理後，本頁作為人讀故事入口；[Copilot Instructions](../../.github/copilot-instructions.md) 說明 LLM 應如何尋找和更新既有文件。需求仍以 `source/` 為準，過往審計仍保留作證據。

核對方法、文件重疊和未完成的治理事項見 [Markdown Governance Review](../GOVERNANCE-CONSOLIDATED-20261101.md)。

## 導讀：遇到問題應該看哪裏

- 需求／權限／建置次序：`source/` 內的對應規格文件（唯讀）。
- 日常概覽：根目錄 [README](../../README.md)。
- 待辦、進度、錯誤：根目錄 [TODO](../../TODO.md)、[PROGRESS-FAMILY](../../PROGRESS-FAMILY.md)、[ERROR_LOG](../../ERROR_LOG.md)。
- 部署／使用操作：`docs/` 內按主題維護的指南。
- 當時發生過甚麼：本目錄有日期的報告；它們是歷史證據，不是自動更新的現況頁。
- Obsidian 同步背景：原有 [sync note](./README.md)；本故事頁沒有重新驗證兩部機器目前的連結或同步狀態。
