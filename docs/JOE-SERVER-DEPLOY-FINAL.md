# JOE-SERVER Final Deployment Status

## Machine and data separation

| Machine | Application data root | Application data status | RAG model |
|---|---|---|---|
| DESKTOP | `C:\docker-data\family-system` | Active data remains on C:; no migration is performed by this deployment | `C:\docker-data\family-rag\models` is absent; use normalized 384-dimensional placeholder and report `isPlaceholder() = true` |
| JOE-SERVER | `D:\docker-data\family-system` | Empty; no C: or Cloud application data has been imported | `D:\docker-data\family-rag\models` is reported provisioned with 6 local BGE files for real 512-dimensional embeddings |

The D: database/storage root and model directory are separate. A ready model directory does not imply that family data has been imported or that C: data has moved.

## JOE-SERVER environment

Set the following in the server-local `.env.docker`:

```dotenv
FAMILY_DATA_ROOT=D:\docker-data\family-system
FAMILY_RAG_MODEL_ROOT=D:\docker-data\family-rag\models
```

`FAMILY_RAG_MODEL_ROOT` takes precedence over legacy `FAMILY_RAG_MODEL_PATH`; when neither is set, the code falls back to the DESKTOP-compatible C: model path. Keep `.env.docker` and secrets out of Git and image archives.

## Database and export limits

- The current deployment does not copy or import data from DESKTOP C: or Cloud Supabase.
- If a future data migration is separately approved, export only the required application tables and exclude vector columns from `family_memories`; recreate embeddings on the destination. Never export Supabase internal Auth tables, password hashes, or tokens.
- Keep RLS membership authorization tied to `family_members.profile_id` and `status = 'active'`.
- Placeholder vectors use `embedding vector(384)`; real BGE vectors use `embedding_bge vector(512)`. These dimensions and their search functions must not be mixed.

## Reported JOE-SERVER verification

The following are deployment results reported for JOE-SERVER. This DESKTOP session has no D: drive and no available Docker daemon, so these results were not independently re-run here. Re-run the commands on JOE-SERVER before production cutover.

- `scripts/export-images.ps1 -DryRun` (use `-DryRun`, not `-WhatIf`): 5 images ready.
- `docker compose --env-file .env.docker -f docker-compose.prod.yml config --quiet`: passed.
- Docker Compose: 5 containers reported healthy.
- `node --check source/rag/embed.js` and `git diff --check`: passed.
- RLS: 15/15.
- Family memories: 10/10 with 512-dimensional local BGE.
- Family reminders: 5/5.
- Agents: 3/3.
- `/api/health`, `/chat`, `/today`: HTTP 200.
- Unauthenticated `POST /api/memories/ingest`: HTTP 401.
- Cosine threshold: `0.4`; the MEME negative case at distance `0.52` is reported fixed and excluded.

## Encryption status

The initial schema enables `pgcrypto`, but the latest pulled `main` does not contain the referenced 14A encryption implementation. Private-memory encryption is not implemented or approved; there is no `encrypted_content` column. Enabling the extension is not equivalent to encrypting data. Treat encryption as a separate design and release gate.

## Rollback

1. Keep DESKTOP `C:\docker-data\family-system` untouched. Do not copy, move, or delete its data.
2. If JOE-SERVER checks fail, stop the app and Compose services without removing volumes or deleting D: directories.
3. Keep Cloud/DESKTOP and JOE-SERVER deployment data isolated; do not attempt an unplanned import during rollback.
4. Preserve logs and backups, correct the D: configuration, and re-run model, schema, RLS, and application checks before resuming.
