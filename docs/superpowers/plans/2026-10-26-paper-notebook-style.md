# Paper Notebook Treatments Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Add ruled notebook paper and the approved taped polaroid frame.
**Architecture:** One Paper Notebook decoration list; existing SVG/native engine.
Commit 1 adds rules/margin/holes. Commit 2 adds frame/tape, picture-only layout
overrides and optional rotation with default/zero paths emitting no new output.
**Tech Stack:** TypeScript, React, PptxGenJS 4.0.1, Vitest, local Chromium/LibreOffice.
**Spec:** User Phase 4c brief supplied 2026-10-26 and ADR 0027.

## Constraints and review focus

Base main f92875d. Exactly two local commits; no push/merge, dependencies,
Chalkboard changes, fit/split/schema/picker changes or validation exceptions.
Protect credit/counter from rules, rotated frame, shadow and image bounds.
Pale rules must pass every applicable contrast pair. Rotation is content-only;
all picture kinds and fallback text share geometry; title images remain unchanged.
Classic and Chalkboard retain whole archives/entries and exact HTML; requests
remain unchanged. Check fit equality before/after picture overrides.

## Commit 1: ruled paper

- [x] Read referenced docs/source and capture fixed-date main fixtures/HTML/requests.
- [x] Add failing Paper Notebook rule/filter/contrast/bounds tests and parity using
  existing readers. Implement pale blue rules ending near6.7, red margin,3holes.
- [x] Adapt only obsolete Paper no-decoration assertions; update Paper snapshot
  file only. Run targeted/full tests and typecheck/lint; commit ruled paper.

## Commit 2: polaroid and rotation

- [ ] Add failing picture override/rotation/native-SVG parity and fit-equality tests.
- [ ] Add optional shape.pictureRotation, Paper-only picture geometry, white frame
  and outer shadow, front translucent tape. Rotate content image/card/placeholder
  in both renderers, emitting nothing for zero/absent rotation. Preserve defaults.
- [ ] Verify rotated bounds, title exclusion, editing and all-look strict XML;
  update only Paper snapshots. No engine changes unless a proven bug is recorded.
- [ ] Render eight cases browser/native; inspect ruled text, frame/tape alignment,
  dense24pt, assessment5bullets, two-line title, credited and missing images.
- [ ] Real Next browser at1440/768/390 with stubbed responses: registry, every
  workspace surface, switching, editing, split/overflow and export themeId.
- [ ] Compare Classic/Chalkboard main bytes/entries/HTML and all request bodies;
  update ADR/architecture/glossary/roadmaps/evidence, restore dev harness.
- [ ] Independent review; Node22 typecheck/lint/full tests/build; second commit.
