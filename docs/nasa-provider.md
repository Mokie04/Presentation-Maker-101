# NASA provider: manual selection

Added 2026-10-12. Manual NASA selection is implemented locally for individual slides.
Automatic generation remains AI → Pexels for every subject; there is no automatic
NASA routing, subject gate, pilot-topic derivation, or candidate ranking. No deployment
was performed.

## Contract

`src/lib/providers/nasa-provider.ts` exposes two server-side functions:

- `searchNasaImages(query, { fetchFn? })`: caller supplies explicit search terms.
  Requests `/search` with `media_type=image` and `page_size=5`; returns at most
  five candidates. Does not broaden queries, paginate, download, or select a result.
- `fetchNasaImageBase64(nasaId, { fetchFn? })`: caller explicitly selects an ID.
  Fetches `/asset/{nasa_id}` and downloads a JPEG/PNG rendition in preference order
  large → medium → original. Returns base64, MIME type, selected rendition,
  NASA ID, and the actual download URL. Thumbnail/small-only manifests fail.

Candidates retain available title, description, preview URL, asset collection URL,
publishing center, photographer, and secondary creator. Missing fields remain
undefined. Center is provenance, not a credit. No attribution or usage permission
is inferred. Search `sourceUrl` is NASA's collection URL; download `sourceUrl` is
its selected image URL. Descriptions are untrusted text, not safe HTML.

An empty search returns `[]`. HTTP/network errors, malformed JSON/shapes,
untrusted URLs, unsupported renditions/content types, empty downloads, timeouts,
and oversized responses throw errors; none are converted into no-results.
No retries or provider fallback are performed inside this module.

Each request has a 10-second deadline covering headers and body. Retrieval uses
at most two requests. JSON is capped at 1 MiB and image bodies at 10 MiB, including
streamed responses without Content-Length. Absolute HTTP or HTTPS asset URLs are
accepted only when their parsed hostname is exactly `images-assets.nasa.gov`, with
no credentials or nonstandard port (default HTTP 80 / HTTPS 443 are accepted). After
validation, URLs are canonicalized to HTTPS, preserving their path and query. This
also applies to search preview/source URLs. Relative URLs, lookalike hosts, and
other schemes are rejected. No HTTP request is issued.
Redirects are rejected on both API and asset requests. No API key or new dependency
is required. Browser execution is rejected; this module must remain server-side.

## Documentation verified

NASA's [official Image and Video Library API PDF](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf)
was reviewed on 2026-10-12 (published release v1.22.0, 2023-01-06). It documents
unauthenticated search, `media_type`, `page_size`, Collection+JSON results, credit
search fields, and the asset manifest endpoint. This integration does not use
NASA's separate api.nasa.gov API-key services. Initial implementation and all automated tests used mocked HTTP. Subsequent
authorized live evaluations are recorded in [nasa-provider-evaluation.md](nasa-provider-evaluation.md),
including the 2026-10-12 URL repair and four successful selected-image retrievals.

## Next slice decisions

Future routing must check **both subject and individual slide topic**. Non-science
subjects retain the existing image flow; a Science label alone is insufficient.
There is no subject classifier or automatic candidate selection in this slice.

Selection/relevance review, credit display and usage-policy review, caching, and
routing/fallback policy remain unresolved. Rendition names are a size preference,
not verified pixel dimensions: NASA's API contract does not guarantee dimensions.
This slice does not decode, resize, crop, or assess image content/quality. TIFF and
other unsupported formats, missing suitable renditions, and originals over the
size cap fail explicitly. The four selected assets passed live retrieval after the URL repair; local visual
inspection found a cell-image/description mismatch. Collection-wide compatibility,
automatic suitability, and application/export rendering remain unverified.

## Inactive search-eligibility pilot

`src/lib/utils/nasa-search-eligibility.ts` exposes a provider-free decision for
**may search**, never image approval or selection. Caller contract:

- Supply `subjectEvidence`, a list of `{ subject, source }` claims. Sources are
  `teacher-supplied`, `keyword-detected`, `model-generated`, or `unknown`. Preserve
  all available claims, including disagreements; do not relabel inference as teacher
  input. Only an actual teacher-supplied subject can establish this pilot's subject.
- Supply `slideTopic` separately from visual descriptions or whole-lesson text.
  A missing topic or a cartoon prompt cannot establish a supported lesson topic.
- Missing/empty evidence, blank/unknown/General Study labels, unknown provenance,
  or absence of teacher evidence return `subject-not-established`. Differing
  normalized claims return `subject-conflict`. A consistent established subject
  other than exactly `Science` returns `non-science-subject`.
- Only these complete topic phrases qualify (case-insensitive; whitespace collapsed):
  `solar system distances`, `solar system scale` (also `solar-system`);
  `Earth atmosphere observations`, `Earth's atmosphere observations` (straight or
  curly apostrophe); `plant root observations`, `plant roots observations`, and
  `plant seedling observations` / `plant seedlings observations`.
  Matching uses bounded, anchored phrases, not substrings or a synonym classifier.
  Other wording returns `unsupported-topic`; false negatives are intentional.
