# 0002 — One credit description

Date: 2026-10
Status: Accepted
PR: [#21](https://github.com/Mokie04/Presentation-Maker-101/pull/21) (decision record for work shipped in earlier PRs)

## Context

NASA and Commons attribution appeared in slide cards, exports and the slideshow, with medium-specific presentation needs.

## Decision

`src/lib/image-metadata.ts` validates source metadata. `describeImageCredit` in `src/lib/image-credit.ts` produces the source label, credit line, source link, optional license and notes; each renderer formats those values for its medium.

## Consequences

Attribution wording has one owner; the slideshow and exports still choose their own layout. AI images have no `ImageMetadata` credit. `tests/lib/image-credit.test.ts` and `tests/lib/services/credit-characterization.test.ts` pin the contract.

## Alternatives considered

Duplicating strings in each renderer was rejected because the copies drifted. See `docs/image-credit-roadmap.md`.
