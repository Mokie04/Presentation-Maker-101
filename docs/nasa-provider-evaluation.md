# NASA provider live evaluation — 2026-10-12

**Verdict: BLOCKED by a specific asset-URL compatibility issue.** All eight searches succeeded, but all four selected-image retrievals failed before downloading bytes. NASA must remain inactive in production routing. Description-based relevance is mixed, including genuine biology candidates; visual classroom suitability is **NOT_PROVEN**.

## Scope and method

- Checkout: `main`, `64de6149e6d817ec54381a553a399c3f2a4103ec`.
- Sequential run: 2026-10-12, approximately 11:51:42–11:52:07 Asia/Manila (03:51:42–03:52:07 UTC).
- Invoked unchanged `searchNasaImages` eight times and `fetchNasaImageBase64` four times. The temporary Node runner transpiled the existing TypeScript module with the installed TypeScript package; its injected fetch wrapper forwarded the real URL/options unchanged and captured copies of those same JSON responses. No mocked responses, alternate endpoint, rewritten URL, retry, or extra metadata/preview fetch was used.
- **12 outbound GETs: 8 searches + 4 manifests; 0 image downloads.** All returned HTTP 200 without redirects; no 429/rate limit. No credentials or paid providers. The four failed retrievals exhaust the retrieval budget.
- This is one five-result page per exact query, not a collection-wide survey, relevance benchmark, or ranking recommendation. Assessments below are based on returned descriptions, not keyword overlap or request success.

## Compatibility evidence and narrow next fix

Search Collection+JSON parsed successfully: `collection.items[].data[]` and preview links matched the schema. All 40 candidates had ID, title, description, source/preview URLs, and center; photographer/secondary creator were often absent and stayed absent. Unknown fields such as album, keywords, date_created and description_508 did not break parsing. No null optional metadata was encountered, so null handling is not proven. Descriptions can contain HTML, old information, embedded credits, and contradictions; they are not safe display HTML or automatically reliable lesson text.

Search source and preview URLs used HTTPS on `images-assets.nasa.gov`. All four HTTPS manifest responses used Collection+JSON version 1.1 and structurally valid `items[].href` strings, **but every asset href used HTTP** on that same hostname. The provider validates all manifest URLs before choosing a rendition and throws exactly:

`Untrusted NASA asset URL.`

