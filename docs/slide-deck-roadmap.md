# Roadmap: deepen the Slide deck module

Source: architecture review candidate 01 (2026-10-18). Planner writes the prompts; a developer chat executes them one phase at a time. After each phase the developer reports back and the planner issues the next prompt.

## Goal

Replace the five parallel structures in `src/app/page.tsx:70–333` (`presentationData.slides[i]`, `slideIds`, `imagesById`, `generatingById`, `imageVersions`) with one **Slide deck** module that owns Slide identity, Slide images and every race rule. Race rules become pure reducer tests instead of click-through tests of `<Home/>`.

## Design decisions (assumed from the grilling round; override any before Phase 1 starts)

| # | Decision | Choice |
|---|---|---|
| Q1 | What the module owns | Deck only: presentation metadata, Slides, content edits, add/delete/renumber, Slide images, pending flags, race tokens. Upload, session picker, loading stage, download flags and slideshow open/close stay in the page. |
| Q2 | Where async work lives | Pure `deckReducer(state, action)` plus a thin `useSlideDeck()` hook that does the fetches and dispatches. No injected image-client port (one adapter = hypothetical seam). |
| Q3 | Slide identity | Internal wrapper `DeckSlide = { id, content: SlideData, image }`. `SlideData` and `PresentationData` stay the model and wire types. The deck derives them, plus the index-keyed image view, at its edges. |
| Q4 | Failed regeneration over an existing image | Keep the previous image; expose a transient per-Slide error. Only a Slide with no image becomes `failed`. |
| Q5 | Race semantics | Preserve today's exactly. The 14 existing integration tests are the acceptance contract. |

Race rules to preserve:
1. A new intent on a Slide (regenerate, library select) supersedes older in-flight results for that Slide.
2. A late batch never overwrites a newer intent.
3. Results for a deleted Slide are dropped, even if a new Slide now sits at its old position.
4. An AI replacement clears the image credit (`imageMetadata`); a library selection sets it.
5. Reset or a new generation invalidates everything in flight.

## Phases

### Phase 1: pure Slide deck module (no UI changes) — done
- Add `GLOSSARY.md` (Slide, Slide deck, Slide image, Pedagogical part, Credit, Image intent).
- New `src/lib/deck/` with types, `deckReducer`, selectors (`toPresentationData`, `toSlideImages`, `toGeneratingFlags`).
- TDD: `tests/lib/deck/deck-reducer.test.ts` encodes the race matrix plus content edits, add/delete/renumber, Q4.
- `page.tsx` untouched. Done = new tests green, existing suite still green.

### Phase 2: wire the hook, migrate page.tsx — done
- `useSlideDeck()` owns fetches for batch generation and single regeneration and exposes derived views plus action callbacks.
- `PresentationWorkspace` swaps its image and deck state for the hook. Delete `slideIds`, `imagesById`, `generatingById`, `imageVersions` and the five hand-written edit handlers.
- `SlideCard`/`SlideshowModal` props unchanged at this stage (index-based view derived from the deck), so the diff stays reviewable.
- Done = all 14 existing integration tests pass unmodified.

Phase 1 outcomes that shape this phase (accepted):
- Reducer actions take `slideId`; the hook converts index to id from the latest state.
- Batch images set no pending flag and bump no version (today's behaviour). The hook builds batch tokens from the current state: `{slideId, version}` per request position.
- `libraryImageSelected` carries no token (it is itself an Image intent).
- Tokens are captured when the request is made, so the hook needs synchronous access to the latest state: keep it in a ref, compute `deckReducer(ref.current, action)` in a dispatch wrapper, assign the ref, then `setState(next)`. Never read React state inside a resolver.

### Phase 3: id-based SlideCard + Q4 UI — done
- `SlideCard` callbacks take the Slide id, not the index (removes the mixed identity).
- Show the transient "regeneration failed, kept previous image" state.
- Integration tests kept; overlap with the reducer tests reported.
- Done = `SlideCard` has one identity model; coverage of the race matrix lives in the reducer tests.

### Phase 4: handoff to candidate 06 (separate roadmap)
The deck exposes the export view (`toPresentationData` plus images with credits kept consistent). Candidate 06 (export payload, `compressImageForExport`, budget trimming) builds on it. Not part of this roadmap.

## Shipping rule

Phases run strictly one at a time, and each ships before the next prompt is issued. A phase ships only when:
1. `npx vitest run` matches the baseline plus the phase's new tests, and `npx tsc --noEmit` is clean.
2. Phases 2 and 3 only: manual smoke test of generate, edit, delete a slide mid-image, regenerate, pick a library image, export PPTX, run on the Vercel preview deployment of the PR (not production).
3. The work is committed on `deck/phase-N`, pushed as a branch, and merged through a PR after the user approves. Developers never push or merge on their own, and nothing is pushed to `main` directly.

Production deploys from `main` only after the PR merge, on the user's explicit go. Rollback is `git revert` of the merge commit or Vercel's promote-previous-deployment. Phase 1 (merged locally, unpushed, no behaviour change) rides out in Phase 2's PR; Phase 3 gets its own PR.

Every phase leaves the app fully working, so stopping after any phase is safe.

## Risks

- Hook closes over stale state in async callbacks. Mitigation: capture the per-Slide version snapshot at request time and compare inside the reducer, never read React state in the resolver.
- `exportPresentationDataSchema` strips unknown keys. Mitigation: ids never go on `SlideData`.
- Tests are the contract; do not weaken the 14 integration tests in Phases 1 and 2.
