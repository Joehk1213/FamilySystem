# SERVER stash review — 2026-10-31

Reviewed: 2026-10-31 14:38:29 +08:00

## Repository verification
- HEAD: 0810722
- `main`: 0810722
- `origin/main`: 0810722
- Working tree: clean (`git status --short` empty)

## Stashes
```
stash@{0}: On main: temp stash SERVER cors allowlist before ff to da0b6b2
```

Files in `stash@{0}`:
```
server/index.js
```

## `stash@{0}` patch (first 100 lines; sensitive patterns redacted)
```diff
diff --git a/server/index.js b/server/index.js
index bd68225..43a80c1 100644
--- a/server/index.js
+++ b/server/index.js
@@ -19,7 +19,45 @@ function startServer() {
     const app = express();
     const port = process.env.PORT || 3000;
 
-    app.use(cors());
+    // Rule #7 da0b6b2 recreation: explicit allowlist default 127.0.0.1:3002,
+    // optional localhost:3002/3000, 127.0.0.1:3000 via CORS_ALLOWED_ORIGIN,
+    // HTTPS explicit non-.invalid, never *, family.example.invalid, or reflect.
+    const defaultOrigin = 'http://127.0.0.1:3002';
+    const allowedOrigins = new Set([defaultOrigin]);
+    const extra = (process.env.CORS_ALLOWED_ORIGIN || '')
+      .split(',')
+      .map((origin) => origin.trim())
+      .filter(Boolean);
+    for (const origin of extra) {
+      try {
+        const url = new URL(origin);
+        if (url.hostname.endsWith('.invalid')) {
+          continue;
+        }
+        if (
+          origin === 'http://localhost:3002'
+          || origin === 'http://localhost:3000'
+          || origin === 'http://127.0.0.1:3000'
+        ) {
+          allowedOrigins.add(origin);
+        } else if (url.protocol === 'https:'
+          && !url.hostname.endsWith('.invalid')
+          && origin !== 'https://family.example.invalid') {
+          allowedOrigins.add(origin);
+        }
+      } catch {
+        continue;
+      }
+    }
+
+    app.use(cors({
+      origin(origin, callback) {
+        if (!origin || allowedOrigins.has(origin)) {
+          return callback(null, true);
+        }
+        return callback(new Error('CORS not allowed'));
+      },
+    }));
     app.use(express.json());
     app.use(configRouter);
     app.use(healthRouter);
```

## Recommendation
**Keep `stash@{0}`; do not pop, drop, or push it as part of this review.** It contains the earlier `server/index.js` CORS allowlist patch from before the fast-forward. The current `0810722` commit includes the later additive CORS fix, so the stash appears historical/superseded, but retaining it avoids destroying the preserved recovery copy. Revisit and drop only after an explicit decision that it is no longer needed.

No stash mutation was performed.