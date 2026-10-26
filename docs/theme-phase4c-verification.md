# Phase 4c verification

Base main f92875d, branch feat/paper-notebook-style. Two commits as requested:
0be6141 adds ruled paper; the second adds polaroid/tape and content picture rotation.
No push, merge, deployment or provider calls.

## Compatibility and snapshots

Captured the three Phase 1 fixtures per registered look before production edits,
with Date fixed at 2026-10-26T00:00:00Z, then recaptured on the completed branch.
Classic and Chalkboard: six whole PPTX archives, all 292 ZIP entries, and ten
serialized SlideView HTML cases are byte-identical. All four request bodies
(implicit default plus three explicit look IDs) are identical. Paper's three
archives and five HTML cases intentionally differ; only its slide XML ZIP entries
changed. Classic and Chalkboard snapshot files remain untouched.

Only `tests/lib/services/__snapshots__/paper-notebook-characterization.test.ts.snap`
changes (12 entries across the branch: six render fixtures and six legacy cases).
The first commit updates the rules in those entries; the second updates affected
content visuals. Obsolete assertions about Paper sharing Classic's entire layout
or having no decorations are adapted only for Paper. Classic/Chalkboard assertions
retain their prior behavior. No fit/split/schema/picker/engine source changed.

External evidence root (not committed):

    /Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/phase4c

main/, branch/, byte-identity.json and contrast.json record captures and hashes.
The temporary capture test was removed; render harness source was restored exactly.
render-harness-used.mjs preserves its dev-only adaptation.

## Safety, parity and rotation

E5EDF2 rules give the A8431F part label 5.083:1 (required 4.5). Every foreground
pair passes against rule colour; rules stop at 6.65 and all lists pass validation.
The shared SVG/native reader compares Paper geometry, colours, stroke, opacity,
rotation, shadow and insertion order for title, picture and no-picture cases.
All-look XML and relationship parsing plus the malformed-tag negative control pass.
A backend suite strictly parses every part of a package containing rotated ordinary
and Commons images plus a missing-image fallback.

Picture/card/placeholder bounds clear bullets, credits and counter after rotation.
Tests prove fit equality with/without the five picture-only overrides, excluded
title-image rotation, CSS/native 2° parity and exact default/zero rotation behavior.
Paper title and bullet editing is included in the existing component regression.
Backend image tests run in Node because jsdom has a separate typed-array realm.

The wide-image render caught legacy native stretching versus browser cover. The
new rotated content path uses decoded aspect ratio and native cover cropping.
The regression was run against the old path and failed (zero crop), then passed
on the corrected path. Contained Commons images preserve their original aspect.

## Render inspection

render/paper-notebook/comparison.png and comparison.html show eight rows with
Chromium/Gelasio on the left and LibreOffice/verified Georgia on the right:
title; ordinary picture; no-picture content; dense content at 24 pt; five-bullet
assessment; a long two-line title; credited image; missing-image placeholder.
The fixed diagram is generated locally from SVG, with no provider or remote asset.
It is wider than the picture box, making cover/contain behavior visible.

Inspected the full sheet and full-resolution image, credit and placeholder rows.
Rules remain faint beneath readable text. Frame, picture, tape and rotation align;
cover crop now matches. Frame/shadow, card, credit and counter are clear; the dense
and assessment content stays present and placeholder text fits. Native text insets,
formula scripts/bullet presentation and rasterization retain pre-existing browser/
LibreOffice differences; no new decoration overlap or clipping was found. This
is local evidence, not native PowerPoint or physical teacher-device proof.

Compared with the approved mock: paler E5EDF2 rules replace BFD3E6, rules end near
6.7, the polaroid/picture is smaller to reserve its lip and shadow above the counter,
and tape stays below the title. The red margin, three binder holes, white frame,
soft shadow, yellow tape and gentle 2° clockwise picture treatment remain.

## Real Next browser

Nine runs (three looks at 1440/768/390) use the real registry with session,
generation, image and download routes stubbed. Normal, rail, sorter, slideshow
and picker show Paper's rules/margin/holes and conditional frame/tape/2° pictures.
Paper has 25 background primitives plus one frame and front tape for content
visuals. Switching to Classic removes these; Chalkboard keeps its own treatments
without Paper rules or rotation. Desktop/tablet title/bullet edits commit; the
existing mobile passive-stage policy remains. Overflow and Split work, and the
Paper download request carries paper-notebook. No unexpected API route or browser
page errors occurred. browser/browser.json and PNGs record surfaces and counts;
browser-check.cjs preserves the external script. No live providers were called.

## Final gates and review

Commit 1: Node 22 typecheck/lint and all 158 files / 1,604 tests passed.
Independent code review found no actionable issues in geometry, crop/contain,
rotation, title exclusion or compatibility paths; 11 focused tests passed there.
Final Node 22.23.4 gates all pass: tsc --noEmit; next lint --dir src --dir tests
(no warnings/errors); 161 files / 1,613 tests in 37.63 seconds; next build (all seven
static pages generated). Strict XML, rotated image regression, fit invariance and
unchanged-look goldens pass in the full suite. Existing jsdom canvas diagnostics
remain non-failing. Final logs are copied to the external evidence root.
git diff --check and the architecture documentation-path test pass.
