# Roadmap: one route definition module for the API routes

Source: architecture review candidate 05 (2026-10-18). Same loop as the earlier roadmaps (`docs/slide-deck-roadmap.md`, `docs/image-credit-roadmap.md`): one prompt per phase, a developer chat executes it, the planner verifies, and each phase ships through a branch, a PR and a Vercel preview before the next prompt is issued.

## Goal

Every route repeats the same sequence: `requireSession` → parse JSON → validate → catch → return the raw `err.message` on 500. The raw message can expose schema-validation dumps, provider HTTP errors and env var names (`"Environment validation error: TEXT_PROVIDER_API_KEY is required"`). Commit ee99aed sanitized only a client string; the routes still leak. Input validation is uneven: `/api/generate-images` accepts a client `delayMs` and `source` (a large `delayMs` holds a 300s function), and `/api/download-pptx` casts `slideImages` without validating it. Only the Commons routes cap the body.

One **route definition module** owns the auth-before-parse ordering, body parsing, error policy and (later) input schema and body cap. Each route keeps only its handler.

## Design decisions (accepted)

| # | Decision | Choice |
|---|---|---|
| Q1 | Phases | 1: module + migrate the five generate/export routes, sanitized 500s the only behaviour change. 2: tighten inputs on those routes. 3: migrate upload, NASA, Commons, health; auth-protection test table-driven over every route. |
| Q2 | Error policy | Unknown errors return a fixed, route-specific message plus a server-side `console.error`. A typed `PublicError(message, status)` passes through unchanged. |
| Q3 | Module shape | `defineRoute({...})` returns the Next handler. It checks auth first, parses JSON, calls the handler, and maps errors by the policy. The handler may return a plain `NextResponse` (file downloads). `dynamic` and `maxDuration` stay as exports in each route file (Next needs them static). The optional zod `input` and `maxBodyBytes` arrive in Phase 2, when first used. |
| Q4 | Phase 1 parity | Every existing 400/401 message and status stays byte-identical. Existing route tests pass unmodified except those that pin a raw 500 message. |
| Q5 | Regenerate variation | Separate small PR after Phase 2: the client sends an attempt counter and the Pexels provider picks a different result. Phase 2 gives `generate-image` a schema for the new field. |

Shape of the module (the developer may refine names, not behaviour):

```ts
class PublicError extends Error { status: number; extra?: Record<string, unknown>; headers?: Record<string, string> }

defineRoute({
  name: string,             // for server logs
  failureMessage: string,   // generic 500 message for unknown errors
  handler: (ctx: { body: Record<string, unknown>; request: NextRequest; session: SessionClaims }) => Promise<NextResponse>,
}): (request: NextRequest) => Promise<NextResponse>
```

## Phases

### Phase 1: module + generate/export routes, sanitized 500s — done
- New `src/lib/api/` module with tests (auth before parse, invalid JSON 400, `PublicError` passthrough, unknown error → generic message and logged, handler `NextResponse` passthrough).
- Migrate `generate`, `generate-image`, `generate-images`, `download-pptx`, `download-markdown`. Existing 4xx strings and statuses unchanged; the `slideIndex` field stays in the `generate-image` error bodies.
- Tests that pin raw 500 messages change on purpose (generate, generate-image, download-pptx, download-markdown, plus any other the developer finds). A table-driven regression test proves that a thrown `Error` containing a secret-looking string never appears in any of the five routes' responses.
- Done = suite green, `auth-protection` test unmodified, no raw error text in responses.

### Phase 2: input validation and body caps — done
- Add the zod `input` option and `maxBodyBytes` to the module.
- Schemas: `generate-images` (typed slide items, capped count, `delayMs` clamped, `source` enum), `generate-image` (prompt length, `source` enum, `slideIndex` int), `download-pptx` (`slideImages` validated as base64 with size limits; malformed input is a 400, not a 500), `generate` (session enum shared with the UI, text length).
- Done = malformed or oversized input gets a 4xx with a clear message; valid existing payloads unchanged.

Final limits (Phase 2). Body over the cap → 413 `Request body exceeds the size limit.`; schema failure → 400 `Invalid request: <path>: <message>; …` (at most 5 issues, values never echoed).

| Route | Body cap | Field limits |
|---|---|---|
| `generate` | 4,500,000 B (Vercel limit) | `text` non-blank string, no length cap (sent untrimmed to the model); `session` one of `SESSION_OPTIONS`; subject provenance keys read from the raw body, unchanged |
| `generate-image` | 64 KiB | `prompt` non-blank, ≤ 4000; `slideIndex` optional int 0–100000 (kept in 400 and 500 bodies); `source` optional `ai`/`pexels`/`auto`; `title` optional ≤ 300 |
| `generate-images` | 256 KiB | `slides` ≤ 100 items of `{ slideIndex` int 0–999, `part` ≤ 100, `visualDescription` ≤ 4000, `title?` ≤ 300 `}`; `source` optional `ai`/`pexels`/`auto`; `delayMs` non-number or negative → 800, above 2000 → 2000 |
| `download-markdown` | 4,500,000 B | `presentationData` = export schema with `slides` ≤ 200; `session` optional ≤ 100 |
| `download-pptx` | 4,500,000 B | as Markdown, plus `slideImages` optional object: keys are slide indexes below the slide count; values `''`, `'failed'`, or raw base64 / `data:image/(png\|jpeg);base64,` starting with a JPEG (`/9j/`) or PNG (`iVBORw0KGgo`) signature, ≤ 1,500,000 characters |
| any other `defineRoute` route | 1 MiB default | none until it defines `input` |

### Phase 3: remaining routes
- Migrate `upload`, `nasa-images/*`, `commons-images/*` (keeping the Commons 413 and 429 + `Retry-After` behaviour through `PublicError`), and `health`.
- `tests/api/auth-protection.test.ts` becomes table-driven over every route handler.

### After Phase 2 (separate PR)
- Regenerate variation fix (Q5).

## Shipping rule

Same as the earlier roadmaps: green suite and typecheck; manual smoke test on the Vercel preview of the PR; commit on `route/phase-N`, push as a branch, merge through a PR after the user approves. Developers never push or merge on their own and nothing goes to `main` directly. Rollback is `git revert` of the merge commit or Vercel promote-previous.

Phase 1 smoke test on the preview: generate slides, regenerate an image, download PPTX and Markdown, all succeed as before. To see a sanitized error, block a request in DevTools or use an invalid session; the message must be the fixed text and never provider internals.

## Risks

- Client code reads `data.error` and shows it to the teacher; the fixed 500 messages must stay readable and actionable.
- `page.tsx` also special-cases Vercel's own timeout page (504), which does not come from our routes and must keep working.
- `env` is a validating Proxy: a missing text-provider variable throws on first access even for image or health routes. Out of scope here; note for later.
- Teachers lose provider detail on 500s (for example "schema validation failed"). Accepted trade-off; the detail is in the server logs.
