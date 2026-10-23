# 0004 — Slide image wire value and export payload

Date: 2026-10
Status: Accepted

## Context

The UI needs to carry generated or selected images into PPTX without overrunning the export body cap or crediting omitted images.

## Decision

`src/lib/slide-image.ts` defines usable image values and the legacy `'failed'` wire sentinel. `buildPptxExportRequest` in `src/lib/export/build-export-request.ts` compresses usable images, then drops images from the last slide backward until the request fits `CLIENT_EXPORT_BUDGET_CHARS` (3.5 MiB of JSON characters). Dropping an image also removes its metadata credit from that request.

## Consequences

`src/app/api/download-pptx/route.ts` validates image formats and caps the request with `MAX_EXPORT_BODY_BYTES` (4,500,000 bytes). If text alone is too large, the server can still return 413. `tests/lib/export/build-export-request.test.ts` covers budgeting and credit coupling.

## Alternatives considered

Sending every original image regardless of size was rejected. The earlier intent to remove `'failed'` entirely was not completed; current wire compatibility keeps it. See `docs/architecture-roadmap.md` (item 3).