For example, the first asset href returned by the [atmosphere manifest](https://images-api.nasa.gov/asset/iss035e014335) was:

`http://images-assets.nasa.gov/image/iss035e014335/iss035e014335~orig.jpg`

The failure occurs in `trustedAssetUrl` (HTTPS requirement), called by the manifest mapping in `fetchNasaImageBase64`. It is not an HTTP request to an untrusted host, a JSON-shape failure, or a large-image failure. API requests used `redirect: 'error'`; response URLs matched requested URLs, with `redirected=false` and no Location header. **Asset-server redirect behavior is NOT_PROVEN**, because no asset request occurred.

Recommended separate repair slice: add regression fixtures for these real HTTP manifest strings; canonicalize only NASA-supplied URLs on the exact trusted asset host to HTTPS after rejecting credentials and nonstandard ports, then apply the existing strict HTTPS validator. Never fetch HTTP, allow arbitrary hosts, or follow redirects. Confirm HTTPS asset availability in a later bounded run; it is not established here. Keep the provider unchanged in this evaluation.

Search JSON bodies were 7,169–8,973 bytes and manifest JSON 435–598 bytes, below the 1 MiB cap; no timeout occurred. Manifest names match `~orig.jpg`, `~large.jpg`, `~medium.jpg`, `~small.jpg`, and `~thumb.jpg`, plus metadata.json. Two manifests lack both large and medium. **Image MIME/bytes/dimensions, the 10 MiB download cap, and whether large fails where medium would succeed are NOT_PROVEN.** Static code inspection shows no medium retry after a selected large download fails; that is an unresolved policy, not an observed failure in this run.

## Selected retrievals — all blocked before visual inspection

Selection was explicit after reviewing all eight result sets, not automatic first-result selection. Two selections are biology candidates.

| Selected NASA ID | Selection rationale | Manifest renditions (JPEG filenames; not verified MIME) | Available credit | Result |
|---|---|---|---|---|
| GSFC_20171208_Archive_e001171 | Distance-scale graphic could explain AU/logarithmic scale. | orig, small, thumb | Description: NASA/JPL-Caltech; structured credit absent; center GSFC | Untrusted NASA asset URL. |
| iss035e014335 | Atmospheric limb/layers could support a physical-science observation. | orig, large, medium, small, thumb | Photographer: Chris Hadfield; center JSC | Untrusted NASA asset URL. |
| iss054e022372 | Arabidopsis plate could show roots directly, unlike an astronaut operating equipment. | orig, large, medium, small, thumb | Photographer: Scott Tingle; center JSC | Untrusted NASA asset URL. |
| jsc2019e039829 | Confocal micrograph could show nuclei and cytoskeletal structures. | orig, small, thumb | Photographer/courtesy: Dr. Gianni Ciofani, IIT and Polytechnic University of Torino-PoliTo; center JSC | Untrusted NASA asset URL. |

For **each** selection: image MIME type = NOT_OBSERVED; image byte size = NOT_OBSERVED (zero downloaded, not an empty image); pixel dimensions = NOT_OBSERVED; selected/downloaded rendition = NONE; visual support for the lesson = NOT_PROVEN. No downloaded image existed to inspect, and no preview or direct-download bypass was attempted. Credit is not permission: no explicit asset license/usage authorization was established for any selection. The solar description links a NASA use-policy page, which was not fetched; the cell asset has third-party courtesy credit and contradictory Earth/space provenance requiring review.

## Topic-by-topic candidate inventory

Each ID links to the exact source collection URL returned by search. P = photographer; S = secondary creator; D = credit/courtesy present in description. Unlisted P/S means absent, not “NASA” by default. Center is publishing provenance, not a usage grant. Descriptive source credits matching P are not duplicated.

### lunar phases

All five descriptions concern rover usability testing and the first phase of Moon Base development. None describes lunar illumination phases. Reject this batch for that lesson.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [jsc2026e417568](https://images-assets.nasa.gov/image/jsc2026e417568/collection.json) | Crewed Lunar Terrain Vehicle Testing | Center: JSC; P: NASA/Bill Stafford | Rover crew/usability test, not lunar phases. |
| [jsc2026e417596](https://images-assets.nasa.gov/image/jsc2026e417596/collection.json) | Crewed Lunar Terrain Vehicle Testing | Center: JSC; P: NASA/Bill Stafford | Rover crew/usability test, not lunar phases. |
| [jsc2026e418532](https://images-assets.nasa.gov/image/jsc2026e418532/collection.json) | Crewed Lunar Terrain Vehicle Testing | Center: JSC; P: NASA/Robert Markowitz | Rover crew/usability test, not lunar phases. |
| [jsc2026e418559](https://images-assets.nasa.gov/image/jsc2026e418559/collection.json) | Crewed Lunar Terrain Vehicle Testing | Center: JSC; P: NASA/Robert Markowitz | Rover crew/usability test, not lunar phases. |
| [jsc2026e417620](https://images-assets.nasa.gov/image/jsc2026e417620/collection.json) | Crewed Lunar Terrain Vehicle Testing | Center: JSC; P: NASA/Bill Stafford | Rover crew/usability test, not lunar phases. |

### solar system

Mixed astronomy candidates; the distance graphic is promising for scale, not a simple planet-identification lesson. One montage explicitly uses the outdated “nine planets” framing. No image was visually verified.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [PIA14074](https://images-assets.nasa.gov/image/PIA14074/collection.json) | A Solar System Family Portrait, from the Inside Out. | Center: JPL; S: NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington | Description repeats title; family portrait is only a potential match, content unclear. |
| [PIA09776](https://images-assets.nasa.gov/image/PIA09776/collection.json) | Solar System in Miniature | Center: JPL; S: NASA/JPL/Space Science Institute | Description repeats title; cannot infer that it explains our solar system. |
| [PIA14348](https://images-assets.nasa.gov/image/PIA14348/collection.json) | K/Th in the Inner Solar System | Center: JPL; S: NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington | K/Th comparison: specialized composition topic, not a general overview. |
| [PIA02973](https://images-assets.nasa.gov/image/PIA02973/collection.json) | The New Solar System | Center: JPL; S: NASA/JPL/ASU | Planet montage; description says nine planets and false-color nebula. Needs historical framing/correction, not automatic use. |
| [GSFC_20171208_Archive_e001171](https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001171/collection.json) | Solar System, in Perspective | Center: GSFC; D: description credit: NASA/JPL-Caltech | Artist concept of logarithmic AU distances and Oort Cloud; selected for a scale lesson. Voyager position is historical, not current. |

### Earth atmosphere

Two descriptions directly concern the atmosphere’s visible limb/layers; circulation is a different, more advanced concept. Reentry and earthquake examples do not explain basic atmospheric layers.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [iss035e014335](https://images-assets.nasa.gov/image/iss035e014335/collection.json) | Earth Atmosphere Observations taken by the Expedition 35 Crew | Center: JSC; P: Chris Hadfield | Orbital photograph; description maps colors roughly to atmospheric layers. Selected as observational evidence, not a labeled explanatory diagram. |
| [PIA24965](https://images-assets.nasa.gov/image/PIA24965/collection.json) | Atmospheric Circulation Cells on Earth and Jupiter | Center: JPL; S: NASA/JPL-Caltech/SwRI/Weizmann Institute of Science | Earth/Jupiter circulation comparison graphic; potentially useful for circulation with careful captioning, not basic layers. |
| [PIA14430](https://images-assets.nasa.gov/image/PIA14430/collection.json) | NASA Sees Tohoku-Oki Earthquake and Tsunami in Earth Upper Atmosphere | Center: JPL; S: NASA/JPL-Caltech | Only title-level description about earthquake/tsunami effects aloft; insufficient for general atmosphere instruction. |
| [iss074e0089803](https://images-assets.nasa.gov/image/iss074e0089803/collection.json) | Earth's thin blue atmosphere traces the planet's horizon above the Pacific Ocean | Center: JSC | Thin atmospheric limb over Pacific; plausible observational illustration, not an explanation of layers or composition. |
| [S70-17646](https://images-assets.nasa.gov/image/S70-17646/collection.json) | Apollo 13 Service Module and Lunar Module as entering Earth's atmosphere | Center: JSC | Objects believed to be Apollo modules during reentry; subject is reentry, not atmospheric structure. |

### plant growth

Biology: plausible plant specimens, but mostly space-agriculture context. No description establishes a growth-stage sequence or explains photosynthesis. Tour photographs are not concept illustrations.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [iss037e027536](https://images-assets.nasa.gov/image/iss037e027536/collection.json) | Plant Growth | Center: JSC; P: Michael Hopkins | Close-up plant growth; specimen candidate, but minimal description and no visible progression established. |
| [KSC-20180613-PH_KLS01_0044](https://images-assets.nasa.gov/image/KSC-20180613-PH_KLS01_0044/collection.json) | Algae Bioreactor and Plant Growth Tour | Center: KSC; P: NASA/Kim Shiflett | Officials touring growth chambers; experiment/facility context, not a growth-process explanation. |
| [KSC-20180613-PH_KLS01_0053](https://images-assets.nasa.gov/image/KSC-20180613-PH_KLS01_0053/collection.json) | Algae Bioreactor and Plant Growth Tour | Center: KSC; P: NASA/Kim Shiflett | Officials touring growth chambers; experiment/facility context, not a growth-process explanation. |
| [0300227](https://images-assets.nasa.gov/image/0300227/collection.json) | Biotechnology | Center: MSFC | Dwarf wheat aboard ISS; real crops and experiment context, not a diagram of photosynthesis or stages. |
| [iss006e45091](https://images-assets.nasa.gov/image/iss006e45091/collection.json) | View of plants in the Russian BIO-5 Rasteniya-2/Lada-2 (Plants-2) Plant Growth Experiment in the SM | Center: JSC | Plant-growth experiment in ISS module; apparatus context, root/shoot detail unverified. |

### plant roots

Biology: the Arabidopsis plate is the strongest description-based root candidate. Equipment and astronauts tending experiments must not stand in for root anatomy, uptake, or gravitropism explanations.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [iss068e013810](https://images-assets.nasa.gov/image/iss068e013810/collection.json) | XROOTS | Center: JSC; P: Bob Hines | XROOTS system; description only presumes a tomato plant. Root visibility is not established. |
| [iss054e022372](https://images-assets.nasa.gov/image/iss054e022372/collection.json) | Petri Plants-2 Experiment Plate Final Survey | Center: JSC; P: Scott Tingle | Arabidopsis seedling plate documenting a root-growth experiment; selected to assess visible roots. Does not by itself prove a gravity effect. |
| [iss066e110795](https://images-assets.nasa.gov/image/iss066e110795/collection.json) | iss066e110795 | Center: JSC | Astronaut operating shoot/root study; experiment activity, not direct root anatomy. |
| [iss068e015480](https://images-assets.nasa.gov/image/iss068e015480/collection.json) | eXposed Root On-Orbit Test System (XROOTS) | Center: JSC; P: Kjell Lindgren | Astronaut managing fluid and inspecting XROOTS plants; experiment activity. |
| [iss064e030235](https://images-assets.nasa.gov/image/iss064e030235/collection.json) | iss064e030235 | Center: JSC | Hydroponic water-management investigation; mechanism described in text, actual root visibility unverified. |

### cells microscopy

Biology: three descriptions identify real confocal micrographs of muscle cells, a stronger concept match than laboratory equipment. Metadata conflicts prevent treating the titles/credits as authoritative without review.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [jsc2019e039829](https://images-assets.nasa.gov/image/jsc2019e039829/collection.json) | Skeletal muscle cells cultured in space | Center: JSC; P: Dr. Gianni Ciofani, IIT and Polytechnic University of Torino-PoliTo.; D: description courtesy: Dr. Gianni Ciofani, IIT and Polytechnic University of Torino-PoliTo | Confocal actin/vinculin/nuclei image; selected for cell structures. Title says cultured in space, description says Earth-grown preflight cells: unresolved conflict. |
| [jsc2019e039828](https://images-assets.nasa.gov/image/jsc2019e039828/collection.json) | Skeletal muscle cells cultured on Earth | Center: JSC; P: Dr. Gianni Ciofani, IIT and PoliTo; D: description courtesy: Dr. Giada Genchi, Istituto Italiano di Tecnologia-IIT (conflicts with photographer) | Confocal cell structures, potentially useful; photographer and description courtesy name different people (see credits). |
| [jsc2024e043735](https://images-assets.nasa.gov/image/jsc2024e043735/collection.json) | MeF1 Preflight Imagery | Center: JSC; P: NASA Space Radiation Laboratory; D: description courtesy: NASA Space Radiation Laboratory | BioCell culture container before later microscopy; description does not establish a microscopic view of cells. |
| [GRC-2017-C-01063](https://images-assets.nasa.gov/image/GRC-2017-C-01063/collection.json) | Advanced Plant Experiment, APEX-4 | Center: GRC | Support work for plant experiment before detailed imaging; not established as a cell micrograph. |
| [jsc2019e039830](https://images-assets.nasa.gov/image/jsc2019e039830/collection.json) | Skeletal muscle cells cultured on Earth | Center: JSC; P: Dr. Giada Genchi, Istituto Italiano di Tecnologia-IIT.; D: description courtesy: Dr. Gianni Ciofani, IIT and PoliTo (conflicts with photographer) | Confocal cell structures, potentially useful; photographer and description courtesy name different people (see credits). |

### bacteria

Biology: colony photographs and a Bt-related image may support specific lessons; descriptions do not establish a general bacterial-cell anatomy illustration. Lab-worker/filter photographs are keyword matches without direct concept support.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [0102076](https://images-assets.nasa.gov/image/0102076/collection.json) | Skylab | Center: MSFC | Historical experiment chart; useful for experimental design, not necessarily bacterial structure. |
| [0102077](https://images-assets.nasa.gov/image/0102077/collection.json) | Skylab | Center: MSFC | Four pictures of bacterial samples/colonies from two experiment runs; promising for colony growth, not individual-cell anatomy. Not retrieved. |
| [9807401](https://images-assets.nasa.gov/image/9807401/collection.json) | Microgravity | Center: MSFC; D: description photo credit: NASA/Marshall Space Flight Center (MSFC) | Researchers doing genetic manipulation; photograph of an experiment, not bacteria or protein production explained visually. |
| [iss030e060469](https://images-assets.nasa.gov/image/iss030e060469/collection.json) | Burbank cleans cabin air bacteria filters in the Node 3 | Center: JSC | Astronaut cleaning air filters; maintenance activity, not bacterial structure. |
| [9804671](https://images-assets.nasa.gov/image/9804671/collection.json) | Microgravity | Center: MSFC | Description identifies Bt and a protein substance on the right; potentially organism/protein-specific. Not retrieved; do not repeat historical safety claims without separate review. |

### human physiology

Biology: renal-stone micrograph is a specific pathology candidate. Most other results show physiology research hardware or its operation, not organs or body-system function.

| NASA ID / source URL | Returned title | Center and available credit | Description-based relevance |
|---|---|---|---|
| [iss034e010797](https://images-assets.nasa.gov/image/iss034e010797/collection.json) | MARES | Center: JSC | MARES exercise/research equipment; no direct anatomy or muscle-function explanation established. |
| [0300109](https://images-assets.nasa.gov/image/0300109/collection.json) | Biotechnology | Center: MSFC | Calcium oxalate crystals in urine, explicitly a micrograph; promising for renal-stone formation, not a general physiology overview. Investigator is not an inferred image credit. |
| [iss058e000975](https://images-assets.nasa.gov/image/iss058e000975/collection.json) | Nona Cube | Center: JSC; P: David Saint-Jacques | Organs-on-chips investigation; description explains purpose, not proof that photograph depicts physiological function. |
| [iss047e038968](https://images-assets.nasa.gov/image/iss047e038968/collection.json) | iss047e038968 | Center: JSC | Astronaut operating MARES; experiment context, not muscle anatomy or a mechanism diagram. |
| [iss068e022275](https://images-assets.nasa.gov/image/iss068e022275/collection.json) | Nanoracks Module in the Cupola | Center: JSC; P: Nicole Mann | OVOSPACE payload view; research apparatus, not ovary structure/function illustration. |

## Remaining decisions

1. Repair and re-evaluate the manifest scheme mismatch before any routing work; repeat visual checks with a new explicit budget. Do not equate this successful search sample with working image retrieval.
2. Future eligibility must check **both subject and individual slide topic**; a Science label alone is insufficient. Preserve non-science and existing AI → Pexels behavior. Match the instructional purpose (diagram, observation, specimen, experimental context), with caption/age suitability review; do not automatically use the first result.
3. Biology is not categorically unsuitable: root plates, cell micrographs, bacterial colonies and renal-stone micrographs are plausible candidates in these batches. That is description evidence only. Equipment photographs do not explain anatomy or mechanisms merely because their experiments study them.
4. Define attribution display, description-embedded credit handling, third-party permission review, and conflict resolution. In particular, the two Earth-cell records disagree between photographer and description courtesy, and the selected cell record disagrees between title and description about Earth versus space. No credit was invented or corrected here.
5. Decide fallback behavior for no relevant candidate, incompatible/oversized originals, failed large downloads, missing credits, and unsafe URLs. Consider bounded medium fallback only after failure-specific evidence and tests; preserve timeout/size/host/redirect protections. No fallback changes were made.

## Exact call ledger

All calls were sequential GETs with redirect rejection; each returned HTTP 200, without redirects. “Asset” below means manifest lookup, not an image download. These are the only outbound calls made by this evaluation.

| # | UTC request start | Exact request URL | Response JSON bytes |
|---|---|---|---:|
| 1 | 2026-10-12T03:51:42.872Z | https://images-api.nasa.gov/search?q=lunar+phases&media_type=image&page_size=5 | 8762 |
| 2 | 2026-10-12T03:51:43.904Z | https://images-api.nasa.gov/search?q=solar+system&media_type=image&page_size=5 | 8160 |
| 3 | 2026-10-12T03:51:44.231Z | https://images-api.nasa.gov/search?q=Earth+atmosphere&media_type=image&page_size=5 | 8100 |
| 4 | 2026-10-12T03:51:44.580Z | https://images-api.nasa.gov/search?q=plant+growth&media_type=image&page_size=5 | 8973 |
| 5 | 2026-10-12T03:51:45.370Z | https://images-api.nasa.gov/search?q=plant+roots&media_type=image&page_size=5 | 7169 |
| 6 | 2026-10-12T03:51:45.721Z | https://images-api.nasa.gov/search?q=cells+microscopy&media_type=image&page_size=5 | 8318 |
| 7 | 2026-10-12T03:51:46.065Z | https://images-api.nasa.gov/search?q=bacteria&media_type=image&page_size=5 | 7539 |
| 8 | 2026-10-12T03:51:46.841Z | https://images-api.nasa.gov/search?q=human+physiology&media_type=image&page_size=5 | 7514 |
| 9 | 2026-10-12T03:52:04.032Z | https://images-api.nasa.gov/asset/GSFC_20171208_Archive_e001171 | 555 |
| 10 | 2026-10-12T03:52:04.959Z | https://images-api.nasa.gov/asset/iss035e014335 | 598 |
| 11 | 2026-10-12T03:52:05.771Z | https://images-api.nasa.gov/asset/iss054e022372 | 598 |
| 12 | 2026-10-12T03:52:06.155Z | https://images-api.nasa.gov/asset/jsc2019e039829 | 435 |

## Files and verification

Only repository file added by this evaluation: `docs/nasa-provider-evaluation.md`. The three pre-existing uncommitted NASA files remain unchanged; no tracked or staged changes, application imports, routes, UI, configuration, exports, dependencies, or production settings were altered. No commit, push, deployment, or paid-provider call.

Preservation hashes (SHA-256, checked before and after):

| Existing file | SHA-256 |
|---|---|
| src/lib/providers/nasa-provider.ts | e3c2eddaebba78745ead53a406daefacd11932a5bccd70d89883b0d62154256f |
| tests/lib/providers/nasa-provider.test.ts | 10afafe354a702ff6e252ca413b5ce5ae50e955b28d2b7fedc1f14be4c62018d |
| docs/nasa-provider.md | adf08072b50f71dc5f45b88364a1eb56558bf7ec089613aa044d5198de80d3e4 |

Temporary local runner, captured responses, and report-generation script are outside the repository in `/tmp/nasa-evaluation-oCIcPl/` (ephemeral); no image files were produced. The report retains the IDs, titles, source URLs, credits, response facts, and complete call ledger needed to understand this result. No code changed, so tests/build were not rerun for this documentation-only slice. Final checks: file hashes, Git scope/staging status, report completeness, and report whitespace.

---

## Follow-up — 2026-10-12: HTTP asset URL repair and live retrieval

**Updated verdict: the observed URL compatibility blocker is resolved for all four selected assets. Ready for a bounded next integration slice with explicit relevance/credit safeguards; not ready for automatic production selection. NASA remains inactive.** The original failed-run evidence above is retained unchanged. This follow-up is a separate run with a new budget, not a retry hidden within the original evaluation.

### Repair and local verification

Root cause: NASA's HTTPS manifests advertise HTTP asset URLs; the earlier validator required HTTPS before normalization. The only production change is in `trustedAssetUrl`: accept parsed absolute HTTP or HTTPS URLs only for the exact `images-assets.nasa.gov` hostname, reject credentials/nonstandard ports, then set the protocol to HTTPS. Path and query remain intact. Default HTTP 80 / HTTPS 443 are accepted and normalized by the URL parser. Relative URLs, lookalike hosts and other schemes remain rejected. All returned/fetched asset URLs are HTTPS. Redirect rejection, response validation, timeouts, byte limits, rendition preference and application routing are unchanged.

Regression tests were added first: four new cases failed against the old validator, then passed after the helper change. Existing HTTPS tests remain green. Coverage includes the real manifest shape, HTTP search preview/source URLs, preserved queries, default and nonstandard ports, credentials, hostname suffix tricks, unsupported schemes, relative URLs, and redirect rejection after upgrade.

| Check | Result |
|---|---|
| `npm test -- tests/lib/providers/nasa-provider.test.ts` | 63 passed |
| `npm test` | 196 passed across 27 files |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0; no warnings/errors |
| `npm run build` | Exit 0; production build completed |
| Scope and whitespace checks | Only four authorized NASA files changed relative to pre-turn snapshots; original evaluation is an unchanged prefix |
| Independent focused code review | No actionable findings |

### Bounded live run and image inspection

Run started at 2026-10-12 11:59:21 Asia/Manila (03:59:21 UTC). The runner invoked the actual repaired `fetchNasaImageBase64` for the four specified IDs sequentially. Its fetch wrapper logged the same requests without URL rewriting or changing options and enforced the HTTPS/host/call budget. **Exactly four manifests + four HTTPS image requests; zero searches, retries, alternate providers, metadata fetches, or manual-download bypasses.** All eight requests returned 200 with `redirected=false`, matching response URLs, no Location header, and `redirect: 'error'`. No rate limiting or timeout occurred.

All manifests still contained HTTP asset URLs, so each successful download exercised the repair. All image responses reported `image/jpeg`; actual decoded base64 byte counts matched Content-Length. Dimensions were read locally with macOS `sips` and every file was decoded/rendered with the local image viewer for inspection. These are asset inspection results, not application/PPTX rendering tests.

| NASA ID | Rendition | MIME | Bytes | Decoded pixels (W × H) |
|---|---|---|---:|---|
| GSFC_20171208_Archive_e001171 | orig | image/jpeg | 781657 | 1280 × 720 |
| iss035e014335 | large | image/jpeg | 287778 | 1920 × 1277 |
| iss054e022372 | large | image/jpeg | 586750 | 1920 × 1280 |
| jsc2019e039829 | orig | image/jpeg | 387075 | 1124 × 844 |

- **Solar system — GSFC_20171208_Archive_e001171:** the actual image is a labeled distance graphic, with planets, heliosphere, Oort Cloud and powers-of-ten distance marks. Visually useful for discussing scale with an explanation of AU/logarithmic spacing; not a realistic planet-size or uniformly spaced orbit diagram. Vertical labels and dense content need appropriate slide space. Its Voyager marker is historical, not a current-position claim. Prior description credit: **NASA/JPL-Caltech**; center GSFC; structured photographer/secondary creator absent. No usage permission was established.
- **Earth atmosphere — iss035e014335:** the photograph visibly shows an orange/white/blue horizon transitioning into darkness. Supports observing the atmosphere, but is not a labeled layer-boundary diagram and does not independently establish exact physical layers. Needs an accurate caption. Prior photographer: **Chris Hadfield**; center JSC. No usage permission was established.
- **Plant roots — iss054e022372:** seedlings and long pale roots are directly visible against a gridded plate. This is a specimen photograph, not merely a person operating equipment. Useful for root/shoot observation with guidance; crowded roots make some individual structures difficult to trace. It does not demonstrate water uptake or a causal microgravity effect by itself. Prior photographer: **Scott Tingle**; center JSC. No usage permission was established.
- **Cells — jsc2019e039829:** the retrieved image is a gray-toned microscopic field with elongated cell-like forms; it does **not** show the red actin, green vinculin, and blue nuclei described in the search metadata. Reject it for the proposed color-coded cell-structure lesson pending source clarification. It may illustrate microscopy generally, but individual structures cannot be confidently labeled from this inspection. The earlier title says cultured in space while the description says Earth-grown preflight cells; that conflict remains unresolved. Prior photographer: **Dr. Gianni Ciofani, IIT and Polytechnic University of Torino-PoliTo.** Description courtesy names the same person/institutions. No permission was inferred, and no guessed correction was applied. The separate credit conflicts for jsc2019e039828 / jsc2019e039830 recorded above are unchanged and were not re-evaluated.

Both selected large renditions downloaded successfully (287,778 and 586,750 bytes), so no practical large-size failure was observed in these two cases. All four images were below the unchanged 10 MiB cap. The solar and cell manifests lacked large/medium and used original JPEGs. No medium rendition was fetched for comparison; this sample cannot establish general large-versus-medium reliability. There is still no retry/fallback after a chosen rendition fails; this repair does not change that policy.

### New call ledger (separate from the original run)

| # | UTC request start | Exact GET URL | HTTP | Response bytes |
|---|---|---|---:|---:|
| 1 | 2026-10-12T03:59:21.077Z | https://images-api.nasa.gov/asset/GSFC_20171208_Archive_e001171 | 200 | 555 |
| 2 | 2026-10-12T03:59:22.162Z | https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001171/GSFC_20171208_Archive_e001171~orig.jpg | 200 | 781657 |
| 3 | 2026-10-12T03:59:24.270Z | https://images-api.nasa.gov/asset/iss035e014335 | 200 | 598 |
| 4 | 2026-10-12T03:59:24.661Z | https://images-assets.nasa.gov/image/iss035e014335/iss035e014335~large.jpg | 200 | 287778 |
| 5 | 2026-10-12T03:59:26.111Z | https://images-api.nasa.gov/asset/iss054e022372 | 200 | 598 |
| 6 | 2026-10-12T03:59:26.496Z | https://images-assets.nasa.gov/image/iss054e022372/iss054e022372~large.jpg | 200 | 586750 |
| 7 | 2026-10-12T03:59:28.235Z | https://images-api.nasa.gov/asset/jsc2019e039829 | 200 | 435 |
| 8 | 2026-10-12T03:59:28.634Z | https://images-assets.nasa.gov/image/jsc2019e039829/jsc2019e039829~orig.jpg | 200 | 387075 |

### Remaining decisions and preserved scope

The next slice must still check both subject and individual slide topic; non-science and the existing AI → Pexels flow stay unchanged. Decide relevance review, safe captions, attribution/third-party usage review, and rejection/fallback policy before production activation. The cell metadata/image discrepancy is a content-selection issue, not another URL compatibility failure; no additional repair was attempted. Search with live HTTP preview/source URLs was not repeated (covered by mocked tests only). Collection-wide compatibility, automated suitability, null metadata, and application/export rendering remain unproven.

Files modified in this repair: `src/lib/providers/nasa-provider.ts`, `tests/lib/providers/nasa-provider.test.ts`, `docs/nasa-provider.md`, and this append-only follow-up in `docs/nasa-provider-evaluation.md`. Pre-existing uncommitted work was preserved; all four remain uncommitted. No routing, UI, exports, fallback policy, dependencies, production configuration, commit, push or deployment changes.

Local evidence is ephemeral under `/tmp/nasa-repair-umtQP4/`: `evidence.json`, `run.cjs`, pre-turn snapshots, and `selected-1.jpg` through `selected-4.jpg` in the table's order. The ledger above retains their source URLs and measured results. No additional repository artifacts were created.
