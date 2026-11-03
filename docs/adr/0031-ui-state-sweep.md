# ADR 0031: UI and state sweep

Date: 2026-11-03
Status: Accepted
PR: [#57](https://github.com/Mokie04/Presentation-Maker-101/pull/57)

## Context

The 2026-10-26 review (`docs/code-review-2026-10-26.md`, items U1 to U8 and T1) found interface and state bugs at the edges of features that had shipped one after another: a deck could be emptied from the panel, Escape on a new bullet left an empty bullet, focus could be pulled away while typing, dialogs ignored Escape after a backdrop click, uploads could overwrite each other, and the Chalkboard empty-slide prompt was nearly invisible. Several tests could not fail on the bug they claimed to guard.

## Decision

Fix each bug with the smallest change, test first, and adopt these rules:

- **Last slide.** Delete Slide is disabled when one slide remains (panel and sorter agree). Preview and the downloads are disabled with no slides, and the slideshow only listens for keys while a slide is current.
- **Dialogs.** Escape is handled at document level while a dialog is open and closes only the topmost layer; during generation it cancels through the same abort path as the Cancel button. After Start over, focus moves to the home heading.
- **Focus recovery.** The workspace only recovers focus for an element that was removed from the document, never for one that merely became disabled; the view switch only arms its focus move when the view really changes.
- **Navigation keys.** Home, End, PageUp, PageDown and the arrows move between slides only when the target is the page, the stage or the rail, never on buttons, links, tabs or form fields.
- **Inline editing.** Escape on a freshly inserted empty bullet deletes it (the same outcome as Backspace and blur); Escape, Enter and Backspace ignore IME composition.
- **Uploads.** A request counter ignores stale results; the paste box and the lesson text come from one source; the file input is reset after reading.
- **Empty-slide prompt.** It uses the active look's palette and font and is covered by a contrast test for every registered look.
- **Disclosure state.** The phone "Image" section's open state lives above the per-slide panel so it survives slide changes.
- **One `h1` per screen.** The home hero on the home screen, the presentation topic in the workspace; the header brand is not a heading.
- **Overflow cache.** `getSlideOverflow` caches per slide bullet array, theme and the other inputs (the selectors keep the same array for an unchanged slide), with a small cap per slide, so typing recomputes only the edited slide. Results equal an uncached measurement.
- **Dead selection code removed.** `useSlideSelection` and the `splitSelection` hint on `useSlideDeck` were unused in production; selection runs through `reconcileSelection` inside the session deck reducer. The module is now `src/lib/deck/slide-selection.ts` and holds only the pure rules; its tests were ported to the reducer and to `useSlideDeck().selection`.
- **Look button.** A deliberate exception to "no visual redesign": the trigger uses the home screen's tactile style with a swatch of the current look, so teachers notice it.

## Consequences

Each rule has a test that fails when the behaviour is broken, and the weak tests named in the review were rewritten and checked by mutating the code under test (for example, making the deck hook always return Session 1's slides now fails the export and preview test).

## Not done

- Duplicating a slide before its automatic picture arrives leaves the duplicate without a picture (the result is routed to the original slide id). Fixing it needs extra provider calls or fanning a result out to copies; teachers can use Regenerate.
- The rail options are `<button draggable>`, which Firefox may not drag. This was not reproduced here (no Firefox), so it is left unchanged and noted as unverified.
