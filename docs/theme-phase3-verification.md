# Phase 3 new-look verification

2026-10-26. Branch: feat/new-looks. Base: main 00fcddc.
No push, merge, deployment, live provider requests or generation/prompt changes.

## Diff summary

- Registered approved Chalkboard and Paper Notebook palettes, reusing Classic's
  exact layout and shape objects. The existing header picker now has three looks.
- Bundled six official static fonts and matching Apache/OFL license texts; added
  local font variables, generated Arimo/Gelasio metrics and registry entries.
- Added Office theme head/body fonts for non-default looks and normalized completed
  export hyperlink/followed-hyperlink colours to the readable credit token.
- Added measured title leading for new-look browser previews, fixing the inherited
  Poppins-leading mismatch. Added checked-radio dismissal to the existing picker.
- Added native/browser render and font-advance tools with ignored output, licensed
  source/hash documentation, new XML snapshots and real-look tests.
- JSZip 3.10.2 was already installed through PptxGenJS; it is now declared directly
  for package post-processing. No additional tool was installed.

## Gates

| Check | Result |
|---|---|
| Node runtime | 22.23.4, matching CI's Node 22 major |
| Full bare Vitest suite, --maxWorkers=2 | 152 files / 1,570 tests pass, exit 0 |
| tsc --noEmit | Exit 0 |
| Next lint --dir src --dir tests | Exit 0, no warnings/errors |
| Next build | Exit 0 |
| Registry-wide contrast | Both new looks pass all pairs; Classic exceptions unchanged |
| Existing Classic snapshot files | Unchanged and passing |
| Documentation path guard | Passing |

The suite prints existing jsdom canvas getContext notices, with no unhandled
errors. The temporary capture test was removed before the final bare suite.

Separate review identified two evidence issues, both fixed: the dev browser now
imports production globals.css/Tailwind formula rules; the new snapshots reuse
Classic's exact six characterization inputs. The same six render fixtures also
have goldens, for twelve snapshots per new look. Classic setup data was extracted
into a shared helper, preserving its assertion block byte for byte.

## Existing assertion edits: exhaustive list

Only one existing assertion changed, reflecting the new production registry:

- tests/lib/themes/registry.test.ts: THEME_IDS equality changed from
  ['sayuna-classic'] to ['sayuna-classic', 'chalkboard', 'paper-notebook'].

The upstream Gelasio license is retained byte for byte, including its original
trailing whitespace; whitespace checks exclude that vendored license only.

No other existing assertion or existing snapshot changed. The existing Classic
characterization test now imports its unchanged input cases from
slide-layout-cases.ts; its describe/it/assertion block is byte-identical to main.
All other tests were added in new files.

## Classic identity

Date was fixed to 2026-10-26T00:00:00Z, preserving real asynchronous timers.
The same Phase 1 short, dense and credited Commons fixtures were rebuilt on main
before edits and on the branch. Whole archive bytes and every entry match both
main and the retained Phase 1 archives:

| Fixture | ZIP entries | Differences |
|---|---|---|
| Short | 47 | 0 |
| Dense, shrink/split | 55 | 0 |
| Credited Commons | 44 | 0 |

Poppins metrics remain byte-identical after regeneration: SHA-256
e530752277407e31aa2d732cd65d525a1ff6a024a91a31adf50f6e364f50c6e8.
The default export request body remains byte-identical and omits themeId.

The product owner explicitly resolved the conflicting HTML requirements in
favour of applying all three local font-variable classes to every SlideView root.
All five serialized Classic HTML cases differ ONLY in those added root-class
tokens. Removing just those tokens restores exact HTML identity. No other Classic
style, text, geometry, palette, formula markup or export byte changed.

## Fonts and measured deviation

[ADR 0024](adr/0024-office-safe-look-fonts.md) lists the pinned upstream URLs,
embedded versions, licenses and SHA-256 of all six fonts and both license files.
Arimo is the official archived Apache static Version 1.23, not a relabeled copy
of current OFL Arimo. Gelasio is the maintainer's static Version 1.008.

Maximum / mean absolute advance deviation per 1000 em, full 146-character set:

