# Backup Forensics - 2026-10-30

Snapshot time: 2026-10-29 03:30:05 +08:00

## Largest files under D:\docker-data
- D:\docker-data\littleplanet\images.tar | 853.23 MB
- D:\docker-data\family-rag\models\onnx\model.onnx | 90.46 MB
- D:\docker-data\family-rag\models\onnx\model_quantized.onnx | 22.9 MB
- D:\docker-data\family-system\postgres\pg_wal\000000010000000000000002 | 16 MB
- D:\docker-data\littleplanet\postgres_live\pg_wal\000000010000000000000001 | 16 MB
- D:\docker-data\family-system\postgres\pg_wal\000000010000000000000001 | 16 MB
- D:\docker-data\littleplanet\app\docs\project_summary.md | 5.73 MB
- D:\docker-data\littleplanet\app\project_summary.md | 5.73 MB
- D:\docker-data\littleplanet\postgres.zip | 5.69 MB
- D:\docker-data\family-system\postgres\base\5\1255 | 0.97 MB
- D:\docker-data\littleplanet\postgres_live\base\5\1255 | 0.92 MB
- D:\docker-data\family-system\postgres\base\1\1255 | 0.77 MB
- D:\docker-data\littleplanet\postgres_live\base\1\1255 | 0.77 MB
- D:\docker-data\family-system\postgres\base\4\1255 | 0.77 MB
- D:\docker-data\littleplanet\postgres_live\base\4\1255 | 0.77 MB
- D:\docker-data\family-system\postgres\base\5\1249 | 0.7 MB
- D:\docker-data\littleplanet\app\source\手稿 網店WORK FLOW DRAFT.docx | 0.65 MB
- D:\docker-data\littleplanet\postgres_live\base\5\1249 | 0.55 MB
- D:\docker-data\littleplanet\postgres_live\pg_stat\pg_stat_statements.stat | 0.53 MB
- D:\docker-data\littleplanet\postgres_live\base\5\2838 | 0.5 MB
- D:\docker-data\family-system\postgres\base\5\2838 | 0.5 MB
- D:\docker-data\family-system\postgres\base\4\2838 | 0.49 MB
- D:\docker-data\littleplanet\postgres_live\base\1\2838 | 0.49 MB
- D:\docker-data\littleplanet\postgres_live\base\4\2838 | 0.49 MB
- D:\docker-data\family-system\postgres\base\1\2838 | 0.49 MB
- D:\docker-data\littleplanet\postgres_live\base\4\1249 | 0.43 MB
- D:\docker-data\family-system\postgres\base\4\1249 | 0.43 MB
- D:\docker-data\littleplanet\postgres_live\base\1\1249 | 0.43 MB
- D:\docker-data\family-system\postgres\base\1\1249 | 0.43 MB
- D:\docker-data\family-rag\models\tokenizer.json | 0.42 MB
Listed 30 files.

## Docker disk usage -v
Images space usage:

REPOSITORY                TAG            IMAGE ID       CREATED         SIZE      SHARED SIZE   UNIQUE SIZE   CONTAINERS
docker.n8n.io/n8nio/n8n   latest         dd580fe1ab6e   13 days ago     1.8GB     32B           1.796GB       1
supabase/storage-api      v1.81.0        98ffec5d0678   2 weeks ago     1.43GB    2B            1.428GB       1
supabase/gotrue           v2.197.0       1736a63078f5   7 weeks ago     94.4MB    2B            94.4MB        1
supabase/postgres         17.6.1.136     f371b5f3f2ac   4 months ago    1.69GB    0B            1.694GB       1
postgrest/postgrest       v14.18         c7cd7e265a85   15 months ago   28MB      0B            27.95MB       1
caddy                     2.9.1-alpine   b4e3952384eb   21 months ago   68.9MB    32B           68.86MB       1

Containers space usage:

