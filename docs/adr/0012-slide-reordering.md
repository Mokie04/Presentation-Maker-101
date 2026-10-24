# 0012 — Slide reordering, duplication and add-after

Date: 2026-10
Status: Accepted

## Context

Teachers need to arrange a deck without detaching images or credits from their slides. Image generation can finish during a move or duplication, and HTML5 drag and drop does not provide a touch alternative.

## Decision

`src/lib/deck/deck-reducer.ts` owns moves, duplication and insertion after a stable slide ID. Moves preserve each slide's image state and version; duplicates get a new ID, independent content and image metadata, version zero and no pending request or error. Every operation renumbers the ordered view. Existing ID/version tokens keep late image results on their original slides.

`src/components/workspace/use-slide-reorder.ts` shares HTML5 drag handling between the sorter and Normal rail. Visible move buttons support touch in both views; Alt+ArrowUp/ArrowDown reorders from the rail while plain arrows retain selection navigation. The panel adds after the selected slide. (The card grid's append-only button was retired with the grid; see `docs/adr/0015-retire-the-card-grid.md`.)

## Consequences

- Selection remains keyed by stable ID: moves retain it, while a single insertion selects the new slide.
- `src/components/workspace/SlideThumbnail.tsx` memoizes passive slide renderings in both views.
- The first slide's title layout remains an export rule; any slide can occupy that position. The sorter explains this below its grid.
- `tests/components/Sorter.test.tsx` checks the actual download request after reordering, including index-keyed images and credits. Export routes and the slide renderer are unchanged.

## Alternatives considered

Reordering only a view array would split image ownership and race handling across modules. Drag-only controls would exclude touch and keyboard users. See `docs/workspace-layout-roadmap.md`.
