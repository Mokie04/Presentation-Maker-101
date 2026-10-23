# Manual Wikimedia Commons picker

Teachers choose NASA (the existing default) or Wikimedia Commons in the existing per-slide picker, edit the search terms and explicitly choose a result. Both sources are available across subjects. No eligibility, ranking, automatic Commons/NASA routing or fallback searches were added. Automatic AI → Pexels generation is unchanged.

## Server and metadata contract

Supported CC BY license URLs accept an optional trailing slash and are stored with the canonical trailing slash. The URL must still match the reported license version; query strings, fragments, extra path segments, and unsupported licenses remain unavailable.

Session-protected POST `/api/commons-images/search` accepts `{ query: string }` (1–500 trimmed characters). POST `/api/commons-images/select` accepts `{ fileId: number }` (positive safe integer). Selection reloads imageinfo/extmetadata by page ID; client URLs, creator and license fields are ignored. Requests are limited to 8 KiB before JSON parsing. Missing legacy image metadata remains valid. NASA metadata remains compatible.

The public Action API is fixed to `https://commons.wikimedia.org/w/api.php`. Search uses generator=search, file namespace 6, limit `SEARCH_FETCH_LIMIT` (20; see Search results below) and imageinfo with URL, MIME, thumbnail MIME and extmetadata. Selection requests a thumbnail bounded by 1200×900; actual returned dimensions may differ. Only trusted HTTPS `upload.wikimedia.org/wikipedia/commons/` JPEG/PNG thumbnails are downloaded, including PNG renderings of SVG. Originals are never a fallback. Nonraster or untrusted thumbnails are unavailable and never exposed as preview URLs. Redirects are rejected.

The descriptive User-Agent identifies SayunaPresentationMaker and its repository. Each request has a 10-second timeout including streamed body consumption. JSON is capped at 512 KiB, images at 2 MiB and 16 million decoded pixels, and serialized selection responses at 3,000,000 bytes. MIME and decoded image type/dimensions must agree. HTTP 429 and API ratelimited/maxlag return a bounded cooldown and are never retried; the only retry is the 5-result size fallback described below. The picker disables Commons requests during cooldown. Switching sources aborts outstanding browser requests and clears results; existing stable-slide guards prevent stale selection after reset/deletion. Server work already started may finish.

This version accepts only clearly identified public domain (Copyrighted=false), CC0 with its canonical license URL, and CC BY or CC BY-SA 1.0/2.0/2.5/3.0/4.0 with the matching canonical URL (`/licenses/by/<version>/` or `/licenses/by-sa/<version>/`, a missing trailing slash is normalized) and an identified Artist. CC BY-SA was added on 2026-10-24 (ADR 0011); its credit notes and Markdown add a ShareAlike line stating that the exported copy is an adapted copy that stays under the same license, and the picker shows a ShareAlike hint. Contradictory attribution flags, additional restrictions, CC BY-NC, CC BY-ND and other/missing/unclear licenses are unavailable. This is a conservative metadata check, not a guarantee of rights clearance. Artist supplies creator; uploader never substitutes for creator. HTML metadata is parsed into plain text with parse5, without executing or retaining markup/attributes. parse5 was already installed as a test dependency and is now an explicit production dependency for safe HTML/entity parsing.

Optional creator, Credit, Attribution, AttributionRequired, UsageTerms, Restrictions and description retain their reported values. Commons metadata additionally records file ID/title, source page, license name/link/kind, raster asset URL, MIME and rendition. Missing values stay missing. Slide deletion retains image ownership and metadata; successful AI/Pexels replacement clears it. Commons slide previews fit the whole raster proportionally. PowerPoint preserves proportions and includes visible creator/license text with a source hyperlink plus complete attribution/license/source/change details in speaker notes. Markdown includes the same metadata and source/license links. Its existing outline format does not embed image bytes.

## Search results (2026-10-24)

Phase 1 of `docs/commons-licenses-roadmap.md` changed no license rule; Phase 2 then added CC BY-SA (see above).