CONTAINER ID   IMAGE                            COMMAND                  LOCAL VOLUMES   SIZE      CREATED             STATUS                       NAMES
3aa968542abf   supabase/gotrue:v2.197.0         "auth"                   0               4.1kB     About an hour ago   Up About an hour (healthy)   familysystem-auth-1
b74cba997b97   supabase/storage-api:v1.81.0     "docker-entrypoint.s…"   0               20.5kB    4 hours ago         Up 4 hours (healthy)         familysystem-storage-1
a05264504bce   postgrest/postgrest:v14.18       "/bin/postgrest"         0               4.1kB     4 hours ago         Up 4 hours (healthy)         familysystem-rest-1
83c95205c217   supabase/postgres:17.6.1.136     "docker-entrypoint.s…"   0               49.2kB    4 hours ago         Up About an hour (healthy)   familysystem-db-1
490f0294c435   caddy:2.9.1-alpine               "caddy run --config …"   0               45.1kB    4 hours ago         Up 4 hours (healthy)         familysystem-gateway-1
e2f30515b37e   docker.n8n.io/n8nio/n8n:latest   "tini -- /docker-ent…"   1               48.1MB    12 days ago         Exited (0) 4 hours ago       n8n-n8n-1

Local Volumes space usage:

VOLUME NAME    LINKS     SIZE
n8n_n8n_data   1         8.226MB

Build cache usage: 0B

CACHE ID   CACHE TYPE   SIZE      CREATED   LAST USED   USAGE     SHARED
docker system df -v exit=0

## D:\backup file inventory
- RAG-LAB-20261030.log | 1557 bytes | 2026-10-29 03:30:06
- RED-TEAM-REPORT-20261030.md | 7490 bytes | 2026-10-29 03:29:30
- overnight-health.log | 393 bytes | 2026-10-29 03:29:26
- DB-SCHEMA-FULL-20261030.log | 47657 bytes | 2026-10-29 03:28:16
- API-MAP-20261030.md | 4282 bytes | 2026-10-29 03:28:15
- SOURCE-AUTOPSY-20261030.md | 3285 bytes | 2026-10-29 03:27:54
- NIGHT-SHIFT-START-20261030.log | 2811 bytes | 2026-10-29 03:26:51
- overnight-all-20261029.log | 25013 bytes | 2026-10-29 03:23:39
- DB-DEEP-DIVE-20261030.log | 16856 bytes | 2026-10-29 03:23:24
- PERF-BENCH-20261030.log | 812 bytes | 2026-10-29 03:22:40
- ROADMAP-v1.1-20261030.md | 5010 bytes | 2026-10-29 03:22:40
- DISASTER-RECOVERY-20261030.md | 4556 bytes | 2026-10-29 03:22:40
- SECURITY-HARDENING-20261030.md | 2887 bytes | 2026-10-29 03:21:31
- FINAL-PROD-AUDIT-20261030.md | 4745 bytes | 2026-10-29 03:19:44
- WAKEUP-CHECKLIST-20261030.md | 1245 bytes | 2026-10-29 03:16:33
- log-diet-20261030.log | 7687 bytes | 2026-10-29 03:16:17
- PROD-MAP-20261030.md | 4046 bytes | 2026-10-29 03:16:17
- bge-regression-20261030.log | 738 bytes | 2026-10-29 03:06:15
- docker-health-20261030.log | 4605 bytes | 2026-10-29 03:04:59
- db-health-20261030.log | 6189 bytes | 2026-10-29 03:04:58
- disk-health.log | 558 bytes | 2026-10-29 02:50:04
- PRODUCTION-README.md | 5210 bytes | 2026-10-29 02:50:03
- security-audit-20261029.log | 524 bytes | 2026-10-29 02:49:16
- overnight-qa-20261029.log | 6341 bytes | 2026-10-29 02:41:41
- postgres-20261029.zip | 7913792 bytes | 2026-10-29 02:00:48
- family-prod-20261029.zip | 71699130 bytes | 2026-10-29 02:00:04
- .env.docker.prod-backup | 1973 bytes | 2026-10-29 00:39:02

Logs larger than 1 GiB: 0
No backup log over 1 GiB was observed.

## Rotation recommendations
- Never truncate or delete PostgreSQL data/WAL or Docker-managed files to control log size.
- Keep health-check logs by date, compress closed logs, retain a short hot window plus monthly summaries, and cap application/container log size using a tested Docker logging policy.
- Preserve audit/security/backup success and failure records for the approved retention period; rotate only after backup, checksums and restore validation.
- Monitor D: free-space alert thresholds and backup age; perform cleanup only with explicit approval and a recovery copy.

Inputs reviewed: D:\backup\disk-health.log and D:\backup\db-health-20261030.log; disk snapshot is historical and not a live backup verification.
