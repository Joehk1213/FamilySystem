# Source Code Autopsy - 2026-10-30

## Scope and inventory

- Reviewed `source/` recursively: 15 files total (8 JavaScript, 6 Markdown, 1 SQL).
- `package.json`: Node.js 1.0.0; scripts include dev/start, seed, approval/RLS/family-memory/agent/reminder/recurring tests. Runtime dependencies: Supabase JS, Transformers.js, cors, dotenv, Express; PDF.js is a dev dependency.
- Static scan ran for TODO/FIXME/HACK/console.log/any/@ts-ignore with --no-ignore. Matches are summarized below; no credential values were copied to this report.

## Findings

### TODO / pending markers

- `source/PRD_MVP.md` documents product decisions still waiting for confirmation (including MFA/privacy-history context). It is requirements source and must remain unchanged.
- `source/BUILD_PLAN.md` includes an unchecked closeout item for legacy TODO inventory.
- `source/REPLANNING-MVP1.md` and `source/REFERENCES.md` contain planning/architecture notes about service-role scope, privacy, and recovery. These are source documents, not necessarily actionable inline TODO comments.
- The active encryption implementation is in `source/security/encryption.js`; `TODO.md` states key rotation/user unlock/RAG encryption are not implemented. Track those in an approved roadmap, not by changing source requirements here.

### FIXME / HACK

- The scan did not identify explicit FIXME or HACK markers in the sampled first 100 matches. This is a static text scan, not proof of absence across generated or ignored artifacts.

### Console output

- `source/rag/embed.js` logs an explicit placeholder fallback message when the local model is unavailable. This is operationally useful and should remain visible.
- Server startup and route modules use console logging for errors/diagnostics; these are outside `source/` scan scope. Review redaction/retention separately before centralizing logs.
- No unqualified debug `console.log` match was identified in source beyond the explicit RAG fallback entry in the scan output.

### `any` / TypeScript suppressions

- The project source is JavaScript and the broad word-boundary scan matched SQL `ANY` syntax in `DB_SCHEMA_DRAFT.sql`; that is a SQL keyword, not a JavaScript `any` type.
- No `@ts-ignore` match was found in the reported first 100 scan results. A TypeScript-specific lint target is not currently applicable.

## Suggested refactoring (no changes made)

1. Separate immutable requirements/design documents from runtime implementation inventory; label stale historical deployment statements so production truth is not inferred from old text.
2. Add a documented safe logging policy (request IDs, error codes, no payload/token/key logging) and route server console output through a minimal logger only in a separately scoped change.
3. Keep `source/rag/embed.js` model-path resolution and fallback as the single source of truth; add tests around local-only model load, 384/512 dimension pairing, and explicit fallback observability.
4. Split the large `server/routes/records.js` only after route behavior and transaction/storage cleanup semantics are covered by focused tests; avoid structural churn in the production hot path.
5. Keep `source/` requirements read-only. This report is an audit summary, not an instruction to rewrite PRD/schema/design source files.