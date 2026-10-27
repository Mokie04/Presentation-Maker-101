# Input hardening verification — 2026-10-27

Branch fix/input-hardening from main 9e458d8. Eight local commits A–H; no push,
merge, deployment or live provider calls. Hostile files are built in memory;
no large binary fixtures are committed. The product default is **250,000 lesson
characters**, shared by upload extraction and direct generation validation.

## Diff and commit summary

| Section | Commit | Result |
|---|---|---|
| A | f796f0f | Zod 4.6.7, Undici 8.12.3, resource-bounded invalid-array route regression |
| B | eace0c5 | DOCX declared/actual inflation bounds, PDF page precheck, shared lesson cap |
| C | 01915e0 | Bounded text attempts/deadline, selective retries, cancellation wiring |
| D | 7437776 | Per-slide image queue, shared concurrency 3, lifecycle/status, image config/retries |
| E | 1061ee3 | Trusted bounded image downloads, CSRF/content type, headers/cache, subject/filename caps |
| F | bee27b0 | Build CI, advisory audit, Node floor, typed config and route-owned durations |
| G | 2fd4bce | ADR, limits/architecture/readme/review bookkeeping |
| H | This final commit | Review corrections, remaining fixture migrations and final evidence/gates |

Production changes are limited to the requested input/provider/deck/route/config
paths and the explicit filename exception. PPTX, Markdown generators, formula
parsing, looks, fitting and export snapshots are unchanged.

## Evidence location

Local artifact root:

    /Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening

The root is called EVIDENCE below. It contains isolated array probes, raw logs,
clean build source/output, header captures and real Chromium screenshots/report.
All probes use local fixtures/stubs; measurements describe this machine only.

## Before/after reproductions

| Fixture | Before | After |
|---|---|---|
| PPTX POST: 4,199,792 B, 1,399,900 empty slide objects | Child exhausted its 256 MiB heap, SIGABRT after 4.77 s including import/startup | Sanitized 400; handler 134.12 ms; heap growth 98,625,904 B |
| Markdown POST: identical body | Child exhausted its 256 MiB heap, SIGABRT after 1.61 s including import/startup | Sanitized 400; handler 134.37 ms; heap growth 98,312,504 B |
| DOCX: 17,157 B compressed, 11,534,487 B XML (~672:1) | Mammoth accepted 11,534,343 text chars; 74.05 ms; heap +13,002,184 B | Declared-size 400 before mammoth; 0.97 ms; heap +65,888 B |
| Same DOCX, local/central sizes falsified to 1 | Original path had no application inflation counter | Native byte cap rejects in 15.74 ms before mammoth |
| Same DOCX, sizes falsified to 0 | JSZip normalizes zero-size entries; original path had no byte counter | Original compressed stream still verified and rejected in 10.12 ms |
| Identical PDF: 2,424,453 B, 20,000 empty pages | 19,506.86 ms; heap +89,593,464 B; RSS +25,657,344 B | 400 page precheck in 0.66 ms; heap +74,016 B |

The unsafe array baseline runs in a separate 256 MiB heap-capped process to protect
the host. Its times are wall times to failure, not completed handler times. The
patched handler times exclude module loading. Heap figures are end-minus-start,
not peak RSS; GC can make individual DOCX stream-test deltas negative. New route
regressions allow <2 s and <256 MiB heap growth; DOCX rejections allow generous
<2 s/<32 MiB growth, and the PDF precheck <500 ms. Normal DOCX/PDF/TXT/MD and a
200,000-character legitimate lesson still work; exactly 250,000 direct characters
are retained and 250,001 reject before calling the provider.

Reproductions and metrics are in EVIDENCE/array-before.json, array-after.json,
logs/input-hardening-B.md and the corresponding before/after logs. Tests generate
the malicious archives/pages in memory.

### Review correction: ZIP parser agreement

A read-only review exposed a second DOCX problem in the initial B implementation:
the bounded inspector and JSZip could select different ZIP end records. A tiny
composite archive could therefore validate a harmless outer directory and inflate
unchecked hidden XML. The final inspector selects the same last EOCD signature
as JSZip, requires its exact header/comment extent, and checks disk-entry counts.
Ambiguous/trailing layouts reject before JSZip.loadAsync. The 11,684-byte review
fixture now rejects in about 0.385 ms. A RED regression first reproduced the late
lesson-cap failure, then asserts JSZip is never called. Normal comment/empty-entry
fixtures remain green. See logs/input-hardening-B-eocd-*.log.

