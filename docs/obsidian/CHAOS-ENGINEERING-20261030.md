# Chaos Engineering Tabletop - JOE-SERVER - 2026-10-30

Planning exercise only. No fault was injected; RTO/RPO values below are proposed targets, not measured guarantees.

| Scenario | Detection | Containment | Recovery | Prevention / backup | Proposed RTO / RPO |
|---|---|---|---|---|---|
| D: disk reaches 0% free | Windows disk alert, Postgres write errors, Docker health degradation | Stop nonessential writes through approved change; preserve logs; do not delete database/WAL/model files blindly | Expand/replace capacity or restore verified DB + Storage into a validated target; confirm key availability; run schema, RLS and health checks | Alert at 20/10/5% free; database-aware backups; capacity trend; avoid unrelated data on production volume | RTO 4-8h; RPO <= 4h only if backup cadence proves it |
| Encryption key exposed | ACL/access audit, endpoint alerts, accidental Git/log exposure | Restrict access, preserve evidence, assess ciphertext access and key use; do not simply replace key because existing ciphertext would fail | Revoke/rotate under a designed versioned-key procedure, re-encrypt in batches and test recovery; current rotation is not implemented, so incident response may require planned outage | Tight env ACL; key outside Git; encrypted offline escrow; audit access and test recovery | RTO 8-24h; RPO 0 data rows if intact, but confidentiality impact begins at exposure |
| All 5 DB containers unhealthy | Compose health checks, `/health` failures, DB connection alarms | Capture docker/DB logs; do not prune/remove volumes; isolate repeated crash cause | Restore Docker daemon/Compose stack, then verified DB/Storage backup if required; verify DB readiness and API health | Pinned images, tested configuration, backups, startup ordering, resource/disk alerts | RTO 1-3h; RPO last verified DB/Storage backup |
| BGE model damaged | Model load error, placeholder log, `isPlaceholder()` true or embedding dimension != 512 | Disable RAG writes/search that assume 512D; preserve local model directory for diagnosis | Re-provision pinned model files from trusted source into a staging directory; verify checksum, local-only load, 512D and regression set before switching | Offline copy of pinned model/checksums; startup readiness gate; dimension validation | RTO 1-2h with model backup; RPO not applicable to records, but avoid mixed-dimension vectors |
| PM2 family-prod dead | `pm2 list` not online, `/health` non-200, watchdog alert | Preserve PM2 and app logs; check port ownership/config; do not restart repeatedly without diagnosis | In owning Windows account run `pm2 resurrect`, verify process online and `curl.exe --fail http://127.0.0.1:3002/health` returns 200 | `pm2 save`, tested Windows Task Scheduler startup task (currently FamilyProdAutoStart absent), Docker-before-app startup order | RTO 15-30m; RPO 0 for stateless app process |

## Cross-scenario safety rules

- Keep production D: distinct from DESKTOP C: and Cloud environments.
- Never run `docker system prune`, delete D: data, or copy a live PostgreSQL data directory as a recovery action.
- Before raw PostgreSQL directory file-copy/restore, stop PostgreSQL cleanly; prefer database-aware dump/restore.
- Database/Storage backups and encryption-key escrow are separate assets and both are required to recover private content.
- Validate with fictional test data in an isolated environment before returning production to writes.