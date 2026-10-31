# Loading loop diagnosis — JOE-SERVER

Timestamp: 2026-10-31 15:03:02 +08:00
Scope: read-only diagnosis; no configuration, code, Docker, or stash changes.

## Repository
- HEAD: 0810722
- Working tree: clean

## Findings
- PM2 `family-prod` logs show the API listening on port 3002 and `[RAG] Using real BGE model at D:\docker-data\family-rag\models`; no `PLACEHOLDER` or 384D fallback marker appears in the captured tail.
- PM2 error tail contains repeated `Origin is not allowed by CORS` (403) stack traces. The log does not identify the requesting Origin, so those entries cannot be attributed conclusively to the UI versus diagnostic requests.
- `GET /health`: HTTP 200. `GET /api/health`: HTTP 200.
- The captured PM2 tail has no URI-level request entries for /api/memories/search, /today, or /health; it therefore cannot prove those requests reached the app. It does contain RAG search activity without a route name.
- CORS probe `Origin: http://joe-server:3002`: HTTP 403, no `Access-Control-Allow-Origin`.
- CORS probe `Origin: http://127.0.0.1:3002`: HTTP 200, `Access-Control-Allow-Origin: http://127.0.0.1:3002`.
- `server/index.js` has the additive 0810722 allowlist logic; default origins contain only `http://127.0.0.1:3002`, then validated configured origins are added. It does not contain `http://joe-server:3002`; the HTTP-origin validator only accepts `localhost` or `127.0.0.1` on ports 3000/3002, so `http://joe-server:3002` is rejected even if added to the environment allowlist. `.env.docker` has `CORS_ALLOWED_ORIGIN=http://localhost:3002`, so it does not add the requested hostname.
- `.env`: `SUPABASE_URL` points to the Cloud host (value not otherwise exposed); anon key is present. `.env.docker`: `SUPABASE_URL=http://127.0.0.1:8000`; anon key is present.
- PM2 log identifies `DOTENV_CONFIG_PATH` source as `D:\backup\.env.docker.prod-backup`; that file was not read. Runtime `GET /api/config` returns HTTP 200/success, local Supabase host `http://127.0.0.1:8000`, anon key present, family ID present; no key or ID value recorded.
- Frontend is the repository static app: `public/index.html`, `/app.js` and `/styles.css` all exist/serve successfully (HTTP 200); index loads `/app.js`, and app code uses relative `/api/...` endpoints including `/api/config`. `dist/` and `build/` do not exist; project conventions specify a static `public/` frontend, so no separate build artifact is expected.
- The HTML initially renders the loading placeholder. The JavaScript then fetches `/api/config` and initializes Supabase using the URL returned by that endpoint. If the browser is not running on JOE-SERVER, `127.0.0.1:8000` points to the client machine, not JOE-SERVER; this is a strong likely cause of client initialization/auth calls hanging or failing. The missing `joe-server:3002` CORS allowlist is also confirmed, though same-origin `/api` requests from that page would not require CORS. Browser console/network evidence is needed to identify the exact pending request.

## Read-only HTTP checks
```text
http://127.0.0.1:3002/health -> 200
http://127.0.0.1:3002/api/health -> 200
Origin http://joe-server:3002 -> 403; ACAO absent
Origin http://127.0.0.1:3002 -> 200; ACAO http://127.0.0.1:3002
http://127.0.0.1:3002/api/config -> 200; success=true; local Supabase URL; anon key/family ID present (values redacted/not recorded)
http://127.0.0.1:3002/app.js -> 200
http://127.0.0.1:3002/styles.css -> 200
```

