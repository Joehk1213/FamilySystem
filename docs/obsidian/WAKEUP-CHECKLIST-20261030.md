# JOE-SERVER Wake-up Checklist - 2026-10-30

This checklist is for the next boot. It does not stop or restart the currently online PM2 process. `FamilyProdAutoStart` was not found; the current process list was saved successfully with `pm2 save`.

## 1. Start Docker Desktop

Wait until Docker Desktop reports **Running**, then confirm the Docker daemon is available:

```powershell
docker info
```

## 2. Bring up the five Supabase containers

From `C:\Project\Family\FamilySystem`:

```powershell
docker compose --env-file .env.docker -f docker-compose.prod.yml up -d
docker compose --env-file .env.docker -f docker-compose.prod.yml ps
```

Wait until `db`, `auth`, `storage`, `rest`, and `gateway` all report healthy before continuing. Do not use prune/delete commands.

## 3. Restore PM2 app and verify health

In the same Windows account that owns the PM2 process list:

```powershell
pm2 resurrect
pm2 list
curl.exe --fail http://127.0.0.1:3002/health
```

Confirm `family-prod` is online and the endpoint returns HTTP 200. If Windows reboot auto-start is required, configure and test a dedicated Task Scheduler task separately; `FamilyProdAutoStart` is currently absent. Do not place environment key values in the task definition or logs.
