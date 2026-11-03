# Export integrity implementation plan

**Goal:** Keep teacher text and picture attribution intact while producing valid, compressed PowerPoint files.
**Architecture:** Sanitize XML-illegal text at the PPTX generator boundary; share conservative formula parsing between preview and exports; preserve transparency in browser compression and report omitted pictures through the existing export hook.
**Spec:** User attachment “export integrity fix”, and docs/code-review-2026-10-26.md items X1, X2, E1–E5, E7.

## Constraints
- Branch fix/export-integrity from main 1ee7d7d; commit the supplied review document; no push or merge.
- Preserve layout, schema, preview styling, image generation, and non-alt-text uncompressed fixture bytes.
- No dependencies; existing tests stay unchanged except documented picture descr snapshots or proven formula defects.

## Tasks
- [x] Parser: add regression table, generated no-loss cases, Unicode fallback and component regression; observe failures, fix whole-token chemistry and bounded markup parsing, run focused tests.
- [x] Client: add transparency/fallback and omission tests; preserve PNG alpha, strip omitted credits, surface dismissible notice, map platform payload errors; run export/component tests.
- [x] PPTX: add strict hostile XML, credits, alt-text and compression tests; sanitize every boundary string, truncate visible credits to 160 code points, add picture descriptions and compression; run generator tests.
- [x] Evidence: compare every uncompressed ZIP entry against main for Phase 1/ordinary-picture fixtures in each look, render credit/control decks with LibreOffice, inspect real browser notice and transparent picture.
- [x] Finish: ADR/review/roadmap/evidence docs, Node 22 and current Node typecheck/lint/tests/build, independent branch review, commit locally.

## Review focus
Whitespace-only strings; formula-like identifiers and emails; unavailable canvas pixel reads; mixed decode/budget omissions; multicodepoint credit text; XML relationships and notes; preservation of ZIP order/content types.

## Decisions and progress
- Existing clean checkout is reused on requested branch; only supplied review doc was untracked.
- Implement independent parser/client work in parallel under dispatching-parallel-agents; generator and verification remain with primary agent.
- Proceed under the user's complete BUILD/VERIFY instructions without a redundant plan approval pause.

- Review: whole-token chemistry and underscore email cases fixed with RED/GREEN regressions; final independent review clean.
- Verification ruling: multipart upload test fixture gains exact Content-Length after main reproduces Node26 stream cancellation artifact; all assertions and production upload code preserved.
- Evidence ruling: strict original fixture byte comparison cannot pass alongside required H_2O fix; retained explicit false result and added controlled current-parser comparisons.

- Final Node22 full suite: 165 files / 1,699 tests passed; typecheck, lint and production build pass. Node26 final gates recorded in verification report.
