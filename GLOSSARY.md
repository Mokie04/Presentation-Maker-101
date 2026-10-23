# Glossary

**Slide** — One page of a presentation: `SlideData` (`slideNumber`, `part`, `title`, `contentPoints`, `visualDescription`, optional `imageMetadata`). `slideNumber` is its 1-based position and is renumbered when a Slide is deleted.

**Slide deck** — The ordered Slides of one generated presentation plus its metadata (`subject`, `originalWriters`, `topic`). The wire and export shape is `PresentationData`. Inside the client, each Slide also carries an internal id that is never reused and never sent to the server.

**Slide image** — The picture shown on a Slide and exported to PPTX: base64 or a `data:` URL. The UI and export routes receive them as `slideImages: Record<index, string>`, where `FAILED_IMAGE` (`'failed'`) means generation failed and nothing is shown. `src/lib/slide-image.ts` owns the wire rules: `isUsableImage`, `toRawBase64`, `sniffImageMime`, `toDataUrl` and the export validation (`hasWireImageFormat`, `MAX_SLIDE_IMAGE_CHARS`).

**Pedagogical part** — `SlideData.part`, the lesson phase a Slide belongs to. `src/lib/pedagogy.ts` owns the rules: `PEDAGOGICAL_PARTS` (Title Page, then the six numbered lesson parts Review to Assessment), `normalizePart` / `canonicalPart` (maps wording such as "Activity" to a canonical part; unknown text is kept), `partOrdinal`, `partLabel` (badge text) and `partWantsAutoImage` (Motivation, Lesson Presentation and Discussion get batch images). The UI adds only colours (`src/components/part-badge.ts`).

**Export payload** — The `/api/download-pptx` request: `{ presentationData, slideImages, session }`. `src/lib/export/` builds it: `buildPptxExportRequest` compresses usable images (`compress-image.ts`) and drops them from the last slide down until the body fits `CLIENT_EXPORT_BUDGET_CHARS`, removing the Credit of each dropped image; `limits.ts` holds that budget and the server cap `MAX_EXPORT_BODY_BYTES`; `filename.ts` names exports; `use-deck-export.ts` runs both downloads.

**Credit (`ImageMetadata`)** — Source and attribution of a library image (NASA or Wikimedia Commons), stored on `SlideData.imageMetadata`. `describeImageCredit` in `src/lib/image-credit.ts` describes it once (source label, credit line, source link, license, notes); each renderer only formats that description. AI-generated images have no Credit.

**Image intent** — A user request for a specific Slide image: a single regeneration or a library selection. A new Image intent supersedes any older in-flight result for that Slide, including a pending batch result.

**Image provider** — An automatic image-generation source implementing `ImageProvider` in `src/lib/providers/image/types.ts`: an `id` and `generate(ImageRequest)` returning raw base64. `ImageRequest` carries the description, optional title and variation. The OpenAI-compatible adapter owns its request details, response handling and retries; the Pexels adapter delegates to the existing search/download provider. `compose.ts` resolves the `ai` / `pexels` / `auto` order and preserves the first provider's error if all fail. `image-provider.ts` remains the public facade used by routes, batch generation and health checks.

**Image library** — A searchable source of manually selected images. `ImageLibrary` in `src/lib/image-library/library.ts` defines its source, label, selection schema, search/select operations and public error mapping. `nasa.ts` and `commons.ts` adapt the existing providers; `route-definitions.ts` supplies their shared route policy. Client-safe candidate types, labels, paths and selection helpers live in `types.ts`. To add a third library, add its adapter here, extend the source/metadata and candidate unions and library constants, wire its routes through the shared definitions, and add it to the picker and adapter contract tests.

**Configuration** — Feature settings validated only when needed. `src/lib/env.ts` owns pure `readTextProviderConfig`, `readImageProviderConfig`, `readPexelsConfig` and `readAppConfig` readers, with matching lazy, cached `get*Config` accessors. `resetConfigCache` isolates tests; App Store auth remains in `src/lib/sessionAuth.ts`.
