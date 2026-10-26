# Decoration engine Phase 4a plan

Spec: user Phase 4a request and the pre-existing uncommitted Phase 4 investigation
in docs/theme-style-roadmap.md. Base main 7d58689. No production decorations,
geometry/fit/split/schema/route/picker changes, dependencies, push or merge.

- [x] Read the investigation, prior ADRs/render contract and read-only mock/prototype.
- [x] Capture main: nine fixed-date PPTX archives (three fixtures x three looks),
  three request bodies and fifteen serialized SlideView cases before product edits.
- [x] Add test-only list, failing safety/filter/parity/XML tests; implement strict
  primitive types, filtering, geometry/contrast validation and runtime guards.
- [x] Render non-empty layers in SVG and native PPTX, preserving empty-list order
  and bytes. Pin radius, line direction, path commands, zero shadow values,
  rotation, dash, shadow units and z-order in normalized output tests.
- [x] Strictly parse all XML/rels for every look and the fixture, including a
  mismatched-tag negative control and forbidden-inner-shadow regression.
- [x] Use an uncommitted Phase 3 harness adaptation to render three fixture slides
  (title/picture/no picture), inspect parity and editable overlay interactions.
- [x] Document ADR 0025 and update architecture/glossary/roadmap/checklist. Preserve
  the user's investigation. Full Node22 checks, independent review, scoped commit.

Validation design: conservative bounds of painted fill/stroke segments, rotated
about the shape-box centre, with shadow extent. Outline interiors are not paint.
Curves use their control hull; complex corners may be conservatively rejected.
Behind paints (including shadow) are composited individually against background;
stacked decorations are not cumulatively certified. Protected boxes always win.
