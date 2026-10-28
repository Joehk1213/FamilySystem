# JOE-SERVER REAL RAG - C: dev vs D: prod planning

## 1. Current state

- **DESKTOP:** Development currently uses Cloud Supabase. Desktop-side data is under `C:\docker-data\family-system`. The local model directory `C:\docker-data\family-rag\models` is missing, so embeddings use the normalized 384-dimensional placeholder and `isPlaceholder()` returns `true`.
- When the model directory or its `config.json` is missing, the application logs: `[RAG] Using placeholder embedding, model missing at <path>`. This is not a real BGE embedding.
- **JOE-SERVER:** `D:\docker-data\family-system` remains empty; no DESKTOP C: or Cloud application data has been imported. The separate `D:\docker-data\family-rag\models` directory is reported ready with six local BGE model files for 512-dimensional embeddings. See [JOE-SERVER-DEPLOY.md](./JOE-SERVER-DEPLOY.md).
- The D: model files do not mean the D: database has been populated. The disposable DESKTOP stack and Cloud development data remain separate.

## 2. D: layout and environment

JOE-SERVER paths:

```text
D:\docker-data\family-system\postgres
D:\docker-data\family-system\storage
D:\docker-data\family-rag\models
```

Set these variables in JOE-SERVER's local `.env.docker`:

```dotenv
FAMILY_DATA_ROOT=D:\docker-data\family-system
FAMILY_RAG_MODEL_ROOT=D:\docker-data\family-rag\models
```

`FAMILY_DATA_ROOT` controls Compose data mounts. `FAMILY_RAG_MODEL_ROOT` takes precedence over the legacy `FAMILY_RAG_MODEL_PATH`; if neither is set, the application uses the DESKTOP-compatible `C:\docker-data\family-rag\models` default. Keep `.env.docker` and all secrets out of image archives and Git.

## 3. DB setup

- Use the configured Supabase Postgres image with pgvector support. Before applying the migrations, verify the image supports `CREATE EXTENSION IF NOT EXISTS vector;`.
- Migration `20261028000001_family_memories.sql` creates the placeholder `embedding vector(384)` column and its HNSW index.
- Migration `20261028000008_family_memories_bge.sql` adds `embedding_bge vector(512)` and its BGE HNSW index. Placeholder and real BGE embeddings therefore use their matching vector columns; do not write a 512-dimensional vector to the 384-dimensional column.
- Regenerate `scripts/init-family.sql` from all `supabase/migrations/*.sql` files in filename order, wrapped in one `BEGIN`/`COMMIT`. It is generated output and must not be hand-edited.
- For an approved data migration from Cloud Supabase, export only `family_members`, `records`, `family_memories`, and `reminders`. Exclude vector columns (`embedding` and `embedding_bge`) from the `family_memories` export and generate embeddings again on JOE-SERVER.
- Do **not** export Supabase internal Auth tables, password hashes, or tokens. Provision target Auth identities through the approved Auth process, map membership `profile_id` values to those identities, and verify that family access uses `family_members.profile_id` with `status = 'active'`.
- Take and verify backups before importing application data. A change to `FAMILY_DATA_ROOT` does not transfer Cloud or C: data.

## 4. BGE weights

- Model: `BAAI/bge-small-zh-v1.5`.
- Transformers.js-compatible files are provisioned locally from `Xenova/bge-small-zh-v1.5` (base model `BAAI/bge-small-zh-v1.5`), pinned to revision `75c43b069aac4d136ba6bc1122f995fedcfd2781`, under `D:\docker-data\family-rag\models`; runtime inference must not download weights or call an external AI API.
- Required files include `config.json`, `tokenizer.json`, `tokenizer_config.json`, `onnx/model.onnx`, and `vocab.txt` (or the equivalent files required by the installed `@xenova/transformers` model layout).
- The installed local model includes both `onnx/model.onnx` and `onnx/model_quantized.onnx`; `embed.js` loads locally with remote models disabled.
- `embed.js` resolves the model path in this order: `FAMILY_RAG_MODEL_ROOT` > `FAMILY_RAG_MODEL_PATH` > C: default. It checks for `config.json` before attempting a local-only load with `local_files_only: true`. If the model is missing or loading fails, it uses the placeholder and logs the fallback explicitly.
- The database has separate vector dimensions by design: placeholder embeddings are normalized 384-dimensional vectors; the current real BGE path is 512-dimensional and uses `embedding_bge`. Keep each embedding paired with its matching column and search function.
- **Approved compatibility plan:** use 512-dimensional local BGE embeddings with `embedding_bge` and retain 384-dimensional feature-hash placeholder embeddings with `embedding` for legacy/fallback use. Keep each embedding paired with its matching column and search function; do not mix vectors or change schema dimensions.
- After provisioning valid local weights, verify `isPlaceholder()` is `false`, the reported embedding dimension is 512, and `npm run test:family-memories` passes with the real local embedding path. A passing placeholder-mode test does not prove that BGE weights are installed.
- Search uses a cosine-distance threshold of `0.4`. The reported MEME negative-query case with distance `0.52` is fixed and is expected to be excluded.

## 5. Verification checklist

JOE-SERVER results below reflect the deployment status supplied for this document update. They were not independently re-run from DESKTOP, which has no D: drive and no available Docker daemon.

- [x] `scripts/export-images.ps1 -DryRun` (**not** `-WhatIf`): 5 images ready; dry-run does not create directories or move data.
- [x] `docker compose --env-file .env.docker -f docker-compose.prod.yml config --quiet`.
- [x] `node --check source/rag/embed.js`.
- [x] `git diff --check`.
- [x] RLS tests: 15/15.
- [x] Family memories: 10/10 with local 512-dimensional BGE.
- [x] Family reminders: 5/5.
- [x] Agent tests: 3/3.
- [x] `/api/health`, `/chat`, and `/today`: HTTP 200.
- [x] Unauthenticated `POST /api/memories/ingest`: HTTP 401.
- [x] Five JOE-SERVER containers reported healthy; model path reports local 512-dimensional BGE rather than placeholder.
- [x] Cosine threshold `0.4` excludes the fixed MEME negative case at distance `0.52`.

The five-container health, model load, and endpoint results are reported JOE-SERVER results, not observations from this DESKTOP session. Re-run them on JOE-SERVER before a production cutover.

## 6. Rollback

- Keep all existing C: data intact; do not copy, move, or delete it as part of this deployment.
- If D: verification fails, stop the app and Compose services on JOE-SERVER without removing volumes or data directories. Preserve logs and backups for diagnosis.
- Keep DESKTOP/Cloud development as a separate environment. Do not import data from C: or Cloud during rollback.
- Resume D: only after correcting the issue and re-running the model, schema, RLS, and application checks. Do not describe placeholder results as REAL RAG.

## 7. Encryption status

The initial schema enables the `pgcrypto` extension, but no 14A encryption implementation is present in the pulled `main` history. Private-memory encryption remains unimplemented: there is no approved encryption/key-management design or `encrypted_content` column. An installed `pgcrypto` extension alone does not mean data is encrypted. Keep private-memory encryption out of the production claim until a separately approved implementation is merged and verified.
