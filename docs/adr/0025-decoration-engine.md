# ADR 0025: Shared vector decoration engine

Date: 2026-10-26
Status: Accepted (Phase 4a implementation; release pending review)

## Decision

A look may carry an optional readonly Decoration list in SlideTheme. Production
looks leave it absent in Phase 4a. Selection, deck data, requests, layout, fitting
and splitting are unchanged. The only decorated look lives in
`tests/helpers/test-decorations.ts` and is never registered.

`src/lib/themes/decoration.ts` owns the shared contract, filtering and pure
validation. `src/components/DecorationLayer.tsx` draws SVG and
`src/lib/services/decoration-pptx.ts` maps the same filtered list to native shapes.
There are no renderer-specific decoration lists. Empty filtered lists mount no
SVG and insert no shapes; production HTML and whole PPTX archives remain exact.

## Units and primitives

Slide coordinates are inches on a 13.333 by 7.5 canvas. Supported shapes are rect,
roundRect with an inch radius, ellipse, signed-end-vector line, and custom path.
Path commands are moveTo, line, quadratic, cubic and close; endpoints and controls
are local inches within the shape's coordinate system. The box defines the native
path coordinate space and centre of rotation; SVG translates local coordinates
and rotates about the same centre. Lines normalize negative vectors to positive
native extents with flipH/flipV. Rotation is degrees, normalized modulo 360 for
native output. Fill transparency is 0–100; stroke width is points; dash is solid
or dash (4 stroke widths painted, 3 widths gap). SVG converts points to inches.

PptxGenJS 4.0.1's roundRect rectRadius is an inch radius despite the public type
comment's 0–1 description. Its DrawingML adjustment is radius divided by the
shorter side times 100000. Radius is constrained to half that side. Radius zero
uses a tiny positive SDK option so its truthiness check emits adjustment zero
rather than the native default radius. Tests read the adjustment back and compare
the recovered radius; the render fixture includes both zero and 0.15 inch radii.
The SDK supports custGeom at runtime but omits that value from its TypeScript
shape union; the one boundary assertion is documented in the mapper.

Only solid colours are supported. No gradients, patterns, glow, textures or raster
assets are introduced: the verified SDK capabilities and shared SVG/native subset
keep export size and parity predictable.

## Outer shadows only

Shadow blur and offset are points, angle is degrees, colour is six-digit hex and
opacity is 0–1. SVG uses feDropShadow with blur/144 inches standard deviation;
native output uses blur/offset in DrawingML points. The shadow filter surrounds
the rotated shape, matching native rotWithShape=0 and globally oriented offsets.
Filters use useId-derived unique IDs and a user-space region, including for
horizontal/vertical lines with zero-size bounds. SVG never receives pointer events.
Raster blur kernels and edge antialiasing are renderer dependent.

PptxGenJS 4.0.1 emits the malformed tag sequence
`<a:innerShdw ...> ... </a:outerShdw>` for an inner shadow. It is not valid XML.
The type exposes only outer; validation, renderer entry and mapper runtime guards
reject an attempted inner shadow. Zero shadow values use a tiny nonzero SDK option
which rounds to XML zero, bypassing SDK truthiness defaults. Options are fresh per
shape because the SDK mutates shadow units during serialization.

## Ordering and safety

Native shapes stack in insertion order. Behind decoration is inserted immediately
after slide creation, before the credit line (which predates background assignment
in the legacy generator). Front decoration is inserted after the counter, including
the title-slide early return. SVG layers bracket the existing SlideView children.
The editable stage, thumbnails, sorter and slideshow share SlideView. Editing
controls stay interactive because decoration has pointer-events none and front
paint cannot occupy their text boxes.

Validation returns problems, without mutating the theme. Renderer/export boundaries
reject invalid nonempty lists. It checks finite geometry/style numbers, six-digit
hex colours, transparency/opacity ranges, stroke width/dash, radius, path commands,
conditions and outer-only shadows. Credit and counter are protected in both layers
whether or not the current slide actually has a credit. Front paint cannot overlap
part labels, titles, title points or bullets; needsVisual narrows content bullets
to the actual picture layout and never selects title slides. Front paint may cover
the picture area. Behind paint must preserve every applicable foreground colour:
3:1 for titles, 4.5:1 for all other text, including both title-point colours and
visual placeholder text. The thresholds come from themeContrastPairs.

Bounds are conservative: fills use their full bounds, path curves their control
hulls, outlines their painted perimeter, and stroke/rotation/shadow enlarge those
bounds. Curved outlines use padded perimeter segments. Path strokes reserve eight half-widths for miter joins, matching the Office theme miter limit; SVG explicitly uses that limit. Shadow protection extends
two blur radii beyond the shifted painted bounds (four SVG standard deviations).
This can reject safe artwork near text; it must not be weakened to make a design
pass. The empty interior of an outlined rectangle is not treated as filled.

Colours are alpha-composited over the theme background in sRGB before WCAG
contrast measurement. Each fill, stroke and shadow is checked independently; stacked
decorations are checked individually against the background. This does not certify
the cumulative colour of overlapping translucent decorations. Future look lists
must avoid such stacks over text or establish their composite contrast separately.

## Evidence and next phases

`tests/lib/themes/decoration.test.ts` covers validation and filtering;
`tests/lib/themes/decoration-parity.test.tsx` independently reads actual SVG and
DrawingML geometry/styles, path controls, signed lines, ordering and filter IDs.
It parses every XML/relationship part for all registered looks and the fixture,
with a deliberately mismatched-tag negative control. Existing goldens are unchanged.
`tests/components/DecorationEditing.test.tsx` exercises editing through both layers.
See `docs/theme-phase4a-verification.md` for baseline, render and gate results.

Phase 4b will add Chalkboard's frame, squiggle, accent and dashed visual treatment
as a validated list. Phase 4c will add Paper Notebook's ruled/margin treatment and
separate image/polaroid frame work. Neither phase's production lists or image
rotation ship here. No per-look credit/counter positions are introduced.
