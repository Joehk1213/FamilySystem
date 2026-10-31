# Google OAuth configuration diagnosis — JOE-SERVER

Checked: 2026-10-31 15:34:44 +08:00
Scope: read-only configuration diagnosis. No OAuth secrets were printed or changed. Auth was not restarted because the required Google secret is absent.

## `.env.docker` presence / lengths (values redacted)
- `GOTRUE_EXTERNAL_GOOGLE_ENABLED`: present, length 4.
- `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`: present, length 72; value not shown.
- `GOTRUE_EXTERNAL_GOOGLE_SECRET`: absent, length 0.
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`: absent; deployment uses the GoTrue `GOTRUE_EXTERNAL_GOOGLE_*` names.
- `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI`: present, length 38; effective container redirect comes from `API_EXTERNAL_URL` + `/callback`, currently placeholder (value omitted).
- `.env.example` confirms expected variable names are `GOTRUE_EXTERNAL_GOOGLE_ENABLED`, `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`, and `GOTRUE_EXTERNAL_GOOGLE_SECRET`.

## Compose mapping
- Auth service maps `GOTRUE_EXTERNAL_GOOGLE_ENABLED`, `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`, and `GOTRUE_EXTERNAL_GOOGLE_SECRET` from Compose environment interpolation; all three are present in the service mapping.
- `GOTRUE_SITE_URL` maps from `SITE_URL`; `GOTRUE_URI_ALLOW_LIST` maps from `ADDITIONAL_REDIRECT_URLS`; `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` maps to `${API_EXTERNAL_URL}/callback`.
- Effective Auth config: Google enabled; Client ID present; Google secret absent. Site URL is a `.invalid` placeholder. Redirect list includes localhost but not `http://joe-server:3002/*` or `http://192.168.1.136:3002/*`.

## Authorize request
```text
Before: HTTP 400
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
After: unchanged; no credentials/config were edited and Auth was not restarted.
```

## Result / required local action
The missing Google OAuth client secret is the direct cause of the 400 response. Compose is already wired to load it, but `.env.docker` does not contain it. Do not paste the secret into chat or this report; the operator must set the Google Cloud OAuth client secret locally in the protected `.env.docker`, and set the approved Site URL / redirect allow-list and OAuth callback URL there. Then recreate only the Auth service and retest for a redirect to Google. Until that is done, no 302-to-Google success can be claimed.

No `.env.docker` values were modified; no container was restarted; no D: data was deleted.