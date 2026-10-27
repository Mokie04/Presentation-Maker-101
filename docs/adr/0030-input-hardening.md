# ADR 0030: Input hardening and bounded provider work

Date: 2026-10-27
Status: Accepted locally; PR and release pending

## Context

The review identified reachable validation and document-inflation memory exhaustion,
PDF CPU exposure, provider retries that could exceed the function lifetime, a single
large image batch response, and missing route/browser safeguards. Request byte caps
alone did not bound expanded files, validation work or upstream waiting time.

## Decision

### Dependencies and validation

Upgrade Zod from 4.6.5 to ^4.6.7 and refresh transitive Undici to 8.12.3. Zod now
rejects the existing 200-slide export bound before constructing issues for every
invalid child. Preserve Next, React, image-size, the export schemas and the PNG/JPEG
wire-signature check. An isolated 4.2 MB invalid-array fixture exhausted a 256 MB
heap before the upgrade; both patched routes return sanitized 400 responses in
about 134 ms with about 98 MB heap growth. These are local measurements, not a
production capacity guarantee.

### Document and lesson bounds

`src/lib/parsers/document-parser.ts` rejects DOCX archives over 2,000 entries,
10 MiB per expanded entry or 20 MiB total expanded data. Check central-directory
records before JSZip deduplicates names. Inspect the same last ZIP end record
selected by JSZip and reject ambiguous/trailing archive layouts; otherwise two
parsers could validate different directories. Count native zlib output in 16 KiB chunks
and stop at the actual byte cap, including entries whose sizes are falsified or
zero. JSZip/pako can synchronously inflate beyond a paused consumer, so its stream
alone is not the enforcement boundary. Only after every raw stream and declared
size is verified, read through JSZip and rebuild STORE data for mammoth. This
bounded extra pass avoids giving mammoth the unchecked uploaded archive. Reject
ZIP64/multidisk archives: capped classroom documents do not require those formats.

PDF input receives a cheap page-object scan and a 200-page limit, pdf-parse's max
option, and an actual reported page-count check. **No hard worker timeout is
implemented.** The current pdf-parse dynamic pdf.js requires do not provide a
reliable worker asset through the Next bundle. Compressed/hidden page objects and
malformed PDFs can still consume CPU before parsing returns. A separately bundled
and traced worker or replacement parser remains a follow-up; the page scan is a
mitigation, not a CPU sandbox, and may conservatively reject false page matches.

`src/lib/lesson-limits.ts` defines the product default of **250,000 characters**
(JavaScript string length). Apply it to extracted text for all four upload formats
and directly pasted text at the generate schema. Do not silently truncate a lesson.
Limit failures return friendly 400 responses. Existing malformed/no-text parsing
errors retain their existing 422 behavior; the review's claim that all parser
errors already mapped to 400 did not match the source.

### Text attempts, deadlines and cancellation

The text SDK and every request disable hidden retries. Allow two explicit retries
by default; retain injected client, maxRetries and backoffDelays options. Each
attempt receives min(150 seconds, time remaining minus a five-second response
reserve) inside a 270-second overall budget. Do not start another attempt with
less than one second available. Bound even an injected transport that ignores
cancellation with an abort/race and clean up timers/listeners.

Retry connection/timeouts, HTTP 408/409/429/5xx, empty content, invalid JSON and
schema failures. Configuration 4xx and unknown programming errors (including bare TypeError)
fail immediately; SDK APIConnectionError wraps actual network failures;
TextOutputTruncatedError still bypasses retries and maps to 422. Default backoffs
are one and two seconds with 0–10% jitter. Honor numeric/date Retry-After on 429,
capped at ten seconds. Explicit injected backoffs remain exact. The generate route
forwards request.signal so disconnect cancellation reaches the upstream attempt.
The request lifetime remains 300 seconds, leaving time for a sanitized response.

### Automatic pictures

The client calls the existing individual image route only for parts accepted by
partWantsAutoImage with a non-blank description, using variation zero. A shared
queue caps automatic requests at three across all sessions. One controller belongs
to each loaded deck; reset/unmount abort all, and replacing a session aborts its
old load. Switching sessions preserves the other session's work. Deleted/stale
queued requests are skipped. Existing image tokens route each single-result
batchImagesResolved action to its owning deck and ignore stale versions.