## PM2 logs — `pm2 logs family-prod --lines 100 --nostream` (sensitive patterns redacted)
```text
[TAILING] Tailing last 100 lines for [family-prod] process (change the value with --lines option)
C:\Users\Joehk\.pm2\logs\family-prod-out.log last 100 lines:
0|family-p | [ENCRYPTION] Using pgcrypto real encryption
0|family-p | Family Calendar API listening on port 3002
0|family-p | Family reminder scheduler started (interval: 900000 ms).
0|family-p | [RAG] Using real BGE model at D:\docker-data\family-rag\models
0|family-p | Family memory chunks ingested: { count: 4, modelPath: 'D:\\docker-data\\family-rag\\models' }
0|family-p | Family memory search completed: {
0|family-p |   modelPath: 'D:\\docker-data\\family-rag\\models',
0|family-p |   metric: 'cosine',
0|family-p |   source_file: [
0|family-p |     'fictional-test.txt',
0|family-p |     'fictional-ingestion-912f7f1e-0e26-4893-b3ca-a4d54cac1a6e.txt',
0|family-p |     'fictional-ingestion-912f7f1e-0e26-4893-b3ca-a4d54cac1a6e.txt',
0|family-p |     'fictional-ingestion-912f7f1e-0e26-4893-b3ca-a4d54cac1a6e.txt',
0|family-p |     'fictional-ingestion-b65cb9cd-81da-495e-9649-e5572eded1b1.pdf'
0|family-p |   ]
0|family-p | }
0|family-p | Family memory search completed: {
0|family-p |   modelPath: 'D:\\docker-data\\family-rag\\models',
0|family-p |   metric: 'cosine',
0|family-p |   source_file: [ 'fictional-ingestion-b65cb9cd-81da-495e-9649-e5572eded1b1.pdf' ]
0|family-p | }
0|family-p | Family memory search completed: {
0|family-p |   modelPath: 'D:\\docker-data\\family-rag\\models',
0|family-p |   metric: 'cosine',
0|family-p |   source_file: []
0|family-p | }
0|family-p | [ENCRYPTION] Using pgcrypto real encryption
0|family-p | Family Calendar API listening on port 3002
0|family-p | Family reminder scheduler started (interval: 900000 ms).
0|family-p | [ENCRYPTION] Using pgcrypto real encryption
0|family-p | Family Calendar API listening on port 3002
0|family-p | Family reminder scheduler started (interval: 900000 ms).

C:\Users\Joehk\.pm2\logs\family-prod-error.log last 100 lines:
0|family-p | ◇ injected env (19) from D:\backup\.env.docker.prod-backup
0|family-p | ◇ injected env (19) from D:\backup\.env.docker.prod-backup
0|family-p | Unhandled API request error: Error: Origin is not allowed by CORS.
0|family-p |     at origin (C:\Project\Family\FamilySystem\server\index.js:66:23)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:219:13
0|family-p |     at optionsCallback (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:199:9)
0|family-p |     at corsMiddleware (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:204:7)
0|family-p |     at Layer.handleRequest (C:\Project\Family\FamilySystem\node_modules\router\lib\layer.js:152:17)
0|family-p |     at trimPrefix (C:\Project\Family\FamilySystem\node_modules\router\index.js:342:13)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\router\index.js:297:9
0|family-p |     at processParams (C:\Project\Family\FamilySystem\node_modules\router\index.js:582:12)
0|family-p |     at next (C:\Project\Family\FamilySystem\node_modules\router\index.js:291:5)
0|family-p |     at router.handle (C:\Project\Family\FamilySystem\node_modules\router\index.js:186:3) {
0|family-p |   status: 403
0|family-p | }
0|family-p | ◇ injected env (19) from D:\backup\.env.docker.prod-backup
0|family-p | Unhandled API request error: Error: Origin is not allowed by CORS.
0|family-p |     at origin (C:\Project\Family\FamilySystem\server\index.js:66:23)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:219:13
0|family-p |     at optionsCallback (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:199:9)
0|family-p |     at corsMiddleware (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:204:7)
0|family-p |     at Layer.handleRequest (C:\Project\Family\FamilySystem\node_modules\router\lib\layer.js:152:17)
0|family-p |     at trimPrefix (C:\Project\Family\FamilySystem\node_modules\router\index.js:342:13)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\router\index.js:297:9
0|family-p |     at processParams (C:\Project\Family\FamilySystem\node_modules\router\index.js:582:12)
0|family-p |     at next (C:\Project\Family\FamilySystem\node_modules\router\index.js:291:5)
0|family-p |     at router.handle (C:\Project\Family\FamilySystem\node_modules\router\index.js:186:3) {
0|family-p |   status: 403
0|family-p | }
0|family-p | Unhandled API request error: Error: Origin is not allowed by CORS.
0|family-p |     at origin (C:\Project\Family\FamilySystem\server\index.js:66:23)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:219:13
0|family-p |     at optionsCallback (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:199:9)
0|family-p |     at corsMiddleware (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:204:7)
0|family-p |     at Layer.handleRequest (C:\Project\Family\FamilySystem\node_modules\router\lib\layer.js:152:17)
0|family-p |     at trimPrefix (C:\Project\Family\FamilySystem\node_modules\router\index.js:342:13)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\router\index.js:297:9
0|family-p |     at processParams (C:\Project\Family\FamilySystem\node_modules\router\index.js:582:12)
0|family-p |     at next (C:\Project\Family\FamilySystem\node_modules\router\index.js:291:5)
0|family-p |     at router.handle (C:\Project\Family\FamilySystem\node_modules\router\index.js:186:3) {
0|family-p |   status: 403
0|family-p | }
0|family-p | Unhandled API request error: Error: Origin is not allowed by CORS.
0|family-p |     at origin (C:\Project\Family\FamilySystem\server\index.js:66:23)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:219:13
0|family-p |     at optionsCallback (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:199:9)
0|family-p |     at corsMiddleware (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:204:7)
0|family-p |     at Layer.handleRequest (C:\Project\Family\FamilySystem\node_modules\router\lib\layer.js:152:17)
0|family-p |     at trimPrefix (C:\Project\Family\FamilySystem\node_modules\router\index.js:342:13)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\router\index.js:297:9
0|family-p |     at processParams (C:\Project\Family\FamilySystem\node_modules\router\index.js:582:12)
0|family-p |     at next (C:\Project\Family\FamilySystem\node_modules\router\index.js:291:5)
0|family-p |     at router.handle (C:\Project\Family\FamilySystem\node_modules\router\index.js:186:3) {
0|family-p |   status: 403
0|family-p | }
0|family-p | Unhandled API request error: Error: Origin is not allowed by CORS.
0|family-p |     at origin (C:\Project\Family\FamilySystem\server\index.js:66:23)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:219:13
0|family-p |     at optionsCallback (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:199:9)
0|family-p |     at corsMiddleware (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:204:7)
0|family-p |     at Layer.handleRequest (C:\Project\Family\FamilySystem\node_modules\router\lib\layer.js:152:17)
0|family-p |     at trimPrefix (C:\Project\Family\FamilySystem\node_modules\router\index.js:342:13)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\router\index.js:297:9
0|family-p |     at processParams (C:\Project\Family\FamilySystem\node_modules\router\index.js:582:12)
0|family-p |     at next (C:\Project\Family\FamilySystem\node_modules\router\index.js:291:5)
0|family-p |     at router.handle (C:\Project\Family\FamilySystem\node_modules\router\index.js:186:3) {
0|family-p |   status: 403
0|family-p | }
0|family-p | Unhandled API request error: Error: Origin is not allowed by CORS.
0|family-p |     at origin (C:\Project\Family\FamilySystem\server\index.js:66:23)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:219:13
0|family-p |     at optionsCallback (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:199:9)
0|family-p |     at corsMiddleware (C:\Project\Family\FamilySystem\node_modules\cors\lib\index.js:204:7)
0|family-p |     at Layer.handleRequest (C:\Project\Family\FamilySystem\node_modules\router\lib\layer.js:152:17)
0|family-p |     at trimPrefix (C:\Project\Family\FamilySystem\node_modules\router\index.js:342:13)
0|family-p |     at C:\Project\Family\FamilySystem\node_modules\router\index.js:297:9
0|family-p |     at processParams (C:\Project\Family\FamilySystem\node_modules\router\index.js:582:12)
0|family-p |     at next (C:\Project\Family\FamilySystem\node_modules\router\index.js:291:5)
0|family-p |     at router.handle (C:\Project\Family\FamilySystem\node_modules\router\index.js:186:3) {
0|family-p |   status: 403
0|family-p | }

```

No code or environment changes were made.