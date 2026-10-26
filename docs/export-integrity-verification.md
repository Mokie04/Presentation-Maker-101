# Export integrity verification — 2026-10-26

Local evidence for `fix/export-integrity`, baseline `main` commit `1ee7d7d`.
No image providers, deployment, push or merge were used. Native evidence
uses installed LibreOffice; browser evidence uses real Chromium around the
production `useSlideDeck`, `useDeckExport`, `PresentationWorkspaceView` and
`SlideView`, with local deterministic API responses.

## Reproduction

The reproducible harness is `scripts/verify-export-integrity.mjs`. It uses an
isolated `git archive` baseline outside the checkout, symlinks the existing
`node_modules`, freezes `Date` at `2026-10-26T00:00:00Z`, and installs nothing.
Pass an output directory outside the repository. Existing LibreOffice, Poppler,
Playwright and Chromium are required. `EXPORT_BASELINE`, `SOFFICE`,
`PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` can select existing local tools.

Executed with Node 22.23.4:

```sh
PLAYWRIGHT_MODULE=/Users/johnnavarro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright \
CHROMIUM_EXECUTABLE=/Users/johnnavarro/Library/Caches/ms-playwright/chromium-1169/chrome-mac/Chromium.app/Contents/MacOS/Chromium \
/Users/johnnavarro/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node \
  scripts/verify-export-integrity.mjs \
  /Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity
```

All large artifacts are in that output directory, referred to below as
`EVIDENCE`.

Local artifacts: [per-entry comparison](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/per-entry-comparison.json),
[controlled Phase 1 comparison](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/controlled-phase1-comparison.json),
[Chalkboard credit render](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/chalkboard-long-credit/slide-2.png),
[control-character PDF](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/control-characters/control-characters.pdf),
[browser notice](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/browser-notice.png),
[exported transparent PNG](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/exported-transparent-picture.png),
[browser checks](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/browser-verification.json),
[summary](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/summary.json).

The source fixture inputs are saved in `fixture-inputs.json`.
They match the original Phase 1 capture's short/dense/Commons decks and the
picture-cover capture's wide/tall/square/box PNG/JPEG companions. Each runs
through all three registered looks. The dense fixture is generated once with
the baseline `autoFitDeck` and shared unchanged by both generators.

## ZIP entry comparison

The requested strict original-main comparison is **not fully satisfied**:
30 of 33 archives differ beyond picture `descr` attributes. The expected
formula fix changes `H_2O`: main subscripts the entire `2O`, while this branch
subscripts `2` and leaves `O` on the baseline. The original fixture title
`Observe H_2O` occurs on these affected slides. The three dense decks pass the
strict comparison. This is a deliberate parser correction, not compression.

`per-entry-comparison.json` contains all 1,494 entry names, sizes, before/after
SHA-256 hashes and individual statuses. Only picture `descr` attributes inside
`p:pic` are masked; text runs, geometry, other attributes and metadata are not
normalized. Every archive preserves entry names/order and `[Content_Types].xml`.
The failed strict status remains explicit in `summary.json`.

A separate controlled comparison substitutes only the current parser into the
ephemeral main source, then restores it. `controlled-phase1-comparison.json`
compares the same 33 archives/1,494 entries and isolates generator behavior.
`snapshot-generator-comparison.json` adds 12 archives/576 entries: every
`slide-layout-cases` fixture and `lookFixtureDeck` in all three looks. These
controlled comparisons permit only picture `descr` differences. They do not
claim the original-main comparison passed.

## Compression

All three 200-slide text decks are below 1.5 MB. Each compressed archive is
compared with a freshly generated uncompressed build using the same final
hyperlink-color normalization. All 2,505 uncompressed ZIP entries are identical;
entry order and `[Content_Types].xml` are preserved. Full hashes are in
`compression-200-slides.json`.

| Look | STORE bytes | Export bytes |
|---|---:|---:|
| Sayuna Classic | 1,698,431 | 533,281 |
| Chalkboard | 2,163,155 | 612,491 |
| Paper Notebook | 3,565,765 | 634,196 |

PptxGenJS 4.0.1 ignores `compression: true` with explicit `nodebuffer` output.
The generator therefore applies JSZip DEFLATE to every look, including Classic.
LibreOffice also opens the compressed short fixture in all three looks; see
`native-open-all-looks.json` and the `open-*` PDF folders.