## Text-provider fake-timer policy

SDK retries are disabled; defaults are two explicit retries, 150-second attempts,
270-second overall budget with five seconds reserved for the response. Injected
client/maxRetries/backoffDelays remain usable; injected backoffs are exact.
SDK APIConnectionError represents real transport failures. Bare programming
TypeError fails immediately; it is not treated as a generic network failure.

| Scenario | Calls | Elapsed ms | Outcome |
|---|---:|---:|---|
| HTTP 400/401/403/404/422 | 1 | 0 | Fail fast |
| HTTP 408/409/429/500/503 then success | 2 | 1,000 | Valid slides |
| 429, Retry-After 3 seconds | 2 | 3,000 | Honor header |
| 429, Retry-After 1,000 seconds | 2 | 10,000 | Cap header delay |
| 429, HTTP-date four seconds ahead | 2 | 4,000 | Honor date |
| Default connection failures | 3 | 3,000 | Final error |
| Default jitter fixed to 5% | 3 | 3,150 | Small jitter |
| Explicit five retries / backoff [10] | 6 | 90 | Injection retained |
| First attempt hangs, next succeeds | 2 | 151,000 | Recovery; late rejection handled |
| Both attempts hang | 2 | 265,000 | Abort both; second timeout shrinks to 114,000 ms |
| Explicit 20 retries / 100,000 ms delays | 3 | 200,000 | Reject next retry before exceeding budget |
| Abort before call / during call / during backoff | 0 / 1 / 1 | 0 / 100 / 100 | No subsequent work; timers cleared |
| Unknown Error or bare programming TypeError | 1 | 0 | Fail fast |

Truncated model output still gets one attempt and the existing sanitized 422.
The route forwards request.signal; dedicated route and provider tests verify
propagation/cancellation. Raw RED/GREEN logs and scenario assertions are retained.

## Browser checks

The reusable harness is scripts/verify-input-images.mjs, run with existing local
Playwright/Chromium and Node 22. It renders the actual production Home, deck hook,
workspace and slide components through Vite with stubbed API responses and small
Next font/image wrappers. This proves local client flow, not live providers,
Next routing, deployment or classroom image quality. Images are tiny valid PNGs.

EVIDENCE/browser/report.json and screenshots record:

- Five eligible pictures: three initial requests, maximum shared concurrency three,
  variation zero, with “Adding pictures... 0 of 5”. Title Page and blank visuals
  are not requested.
- Four successes and one 500: actionable failure status, preserved lesson content.
- Start over with three in flight: three abort events, zero queued requests started
  afterward, zero late images/decks after held responses were resolved.
- A fresh text-only deck: zero picture calls and no picture status.
- Queued fourth slide becomes ineligible, is skipped, then returns to Discussion:
  three total requests and no permanent loading status.
- Normal generation retains all six slides, subject, lesson submission and content.
  Automatic request fields remain description/index/variation only, matching main.
- No browser page errors. Hook tests also cover cross-session/replacement/deletion
  routing, a shared cap across overlapping loads, unmount and abort-ignoring mocks.

The review's claim that old browser requests included titles was rejected after
checking main's loadPresentation: it omitted title. The temporary uncommitted
addition was removed so generic-description Pexels queries remain unchanged.

## Clean production build and headers

Create a git-archive source tree outside the checkout, overlay final tracked
corrections, and symlink the existing installed dependencies. No runtime .env files
are copied; .env.example is never loaded. Build under an empty environment:

```sh
env -i PATH=/path/to/node22/bin:/usr/bin:/bin NEXT_TELEMETRY_DISABLED=1   /path/to/node22/bin/node node_modules/next/dist/bin/next build
```

The build exits 0 with seven static pages and no provider environment variables.
EVIDENCE/clean-source-runtime-comparison.json records all 147 source/config hashes,
identical to the final working tree. EVIDENCE/clean-build22.log is the raw build.

Start that production build with only a local verification auth secret (no
provider keys), then run curl --head against / and /api/health. The page returns
200; the protected API returns 401 without making a paid provider call. Both show:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

