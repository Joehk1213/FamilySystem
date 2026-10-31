# Disaster Recovery Playbook - JOE-SERVER - 2026-10-30

## Current evidence and limits

- D: data root: D:\docker-data\family-system\ (Postgres and Storage); model files are separate under D:\docker-data\family-rag\models\.
- Prior disk snapshot recorded 2,590 files / 1,146,931,958 bytes under D:\docker-data. The DB health log recorded zero estimated live rows for application tables except one profile; this is not a verified backup.
- The requested archive C:\backup\desktop-dev-20261030.zip was checked and is absent. No restore from that archive is currently possible. Even if supplied, it is DESKTOP development material, not proof of a production-consistent backup.
- Preserve the production encryption key separately from DB/Storage backups. Without the matching key, private-record ciphertext cannot be decrypted.

## Scenario A - D: storage failure

1. Do not overwrite or format the failed disk. Record the failure and identify the newest verified database dump plus Storage backup. Confirm restore source, timestamps, checksum, PostgreSQL major version, and whether it is production data.
2. The named C: ZIP is currently missing. If it later appears, first verify provenance, archive integrity, contents, schema/version compatibility, and explicit approval as a recovery source. A DESKTOP development archive must not be blindly promoted or merged into production.
3. For a raw PostgreSQL data-directory restore/copy, PostgreSQL must be stopped cleanly first; a live file copy is not transactionally consistent. Prefer a database-aware dump/restore. Restore into a new isolated D: target and validate before switching mounts.
4. Restore DB and private Storage from a coordinated, tested backup; preserve the original failed media read-only where possible. Retain the matching encryption key outside the restored volume.
5. Start services only after validating permissions, free space, version compatibility and restore logs. Check Compose health, schema, RLS, private-record decryption with fictional test data, and the health endpoint.

Back up: encrypted DB dump, private Storage objects, Compose/configuration without secrets, encryption key in a separate encrypted recovery medium, checksums, and restore procedure.

Do not: delete/format D:, copy a live PostgreSQL directory, use C: dev data as an unverified production restore, overwrite a non-empty DB, or store the key beside an unencrypted dump.

## Scenario B - encryption key lost

1. Stop writes to private records through the approved maintenance procedure; do not rotate or regenerate a replacement key in place.
2. Search only approved offline encrypted key escrow/recovery media and verify the recovered key through a controlled round-trip test using a known fictional ciphertext in an isolated environment.
3. If the matching key cannot be recovered, encrypted_content ciphertext remains present but private plaintext is not recoverable. A new key cannot decrypt old ciphertext. Escalate as a data-loss incident and document affected ciphertext scope.
4. After recovery, re-secure the key, verify env ACL, test authenticated/RLS reads, then restore write service.

Back up: at least two controlled, encrypted offline key-recovery copies with access logging and periodic recovery tests, separate from database backups.

Do not: put key values in Git, chat, logs, plain USB, or the database backup; do not claim key rotation is implemented (it is not).

## Scenario C - Docker stack unavailable

1. Leave PM2 alone unless separately approved; do not stop it as a first diagnostic step. Check Docker Desktop/daemon health and capture logs.
2. Once Docker Desktop is Running, from C:\Project\Family\FamilySystem run: docker compose --env-file .env.docker -f docker-compose.prod.yml up -d. Then run docker compose --env-file .env.docker -f docker-compose.prod.yml ps. Wait for db/auth/storage/rest/gateway healthy.
3. In the same Windows account that owns PM2, run pm2 resurrect, then pm2 list. Confirm family-prod online.
4. Verify curl.exe --fail http://127.0.0.1:3002/health returns HTTP 200; then perform read-only DB/schema checks before accepting writes.
5. If containers fail health, preserve logs and data directories; use tested DB/Storage restore only after diagnosis.

Back up: .env.docker and PM2 app env in protected encrypted storage, Compose/images or pinned image tags, DB and Storage, encryption key separately, and logs.

Do not: run docker system prune, delete volumes/directories, initialize over an existing production DB, or copy secrets into this document.