## Formula output

`formula-reproduction.json` records 32 cases before and after with actual
`FormattedFormula` HTML, preview text, exported PPTX title text, Markdown text,
and segment flags. `formula-reproduction.md` is the readable table. It covers
the required chemical, identifier, currency, script, radical and equation
examples. `docs/export-integrity-formulas.md` contains the focused parser
verification and its invariant exception for required radical/arrow
normalization.

## LibreOffice rendering

`chalkboard-long-credit/` contains the actual PPTX, PDF, rendered PNGs and
extracted PDF text for a 300-character creator string. Visual inspection of
`slide-2.png` confirms the visible credit remains one line within the inner
Chalkboard frame. `credit-verification.json` proves the visible line has exactly
160 Unicode code points ending in an ellipsis, the full creator remains in
notes and the source hyperlink is preserved.

`control-characters/` contains the corresponding two-slide VT/FF deck and
rendered artifacts. Extracted PDF text retains `AfterVTTitle`, `AfterFFTitle`,
`AfterVTBullet`, `AfterFFBullet`, `AfterVTBody`, `AfterFFBody`, and the complete
second-slide title. Writer text after both controls is also present. This
checks actual renderer continuation after the illegal input characters.

LibreOffice evidence does not establish native Microsoft PowerPoint behavior.

## Real browser export

`browser-notice.png` captures the production workspace displaying:

> 1 picture was left out of the PowerPoint (slide 3).

The actual compressor cannot decode the deliberately oversized broken image,
the export hook surfaces the omission, the dismiss button removes the notice,
and the posted request removes the omitted image's credit metadata. The other
picture is created in a real canvas with transparency and exported through the
actual compressor and hook. The local PPTX endpoint uses the real generator.

`browser-export.pptx` and `exported-transparent-picture.png` are the actual
download and its extracted picture. Chromium decodes the embedded 64×64 PNG;
the corner is RGBA `[0,0,0,0]`, and the center is `[255,0,0,255]`. Alpha is
preserved, preventing the opaque black JPEG background. The browser reports
zero page errors. Details and request payload are in `browser-verification.json`
and `browser-request.json`.

The existing preview **does overflow** at this credit length:
`browser-long-credit.png` shows the second line crossing the Chalkboard bottom
frame. This phase changes PPTX credit length only; the preview is unchanged as
requested.

## Repository gates and assertion exceptions

Final checks use Node 22.23.4 and Node 26.3.0 with two Vitest workers. Commands:

- Typecheck: tsc --noEmit.
- Lint: next lint --dir src --dir tests.
- Full tests: vitest run --maxWorkers=2.
- Production build: next build.
- Whitespace: git diff --check.

Initial export-integrity results at commit 23d1493:

| Runtime | Typecheck | Lint | Full suite | Production build |
|---|---|---|---|---|
| Node 22.23.4 | exit 0 | no warnings/errors | 165 files / 1,699 tests pass (49.64 s) | exit 0, seven static pages |
| Node 26.3.0 | exit 0 | no warnings/errors | 165 files / 1,699 tests pass (41.91 s) | exit 0, seven static pages |

The docs-paths guard is included in both green full suites. Existing jsdom canvas
unavailable messages remain non-failing; there are no unhandled errors in either
final run. Final logs are saved in EVIDENCE/gates/. Whitespace and the evidence
script's JavaScript syntax check pass.

The Node 26 upload fixture initially produced an unhandled ReadableStream error
on both main and this branch (all five assertions passed). The test-only helper
in `tests/api/upload.test.ts` now serializes FormData once and supplies the exact
Content-Length with the matching multipart Content-Type. Every existing assertion
is unchanged. This fixes the Undici producer cancellation artifact and keeps
production upload code untouched. Independent review verified that separate tests
retain streamed-limit coverage. Baseline and corrected logs are retained.

Existing assertion changes, named explicitly:

- `tests/lib/export/build-export-request.test.ts`, “keeps the empty string
  compress returns for a large image it cannot decode”: dropped indexes change
  from [0] to [1, 0]. This is an exception beyond the two allowed categories:
  BUILD E2 requires the formerly unreported compression omission to be recorded.
  Retaining that assertion would contradict E2.
- `tests/lib/services/pptx-title-formulas.test.ts`, “characterizes title and content
  formula runs in the exported slide XML”: H_2O now subscripts 2 instead of 2O,
  keeps O on the baseline, and updates the affected XML hash. Plain-title hash
  remains unchanged.
