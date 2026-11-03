# 0017 — Split a full slide

Date: 2026-10
Status: Accepted
PR: [#32](https://github.com/Mokie04/Presentation-Maker-101/pull/32)

## Context

Text fit flags content that remains too large at the readability floor. Teachers need to move whole bullets to a continuation without losing the original slide's image, credit or in-flight work. Titles can overflow independently, so splitting body text must not be offered as a title fix.

## Decision

`src/lib/deck/deck-reducer.ts` owns the slideSplit action, identified by the original stable ID and a bullet boundary. The original keeps the prefix and its complete image object, including metadata, version, pending status and error. A continuation is inserted immediately after it with a new ID, the same part, remaining bullets, no visual and a fresh image state at version zero. Renumbering updates the ordered export view; existing ID/version tokens still resolve to the original.

`src/lib/deck/slide-split.ts` increments trailing continuation titles and preserves an empty title. `src/lib/slide-split.ts` chooses the largest nonempty prefix whose body fits the original layout, leaving at least one bullet to move. It falls back to one bullet when even that cannot fit. The title layout at index zero and slides with fewer than two bullets have no suggestion.

## Consequences

- Both notices offer Split into two slides only for splittable body overflow. Title overflow has its own shortening message. A still-full continuation can be split again; an individual long bullet is never divided.
- The session deck reducer pairs the original ID with the inserted ID when it reconciles selection (`reconcileSelection` in `src/lib/deck/slide-selection.ts`), so the same update that adds the continuation keeps the original selected and no child ever renders a transient jump. Normal add and duplicate operations still select their new IDs. (An earlier standalone `useSlideSelection` hook and a `splitSelection` hint on the deck hook did this before the session layer existed; both were removed as dead code.)
- After a split, focus returns to the original stage and the existing polite status announces the updated count.
- Rail and sorter use the same overflow helper; passive thumbnails remain memoized. The continuation has full-width body space because it has no visual.
- Long titles can remain flagged after a successful body split. Allowing two-line titles by moving the body is a separate follow-up; undo and merging are outside this phase.

## Alternatives considered

Copying the original image would duplicate its credit and imply that pending image requests belonged to both slides. Splitting at the midpoint would retain fewer fitting bullets or leave avoidable overflow. Changing selection after rendering would briefly select the continuation.
