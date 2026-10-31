# JOE-SERVER Online Recovery — 2026-10-31

## Result: ONLINE — addendum verified at 2026-10-31 14:03:47 +08:00

- Repository: `C:\Project\Family\FamilySystem`; `HEAD=main=origin/main=0810722` (`fix(cors): ensure default 127.0.0.1:3002 always allowed plus configured origins additive (Rule #7)`). Working tree clean.
- Effective PM2 context: `JOE-SERVER\Joehk`, `C:\Users\Joehk\.pm2`; `family-prod` is online (PID 1964).

## Docker and database

`docker compose --env-file .env.docker -f docker-compose.prod.yml ps` verified all five containers healthy: `familysystem-db-1`, `familysystem-auth-1`, `familysystem-rest-1`, `familysystem-storage-1`, and `familysystem-gateway-1`.

Read-only DB checks passed: `vector` 0.8.2; `pgcrypto` 1.3; `public.records.encrypted_content` is `bytea`; 4 `public.records` RLS policies; `trg_records_guard_private_plaintext` present and enabled.

## Application, CORS, and RAG

- `http://127.0.0.1:3002/health`: HTTP 200.
- Request with `Origin: http://127.0.0.1:3002`: HTTP 200; `Access-Control-Allow-Origin: http://127.0.0.1:3002`.
- Committed Rule #7 change in `server/index.js`: defaults are always retained and configured allowlisted origins are additive: `[...defaultCorsOrigins, ...configuredCorsOrigins]`. Explicit validation remains; `.invalid` origins are rejected; bare `app.use(cors())` is absent.
- Model root: `D:\docker-data\family-rag\models`; latest 100-run local benchmark mean `10.317 ms`, dimension 512, `isPlaceholder=false` (real BGE). No download or external AI service was used.

## P0 backup ACL: HARDENED

- Target: `D:\backup\.env.docker.prod-backup`; owner `JOE-SERVER\Joehk`; size `1973` bytes.
- Inheritance is disabled. Only `BUILTIN\Administrators`, `NT AUTHORITY\SYSTEM`, and `JOE-SERVER\Joehk` have `FullControl`; `Authenticated Users` and `Users` are absent.
- ACL was verified from metadata only; the file contents were not read or printed. `C:\backup` is absent.

## Cloud migration review: HOLD — not executed

- `supabase/CLOUD-MIGRATION-FIX.sql` exists and has 94 lines. It is wrapped in `BEGIN;` / `COMMIT;`, uses `CREATE EXTENSION IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, and `DROP TRIGGER IF EXISTS` before recreating the trigger. It targets the pgcrypto extension, `public.records.encrypted_content`, encryption routines, and guard trigger; it does not contain full `init-family.sql` table/seed initialization logic.
- The five execution-preparation steps below are quoted from `docs/CLOUD-FIX-STEPS.md`. All remain **NOT CONFIRMED / HOLD**:
  1. “登入 Supabase Dashboard，確認選擇的是 FamilySystem Cloud development project，project ref 為 `ewruwxhyxkbefklrgsbi`。” — **NOT CONFIRMED / HOLD**
  2. “打開指定的 SQL Editor：[FamilySystem Cloud SQL Editor](https://supabase.com/dashboard/project/ewruwxhyxkbefklrgsbi/sql/new)。” — **NOT CONFIRMED / HOLD**
  3. “確認頁面 project ref 正確，並確認目前有可還原的 Cloud schema backup。” — **NOT CONFIRMED / HOLD**
  4. “開啟 [CLOUD-MIGRATION-FIX.sql](../supabase/CLOUD-MIGRATION-FIX.sql)，完整複製內容貼入 SQL Editor。” — **NOT CONFIRMED / HOLD**
  5. “確認 SQL 以 `BEGIN;` 開始、以 `COMMIT;` 結束，再按 **Run** 一次。若執行出錯，不要自行只重跑部分語句；先保留完整錯誤訊息並檢查交易是否 rollback。” — **NOT CONFIRMED / HOLD**; no authorization/run occurred.
- Search across `docs/`, `server/`, and `source/` found the project ref only in `docs/CLOUD-FIX-STEPS.md`; `server/index.js` has no hardcoded project URL. No Cloud SQL, `supabase db push`, or `scripts/init-family.sql` was run.

## RAG scope and stash handover

- `PRD_MVP.md` excludes vector search/AI from MVP. `TODO.md` marks Family Memory/RAG as an approved non-MVP extension and documents local BGE plus the 384D placeholder as not equivalent to real model weights; this JOE-SERVER run verified real local 512D embeddings.
- `BUILD_PLAN.md` does not itself contain a separate approved-RAG extension entry; it describes the MVP build stages. Thus the extension approval is evidenced by `TODO.md`, not a matching BUILD_PLAN entry. `source/DB_SCHEMA_DRAFT.sql` has no diff in commit `0810722`.
- SERVER stash remains preserved: `stash@{0}: temp stash SERVER cors allowlist before ff to da0b6b2` (old `server/index.js` patch). Per owner-provided handover, DESKTOP TODO and `embed.js` stashes remain preserved and were not popped; that DESKTOP state is not locally inspectable from this SERVER.

## Safety

No secret values were included. No Cloud migration, `supabase db push`, `init-family.sql`, Docker prune/down, fixture-mutating test, or D: data deletion was performed.
