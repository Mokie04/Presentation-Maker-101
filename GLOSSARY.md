# Glossary

**Slide** — One page of a presentation: `SlideData` (`slideNumber`, `part`, `title`, `contentPoints`, `visualDescription`, optional `imageMetadata`). `slideNumber` is its 1-based position and is renumbered when a Slide is deleted.

**Slide deck** — The ordered Slides of one generated presentation plus its metadata (`subject`, `originalWriters`, `topic`). The wire and export shape is `PresentationData`. Inside the client, each Slide also carries an internal id that is never reused and never sent to the server.

**Slide image** — The picture shown on a Slide and exported to PPTX: base64 or a `data:` URL. The UI and export routes receive them as `slideImages: Record<index, string>`, where `FAILED_IMAGE` (`'failed'`) means generation failed and nothing is shown. `src/lib/slide-image.ts` owns the wire rules: `isUsableImage`, `toRawBase64`, `sniffImageMime`, `toDataUrl` and the export validation (`hasWireImageFormat`, `isValidWireImage`, `MAX_SLIDE_IMAGE_CHARS`).

**Pedagogical part** — `SlideData.part`, the lesson phase a Slide belongs to. `src/lib/pedagogy.ts` owns the rules: `PEDAGOGICAL_PARTS` (Title Page, then the six numbered lesson parts Review to Assessment), `normalizePart` / `canonicalPart` (maps wording such as "Activity" to a canonical part; unknown text is kept), `partOrdinal`, `partLabel` (badge text) and `partWantsAutoImage` (Motivation, Lesson Presentation and Discussion get batch images). The UI adds only colours (`src/components/part-badge.ts`).

**Credit (`ImageMetadata`)** — Source and attribution of a library image (NASA or Wikimedia Commons), stored on `SlideData.imageMetadata`. `describeImageCredit` in `src/lib/image-credit.ts` describes it once (source label, credit line, source link, license, notes); each renderer only formats that description. AI-generated images have no Credit.

**Image intent** — A user request for a specific Slide image: a single regeneration or a library selection. A new Image intent supersedes any older in-flight result for that Slide, including a pending batch result.
