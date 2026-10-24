# 0014 — One slide renderer in the slideshow

Date: 2026-10
Status: Accepted

## Context

The slideshow used a separate reflowing layout, so a phone preview differed from the stage and downloaded slide. Reflow also required special mobile overflow handling.

## Decision

`src/components/SlideshowModal.tsx` renders the current slide with `src/components/SlideView.tsx` in full mode, fitted at 16:9 between its controls. Phones show the same slide as larger screens. Portrait phones below 768 px get a dismissible rotate hint, reset on each open; short landscape screens (500 px tall or less) use tighter bars and padding so the slide gains height.

## Consequences

- The slideshow retains its navigation, keyboard and swipe controls without duplicating slide geometry or formula rendering.
- A clickable attribution bar sits directly below a credited slide with a usable image. It includes source and available license links; its repeated credit text is hidden from assistive technology because the slide already exposes that text.
- Small portrait slides and dense text remain limited by the shared export geometry. The preview does not provide browser shrink-to-fit or reflow the slide.
- `tests/components/SlideshowSlideView.test.tsx` covers shared rendering, image fit, credits, formulas and the portrait hint.

## Alternatives considered

Retaining a separate phone layout would keep the preview inconsistent with the stage and export. See `docs/workspace-layout-roadmap.md`.
