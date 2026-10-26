# Phase 1 theme module verification

2026-10-26. Branch: feat/theme-module. Base: main at
ff0d9acf45950d7027bd90469dcac34103a89cec (also the local origin/main at start).
No push, merge, deployment or live provider calls.

## Changes

- Theme types, Classic composition, const ID tuple/registry/guard and computed
  WCAG contrast pairs in src/lib/themes.
- Optional theme propagation through preview/editing, fit/overflow, split,
  auto-fit and both PPTX entry points. Existing legacy exports remain unchanged.
- Font metrics registry, with only the original Poppins table; metrics generator
  accepts font-face lists without adding bundled fonts or generated tables.
- Ten new tests across three files, ADR 0022, architecture/glossary/roadmap updates.
  The pre-existing untracked theme-style roadmap is included.
- No existing test assertions, test helpers or snapshot files were edited.

## Verification

| Gate | Result |
|---|---|
| Typecheck | npx tsc --noEmit: exit 0 |
| Lint | npm run lint: exit 0, no warnings/errors |
| Full tests, CI runtime | Node 22.23.4, vitest run --maxWorkers=2: 141 files, 1,523 tests pass, exit 0 |
| Production build | Node 22.23.4, next build: exit 0 |
| Existing XML goldens | Six slide XML snapshots and all other snapshots pass unchanged |
| Documentation paths | Existing architecture/docs-paths test passes |
| Separate review | No actionable issues |

The suite prints existing jsdom canvas getContext notices. An initial full run
on the host's Node 26.3.0 passed all assertions but exited unsuccessfully with an
unhandled ERR_INVALID_STATE (ReadableStream already closed) during the unchanged
upload.test.ts. The full rerun on the repository's Node 22 CI runtime passed
without that error. No upload code/tests or runtime configuration were changed.

## Byte identity

Baseline PPTX and HTML were captured on main before product edits. The clock was
fixed to 2026-10-26T00:00:00Z (Date only; real async timers retained).

| Fixed fixture | ZIP entries compared | Different entries | Whole archive identical |
|---|---|---|---|
| Short deck | 47 | 0 | Yes |
| Dense deck, fitting and splitting | 55 | 0 | Yes |
| Credited Commons image | 44 | 0 | Yes |

Entry names and every entry's uncompressed bytes were compared. Whole ZIP file
bytes also match. The dense fixture starts at the 24 pt body floor and splits
into five slides, preserving the original content.

Serialized SlideView HTML matches exactly for title, content with image, content
without image, dense content and credited content (five cases). Combined JSON
SHA-256: 5a7e69f71767bb594bc00e1d103ff3729a73707930f39c55869ffa66b48d0660.

Poppins metrics SHA-256 before and after both no-argument generation and explicit
Poppins generation:
e530752277407e31aa2d732cd65d525a1ff6a024a91a31adf50f6e364f50c6e8.
The generated file is absent from the Git diff.

## Browser evidence

Chromium, 1440 / 768 / 390 px wide, 1000 px high, device scale 1, reduced motion.
Five fixed slide cases in Normal, plus sorter and slideshow: 21 comparisons.
Session, deck generation and batch images are intercepted with fixed responses;
no provider requests run. Browser logs contain no page errors or unexpected APIs.

Initial captures were made before editing. A supplemental baseline used the same
main commit extracted with git archive into a scratch directory, with shared
installed dependencies and no secrets. Settled comparisons disable GPU rendering
and wait for fonts/image decoding to reduce capture timing noise.

All slide content is visually unchanged. Nineteen settled PNGs match byte for
byte. Two full-page screenshots have isolated raster differences outside slide
content: four pixels on the 1440 px slideshow navigation-button edge, and the
final 390-pixel scanline at y=2266 in the phone full-page capture, below its
1000 px viewport. These are recorded explicitly; all 21 full PNGs are not claimed
byte-identical.

Artifacts, original captures, settled captures, fixed decks, per-entry SHA-256
manifest, capture harnesses and verification logs are retained locally:

[Evidence and comparison manifest](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase1/comparison.json)

[Main captures](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase1/main)

[Branch captures](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase1/branch)

## Implementation choices

- getTheme falls back to Classic for missing/unknown IDs; isThemeId is strict.
  Future API validation must use the guard.
- previewFont is a CSS font-family string. SlideView retains the existing local
  Poppins variable class, preserving default markup.
- Layout field names are title, content, credit and counter; values reference
  the existing objects, with literal types widened for future geometry.
- Classic's exact radius retains the native PPTX roundRect without an explicit
  adjustment. Other radius percentages map to shorter-side inches; zero uses rect.
- fitText and titlePointSize also take an optional theme so nested measurement and
  title point sizing do not fall back to Classic under a custom layout.
- Contrast exceptions are exactly the requested three, with ratios 2.28, 2.41
  and 3.57. The roadmap's earlier two-exception finding is corrected.

Classic's failing contrast colours remain unchanged by product decision. Native
PowerPoint rendering of future fonts/themes is NOT_PROVEN and belongs to later
phases; there are no new fonts, looks, wire fields, routes or picker in this change.