- **Fetch size.** A search asks Commons for `SEARCH_FETCH_LIMIT` = 20 results. Measured on 2026-10-24 over 7 real searches (350 pages) with the provider's exact parameters: 20 results were 47–66 KB, the largest single page 8.6 KB and the longest metadata value 5,987 characters, so 20 of the largest pages stay near 172 KB, about a third of the unchanged 512 KiB `JSON_LIMIT`. Because the schema allows metadata values up to 20,000 characters, a crafted page of 20 could still exceed the limit; in that case the provider retries once with today's 5 results, so a longer list never fails a search that worked before. A rate limit or HTTP error from that retry is reported as such; any other retry failure reports the original size error.
- **Order and caps.** Results come back usable first: at most `MAX_SELECTABLE` = 8 selectable candidates in Commons' rank order, then at most `MAX_UNAVAILABLE` = 4 unavailable ones, also in rank order. The response shape is unchanged; each candidate still carries `selectable` and `unavailableReason`.
- **Unavailable reasons.** Checked in this order, all worded by us; only the license name comes from Commons, as parsed plain text, trimmed and capped at 60 characters with an ellipsis:
  - `Untrusted Commons thumbnail URL; unavailable in this version.`
  - `The license could not be identified.` (no license name)
  - `The creator is not identified, which this license requires.` (CC BY or CC BY-SA with its canonical URL but no Artist, an "unknown" Artist, or AttributionRequired=false)
  - `The license details for "<name>" are incomplete or inconsistent.` (a supported license name whose URL or Copyrighted flag does not match)
  - `License "<name>" is not supported in this version.` (any other license, e.g. CC BY-NC, CC BY-ND, CC BY-NC-SA, GFDL)
  - `Additional restrictions require review; unavailable in this version.`
  - `No suitable JPEG/PNG thumbnail is available.`
- **Picker.** Only selectable results show by default, with a `Show N unavailable results` / `Hide unavailable results` toggle. When nothing is usable, the picker says `No usable images found. N results are unavailable because of their licenses.` and lists them open so the reasons are visible; the toggle hides them. Counts use the singular for one result. The toggle resets on a new search or source change. The picker shows at most `MAX_DISPLAYED_CANDIDATES` = 12 results (NASA returns 5).

## Official documentation verified 2026-10-12

