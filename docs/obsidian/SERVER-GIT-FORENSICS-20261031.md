# SERVER Git Forensics - 2026-10-31

**Scope:** Read-only local Git forensics. No code change, fetch, branch switch, pull, push, reset, clean, or production-data access was performed. No secret values are included.

## Local repository state

- Repository: `C:\Project\Family\FamilySystem`
- `main`, `origin/main`, and `origin/HEAD` point to commit `3b1422a`.
- Tag `v1.0-encrypted-real` points to `3b1422a`; `v0.9-joe-real-rag-encrypted-placeholder` is also present locally.
- `git status --short` is clean.
- The local `git log --graph --all -30` contains local agent-host history, while the named application refs still resolve to `3b1422a`.

## Commit availability and comparison limits

Local `git cat-file -t` returned **NOT FOUND** for both `da0b6b2` and `423fdc0`. Therefore their `git show --stat`, the requested `git diff da0b6b2..3b1422a -- server/index.js`, and `merge-base`/ahead-behind relationships cannot be established from this clone. No fetch was performed, as requested.

`git show --stat 3b1422a` reports 7 changed files and 379 insertions / 42 deletions:

- `.env.example`
- `TODO.md`
- `public/mvp-pages.js`
- `scripts/init-family.sql`
- `server/routes/records.js`
- `source/security/encryption.js`
- `supabase/migrations/20261028000011_family_encryption_real.sql`

This commit does **not** change `server/index.js` or `supabase/CLOUD-MIGRATION-FIX.sql`. The referenced paths are:

- `C:\Project\Family\FamilySystem\server\index.js`
- `C:\Project\Family\FamilySystem\supabase\CLOUD-MIGRATION-FIX.sql`
- `C:\Project\Family\FamilySystem\.env.example`
- `D:\docker-data\family-rag\models\`

The BGE model path is listed for deployment context only; no model files were inspected or changed for this Git report.

## CORS finding - Rule #7 non-compliance

Current `HEAD:server/index.js` contains `app.use(cors())`. The local `3b1422a` commit did not change this file. The requested `da0b6b2` commit is unavailable locally, so this clone cannot establish whether that commit contains the claimed CORS fix.

**Current checked-out state does NOT meet Rule #7. Do not claim CORS is fixed.** Required behavior is an explicit allowlist:

- Default allow only `http://127.0.0.1:3002`.
- Allow `http://localhost:3002`, `http://localhost:3000`, or `http://127.0.0.1:3000` only when each is explicitly listed in `CORS_ALLOWED_ORIGIN`.
- Permit HTTPS origins only when explicitly configured and never accept `.invalid` hosts.
- Never use `*` and never reflect arbitrary `Origin` values.
- `family.example.invalid` must never be treated as a production origin.

A maintainer must supply or make the expected commits available through an authorized process before their contents or ancestry can be verified. No such retrieval was attempted here.

## Ownership and environment handling

- **Rule #2 ownership:** PJ2 owns `source/agents/`, `source/memory/`, and `public/mvp-pages.js`. The owner retains `migrations/`, `scripts/init-family.sql`, `source/rag/embed.js`, `source/reminders.js`, and `source/security/encryption.js`. This forensic task changed none of these files.
- **Rule #5 environment isolation:** `.env` is the Cloud environment; `.env.docker` is the local loopback environment. Both must remain gitignored and separate. `.env.example` may contain placeholders only. This report contains no encryption key, service-role key, anon key, Google secret, or other credential values.

## Conclusion

The checked-out `main`/`origin/main`/`v1.0-encrypted-real` state is locally clean at `3b1422a`, but it does not prove the claimed `da0b6b2` CORS allowlist fix. Since the current `server/index.js` still uses unrestricted default `cors()`, Rule #7 is **not satisfied in this checkout**. No code or repository state was changed.