| Pair | Regular | Bold | Italic |
|---|---|---|---|
| Arial / Arimo | 416.992 / 11.424 | 416.992 / 11.424 | 416.992 / 11.424 |
| Georgia / Gelasio | 512.207 / 26.143 | 472.168 / 21.468 | 512.207 / 25.835 |

Missing glyphs account for most of those totals. Among shared glyphs, Arial/Arimo
is exactly 0 / 0 in every style (129 glyphs). Georgia/Gelasio is 90.332 / 0.659,
52.734 / 0.385 and 43.945 / 0.321 respectively (137 glyphs); Sigma accounts for
the shared difference. Gelasio lacks eight lowercase Greek glyphs in this set;
installed Arial lacks several superscript/subscript glyphs. The JSON records
missing lists, system-file paths/hashes and every maximum. Measurements read
system font files in place; no Arial or Georgia file was copied or committed.
These results do not prove platform-specific fallback/shaping for missing symbols.

Nineteen slides from the existing 24-bullet, credited 8-bullet and formula-dense
auto-fit fixtures still fit under both new looks. Each new look gains vertical
title slack on 19/19 slides and body slack on 1/19. Other body wrap thresholds tie;
this is not reported as a body-size gain. Separate wrapping stress tests verify
that narrower body advances actually affect fitting. Generation-time auto-fit
remains Classic and no teacher text is changed by look selection.

## Render harness

The harness produced six-slide PPTX/PDF/browser/native PNG sets and side-by-side
sheets for Classic, Chalkboard and Paper Notebook. It uses the real SlideView
source, actual production formula CSS and bundled fonts in Chromium. PDF font
inspection confirms real Arial and Georgia for the new-look native renders.
All six new-look browser cases have no text-box overflow; native inspection shows
all content present, the dense case at 24 pt, correct colours and legible credits.
The six input roles are title, image content, no-image content, dense, assessment
and credited image; separate legacy goldens cover title library images, whitespace
visuals and credit when the image is unavailable.

Classic initially substituted fonts. The user authorized temporary CoreText login-
session registration of bundled Poppins Regular/Bold/Italic. All three registered
successfully, all render sheets were rerun, and finally cleanup unregistered all
three successfully. The final Classic PDF lists Poppins Regular/Bold/Italic.
No files were copied into system font folders, and no registration remains.
Classic's existing first-point glyph-ink overshoot is recorded as a baseline
layout measurement; it is not a new-look overflow or a change to Classic.

Tolerance: existing native text-box insets/bullet indentation, formula script
placement, link underline, antialiasing and minor line placement. Not tolerated:
missing content, new-look text outside its box, substituted Arial/Georgia, or
unreadable links. See scripts/README-slide-look-rendering.md for how to rerun.

PowerPoint spot-check result: NOT_PROVEN. AppleScript opening/export encountered
a generated-file access prompt; after the attempt it returned parameter error
-50 and no PNG export completed. A native file-chooser attempt did not resolve
access, and was cancelled without opening other files. No PowerPoint render
success is inferred from LibreOffice, ZIP/XML validity or application startup.

## Real-app browser

All nine combinations of 1440 / 768 / 390 px and the three registered looks pass,
using fixed local deck/image responses and no provider calls:

- Header picker visible; three live previews and Poppins/Arial/Georgia font notes.
- Actual Next font variables resolve to loaded Poppins/Arimo/Gelasio faces.
- Open picker and phone sheet stay within the viewport.
- Each look restyles Normal, sorter and slideshow with the approved background.
- Overflow notices and Split work under each look; split adds its continuation.
- PPTX requests carry chalkboard or paper-notebook; Classic omits themeId.
- No generation/image requests are caused by changing looks; no page errors.

Forty-eight screenshots and the per-combination assertions/request logs are saved.
The download body is stubbed in this browser check; real route/package correctness
is independently covered by API tests, XML goldens and the native render harness.

[Evidence manifest, checks and hashes](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase3/comparison.json)

[Final render sheets and PDF font inventories](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase3/render)

[Real-app browser screenshots and assertions](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase3/browser)

[Advance deviations and missing-glyph details](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase3/font-deviations.json)
