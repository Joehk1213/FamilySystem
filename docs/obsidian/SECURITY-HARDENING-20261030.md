# SECURITY + ENV HARDENING CHECKLIST - 2026-10-30

## Verified

- Production env file present: True (values withheld).
- .env.example has placeholder only: True; actual placeholder line: `FAMILY_ENCRYPTION_KEY=your-32-byte-base64-key-here`.
- encryption.js getEncryptionKey() found: True.
- .env and .env.docker are ignored by Git (check-ignore exit 0; names only: .env, .env.docker).
- pgcrypto migration calls pgp_sym_encrypt with AES-256 option: True.
- private plaintext guard trigger/function is present in migration: True.
- Google OAuth enabled flag: false.

## Production env ACL review

Checked path: `D:\backup\.env.docker.prod-backup`; owner: `JOE-SERVER\Joehk`; inherited ACLs enabled: True.
Access rules (no environment values):
- BUILTIN\Administrators | FullControl | Allow | inherited=True
- NT AUTHORITY\SYSTEM | FullControl | Allow | inherited=True
- NT AUTHORITY\Authenticated Users | Modify, Synchronize | Allow | inherited=True
- BUILTIN\Users | ReadAndExecute, Synchronize | Allow | inherited=True
Compose env ACL owner: `JOE-SERVER\Joehk` (full ACL not duplicated).

**Finding:** the production env ACL currently grants Authenticated Users Modify and Users Read/Execute in addition to Administrators/SYSTEM. This is broader than desirable for a file containing secrets. No ACL was changed during this audit.

## Hardening actions

1. Restrict both production env files to the service owner, Administrators, and SYSTEM with explicit non-inherited ACLs; verify PM2 account still has read access before applying. Test access from the PM2 identity, and record only the ACL—not values.
2. Keep the encryption key out of Git and logs; the env files are ignored, and the repository example contains a placeholder. Maintain a separately encrypted offline recovery copy on a removable encrypted USB with controlled access; test recovery without exposing the key.
3. Maintain authenticated RLS and the database trigger that rejects private plaintext writes. AES-256 at rest applies only to private record content; titles/metadata and family-memory/RAG content are not covered.
4. Key rotation is not implemented. Design versioned ciphertext/key IDs, dual-key read during migration, re-encrypt in bounded transactions, rollback/recovery, and audit/tests before any production rotation.
5. Google OAuth is disabled in the current production env. Enable only after Google callback/HTTPS URLs and client credentials are configured securely and end-to-end tested.

## Database roles

Queried `pg_shadow` usernames only (password column deliberately not selected; query exit 0):
- authenticator
- pgbouncer
- postgres
- supabase_admin
- supabase_auth_admin
- supabase_etl_admin
- supabase_read_only_user
- supabase_replication_admin
- supabase_storage_admin

No password hashes or environment key values were read into this report.
