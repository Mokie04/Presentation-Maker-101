# 0016 — Fit slide text

Date: 2026-10
Status: Accepted

## Context

Dense generated text was centred and clipped in the browser and could spill over neighbouring boxes when PowerPoint did not apply shrink on open. Teachers could not reach the clipped lines. Web and export need the same size decision while preserving fitting-slide XML.

## Decision

`src/lib/slide-fit.ts` provides one pure glyph-width estimator for SlideView and PPTX export. It wraps words and breaks overlong words, searching down in 1pt steps. The bundled Poppins Regular and Bold advances and natural 1.5em title line height are generated into `src/lib/slide-fit-metrics.ts` by `scripts/generate-slide-fit-metrics.mjs`, without dependencies. Formulas are measured as displayed text with conservatively full-size scripts.

The floors in `src/lib/slide-theme.ts` are 24pt for content bullets, 28pt for both titles, and 16pt for title-slide points. Title points retain their original mixed sizes, shrinking proportionally with each point clamped to 16pt. Width and height margins of 6% and 3% allow for wrapping differences and substituted fonts. Existing bullet and title-point line spacing scales with the fitted size. Bullet measurement reserves the on-slide editor’s two-em wrapper at every candidate size, so an editable slide cannot gain extra wrapped lines simply by entering edit mode.

## Consequences

- Fitting boxes keep their original sizes and export options. Dense boxes receive explicit smaller sizes; export retains shrink as a second line of defence because PowerPoint and substitute fonts can wrap differently.
- Fit is recomputed from current text while the teacher types, intentionally changing the size live. There is no DOM measurement or state in SlideView.
- Overflow at the floor is flagged in the rail, stage and panel. Full-size boxes align at the top and scroll; thumbnails stay clipped. Splitting content remains Phase B.
- The committed 45-string browser corpus covers 20–300 characters, formulas, MCQ options, long words and Filipino text. At 35pt in Chrome with bundled Poppins, mean signed error is +0.133 lines, mean absolute error 0.222, and worst error is one line in either direction. Measuring the same corpus inside the editable two-em wrapper gives +0.356 mean error (also absolute), zero underestimation and at most two extra estimated lines. This is calibration, not proof of PowerPoint rendering on every teacher's computer.

## Alternatives considered

Browser-only measurement would leave export dependent on a different decision. Relying only on PowerPoint shrink preserves overflowing files on open. Generating shorter text is complementary Phase C work.
