# ADR 0026: Chalkboard treatments

Date: 2026-10-26
Status: Accepted (Phase 4b implementation; release pending review)

## Decision

Only `src/lib/themes/chalkboard.ts` gains production decoration. The existing
palette, shapes, layout, fitting, requests and Phase 4a engine remain unchanged.
The readonly list draws three treatments through the existing SVG/native mappers:

- A uniform wooden board: three behind-layer outlined rectangles, wood 8B5E3C,
  dark edge 5E3F27 and highlight A97B52. The total thickness is 0.09 inch (6.48 pt)
  on all four sides. Paint stays inside the slide; the bottom starts at y 7.41,
  leaving the fixed credit box ending at 7.40 clear. The mock's 14 pt frame would
  cover credits. The thinner frame remains visible in the render and requires no
  credit-position override.
- A chalk F4F1E8 squiggle, x 0.8, width 4.5 inches, behind the text. Its local
  control hull is only 0.088 inch tall. Content uses y 2.006–2.094; title slides use
  y 3.23–3.318. Both lie entirely between the existing text boxes. It is a filled
  quadratic ribbon 0.028 inch (2.016 pt) thick, rather than a stroked path: the
  engine's conservative eight-half-width join reserve cannot fit a 2 pt stroke
  into the content layout's 0.10-inch gap. No validation rule is relaxed.
- A front dashed chalk roundRect for content with needsVisual only: x 8.2,
  y 2.06, w 4.54, h 4.58, radius 0.16 inch, stroke 2.5 pt, native dash 4:3.
  It encloses the card (x about 8.267, y 2.1, w 4.4, h 4.5) and both existing
  rectangular image boxes. The card's approximately 0.733-inch native corner
  radius is retained; the shallower outer radius keeps image corners inside the
  outline without masking or rotating the image. The stroke starts at x 8.183,
  clear of the visual-layout bullets ending near x 8.133, and ends below y 6.658,
  clear of the counter. Title images do not receive this content-only treatment.

## Verification

The real list passes validateDecorations with no exceptions. Existing parity
readers are shared between the synthetic engine fixture and Chalkboard. Tests
compare source/SVG/DrawingML, local path commands/controls, layers, filtering,
passive SVG and editable title/bullet interactions. Strict XML parsing runs over
all looks. Only the Chalkboard characterization snapshot file changes (12 entries).

See `docs/theme-phase4b-verification.md` for compatibility captures, eight-row
browser/LibreOffice sheet, real-registry responsive checks and final Node 22 gates.
The seven requested content cases include a long content title fitted at 34 pt;
existing geometry cannot fit two Arimo lines at 40 pt. A supplemental actual title
slide fits two lines at exactly 40 pt and demonstrates clear descenders above its
squiggle. No fit or layout override was introduced. Native PowerPoint rendering
remains unproven; LibreOffice and Chromium evidence is local.
