# v1.1 Roadmap - Proposal - 2026-10-30

This is a proposal only. No Cloud migration, OAuth enablement, schema change, threshold change, or production write was performed. Keep PRD/schema draft changes behind explicit approval.

## P0 - Reliability and security foundations

### Backup automation and restore drill
- Define a database-aware Postgres dump plus private Storage backup schedule; encryption and checksums; retention; monitoring; and restore owner.
- Back up the DB/storage payload and FAMILY_ENCRYPTION_KEY separately. Store the key in controlled encrypted offline media; never in Git, logs, or the same unencrypted archive.
- Exercise restore in an isolated environment, verify schema/RLS and private-record decryption, record RPO/RTO, and never test by overwriting production.
- Resolve the current broad env-file ACLs (Authenticated Users Modify, Users Read) only after confirming the PM2/Compose identities; test effective access after tightening.

### Cloud migrations 00010 and 00011 - gated manual procedure
1. Confirm the target Cloud project, ownership/approval, maintenance window, current migration history and supported Postgres/pgcrypto features. No Cloud project is currently linked/configured per TODO.
2. Take and verify a restorable Cloud DB backup; rehearse against a disposable clone first. Do not run directly against production as a dry-run substitute.
3. Review 20261028000010_family_encryption_pgcrypto.sql (extension and nullable encrypted_content BYTEA) and 20261028000011_family_encryption_real.sql (pgcrypto AES-256 wrappers, grants and private plaintext guard). Confirm ordering/idempotency and privilege assumptions.
4. Apply migrations through the approved migration runner, one migration at a time; capture exit status without logging secrets. Verify extension versions, column type, functions/grants, trigger, and expected RLS policies.
5. Use fictional authenticated accounts to test creator-only private read, denied cross-member read, encryption round-trip and plaintext-write rejection. Verify row counts/data integrity and rollback/recovery path before cutover.
6. Never use service_role as a substitute for authenticated RLS tests. Keep current production and Cloud data separate unless a separate migration plan approves transfer.

## P1 - Auth and encryption lifecycle

### Google OAuth
- Current production flag is GOTRUE_EXTERNAL_GOOGLE_ENABLED=false.
- Configure a Google OAuth Web client and exact HTTPS callback at API_EXTERNAL_URL plus /callback; configure exact SITE_URL, CORS origin and redirect allow-list.
- Store client ID/secret only in protected server-side environment. Enable the flag in a controlled maintenance window, restart only through the approved release procedure, and test callback/sign-in/sign-out with fictional accounts.
- Keep OAuth disabled until HTTPS/public URL and account lifecycle are validated.

### Key rotation design (not implemented)
- Design explicit key version IDs, KMS/escrow source, rotation authorization and audit trail.
- Support dual-key reads, bounded re-encryption batches, idempotency, interruption recovery, rollback and old-key retirement criteria.
- Ensure database trigger/RPC permissions cannot write ciphertext under an unknown key version. Test loss/recovery and access revocation using fictional records before implementation.

### RAG threshold 0.4 evaluation
- Preserve current cosine threshold 0.4 until a labeled, fictional/local evaluation set exists.
- Measure recall, precision and negative-query false positives across representative family reminder/calendar queries; stratify by source and language.
- Tune only with reviewable evaluation results, regression tests and a deploy/rollback plan; do not send private text to external models.

## P2 - Product expansion and scale

### Multiple-family support
- Audit assumption that a user/profile may belong to multiple families, current active-membership selection, family-scoped RLS, JWT/API selection and UI family switching.
- Define explicit active-family selection and session behavior; prove cross-family isolation with authenticated tests before expanding UI/API.
- Do not change schema until requirements are approved and migrations are reviewed.

### Operational hardening
- Add routine alerting for health, backup age/failure, disk capacity, model readiness and key escrow recovery tests.
- Keep deployment docs and the user guide aligned with actual v1.0 encryption scope; distinguish private record body encryption from metadata/RAG content.

## Suggested sequence

1. P0 backup/key escrow and isolated restore drill; remediate env ACL safely.
2. P0 disposable Cloud migration rehearsal for 00010/00011; apply to Cloud only after owner approval and verified backup.
3. P1 OAuth HTTPS configuration and fictional-account acceptance tests.
4. P1 key-rotation design review; implementation only after approval.
5. P1 threshold evaluation; retain 0.4 until evidence supports change.
6. P2 multi-family requirements and RLS/UI design.
