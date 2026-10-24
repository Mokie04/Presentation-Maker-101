# 0015 — Retire the card grid

Date: 2026-10
Status: Accepted

## Context

Phases 2 to 5 moved editing into the Normal view (rail, stage and panel) and arrangement into the Slide sorter. The original card grid and its Edit Slides toggle duplicated those controls, appended new slides instead of inserting after the selection, and kept a second slide layout that differed from the export.

## Decision

`src/components/workspace/PresentationWorkspaceView.tsx` offers two views, Normal and Slide sorter. The card component, the Grid option, the Edit Slides toggle and the grid's append-only add button are removed. `src/components/SlideImageControls.tsx` stays as the panel's image and credit controls.

## Consequences

- One editing surface: every slide action goes through the panel, the stage or the sorter, keyed by the selected stable slide ID.
- The integration checks that drove the grid (`tests/components/PresentationWorkspace.test.tsx`, `tests/components/NasaPicker.test.tsx`, `tests/components/SubjectProvenance.test.tsx`) now select a slide in the rail and act in the panel. Assertions about slides that are not selected select them first or read the export request.
- A library picker closes when the selection changes, so a pending selection can no longer outlive deleting another slide through the UI; `tests/lib/deck/deck-reducer.test.ts` still dispatches late selections after deletes, and the ported workspace tests keep in-flight AI regeneration across deletion.
- The empty Normal view keeps its own `+ Add Slide` button.

## Alternatives considered

Keeping the grid as a read-only overview would repeat the sorter with a different slide rendering. See `docs/workspace-layout-roadmap.md`.
