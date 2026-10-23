# 0006 — Image library seam

Date: 2026-10
Status: Accepted

## Context

Manual NASA and Commons selection share search/select route behavior but have different metadata, retrieval and public errors.

## Decision

`ImageLibrary` in `src/lib/image-library/library.ts` defines the server adapter. `src/lib/image-library/nasa.ts` and `src/lib/image-library/commons.ts` implement it. `src/lib/image-library/route-definitions.ts` supplies shared search/select definitions, and `src/lib/providers/bounded-fetch.ts` limits server retrieval; each provider remains responsible for URL trust.

## Consequences

The picker uses source-discriminated candidates from `src/lib/image-library/types.ts`. A new library needs an adapter, candidate and metadata variants, route wiring and tests. `tests/lib/image-library/contract.test.ts` checks both adapters.

## Alternatives considered

Keeping two unrelated route implementations was rejected because their policy could drift. See `docs/nasa-provider.md` and `docs/commons-provider.md` for provider history.
