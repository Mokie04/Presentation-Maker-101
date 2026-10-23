# 0001 — Slide deck reducer and hook

Date: 2026-10
Status: Accepted

## Context

Slide position changes after deletion, while image generation can finish later. Index-based image state could attach a result to the wrong slide.

## Decision

`src/lib/deck/deck-reducer.ts` gives each slide a stable internal ID and image version. `src/lib/deck/use-slide-deck.ts` captures ID/version tokens when requesting images; the reducer ignores stale results. `src/lib/deck/selectors.ts` creates the index-keyed view needed by UI and export without sending internal IDs to the server.

## Consequences

All slide edits and image-intent resolutions go through the reducer. The API still receives `PresentationData` and index-keyed image data. `tests/lib/deck/deck-reducer.test.ts` checks deletion and race behavior.

## Alternatives considered

Keeping image state keyed only by current array index was rejected because deletion changes that index. See `docs/slide-deck-roadmap.md` for the phased migration.
