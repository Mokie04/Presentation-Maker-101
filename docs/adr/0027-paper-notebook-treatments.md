# ADR 0027: Paper Notebook treatments

Date: 2026-10-26
Status: Accepted (Phase 4c implementation; release pending review)

## Ruled paper (commit 1)

Paper Notebook carries 21 opaque E5EDF2 blue rules, a D9826B margin line and three
E4DCC4 binder holes edged CDB57A. All use the existing behind-layer engine.
Rules run from y 1.05 to 6.65 in 0.28-inch increments, at 0.75 pt. They stop above
the counter starting at 6.85 and the credit starting at 7.15. The margin stays
at x 0.62; holes occupy x 0.18–0.42, clear of text beginning at x 0.8.

E5EDF2 replaces the mock's BFD3E6: every foreground contrast pair, including the
A8431F part label at 4.5:1, passes against the opaque rule colour. No validator
exception, line transparency, inner shadow or texture is introduced.

The production change in this commit is only the decoration list; fitting,
layout, fonts, picker and export contracts are untouched. Shared source/SVG/native
parity, filtering, rule bounds, contrast and all-look strict XML tests cover it.
Only Paper Notebook's characterization snapshot file changes. The polaroid and
content picture rotation follow in the second commit as requested.

## Polaroid and content pictures (commit 2)

A white rectangle at x 8.44, y 2.2, w 4.18, h 4.28 rotates 2° clockwise behind
content visuals, edged E8E0CC with an outer 6 pt blur / 2 pt offset shadow (60°,
5B4A20, opacity 0.18). Its rotated stroke/shadow bounds end above y 6.75, clear
of the counter. Front F5D76E tape at 35% transparency rotates -4° at y 2.17;
its rotated top stays below the title box ending at y 2.00. The shared validator
passes the entire list without exceptions. No decoration-engine change was needed.

Paper alone overrides content image, libraryImage, imageSizing, visualCard and
placeholder. The picture/card box is x 64.5%, y 2.35, w 29%, h 3.7; placeholder
text is inset. Its bottom ends at 6.05 before rotation, leaving a 0.43-inch frame
lip. The card is rectangular. All text layout, bullets widths, fit inputs,
credit/counter and title layout remain unchanged; tests prove fit equality.

The optional shape.pictureRotation token defaults to absent/zero. SlideView applies
CSS rotation around the centre to content images, cards and fallback text; export
applies native rotation to those same elements. Default/zero emits no new styles
or rotation options. Picture geometry already flowed through theme-scoped aliases
in SlideView, EditableSlideView and the generator; no redundant rerouting was
needed. Title-slide pictures are explicitly excluded from frame, tape and rotation.

A wide local render fixture exposed a legacy export bug: ordinary images supplied
the box aspect ratio to the SDK instead of the source ratio and were stretched,
whereas browser object-cover crops them. The new rotated-picture path decodes the
real dimensions and uses native cover sizing; a regression fails on the legacy
path and passes on the fix. Commons/library images retain aspect-fit containment.
Legacy nonrotating export paths remain unchanged to preserve Classic/Chalkboard.

See `docs/theme-phase4c-verification.md` for the eight-case render sheet, responsive
workspace checks, byte comparisons, XML/parity tests and final gates. The result
keeps the approved mock's notebook/polaroid treatment with paler, shorter rules,
a smaller picture/frame and tape below the title. No layered-paper variant,
per-look credit positions, provider work or title-picture frame is introduced.
