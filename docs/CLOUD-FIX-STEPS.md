# Cloud Supabase 修復步驟：records.encrypted_content 42703

## 目的與範圍

Cloud development 的 `public.records` 尚未套用 family encryption migrations 時，records API 會因查詢 `encrypted_content` 回傳 PostgreSQL `42703`。此 bundle 將 migration `20261028000010`（pgcrypto extension、BYTEA 欄位）及 `20261028000011`（加解密 RPC、權限及 plaintext guard trigger）按順序合併。

此步驟只套用 schema/function/trigger 變更，不匯入 C: 或 D: 資料、不處理真實家庭資料，亦不會透過 `docker exec` 操作 Cloud。**不可對 production 或錯誤 project 執行。**

## 加密實作與資料範圍

- `source/security/encryption.js` 驗證 `FAMILY_ENCRYPTION_KEY` 為 32-byte base64，並在無效或缺少 key 時 fail closed；Node 程式透過 Supabase RPC 呼叫資料庫加解密，並無應用層 AES-GCM 實作。
- PostgreSQL `encrypt_private_content`／`decrypt_private_content` RPC 使用 pgcrypto `pgp_sym_encrypt`／`pgp_sym_decrypt`，加密選項為 `cipher-algo=aes256`（PGP/OpenPGP AES-256）。兩個 RPC 為 `SECURITY INVOKER`；執行權限撤銷自 `PUBLIC`、`anon`、`service_role`，只授予 `authenticated`。
- Rule #3：加密範圍只包括 private `records.content`，密文存於 `records.encrypted_content`。標題、其他 metadata 及附件不會因此加密；既有 plaintext private content 亦不會自動轉換。v1.1 尚未提供 key rotation。

## 權限與環境邊界

- Rule #1：家庭成員權限只以 `family_members.profile_id` 配合 `status = 'active'` 判斷；不可用 `user_id` 或其他欄位取代。
- Rule #6：一般請求使用 anon key 加用戶 JWT，並由 RLS 授權；`service_role` 只限 scheduler 等受控後端場景，不得用於一般用戶請求。
- Rule #5：Cloud `.env` 與本機 `.env.docker` 的 key 必須分開管理，不可互相複製。不要讀取 `.env`、`.env.docker` 或 `.env.docker.prod-backup` 的內容；不可將 key 值貼入 SQL Editor、文件、ticket 或 log。

## 執行前

1. 登入 Supabase Dashboard，確認選擇的是 FamilySystem Cloud development project，project ref 為 `ewruwxhyxkbefklrgsbi`。
2. 打開指定的 SQL Editor：[FamilySystem Cloud SQL Editor](https://supabase.com/dashboard/project/ewruwxhyxkbefklrgsbi/sql/new)。
3. 確認頁面 project ref 正確，並確認目前有可還原的 Cloud schema backup。
4. 開啟 [CLOUD-MIGRATION-FIX.sql](../supabase/CLOUD-MIGRATION-FIX.sql)，完整複製內容貼入 SQL Editor。
5. 確認 SQL 以 `BEGIN;` 開始、以 `COMMIT;` 結束，再按 **Run** 一次。若執行出錯，不要自行只重跑部分語句；先保留完整錯誤訊息並檢查交易是否 rollback。

## 驗證

在同一 Cloud SQL Editor 執行：

```sql
SELECT column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'records'
  and column_name = 'encrypted_content'
  and data_type = 'bytea'
  and udt_name = 'bytea';

SELECT p.proname AS routine_name,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute,
       COALESCE(bool_or(acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'), false) AS public_can_execute
from pg_proc AS p
join pg_namespace AS n on n.oid = p.pronamespace
cross join lateral aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
where n.nspname = 'public'
  and p.proname in ('encrypt_private_content', 'decrypt_private_content')
  and p.pronargs = 2
group by p.oid, p.proname
order by p.proname;

SELECT trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'records'
  and trigger_name = 'trg_records_guard_private_plaintext';
```

以上為三個 post-condition 查詢，預期：

1. 欄位查詢回傳一筆，`data_type` 及 `udt_name` 均為 `bytea`。
2. RPC 查詢回傳兩筆；兩筆的 `authenticated_can_execute` 均為 `true`，而 `anon_can_execute`、`service_role_can_execute`、`public_can_execute` 均為 `false`。
3. Trigger 查詢回傳一筆。

然後在 DESKTOP 使用 Cloud `.env` 執行 `npm start`，確認 records API 不再因 `records.encrypted_content` 回傳 42703。

## Key 與資料安全

- `FAMILY_ENCRYPTION_KEY` 必須是每個環境各自產生的 32-byte base64 key。DESKTOP Cloud `.env` 與本機 `.env.docker` 使用不同 key；不可複製 JOE-SERVER key 或把 key 放入 SQL Editor、文件或 Git。
- Key 遺失會令已加密的 private record content 無法解密。請使用受控、加密的秘密管理／備份程序保存 key；不可在 ticket、chat 或 log 中記錄 key 值。
- Private record 的標題、其他 metadata 及附件仍不在本加密範圍。這些 migrations 不會自動加密既有 plaintext private content；既有資料需要先盤點並按核准程序處理。
- 不要對 Cloud 執行整份 `scripts/init-family.sql`。此檔是完整初始化 bundle，不是本次 Cloud 修復指令。
