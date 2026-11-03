# Export Picture Cover Fix Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Match browser object-cover for ordinary Classic/Chalkboard content images.
**Architecture:** Generalize PR42's private cover helper in pptx-generator.ts.
A successful decode uses real source aspect and theme picture-box cover sizing;
a failed decode returns control to the untouched legacy sizing path.
**Tech Stack:** TypeScript, image-size, PptxGenJS4.0.1, Vitest, local render tools.
**Spec:** User export-picture-aspect fix brief, 2026-10-26; ADR0028.

## Constraints and review focus

Base origin/feat/paper-notebook-style at 2de3737 (PR42). No push/merge, library,
preview, geometry, placeholder, fit/split/decoration/route or Paper valid-output
changes. Zero rotation must emit no option. JPEG/PNG source aspect, centred crop,
undecodable fallback, native dimensions and unchanged library packages are pinned.

## Tasks

- [x] Verify remote PR42 head and clean checkout; read sizing code and prior ADRs.
- [x] Capture PR42 Phase1 short/dense/library fixtures for every look, plus ordinary
  wide/tall/square/box-matching and Commons/NASA companion packages. Capture before
  browser/native renders with temporary session Poppins registration and cleanup.
- [x] Add red Node regression cases for wide3:2, tall2:3, square and box32:33 in
  JPEG and PNG; independently check object-cover crop and picture-box extents.
- [x] Generalize cover helper with optional zero rotation and decode-failure return;
  use it for all ordinary content images and retain legacy fallback/imageSizing.
- [x] Verify library/title/Paper identities and strict XML. Update only affected
  Classic/Chalkboard snapshots and prove all changes confined to picture ext/crop.
- [x] Render after with the exact same assets, including a locally generated
  landscape photo-like scene. Inspect paired before/after browser/LibreOffice sheet.
- [x] Write ADR0028, Done table and verification report; restore temporary harness,
  remove capture tests and prove all changed ZIP entries and XML scope.
- [x] Independent review; Node22 typecheck/lint/full tests/build; scoped local commit.

Ruling: Original Phase1 short/dense archives do not contain ordinary pictures, so preserve them exactly and add 24 ordinary companion packages plus six library companions. The generalized helper returns false only for failed/missing dimensions, letting the existing caller retain imageSizing solely for fallback.
