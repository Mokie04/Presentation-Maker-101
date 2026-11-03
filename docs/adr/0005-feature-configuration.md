# 0005 — Per-feature configuration

Date: 2026-10
Status: Accepted
PR: [#21](https://github.com/Mokie04/Presentation-Maker-101/pull/21) (decision record for work shipped in earlier PRs)

## Context

Upload and image routes should not fail merely because an unrelated text-provider key is absent.

## Decision

`src/lib/env.ts` has separate validating readers and lazy cached accessors for text, image, Pexels and app/upload settings. `src/lib/sessionAuth.ts` independently reads App Store session settings.

## Consequences

Only the feature in use validates its settings. Direct `process.env` access elsewhere in `src/` is barred by `tests/architecture/config-boundary.test.ts`; `tests/lib/env.test.ts` checks the readers.

## Alternatives considered

One validated startup environment object was rejected because unrelated routes inherited one another's required keys. See `docs/architecture-roadmap.md` (item 4).