- Eligible decisions contain `eligible: true`, `reason: 'supported-pilot-topic'`,
  and `pilotTopic`: `solar-system-scale`, `earth-atmosphere-observations`, or
  `plant-root-seedling-observations`. Ineligible decisions contain only
  `eligible: false` and the reason. Subject checks precede topic checks.

Current provenance flow (2026-10-12): the optional Subject control beside Session
starts at `Automatic` and offers the detector's existing labels: Science,
Mathematics, Social Studies/History, English/Reading, and General Study. Keywords
and model output never preselect a teacher choice.

- Automatic sends the original `{ text, session }` request with no explicit
  subject/source. The server uses `detectSubject(text)` and records only that
  actual result as `keyword-detected`, followed by the returned model subject as
  `model-generated`. Science keywords remain inference, not teacher proof.
- An explicit choice sends the existing `subject` plus the new
  `subjectSource: 'teacher-supplied'` marker. The server requires an exact supported
  label and marker; malformed pairs and client `subjectEvidence` arrays are
  rejected with 400. It does not run the detector in this path.
- Legacy requests with only `subject` retain their existing generation behavior;
  nonblank values are recorded as `unknown`, never retroactively teacher-supplied.
  Legacy omitted/blank inputs still use detection. No new fields are required.
- The route assembles `PresentationData.subjectEvidence` from the submitted input
  and model subject after generation. Teacher input is retained verbatim as the
  selected label even when the model disagrees. `PresentationData.subject` remains
  model content; server history does not overwrite it or vice versa. The model
  response schema strips claimed history, and the route replaces any such history
  with its own entries. Provenance records application input history, not an
  identity attestation or security credential.
- Selection is passed as an argument and serialized when the request is submitted;
  later control changes cannot relabel the result. Workspace state stores the
  response history, preserves it with slide edits/addition/deletion, replaces it
  with the next result, and clears it and the Subject choice on reset. Legacy
  presentations without this optional metadata remain valid.
- The existing model/export schema still projects only content fields; export
  routes accept presentation metadata but omit it from PPTX/Markdown content.
  Existing exports and the displayed model subject are unchanged.

Remaining integration dependencies: image requests still lack subject evidence
and a separate instructional slide topic. Carry server-recorded history to those
callers and establish individual topics before using the eligibility policy;
slide titles and visual prompts are not converted into pilot topics here. Neither
NASA nor its policy is invoked by generation/image requests. Candidate review,
caption accuracy, metadata/credit preservation, usage review, and bounded routing
remain separate work. The existing AI → Pexels flow remains unchanged.


## Manual picker contract

Each slide with a visual offers `Find NASA image`. Search text starts with the slide
title and remains editable; no request occurs until the teacher searches. The
session-protected `POST /api/nasa-images/search` accepts `{ query }`, returns up to
five candidates, and distinguishes an empty list from an upstream error.
`POST /api/nasa-images/select` accepts only `{ nasaId }`; client URLs/credits are
ignored. It reloads exact-ID image metadata via NASA's `nasa_id` search filter,
then retrieves the asset through the existing manifest/download protections.
There are no retries or alternative providers inside either endpoint.

Selection replaces only the stable slide identity that opened the picker. Cancel,
empty search, and failures preserve its current image. Unmount/reset aborts local
requests; stale results cannot attach to shifted/replacement slides. Successful
manual selection invalidates older batch/single-AI results for that slide. A later
successful AI/Pexels replacement clears NASA metadata; a failed attempt preserves
a currently selected NASA image and its credits.

Selected `SlideData.imageMetadata` retains the NASA ID, available title/description,
preview/collection source URL, actual asset URL, rendition/MIME, photographer,
secondary creator, and publishing center. Structured credits are displayed with
distinct labels; missing fields are never filled with invented attribution. The
full source description is preserved as plain text, including embedded credits or
contradictions, rather than parsed to choose an authoritative credit. No usage
permission is inferred. The model-generation schema still excludes this metadata.
An export-only schema preserves it through Markdown and PowerPoint validation.

Slide edits/deletion preserve the selected image's metadata. Markdown includes
escaped source/credit text and a source link. PowerPoint includes a visible credit
footer/link and full source description in speaker notes, including the title
slide; its NASA image is also rendered when present. Existing export size budgeting
can still omit image bytes, but metadata/notes remain. No source/credit UI was added
for the automatic AI/Pexels path.

Verification used mocked provider, DOM, and browser responses. No live NASA calls
were made for this manual-picker implementation. Metadata conflicts found in the
earlier live evaluation remain unresolved; teachers must review relevance, captions,
and usage conditions. Subject provenance and the inactive eligibility policy were
not extended or connected to the manual flow.

## Production hosting limit

The selection endpoint returns image bytes as base64 JSON. Vercel's documented
[4.5 MB function response limit](https://vercel.com/docs/functions/limitations)
can therefore reject a selected image even when it passes the provider's 10 MiB
download cap. Base64 expands the payload by roughly one third; metadata also
consumes response space. The four evaluated images are below this hosting limit.
A failed selection preserves the existing slide image. Server-side resizing or
alternative asset delivery is not implemented in this release.
