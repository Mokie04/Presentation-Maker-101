# Glossary

**Slide** — One page of a presentation: `SlideData` (`slideNumber`, `part`, `title`, `contentPoints`, `visualDescription`, optional `imageMetadata`). `slideNumber` is its 1-based position and is renumbered when a Slide is deleted.

**Slide deck** — The ordered Slides of one generated presentation plus its metadata (`subject`, `originalWriters`, `topic`). The wire and export shape is `PresentationData`. Inside the client, each Slide also carries an internal id that is never reused and never sent to the server.

**Slide image** — The picture shown on a Slide and exported to PPTX: base64 or a `data:` URL. The UI and export routes receive them as `slideImages: Record<index, string>`, where `'failed'` means generation failed and nothing is shown.

**Pedagogical part** — `SlideData.part`, the lesson phase a Slide belongs to (`PEDAGOGICAL_PARTS` in `SlideCard`, e.g. Review, Motivation, Discussion, Assessment). It decides whether batch generation makes an image for the Slide (`shouldGenerateImageForPart`).

**Credit (`ImageMetadata`)** — Source and attribution of a library image (NASA or Wikimedia Commons), stored on `SlideData.imageMetadata` and rendered by `imageCreditText`. AI-generated images have no Credit.

**Image intent** — A user request for a specific Slide image: a single regeneration or a library selection. A new Image intent supersedes any older in-flight result for that Slide, including a pending batch result.