- `tests/components/EditableSlideView.test.tsx`, “edits raw title text live and
  restores formulas when finished”: the initial commit made CO_2 literal. The
  underscore-chemistry follow-up restores the original CO_2 subscript assertion;
  see `docs/export-integrity-formulas.md` for the correction and new evidence.

Snapshot changes are limited to corrected H_2O runs, picture descr attributes,
and their dependent hashes. All 13 changed entries are listed below; the full
machine-readable list is EVIDENCE/snapshot-scope.json.


- tests/lib/services/__snapshots__/chalkboard-characterization.test.ts.snap: Chalkboard legacy characterization: long content title with formulas and AI… > preserves the same six legacy cases through both export entry points > slide 2 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/chalkboard-characterization.test.ts.snap: Chalkboard legacy characterization: title with writers and library image > preserves the same six legacy cases through both export entry points > slide 1 1 — picture alt descr.

- tests/lib/services/__snapshots__/chalkboard-characterization.test.ts.snap: pins all six Chalkboard slide XML bytes > slide 2 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/chalkboard-characterization.test.ts.snap: pins all six Chalkboard slide XML bytes > slide 3 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/chalkboard-characterization.test.ts.snap: pins all six Chalkboard slide XML bytes > slide 6 1 — picture alt descr.

- tests/lib/services/__snapshots__/paper-notebook-characterization.test.ts.snap: Paper Notebook legacy characterization: long content title with formulas and AI… > preserves the same six legacy cases through both export entry points > slide 2 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/paper-notebook-characterization.test.ts.snap: Paper Notebook legacy characterization: title with writers and library image > preserves the same six legacy cases through both export entry points > slide 1 1 — picture alt descr.

- tests/lib/services/__snapshots__/paper-notebook-characterization.test.ts.snap: pins all six Paper Notebook slide XML bytes > slide 2 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/paper-notebook-characterization.test.ts.snap: pins all six Paper Notebook slide XML bytes > slide 3 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/paper-notebook-characterization.test.ts.snap: pins all six Paper Notebook slide XML bytes > slide 6 1 — picture alt descr.

- tests/lib/services/__snapshots__/slide-fit-characterization.test.ts.snap: pins fitting title, wide, visual and credited library slide XML 1 — picture alt descr.

- tests/lib/services/__snapshots__/slide-layout-characterization.test.ts.snap: PPTX layout: long content title with formulas and AI… > preserves every slide XML byte through both export entry points > slide 2 1 — bounded H_2O script and/or alt descr.

- tests/lib/services/__snapshots__/slide-layout-characterization.test.ts.snap: PPTX layout: title with writers and library image > preserves every slide XML byte through both export entry points > slide 1 1 — picture alt descr.

## Other choices and follow-ups

- Apply the final DEFLATE pass to Classic too, because the installed SDK ignores
  its compression flag for explicit nodebuffer output.
- Preserve existing arrow/radical conversions as explicit syntax exceptions to
  the ordinary-text identity invariant.
- Use general omission wording because decoding and budget limits both cause
  omissions; preserve the user's dismissible status semantics.
- Keep the strict original-main byte comparison marked false; the requested
  bounded H_2O correction necessarily changes native script runs beyond descr.
  The separate controlled matrix proves generator changes independently.
- Confirmed browser credit overflow remains open under E4's explicit preview
  exclusion. PR/release are pending; this task requests a local commit only.

Independent review found two further ordinary-token/email formatting cases;
both received failing-then-passing regressions and were fixed. Final review
reports no remaining actionable findings.

## Underscore chemistry follow-up verification

One subsequent local commit restores the original CO_2 editing assertion and
whitelisted underscore chemistry. Existing export behavior and snapshots remain
unchanged. See `docs/export-integrity-formulas.md` for the actual 22-case
preview/PPTX/Markdown comparison, unchanged PPTX hash, regression cycles and
optional group-syntax deferral.

Node 22.23.4 and Node 26.3.0 both pass standalone typecheck, lint, the full suite
(166 files / 1,723 tests; 40.51 s and 44.53 s respectively) and production build.
The two 2,000-sample properties pass; independent review is clean. Follow-up
captures and logs are retained under EVIDENCE/underscore-chemistry/.
