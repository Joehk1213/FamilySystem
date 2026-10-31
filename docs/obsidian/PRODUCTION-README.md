# FamilySystem - JOE-SERVER Production Notes

> Current release: `v1.0-encrypted-real` (commit `3b1422a`). This runbook summarizes the current JOE-SERVER state; older deployment notes may describe the pre-encryption release.

## Release changes

- `v0.9-joe-real-rag-encrypted-placeholder` (`e37a26e`) added the pgcrypto extension and a nullable `records.encrypted_content BYTEA` placeholder. It did not encrypt records.
- `v1.0-encrypted-real` (`3b1422a`) adds the private-record body encryption path: pgcrypto AES-256 PGP encryption/decryption, authenticated-only RPC grants, a database guard against authenticated plaintext writes, and JWT/RLS-authorized API decryption.
- Only `visibility='private'` record `content` is encrypted at rest. Titles and other metadata, plus family-memory/RAG content, are not encrypted by this feature. Key rotation and user-controlled unlock are not implemented.

## Machine and data paths

| Environment | Data root | Model root | Notes |
|---|---|---|---|
| DESKTOP / development | `C:\docker-data\family-system` | `C:\docker-data\family-rag\models` | Separate development environment. Never delete or copy its data as part of JOE-SERVER operations. |
| JOE-SERVER / production | `D:\docker-data\family-system` | `D:\docker-data\family-rag\models` | Postgres and Storage persist on D:. Six local model files provide real 512-dimensional BGE. No C: or Cloud import is implied. |

Operational env/backup material and QA logs are under `D:\backup\`. Production Node uses `DOTENV_CONFIG_PATH=D:\backup\.env.docker.prod-backup`; do not print or commit values from that file. Keep the encryption key backed up in a separate, controlled and encrypted recovery process: losing it makes existing ciphertext unreadable.

## Services and RAG

The five Compose services are `db`, `auth`, `storage`, `rest`, and `gateway`. Keep their health checks green. The API listens on loopback port 3002; the gateway is loopback-only unless an independently approved HTTPS reverse proxy is configured.

JOE-SERVER loads the local Transformers.js-compatible BGE model from `D:\docker-data\family-rag\models` with remote model loading disabled. Real embeddings are 512D and use `embedding_bge`; the legacy placeholder uses a separate 384D `embedding` column. Never mix dimensions. No external AI inference is used.

The database has `pgcrypto` and nullable `public.records.encrypted_content BYTEA`. The application encrypts private record bodies before writes and decrypts only after the caller is authenticated and RLS has authorized the read. Do not expose service-role credentials to user-facing paths.

## Backups and QA logs

`D:\backup\` contains the production env backup and operational logs, including `overnight-health.log`, `overnight-qa-20261029.log`, and `security-audit-20261029.log`. Keep this directory on a protected local disk; do not sync secrets into Git or public/cloud artifacts. Separately back up the Postgres data and private Storage data using an encrypted, tested restore procedure. A database/storage backup is not a substitute for preserving the encryption key.

## PM2 operations (PowerShell)

Set the environment explicitly before starting/restarting the app; do not use `--env-file .env.docker` with PM2:

```powershell
$env:DOTENV_CONFIG_PATH = 'D:\backup\.env.docker.prod-backup'
$env:FAMILY_RAG_MODEL_ROOT = 'D:\docker-data\family-rag\models'
$env:PORT = '3002'
pm2 start server/index.js --name family-prod
pm2 save
pm2 list
pm2 logs family-prod
```

Closing a terminal does not stop the PM2 daemon. `pm2 save` saves the process list, but by itself does not configure Windows reboot startup; use a separately tested Windows Task Scheduler task to run `pm2 resurrect` at login/startup if reboot recovery is required. Do not stop or restart `family-prod` during routine checks.

## Enable Google OAuth (only after public HTTPS is ready)

1. Configure an OAuth 2.0 Web client in Google Cloud Console. Add the exact Supabase Auth callback URI `<API_EXTERNAL_URL>/callback` to the authorized redirect URIs. In this deployment, `API_EXTERNAL_URL` is the public HTTPS API base ending in `/auth/v1`.
2. In the server-side Compose environment file, set `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true`, `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`, and `GOTRUE_EXTERNAL_GOOGLE_SECRET`. Keep client secret only in the ignored local env file; never put it in this document, frontend, or Git.
3. Set `SUPABASE_PUBLIC_URL`, `API_EXTERNAL_URL`, `SITE_URL`, CORS origin, and redirect allow-list to the actual HTTPS origins. Do not use loopback or example `.invalid` URLs for external sign-in.
4. Review the resolved Compose config without printing secrets, then apply the Auth configuration using the approved maintenance window. Test the OAuth callback and sign-in with a fictional account before enabling real users.

## Validation references

Current recorded QA: RLS 15/15, reminders 5/5, family memories 10/10 with local 512D BGE, agents 3/3; `/health` HTTP 200; `records.encrypted_content` is nullable `bytea`; five Compose services healthy. See `D:\backup\overnight-qa-20261029.log` for the detailed run. Test only against the loopback disposable fixture DB and remove fixture data afterward.
