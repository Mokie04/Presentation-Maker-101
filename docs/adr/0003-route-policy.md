# 0003 — One protected-route policy

Date: 2026-10
Status: Accepted

## Context

Routes need the same auth-before-parse order, body caps, validation and safe error handling.

## Decision

Protected handlers use `defineRoute` in `src/lib/api/define-route.ts`. It authenticates before reading the body, caps and parses it, validates a declared Zod input, passes intentional `PublicError` messages, and returns a route-specific fixed message for unexpected errors. The session bootstrap in `src/app/api/session/route.ts` is exempt because it creates the session.

## Consequences

Each route owns its schema, cap and `failureMessage`; provider error text stays in server logs. `tests/architecture/routes-use-define-route.test.ts`, `tests/api/auth-gate.test.ts` and `tests/api/error-sanitization.test.ts` enforce the boundary.

## Alternatives considered

Hand-written policy in every route was rejected. See `docs/route-module-roadmap.md` for the rollout and limits.