- [API:Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo)
- [API:Search](https://www.mediawiki.org/wiki/API:Search)
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
- [API errors and warnings](https://www.mediawiki.org/wiki/API:Errors_and_warnings)
- [Commons machine-readable data](https://commons.wikimedia.org/wiki/Commons:Machine-readable_data)
- [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)
- [Vercel function limitations](https://vercel.com/docs/functions/limitations)

## Local acceptance evidence — 2026-10-12

Artifacts and call ledger: `/tmp/commons-picker-kxGvKF/` (temporary local files, not committed).

One controlled browser flow used the actual local session endpoint without changing authentication configuration. Text generation and automatic image generation were fixture responses, with all paid-provider requests prohibited by a server guard. Actual search: `water cycle USGS`, 2026-10-12 06:41:31 UTC. Commons returned HTTP 200 JSON without redirection; the application returned HTTP 502 with `Untrusted Commons URL` before previews or selection. Raw upstream JSON was not retained, so the offending field cannot be identified from this run. No repeated live search, selected-image metadata request, image download or live preview followed. Live selected-image/slide/export acceptance is **NOT PROVEN**. Unsafe/nonraster thumbnails are subsequently handled as unavailable individual candidates, with regression coverage, but the original live failure has not been revalidated; no claim is made that this resolves it.

A separate browser run mocked Commons search/selection and all previews, used the actual local export endpoints, selected a CC BY fixture on the final slide, deleted the first slide, and confirmed image/credit ownership and both downloaded files. The exported raster is 16×8, and the final Commons preview uses object-contain. PowerPoint ZIP/image geometry and attribution notes are checked by automated real-export tests; exported PDF rendering is inspected locally. These are mocked browser/export checks, not live Commons evidence.

During the initial RED run of the oversized-input tests, two forwarding spies accidentally invoked the provider (roots search and file ID 42 retrieval). Those tests were corrected to rejecting mocks; no result was used. Subsequent focused and full automated runs use no live provider calls. These incidental invocations are separate from the guarded browser call ledger and prevent claiming that all initial test activity was provider-free.

Remaining gate: a separately authorized bounded live compatibility run must capture the upstream response safely, identify any remaining rejected URL shape, and prove selection, previews and actual exports. Do not loosen trusted hosts or redirect protections to pass that gate. Long metadata is preserved in notes/Markdown; footer text may shrink. Unsupported-license coverage is intentionally narrow.

## Final local verification

- Focused tests: 68 passed across 4 files.
- `npm test -- --maxWorkers=1`: 365 passed across 36 files.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed without warnings/errors.
- `npm run build`: passed.
- `git diff --check`: passed.
- Read-only review: no outstanding code findings; live acceptance remains NOT PROVEN.
- Baseline hash comparison: only the intended 11 existing tracked files changed. The existing NASA provider, subject/provenance flow, eligibility policy, auth and production configuration remain unchanged.
- Mocked browser: selected-image ownership after deletion, source/credit/license in actual Markdown/PPTX exports, 16×8 decoded export image and 2:1 slide geometry passed. LibreOffice-rendered slide footer does not overlap content. No paid-provider calls.

## Changed-file inventory

- `docs/commons-provider.md`
- `package-lock.json`
- `package.json`
- `src/app/api/commons-images/request.ts`
- `src/app/api/commons-images/search/route.ts`
- `src/app/api/commons-images/select/route.ts`
- `src/app/page.tsx`
- `src/components/NasaImagePicker.tsx`
- `src/components/SlideCard.tsx`
- `src/lib/image-metadata.ts`
- `src/lib/providers/commons-provider.ts`
- `src/lib/schemas/presentation-export.ts`
- `src/lib/services/markdown-generator.ts`
- `src/lib/services/pptx-generator.ts`
- `src/types/presentation.ts`
- `tests/api/commons-images.test.ts`
- `tests/components/NasaPicker.test.tsx`
- `tests/lib/providers/commons-provider.test.ts`
- `tests/lib/services/commons-credits.test.ts`

## URL compatibility repair and live acceptance — 2026-10-12

This follow-up supersedes the earlier NOT PROVEN live verdict above; the original failed-run evidence remains unchanged.

### Exact diagnosis and minimal repair

The first authorized reproduction used `searchCommonsImages("water cycle USGS")` with the actual fetch path, capturing only the upstream public JSON (13,398 bytes, HTTP 200, no redirect) locally. Each returned `imageinfo[0].descriptionurl` passed validation. Every `imageinfo[0].thumburl` used the new `thumb.wikimedia.org` host and failed `commonsAssetUrlSchema` because its hostname rule accepted only `upload.wikimedia.org`. For file ID 128001773, the precise rejected URL was:

```text
https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/USGS_WaterCycle_English_ONLINE_20221013.png/1280px-USGS_WaterCycle_English_ONLINE_20221013.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail
```

This is a hostname migration, not an HTTP/HTTPS compatibility problem: the observed URLs were already HTTPS. [Wikimedia's official migration notice](https://phabricator.wikimedia.org/T434821) confirms the new thumbnail host. In the current pre-repair provider, the existing safe thumbnail parsing already prevented a whole-search exception: all five results were unavailable and their rejected preview URLs were omitted. The older recorded 502 is not claimed to reproduce unchanged; the rejected URL rule and inability to select were reproduced precisely.

The only application-code change adds an alternative to `commonsAssetUrlSchema`: exact HTTPS host `thumb.wikimedia.org` with the path prefix `/wikipedia/commons/thumb/`. Existing `upload.wikimedia.org` support remains. Scheme, credentials, nonstandard ports, lookalike hosts and unrelated paths remain rejected. Path and query are preserved; no host rewriting, HTTP requests, redirect following, fabricated source links or original-image fallback were added. License gates, timeouts and all byte/pixel/serialized-response limits remain unchanged.

A minimal one-page public response fixture is stored in `tests/fixtures/commons-water-cycle.json`. Its regression failed first because the observed candidate was unavailable, then passed for search and selected-file retrieval after the schema change. Nine independently specified unsafe variants remain rejected. All automated HTTP in these tests is mocked; no forwarding spies or live automated calls were used in this repair.

### Live picker and actual exports

The second and final authorized search ran through the actual local picker endpoint with the same query. It returned the five original IDs: 128001773, 128246654, 159244956, 162636056 and 179057702. All five displayed raster previews returned HTTP 200 (three PNG, two JPEG). The explicit choice was the English USGS water-cycle diagram, file ID **128001773**, because it explains water stores and flows rather than merely photographing an experiment. Selected-file metadata was reloaded server-side by ID, followed by exactly one provider image download. All four provider HTTP requests returned 200 without redirects or rate limiting; no retry, unrelated search, manual download bypass, NASA call or paid-provider call occurred.

The controlled presentation and automatic initial images were browser fixtures; session, Commons search/selection and export endpoints were actual local app requests. Existing development authentication behavior was used without changing any authentication/production settings. The selected diagram appeared only on the Water cycle slide. Deleting the first slide moved that same stable slide from third to second without changing its image or metadata, and the other remaining slide had no external-image metadata.

Selected rendition: raster thumbnail; MIME `image/png`; **1,328,683 bytes**; decoded **1280 × 876** pixels; SHA-256 `290b8fcc159d9e1385ff91f30d2510b9337baf637c0dc64960cf42568833e557`. Browser preview uses `object-contain`.

Creator (plain-text Artist): Hayley Corson-Dosch, Cee Nell, Rachel Volentine, Althea Archer, Ellen Bechtel, Jennifer Bruce, Nicole Felts, Tara Gross, Dianne Lopez-Trujillo, Charlotte Riggs, Emily Read.

Source page: https://commons.wikimedia.org/wiki/File:USGS_WaterCycle_English_ONLINE_20221013.png

License: **Public domain**; reported attribution-required flag: **false**; Credit: `https://www.usgs.gov/media/images/water-cycle-png`; UsageTerms: **Public domain**. No LicenseUrl or separate Attribution text was supplied, so those values remain missing. The reported public-domain status is preserved as source metadata, not independently adjudicated rights clearance.

Actual browser downloads `acceptance.pptx` and `acceptance.md` were inspected. PowerPoint slide 2 contains the selected diagram with complete creator/source/license/Credit/usage terms and modification statement in speaker notes; visible creator/license text links to the exact Commons source page. The first remaining slide has no selected-image credits. Markdown associates the same metadata with Water cycle and preserves the source link and public-domain label; its existing outline format does not embed image bytes.

Existing export compression converts the raster into a **480 × 329 JPEG (30,397 bytes)**. PPTX geometry fits its decoded ratio **1.458966565** without stretching; the original ratio was **1.461187215**, with the small difference due to existing integer-dimension resizing. The locally rendered PowerPoint shows the complete diagram, with the credit footer below content and no overlap. Small diagram labels lose readability at the existing export size; image compression/layout were deliberately not changed in this URL-only repair. The original browser image remains 1280 × 876.

Artifacts and complete captures are local at `/tmp/commons-repair-HnznDe/`: `search-1.json`, `search-2.json`, `metadata.json`, `diagnosis.json`, `calls.json`, `browser-evidence.json`, `selected.png`, before/after-deletion screenshots, `acceptance.pptx`, `acceptance.md`, rendered PDF/PNG and `export-inspection.json`. These contain public NASA-free Commons metadata and controlled lesson content, no session cookies or secrets.

### Exact live call ledger (UTC)

Provider budget used: **2/2 searches, 1/1 selected-file metadata request, 1/1 image download**. The five displayed-result previews are separate browser requests. Official documentation browsing is separate from Imageinfo/provider calls.

1. **search** — 2026-10-12T07:00:26.415Z; HTTP 200; redirects: False; MIME `application/json; charset=utf-8`; JSON bytes: 13398.

   ```text
   https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Cmime%7Cthumbmime%7Cextmetadata&iiurlwidth=1200&iiurlheight=900&iiextmetadatalanguage=en&iiextmetadatafilter=Artist%7CCredit%7CAttribution%7CAttributionRequired%7CLicenseShortName%7CLicenseUrl%7CCopyrighted%7CUsageTerms%7CRestrictions%7CImageDescription&generator=search&gsrsearch=water+cycle+USGS&gsrnamespace=6&gsrlimit=5
   ```

2. **search** — 2026-10-12T07:04:17.860Z; HTTP 200; redirects: False; MIME `application/json; charset=utf-8`; JSON bytes: 13398.

   ```text
   https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Cmime%7Cthumbmime%7Cextmetadata&iiurlwidth=1200&iiurlheight=900&iiextmetadatalanguage=en&iiextmetadatafilter=Artist%7CCredit%7CAttribution%7CAttributionRequired%7CLicenseShortName%7CLicenseUrl%7CCopyrighted%7CUsageTerms%7CRestrictions%7CImageDescription&generator=search&gsrsearch=water+cycle+USGS&gsrnamespace=6&gsrlimit=5
   ```

3. **metadata** — 2026-10-12T07:04:21.755Z; HTTP 200; redirects: False; MIME `application/json; charset=utf-8`; JSON bytes: 2668.

   ```text
   https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url%7Cmime%7Cthumbmime%7Cextmetadata&iiurlwidth=1200&iiurlheight=900&iiextmetadatalanguage=en&iiextmetadatafilter=Artist%7CCredit%7CAttribution%7CAttributionRequired%7CLicenseShortName%7CLicenseUrl%7CCopyrighted%7CUsageTerms%7CRestrictions%7CImageDescription&pageids=128001773
   ```

4. **image** — 2026-10-12T07:04:22.194Z; HTTP 200; redirects: False; MIME `image/png`.

   ```text
   https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/USGS_WaterCycle_English_ONLINE_20221013.png/1280px-USGS_WaterCycle_English_ONLINE_20221013.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail
   ```

- Preview 1: 2026-10-12T07:04:19.169Z; HTTP 200; `image/png`; `https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/USGS_WaterCycle_English_ONLINE_20221013.png/1280px-USGS_WaterCycle_English_ONLINE_20221013.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail`.
- Preview 2: 2026-10-12T07:04:19.170Z; HTTP 200; `image/jpeg`; `https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/USGS_WaterCycle_English_%282022%29.pdf/page1-1280px-USGS_WaterCycle_English_%282022%29.pdf.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail`.
- Preview 3: 2026-10-12T07:04:19.171Z; HTTP 200; `image/png`; `https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/USGS_WaterCycle_Online_Arabic.png/1280px-USGS_WaterCycle_Online_Arabic.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail`.
- Preview 4: 2026-10-12T07:04:19.172Z; HTTP 200; `image/png`; `https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/USGS_WaterCycle_Online_Slovenian.png/1280px-USGS_WaterCycle_Online_Slovenian.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail`.
- Preview 5: 2026-10-12T07:04:19.172Z; HTTP 200; `image/jpeg`; `https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Water_cycle_natural_Russian.jpg/1280px-Water_cycle_natural_Russian.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail`.

### Verification and scope

- Focused provider/API/picker/export tests: **78 passed across 4 files**; provider tests alone: **45 passed**.
- Full `npm test -- --maxWorkers=1`: **375 passed across 36 files**.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`: passed; lint has no warnings/errors.
- Focused read-only review found no actionable issues.
- Live results above are separate from mocked regression tests. No claim is made about untested Commons queries, licenses or deployment environments.
- Files changed in this repair only: `src/lib/image-metadata.ts`, `tests/lib/providers/commons-provider.test.ts`, new `tests/fixtures/commons-water-cycle.json`, and this appended report. Prior uncommitted work is preserved. No provider logic, routing, UI, export behavior, dependencies, production configuration, commit, push or deployment changed in this repair.

**Verdict:** the observed Commons thumbnail-host compatibility issue is repaired and the bounded local live selection/export acceptance passed. The earlier URL blocker is cleared. Existing dense-diagram export readability remains a limitation outside this slice.