Expose loading/done/failed counts and one small workspace-header status. Successful
completion hides it; failures remain visible until recovery, deletion or reset so
the teacher can act. This is the deliberate interpretation of “disappears when
finished.” Manual regeneration keeps its direct flow and becomes lifecycle-
cancelable; it is outside the automatic queue's cap. Retain the batch server route
for compatibility, but the browser no longer calls it.

Disable hidden image-SDK retries and fail all image 4xx except 429 without retry.
IMAGE_PROVIDER_SIZE is optional and validated for known models. Preserve landscape
intent: DALL-E 3 defaults to 1792x1024, gpt-image models to 1536x1024; their square
and portrait alternatives are accepted. Other compatible models retain 1024x576.
In auto mode skip AI immediately when its key is the not-configured placeholder;
a configured Pexels key selects the stock fallback. Provider image quality/format
behavior beyond this size policy has not been live-provider verified.

### Smaller hardening

`src/lib/providers/download-provider-image.ts` uses boundedFetch for a ten-second
headers/body deadline, three MiB byte limit, image MIME check and rejected redirects.
Pexels downloads permit only HTTPS images.pexels.com. OpenAI URL fallback permits
exact known oaidalleapiprodscus.blob.core.windows.net and files.oaiusercontent.com
hosts plus the configured public HTTPS provider hostname, without credentials or
custom ports. Reject local/IP provider hosts; no wildcard Azure allowance. Unknown
asset/CDN hosts from compatible providers now fail closed and may require an
explicit reviewed policy update. Base64 API results are unchanged.

Sanitize only legacy subject values: remove controls, quotes and newlines, trim,
and limit to 100 characters. Teacher-supplied provenance remains unchanged. Bound
each export filename slug to 80 characters, the explicit filename exception to
this task's export exclusion. Normal short names and casing remain unchanged.

Authenticated routes use no-store for success and error responses. Next response
headers add nosniff and strict-origin-when-cross-origin referrer policy. After
authentication, defineRoute rejects browser-marked cross-site mutating requests
with 403 and requires application/json for JSON-mode mutations (415 otherwise).
Reject before reading bodies. Multipart uploads retain their parse mode. The GET
session handoff flow is unchanged. Missing Sec-Fetch-Site remains allowed for
non-browser clients; this is not an origin allowlist or replacement for auth.
Ignore all .env* files except the example.

### Config and CI

Typecheck .mts config files and remove the unsupported environmentMatchGlobs
option. Component tests already declare their own jsdom environment. The existing
Node 22 verify job adds a production build after tests without provider secrets.
A separate audit job reports production advisories; its audit step is advisory (step-level continue-on-error plus a warning annotation), so the job stays green instead of showing a red check on every pull request. Declare
Node `>=22.12 <25`, supporting majors 22 and 24, and .nvmrc 22; some test
dependencies require a newer Node 22 patch. The upper bound prevents selecting
unsupported newer majors while the legacy PDF parser remains in use.

Route files own literal maxDuration values. Give session 10 seconds, health 30,
upload 60 and Markdown download 30; retain existing values elsewhere. Remove the
competing vercel.json functions override so runtime policy has one source rather
than relying on uncertain precedence between two declarations.

## Explicit exclusions and remaining decisions

No rate limiting/quotas or shared handoff-token replay store (S4/S6) are added.
Next/React/image-size upgrades remain separate. No X-Frame-Options or
frame-ancestors is introduced: the product owner must decide permitted embedding
origins before restricting the App Store's iframe. PDF hard CPU cancellation is
still open as described above. N1 records another remaining PDF limitation:
pdf-parse 1.1.4 bundles pdf.js 1.10.100, which fails on Node 26 for real PDFs
(including 'bad XRef entry'); the reported LibreOffice PDF works on Node 22 and
24. The integration fixture's existing Buffer-pool workaround needs more than
32 KiB on Node 24. That padded fixture also parses on Node 26, so the failure
is not universal. This does not resolve legacy Buffer handling. PDF parsing is
not supported on Node 25 and later; the engine upper bound is a mitigation, not
a parser fix. Replace pdf-parse with a maintained parser in a separate task.
The real-PDF integration test skips only on Node 25+, with a named reason; a
separate guard regression keeps it active on supported versions.
No export/PPTX implementation, look, fitting,
image-generation prompt or broader UI sweep is included.

## Evidence

`docs/input-hardening-verification.md` records before/after measurements, timer
scenarios, browser lifecycle checks, clean-environment build/header output, every
existing test edited, local commits A–H, final gates and deviations. Large artifacts
remain outside the repository. Tests generate hostile documents in memory.
