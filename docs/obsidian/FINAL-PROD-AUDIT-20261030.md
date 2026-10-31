# FINAL PROD AUDIT - JOE-SERVER - 2026-10-30

## Release history
Current release: v1.0-encrypted-real (3b1422a).

Recent commits:
- 3b1422a (HEAD -> main, tag: v1.0-encrypted-real, origin/main, origin/HEAD) feat(security): real pgcrypto encryption for private records
- e37a26e (tag: v0.9-joe-real-rag-encrypted-placeholder) feat(security): add pgcrypto + encrypted_content placeholder
- 778b2a7 docs(deploy): document JOE-SERVER final BGE status and rollback
- 7ec1647 feat(rag): real BGE 512 on JOE-SERVER D: + tighten threshold 0.4
- 294d8a3 docs(deploy): add JOE-SERVER RAG checklist, note 384/512 blocker
- 5276190 feat(rag): support FAMILY_RAG_MODEL_ROOT with fallback for JOE-SERVER D:
- 1e7a640 docs(deploy): mark JOE-SERVER D: empty; RAG setup after dev
- f3dff7d docs(deploy): clarify Desktop C: vs JOE-SERVER D: vector DB
- b84421e docs(deploy): record C/D dry-run verification without data move
- b987407 docs(progress): record final main push verification
- edc1856 feat(bge): enforce local-only loading with placeholder fallback
- 7819c6a feat(memory): add local PDF ingestion and housekeeper citations
- aef6849 feat(ingest): local txt/md chunk 1000/200 + /api/memories/ingest authenticated + BGE placeholder isPlaceholder() + reminder scheduler 15min - 9/9 green
- 392c920 feat(agents): 4-agent anti-hallucination loop Security/Librarian/Analyst/Editor + orchestrator + chat badge
- ff8a799 feat(PJ2): 17 migrations (reminders + security_logs + BGE placeholder + threshold) + 7-day overview + init rebuild - safe point
- ff808a4 initial commit
- a232a51 fix(rls): deny Guest schedule request - 15/15 RLS + 3/3 approval green
- 3ecd464 chore(security): add CMS cert 82834C3444AD924A67ECD735B79DDFB69E604EA6, backup includes DB+storage
- 220abcf docs: normalize line endings and finalize MVP1.0 replanning
- 6db1e85 feat(ui): add four MVP pages and enforce attachment limit
- 036fa66 feat(schedule): add approve_schedule_change wrapper and restrict ACL to authenticated
- 4a21212 fix(rls): require readable target for schedule change and allow owner RETURNING
- 6eab996 chore: disable vector and analytics for MVP1.0 local dev
- dda21d9 iniial commit
- ed0b285 Initial commit

Tags (newest first):
- v1.0-encrypted-real
- v0.9-joe-real-rag-encrypted-placeholder

Compose config --quiet exit code: 0

## Containers

| Name | Service | Status |
|---|---|---|
| familysystem-auth-1 | supabase/gotrue:v2.197.0 | "auth"                   auth      About an hour ago   Up About an hour (healthy)    |
| familysystem-db-1 | supabase/postgres:17.6.1.136 | "docker-entrypoint.s…"   db        4 hours ago         Up About an hour (healthy)   5432/tcp |
| familysystem-gateway-1 | caddy:2.9.1-alpine | "caddy run --config …"   gateway   4 hours ago         Up 4 hours (healthy)         127.0.0.1:8000->80/tcp |
| familysystem-rest-1 | postgrest/postgrest:v14.18 | "/bin/postgrest"         rest      4 hours ago         Up 4 hours (healthy)         3000/tcp |
| familysystem-storage-1 | supabase/storage-api:v1.81.0 | "docker-entrypoint.s…"   storage   4 hours ago         Up 4 hours (healthy)         5000/tcp |

Healthy containers observed: 5 (expected 5). Compose ps exit code: 0.

## Storage and model layout

- D:\docker-data\family-system\postgres - PostgreSQL persistent data.
- D:\docker-data\family-system\storage - Supabase Storage persistent data.
- D:\docker-data\family-rag\models - 6 files recursively (expected 6). No files listed with secret values.

## Environment separation

- Host Node/PM2 loads its application environment through DOTENV_CONFIG_PATH (production env stored under D:\backup).
- Docker Compose interpolation uses --env-file .env.docker. These are separate process/config responsibilities; neither environment values nor keys are reproduced here.

## Embedding dimensions

- Real local BGE-small-zh uses 512 dimensions and the embedding_bge column/function.
- Legacy placeholder feature-hash uses 384 dimensions and its separate embedding column/function. Never mix dimensions.

## Encryption scope

- pgcrypto backs application/RPC encryption for private records content stored in public.records.encrypted_content BYTEA; authorized reads are gated by authentication/RLS.
- Titles/metadata and family-memory/RAG content are outside this encryption scope; do not describe it as end-to-end encryption.

## Current QA evidence

- PM2 family-prod online: True (checked separately at final step).
- GET http://127.0.0.1:3002/health: HTTP 200.
- Compose configuration validation: passed; containers healthy: 5 / 5.

No key values were read into this report. Historical deployment documents may describe pre-v1.0 encryption status.
