# JOE-SERVER REAL RAG - C: dev vs D: prod planning

## 1. Current state

- **DESKTOP:** Development currently uses Cloud Supabase. Desktop-side data is under `C:\docker-data\family-system`. The local model directory `C:\docker-data\family-rag\models` is missing, so embeddings use the normalized 384-dimensional placeholder and `isPlaceholder()` returns `true`.
- When the model directory or its `config.json` is missing, the application logs: `[RAG] Using placeholder embedding, model missing at <path>`. This is not a real BGE embedding.
- **JOE-SERVER:** The local stack is deployed on `D:\docker-data\family-system`. Application tables remain empty; no Cloud data has been imported. See [JOE-SERVER-DEPLOY.md](./JOE-SERVER-DEPLOY.md).
- The disposable DESKTOP stack is separate from the JOE-SERVER D: stack; no Cloud data was moved or imported.

## 2. Target D: structure

Planned JOE-SERVER directories:

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

## 5. Verification checklist

- [ ] Run `scripts/export-images.ps1 -DryRun` (**not** `-WhatIf`); confirm all 5 required images are ready. Dry-run does not create directories or move data.
- [ ] Run `docker compose --env-file .env.docker -f docker-compose.prod.yml config --quiet`.
- [ ] Run `node --check source/rag/embed.js`.
- [ ] Run `git diff --check`.
- [ ] Run `npm run test:rls`; confirm 15/15 RLS tests pass.
- [ ] Run `npm run test:family-memories`; confirm 10/10 checks pass in the selected embedding mode.
- [ ] Run `npm run test:reminders`; confirm 5/5 checks pass.
- [ ] Run `npm run test:agents`; confirm 3/3 checks pass.
- [ ] Verify `/health`, `/chat`, and `/today` return HTTP 200.
- [ ] Verify unauthenticated `POST /api/memories/ingest` returns HTTP 401.
- [ ] Confirm the selected model mode and vector dimensions in logs and test output; do not mark REAL RAG verified while `isPlaceholder()` is `true`.

## 6. Rollback

- Keep all existing C: data intact. The JOE-SERVER D: deployment is new and remains a planning target until explicitly provisioned.
- Do not move or delete C: data as part of setup or rollback. Do not cut over to D: until the local BGE load, matching 512-dimensional search path, migrations, RLS tests, and application checks have all passed.
- If D: verification fails, stop the D: rollout and continue using the existing DESKTOP/Cloud development environment. Preserve logs and backups for diagnosis; do not describe placeholder results as REAL RAG.