The API also shows `cache-control: no-store`. Raw headers are saved in
EVIDENCE/headers-home.txt and headers-api.txt. Authentication success/live-provider
health is not claimed. The temporary local server is stopped after verification.

## Final Node 22 gates

Node 22.23.4:

- Standalone tsc --noEmit: exit 0, including .mts config.
- next lint --dir src --dir tests: no warnings/errors.
- Full vitest run --maxWorkers=2: **177 files / 1,854 tests pass**, 39.52 seconds.
- Clean-environment next build: exit 0; all runtime source/config bytes match.
- git diff --check: pass. Docs-paths guard is included in the green full suite.

Existing jsdom canvas-unavailable diagnostics remain non-failing; no unhandled
errors occur in the final run. The first all-section run found 26 failures in six
old fixture files (missing JSON Content-Type or obsolete batch expectations).
Those were corrected without weakening content/credit/theme assertions, and the
complete suite was rerun green. Final and intermediate logs are retained.

Production dependency audit is advisory and currently exits nonzero: three high
and one critical finding across Next, postcss, image-size and pptxgenjs. Requested
Zod/Undici fixes are applied. The user explicitly excluded the major framework and
image-size upgrades; the PNG/JPEG signature guard remains intact. No audit fix
--force or unrelated upgrade was run. CI's separate continue-on-error audit job
prints that summary without blocking verify.

## Deliberate choices and remaining limits

- PDF page/text limits do **not** provide the optional hard worker timeout. The
  current dynamic pdf.js bundle needs separately packaged/traced worker assets;
  malformed or compressed-page PDFs can still use CPU before parsing returns.
- DOCX rejects ZIP64, multidisk and ambiguous/trailing ZIP layouts. Native byte
  accounting plus a bounded JSZip reread/STORE reconstruction avoids pako's
  synchronous inflation bursts and undocumented JSZip metadata.
- New limit errors are 400; existing malformed/no-text parser errors remain 422,
  correcting the prompt's mistaken description of current route behavior.
- The text default is two retries; injections remain compatible. Bare programming
  TypeError fails fast, while SDK-wrapped connection errors retry.
- Image failure status persists until recovery/removal/reset; only successful
  completion hides it. Manual regeneration retains its direct flow, with lifecycle
  cancellation, outside the automatic queue cap.
- Model-aware landscape defaults are DALL-E 3 1792x1024 / gpt-image 1536x1024; other
  models retain 1024x576. API quality/format compatibility beyond requested size
  rules is not live-provider tested.
- Hosted image downloads accept exact trusted hosts; a compatible provider using
  a different CDN requires an explicit policy update. No Azure wildcard is used.
- Filename cap applies to each topic/session slug, the explicit export exception.
- S4 rate limits/quotas and S6 replay storage remain open. Next/React/image-size
  upgrades and embedding-origin/frame-ancestors policy remain separate decisions.
- Final review corrections are included in H rather than rewriting prior commits.
  An independent reviewer identified the ZIP/progress issues; a subsequent review
  agent was stopped by its service's cybersecurity filter. No clean follow-on
  independent-review approval is claimed; the final corrections were checked by
  focused regressions, primary source review and the complete gates above.

## Existing test files edited and why

The following inventory is against main 9e458d8. New regression suites/helpers are
not listed as edits to existing tests. No export snapshots or generated output
assertions changed.

