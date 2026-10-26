# Export picture cover verification

Base: origin/feat/paper-notebook-style at 2de3737786f00812bbf29fc8b1aff3d9556bbbd0
(PR42, fetched and verified). Branch fix/export-picture-aspect. No push, merge,
deployment or provider calls. Production changes touch only pptx-generator.ts.

## Regression and formats

The new Node regression reproduces the old 4.2-inch extent versus the preview's
4.267-inch box. JPEG and PNG fixtures exercise 3:2, 2:3, 1:1 and box-matching 32:33
on both affected looks. Expected source scaling/crop is independently calculated
with max(boxWidth/sourceWidth, boxHeight/sourceHeight); centred left/right and
top/bottom fractions and native extents are checked. The box case has zero crop.
Zero rotation remains absent in XML. The malformed-image fallback uses a valid
base64 truncated PNG header, preserving legacy sizing and avoiding a new throw.
Library decode errors and aspect-fit ratios remain unchanged.

All-look XML parsing covers every XML and relationship part of JPEG exports; the
existing strict parser and malformed-tag negative control remain green. Paper's
existing crop/rotation suite is unchanged and passes.

## Package identity and exact changed entries

External evidence root (not committed):

    /Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/export-picture-aspect

base/ and branch/ use the same inputs with Date fixed at 2026-10-26T00:00:00Z.
byte-comparison.json records SHA-256, entry count and every changed entry.

Compared 49 evidence files, including 39 whole PPTX archives:

- All nine original Phase1 short/dense/credited fixtures are byte-identical, all
  438 ZIP entries included. Those original inputs supply an image only for the
  credited/library case, so they do not reproduce ordinary-image stretching.
- Added 24 ordinary companions: each look times four aspects times PNG/JPEG.
  Paper's eight companions are byte-identical. Each of the 16 Classic/Chalkboard
  companions changes exactly ppt/slides/slide2.xml. Removing only a:srcRect and
  a:ext inside p:pic makes every changed slide exactly equal to its baseline.
- Six additional library-only packages (each look times Commons/NASA, with title
  and content library images) are whole-archive/entry identical.
- All 13 Paper archives are byte-identical across the full matrix. All 15 existing
  SlideView HTML cases and four request bodies are identical as well.

This supplemental matrix preserves the original Phase1 inputs rather than silently
adding ordinary images to them. No new binary baseline archives are committed.

## Snapshot scope

Only two snapshot files change, with three entries total:

- `tests/lib/services/__snapshots__/slide-layout-characterization.test.ts.snap`:
  long content title/formulas/ordinary image, slide2.
- `tests/lib/services/__snapshots__/chalkboard-characterization.test.ts.snap`:
  same legacy ordinary-image case slide2 and six-render-fixture deck slide2.

snapshot-scope.json lists exact keys. The comparison parses both snapshot maps,
requires identical keys, masks only their hashes plus p:pic's a:ext/a:srcRect, and
asserts the remaining values exactly equal. Paper Notebook and every other snapshot
file are unchanged. Both export entry points continue to agree.

## Render and local landscape check

before/ and after/ render the exact same wide, tall and square locally generated
landscape scenes in all three looks through real SlideView and LibreOffice.
before-after.png / before-after.html show four columns per row: browser before,
native before, browser after, native after. Individual full-resolution PNGs, PPTXs,
PDFs and font reports are retained per look. The temporary harness was restored;
render-harness-used.mjs preserves its adaptation externally.

The source landscape-photo.jpg is a seeded, locally generated 900×600 raster with
sky gradients, terrain and grain; no image provider or external media was used.
Classic's after/deck.pptx slide2 and its LibreOffice PNG are the requested real
export check. The before image's round sun is squeezed; the corrected native crop
keeps it circular like the browser. landscape-real-check.json records pixel bounds.
Wide/tall native crop and placement now match the browser; all three Paper native PNGs are byte-identical. Eight of nine browser PNGs are byte-identical; the Paper portrait capture differs by 15 isolated edge pixels (maximum channel difference18). All preview HTML is identical.
Existing font rasterization/text-box inset differences remain unrelated to sizing.
This is local LibreOffice evidence, not native PowerPoint or physical-device proof.

For both render runs, bundled Poppins Regular/Bold/Italic were registered only for
the login session and unregistered in finally cleanup. Each font-session.json records
all three registration and cleanup results as true. No system font files were copied.
PDF font inventories verify actual Poppins, Arial and Georgia in before and after.

## Review and gates

Independent code review found no actionable findings; the focused suite passed.
A transient ENOSPC prevented one initial test run before its tests executed. The
repository's disposable .next/cache was cleared; source/evidence were preserved.
Subsequent checks pass. Final Node22.23.4 gates: tsc --noEmit; next lint --dir src
--dir tests (no warnings/errors); full suite 162 files / 1,619 tests in 45.74 seconds;
next build with seven static pages generated. A standalone typecheck was rerun
after the build completed because concurrent regeneration of .next/types had
caused transient missing-generated-file diagnostics. The final typecheck exits0.
The focused six-test cover suite and documentation-path guard also pass.
Existing jsdom canvas diagnostics remain non-failing. Final logs are copied to the
evidence root. git diff --check passes.
