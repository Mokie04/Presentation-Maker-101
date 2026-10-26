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