| Existing file | Reason |
|---|---|
| tests/api/commons-by-sa-select.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/commons-images.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/download-markdown.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/download-pptx.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/generate-auto-fit.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/generate-subject-provenance.test.ts | JSON header plus forwarded-signal assertion; provenance values unchanged. |
| tests/api/generate-truncation.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/generate.test.ts | Assert forwarded request signal in provider call; content assertions unchanged. |
| tests/api/input-validation.test.ts | Replace old 2 MB accepted lesson with product-cap 400/no-provider assertion; assert forwarded signal. |
| tests/api/look-export.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/nasa-images.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/api/upload-errors.test.ts | Add friendly 400 shared lesson-limit case; retain existing malformed/no-text 422. |
| tests/components/EditOnSlide.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/ExportNotice.test.tsx | Individual automatic-image responses preserve omission/export-notice assertions. |
| tests/components/GenerationTruncation.test.tsx | No-picture-request check targets individual endpoint after truncated generation. |
| tests/components/LookPropagation.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/NasaPicker.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/NormalView.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/PresentationWorkspace.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/SessionDecks.test.tsx | Individual-endpoint mocks; blank visuals correctly mean zero calls, retaining independent-deck/export assertions. |
| tests/components/SlideFitIntegration.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/SlideSplitIntegration.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/Sorter.test.tsx | Individual mocks/status disambiguation; remove impossible automatic Title Page image fixture, retain reorder/index checks. |
| tests/components/SubjectProvenance.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/TouchWorkspace.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/components/WorkspaceAccessibility.test.tsx | Migrate automatic/deferred fixtures from batch to individual responses; disambiguate picture vs position status where needed; preserve existing behavior checks. |
| tests/lib/api/define-route.test.ts | Add JSON header to streamed-JSON helper so parsing/body-cap assertions remain reachable. |
| tests/lib/deck/blank-visual-batch.test.tsx | Assert individual calls at original indexes 1/3, variation 0; reverse result order and verify intermediate/final ownership. |
| tests/lib/deck/look-state.test.tsx | Blank-visual fixtures now correctly make zero automatic calls; retain look persistence/session/no-generation checks. |
| tests/lib/deck/session-decks-routing.test.tsx | Group individual deferred responses by load; retain replacement/session/regen routing; omitted eligible response now explicit failed sentinel. |
| tests/lib/deck/use-slide-deck-insertion.test.tsx | Migrate individual image response fixtures while preserving stable-ID edit/move/insert ownership assertions. |
| tests/lib/deck/use-slide-deck-operations.test.tsx | Migrate individual image response fixtures while preserving stable-ID edit/move/insert ownership assertions. |
| tests/lib/deck/use-slide-deck.test.tsx | Individual request fixtures and visible failure/sentinel assertions; separate variation-zero automatic calls from manual regeneration. |
| tests/lib/deck/use-slide-split.test.tsx | Resolve captured individual deferred calls; preserve split/regeneration identity; missing eligible picture now failed. |
| tests/lib/env.test.ts | Include model-derived size in config expectations. |
| tests/lib/export/export-characterization.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/lib/export/filename.test.ts | Long topic expectation changes from 300 to 80 characters, preserving ordinary naming assertions. |
| tests/lib/parsers/document-parser.test.ts | Use tiny valid ZIP instead of fake DOCX bytes; allow verified STORE buffer; assert pdf max/page/text limits. |
| tests/lib/providers/image-provider-characterization.test.ts | Include compatible custom-model size/placeholder skip; trusted URL and real MIME-bearing Response mocks for bounded downloads. |
| tests/lib/providers/image-provider.test.ts | Correct DALL-E landscape size; real MIME-bearing image Response mocks for bounded downloads. |
| tests/lib/providers/image/contract.test.ts | Assert accepted DALL-E size and hidden SDK retries disabled. |
| tests/lib/providers/pexels-provider.test.ts | Replace arrayBuffer-only mocks with real image/jpeg Responses for bounded streaming. |
| tests/lib/providers/text-provider-truncation.test.ts | Assert zero remaining timers instead of no timer creation: attempt deadline timers are required; still one truncated call/no retry. |
| tests/lib/providers/text-provider.test.ts | Assert request timeout/signal options; use typed temporary HTTP errors; change default retry exhaustion 6 calls to 3. Explicit injected backoffs retained. |
| tests/lib/services/commons-credits.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/lib/services/nasa-credits.test.ts | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |
| tests/lib/themes/new-looks.test.tsx | Add JSON Content-Type to request fixtures only; all prior behavior/output assertions unchanged. |

Detailed per-section RED/GREEN commands, test names and measurement notes are retained under EVIDENCE/logs/input-hardening-B.md, C.md, D.md and E.md.

Local artifacts: [array comparison](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening/array-after.json), [browser report](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening/browser/report.json), [loading screenshot](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening/browser/loading.png), [partial failure screenshot](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening/browser/partial-failure.png), [API headers](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening/headers-api.txt), [clean build log](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/input-hardening/clean-build22.log).
