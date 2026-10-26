# Phase 4a verification

Base: main 7d58689. Branch: feat/decoration-engine. Local implementation only;
no push, merge, deployment or provider calls. No production look has a decoration.

## Compatibility evidence

Captured main before production edits, with Date fixed at 2026-10-26T00:00:00Z,
then ran the same capture against the branch. Fixtures are the Phase 1 short,
dense/auto-split and credited Commons decks, repeated for all three registered
looks. All nine whole archives and all 438 ZIP entries are byte-identical. All
15 serialized SlideView cases (five per look), three explicit-theme request bodies
and the implicit-default request body are identical. Existing XML snapshots were
not modified. The temporary capture test was removed before the bare full suite.

External evidence root (not committed):

    /Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/phase4a

main/ and branch/ hold captures; byte-identity.json records whole-file SHA-256 and
entry counts. The capture test copy is /tmp/phase4a-evidence.capture.test.tsx.

## Render and editing evidence

The Phase 3 render harness was temporarily adapted for the unregistered fixture:
three slides (title, picture content, no-picture content), real SlideView and
production CSS, Arimo browser face and verified native Arial. It generated native
PPTX, LibreOffice PDF/PNGs, Chromium PNGs and a comparison sheet. The harness file
was restored exactly before commit; render-harness-used.mjs preserves the dev
adaptation outside the repo.

render/test-decorations/comparison.png and comparison.html show all primitives
in both columns, including the 0.15-inch roundRect radius, the zero-radius outline,
rotated translucent dashed rectangle with outer shadow, ellipse, quadratic/cubic
path, horizontal dashed line and negative-vector diagonal line. Visual inspection
found matching placement and radius with small native/browser text and stroke
rasterization differences. This is local Chromium/LibreOffice evidence, not a
native PowerPoint or physical teacher-device rendering claim.

The same browser harness mounted real EditableSlideView, clicked title and first
bullet, filled new values and committed them. report.json records Edited water /
Edited evidence and pointer-events none for both layers; editable.png captures the
result. A component regression test repeats title/bullet focus and commit behavior.
No browser page errors occurred.

## Safety and independent review

Tests normalize actual SVG and DrawingML against the source list, including
geometry rounded to 0.01 inch, radius, rotation, fill transparency, line styles,
shadow units/zero values, path controls, signed vectors, conditions and shape/DOM
order around all text including credits. All XML and .rels parts are parsed with
strict DOMParser for every registered theme and the test theme. The mismatched
inner/outer tag negative control throws. Both export and mapper reject an inner
shadow attempt; the contract also has a compile-time rejection assertion.

Independent review identified acute path miter joins extending beyond half-width
stroke bounds. Validation now reserves the Office miter limit, SVG states the same
limit, and the reported credit-overlap case is pinned as a regression. SVG shadows
use slide-space filter bounds so zero-height/width lines remain supported.

## Final gates

Node 22.23.4: typecheck, lint, full tests (--maxWorkers=2) and next build.
All passed: tsc --noEmit, next lint --dir src --dir tests (no warnings/errors),
155 test files / 1,594 tests in 42.75 seconds, and next build (all seven static
pages generated). The suite emits the existing jsdom canvas-not-implemented
messages from accessibility checks; there are no failing tests. Final gate logs
are copied to the external evidence root. A final recapture after review and
render fixes again confirms all 19 baseline evidence files identical.
