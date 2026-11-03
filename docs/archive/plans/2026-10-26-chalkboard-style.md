# Chalkboard Treatments Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution.

**Goal:** Add the approved Chalkboard frame, squiggle and dashed picture outline.
**Architecture:** Only Chalkboard gains a readonly decoration list. Reuse unchanged
Phase 4a validation and SVG/native renderers. Frame uses nested outlined rects;
squiggles use thin filled curved paths to fit the existing text gaps without
relaxing conservative path-join bounds. Picture outline is a front roundRect.
**Tech Stack:** TypeScript, React SVG, PptxGenJS 4.0.1, Vitest, local render tools.
**Spec:** User Phase 4b brief supplied 2026-10-26; ADR 0026 records implementation.

## Constraints and review focus

Base main dd80861. No push/merge, layout/fit/schema/picker changes, dependencies,
Paper Notebook treatments or production engine changes. Protect credit/counter;
frame entirely inside 13.333 by 7.5 inches with bottom paint below 7.40. Squiggle
inside title/body gaps; picture outline must fit images and empty placeholders.
Exercise dense floor, five-bullet assessment, two-line title, credited image,
no-visual content, thumbnail scaling and edit/split/overflow interactions.

## Tasks

- [x] Read spec, ADRs, roadmap, engine, geometry and render notes; capture fixed-date
  main archives/HTML/requests using Phase 1 fixtures before production edits.
- [x] Add failing real-Chalkboard list/filter/validation tests. Implement only the
  list in src/lib/themes/chalkboard.ts with wood/dark/highlight outlines, separate
  title/content ribbon positions and conditional dashed picture roundRect.
- [x] Reuse the SVG/native parity helper for Chalkboard, retaining all existing
  synthetic assertions; keep strict XML and unchanged-look tests. Update only
  Chalkboard XML snapshot file and Chalkboard-specific no-decoration assertion.
- [x] Add/edit component coverage and seven render fixtures; inspect native/browser
  sheet, credit clearance, title descenders and picture/placeholder framing.
- [x] Stub actual Next routes and exercise real registry at 1440/768/390: picker,
  stage, rail, sorter, slideshow, switching, overflow/split and export themeId.
- [x] Compare final Classic/Paper archives and entries, HTML and all request bodies
  against main; document ADR/roadmaps/evidence. Node22 typecheck/lint/full tests/build.
- [x] Independent review, scoped commit, clean tree; no push or merge.
