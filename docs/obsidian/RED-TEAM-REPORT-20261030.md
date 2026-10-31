# RED TEAM REPORT - 2026-10-30

Read-only configuration and policy review. No exploit, credential extraction, or write testing was performed.

## Findings and severity

### P0 - Production environment file ACL is too broad (confirmed)
- D:\backup\.env.docker.prod-backup grants Authenticated Users Modify and BUILTIN\Users ReadAndExecute; ACL inheritance is enabled. This permits unnecessary local account access to credentials.
- Recommended: after mapping the PM2 and Compose Windows identities, replace inherited broad grants with owner/service account, Administrators and SYSTEM only. Validate PM2 can still read its env before and after the change. No ACL modification was made.

### P0 - External production URLs are placeholders; public reachability is not production-ready
- Configured SITE_URL/API_EXTERNAL_URL/SUPABASE_PUBLIC_URL use `family.example.invalid`, while CORS_ALLOWED_ORIGIN is `http://localhost:3002`. `.invalid` is deliberately non-routable, and localhost is not a real remote browser origin.
- Do not enable external sign-in or expose the service until an approved HTTPS domain, exact callback, CORS origin and redirect allowlist are configured and validated. Current local health 200 proves loopback liveness only.

### P1 - Express API CORS is not restricted in application code
- `server/index.js` mounts `cors()` with default options; the configured `CORS_ALLOWED_ORIGIN` applies to Supabase services and is not passed to Express CORS middleware.
- Recommended: define the exact approved frontend origin(s) in host app config and configure Express CORS explicitly. Validate preflight behavior for Authorization headers. This audit did not change code or restart production.
### P1 - Google OAuth remains disabled
- `GOTRUE_EXTERNAL_GOOGLE_ENABLED=false`; this is safer until real HTTPS callback and credentials are configured.

### P1 - Key rotation/recovery not implemented
- Loss of the matching key makes private `encrypted_content` unreadable. Establish encrypted offline escrow/recovery and design versioned-key rotation before representing this as operationally complete.

### P2 - RLS policy catalog presence is not a semantic security proof
- Four records CRUD policies target authenticated role; database trigger blocks private plaintext writes. Keep authenticated cross-family/creator tests in a disposable environment.
- No production mutation or integration tests were run.

## Secret-handling scan

- C:\Project\Family\FamilySystem\source\BUILD_PLAN.md:22:- [ ] 種子腳本（service_role，受控場景）：虛構家庭「Test Family」＋虛構成員（爸爸 master active、太太 master active、工人姐姐 worker active、兩個小朋友冇帳戶、一個 pending 申請）
- C:\Project\Family\FamilySystem\source\CONVENTIONS.md:33:[redacted matching content]
- C:\Project\Family\FamilySystem\source\CONVENTIONS.md:34:[redacted matching content]
- C:\Project\Family\FamilySystem\source\CONVENTIONS.md:54:- 一般用戶請求：帶用戶 JWT（由前端傳），接受 RLS 權限檢查 —— **唔准用 service_role 令讀寫成功**
- C:\Project\Family\FamilySystem\source\CONVENTIONS.md:55:- Admin 審批等管理操作：沿用操作者 JWT，後端驗證有效登入、同家庭、已批准 Admin 權限，再交 RLS／受控函式檢查（唔好預設用 service_role）
- C:\Project\Family\FamilySystem\source\CONVENTIONS.md:56:- service_role 只用於：項目初始化、種子腳本呢類冇用戶身份嘅場景
- C:\Project\Family\FamilySystem\source\REFERENCES.md:40:我哋嘅 .env.example 結構一樣，加 `SUPABASE_SERVICE_ROLE_KEY`（後端專用，唔可以出現喺前端 bundle —— 所以佢**唔可以有 VITE_ 開頭版本**）。
- C:\Project\Family\FamilySystem\source\REPLANNING-MVP1.md:34:  - 後端 service_role 技術上仲睇到，但文件要寫明係應用層私隱，非絕對
- C:\Project\Family\FamilySystem\source\REPLANNING-MVP1.md:38:[redacted matching content]
- C:\Project\Family\FamilySystem\source\REPLANNING-MVP1.md:92:- Backend：`server/` 用你現有 Express，全部 API 驗 `Authorization: Bearer <user JWT>`，用 anon key + user JWT 查 DB，RLS 係最終防線，唔用 service_role
- C:\Project\Family\FamilySystem\source\REPLANNING-MVP1.md:106:- [ ] `.env` 有 service_role key 嘅只喺 `scripts/seed` 手動用，唔入前端/一般 server

## Read-only PostgreSQL policy inspection
                       polname                       | polcmd |    polroles     
-----------------------------------------------------+--------+-----------------
 families_select_active_member                       | r      | {authenticated}
 families_update_admin                               | w      | {authenticated}
 profiles_select_self_or_family_admin                | r      | {authenticated}
 profiles_update_self                                | w      | {authenticated}
 family_members_select_self_or_family_admin          | r      | {authenticated}
 family_members_insert_self_pending                  | a      | {authenticated}
 family_members_insert_admin                         | a      | {authenticated}
 family_members_update_admin                         | w      | {authenticated}
 records_update_editable                             | w      | {authenticated}
 records_delete_editable                             | d      | {authenticated}
 record_participants_select_readable_record          | r      | {authenticated}
 record_participants_insert_editable_record          | a      | {authenticated}
 record_participants_update_editable_record          | w      | {authenticated}
 record_participants_delete_editable_record          | d      | {authenticated}
 record_audience_select_readable_record              | r      | {authenticated}
 record_audience_insert_admin                        | a      | {authenticated}
 record_audience_delete_admin                        | d      | {authenticated}
 attachments_select_readable_record                  | r      | {authenticated}
 attachments_insert_editable_record                  | a      | {authenticated}
 attachments_update_editable_record                  | w      | {authenticated}
 attachments_delete_editable_record                  | d      | {authenticated}
 schedule_change_requests_select_requester_or_master | r      | {authenticated}
 storage_objects_select_readable_record              | r      | {authenticated}
 storage_objects_insert_editable_record              | a      | {authenticated}
 storage_objects_update_editable_record              | w      | {authenticated}
 storage_objects_delete_editable_record              | d      | {authenticated}
 records_insert_as_self                              | a      | {authenticated}
 records_select_readable                             | r      | {authenticated}
 schedule_change_requests_insert_worker_only         | a      | {authenticated}
 family_memories_select_same_active_family           | r      | {authenticated}
 family_memories_insert_active_member                | a      | {authenticated}
 reminders_select_active_family                      | r      | {authenticated}
 reminders_insert_active_family                      | a      | {authenticated}
 reminders_update_active_family                      | w      | {authenticated}
 reminders_delete_active_family                      | d      | {authenticated}
 same family active can read security_logs           | r      | {authenticated}
 same family active can insert security_logs         | a      | {authenticated}
(37 rows)

Policy query exit code: 0

## Additional checks
- `.env` and `.env.docker` are gitignored; `.env.example` contains a placeholder, not a production key.
- `source/security/encryption.js` contains `getEncryptionKey()`; migration 00011 uses pgcrypto AES-256 and a private plaintext guard.
- No key or password value is printed in this report.
