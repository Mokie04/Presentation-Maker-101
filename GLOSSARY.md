# Glossary

**Slideshow** — `src/components/SlideshowModal.tsx`, a full-screen view using the same passive Slide view at 16:9. Previous/Next, jump, keyboard and swipe controls navigate independently of Normal selection. Portrait phones show a dismissible rotate hint; credited images retain clickable source and license links below the slide.

**Touch navigation** — Previous/Next controls in the workspace status bar and horizontal stage swipes over 60 px. `src/components/workspace/use-swipe.ts` shares gesture handling with the slideshow, ignoring vertical gestures, active text editing and panel starts. Phone controls have at least 44 px touch targets; the panel uses native Slide details and Image disclosures, with Slide details initially open on phones and both sections open from 768 px.

**Dialog focus** — `src/components/workspace/use-dialog-focus.ts` keeps keyboard focus inside the open slideshow, makes the page behind it inert and returns focus to the Preview button on close.

**Slide** — One page of a presentation: `SlideData` (`slideNumber`, `part`, `title`, `contentPoints`, `visualDescription`, optional `imageMetadata`). `slideNumber` is its 1-based position and is renumbered when the deck order changes.

**Slide deck** — The ordered Slides of one generated presentation plus its metadata (`subject`, `originalWriters`, `topic`, and optional server-recorded `subjectEvidence`). The wire and export shape is `PresentationData`. Inside the client, each Slide also carries a stable internal id that is never reused and never sent to the server. `src/lib/deck/deck-reducer.ts` owns its edits and image race rules.

**Slide view** — `src/components/SlideView.tsx`, a passive 16:9 rendering of one Slide from the shared theme. It accepts the Slide, zero-based index, total, optional image and original writers, plus full or thumbnail mode. Text and formulas stay accessible in full mode; thumbnails are hidden from assistive technology and ignore pointer events. Phase 1 ships it unused.

**Slide theme** — `src/lib/slide-theme.ts`, the pure shared PPTX palette, Poppins font face, point sizes and title/content geometry. Coordinates preserve the export's inches and percentages; the Slide view converts them to slide percentages and container-scaled type. Index zero uses the title layout.

**Slide rail** — `src/components/workspace/SlideRail.tsx`, the numbered thumbnail list in Normal view. Selection uses stable slide IDs, with listbox semantics, a highlighted option and memoized `SlideView` thumbnails. It scrolls vertically on tablets and laptops and horizontally below the stage on phones.

**Slide sorter** — `src/components/workspace/SlideSorter.tsx`, the responsive thumbnail list for selecting, reordering, duplicating and deleting Slides. Drag handling is shared with the Normal rail; visible move buttons support touch, and Alt+ArrowUp/ArrowDown moves from the rail. Double-click or Enter opens a sorter card in Normal view. The first position uses the title layout in the exported file.

**Slide panel** — `src/components/workspace/SlidePanel.tsx`, the always-editable controls for the selected Slide: part, title, bullets, image, delete and add. `src/components/SlideImageControls.tsx` holds its image and credit controls.

**Inline editing** — Editing a title or stored bullet directly on the Normal stage at widths of 768 px and above. `src/components/workspace/EditableSlideView.tsx` supplies interactive wrappers to the passive Slide view; `src/components/workspace/InlineText.tsx` uses a plain textarea showing raw formula syntax. Changes update the deck and panel live, Escape restores the starting value, Enter inserts a bullet, and empty bullets are deleted on blur or Backspace. Derived writer text stays passive; phones use the panel.

**Workspace view** — Normal is the default three-pane workspace and Slide sorter arranges the deck; the original card grid and its Edit Slides toggle were retired in Phase 6. `src/components/workspace/PresentationWorkspaceView.tsx` owns the view switch. `src/lib/deck/use-slide-selection.ts` keeps selection as UI state outside the deck reducer; a single workspace keyboard listener navigates without intercepting form-field keys.

**Slide image** — The picture shown on a Slide and exported to PPTX: raw base64 or a `data:` URL. The UI and PPTX route use index-keyed `slideImages`; `FAILED_IMAGE` (`'failed'`) means generation failed and nothing is shown. `src/lib/slide-image.ts` owns the wire rules: `isUsableImage`, `toRawBase64`, `sniffImageMime`, `toDataUrl` and export validation (`hasWireImageFormat`, `MAX_SLIDE_IMAGE_CHARS`).

**Pedagogical part** — `SlideData.part`, the lesson phase a Slide belongs to. `src/lib/pedagogy.ts` owns the rules: `PEDAGOGICAL_PARTS` (Title Page, then the six numbered lesson parts Review to Assessment), `normalizePart` / `canonicalPart` (maps wording such as "Activity" to a canonical part; unknown text is kept), `partOrdinal`, `partLabel` (badge text) and `partWantsAutoImage` (Motivation, Lesson Presentation and Discussion get batch images). The UI adds only colours (`src/components/part-badge.ts`).

**Export payload** — The `/api/download-pptx` request: `{ presentationData, slideImages, session }`. `src/lib/export/` builds it: `buildPptxExportRequest` compresses usable images (`compress-image.ts`) and drops them from the last slide down until the body fits `CLIENT_EXPORT_BUDGET_CHARS`, removing the Credit of each dropped image; `limits.ts` holds that budget and the server cap `MAX_EXPORT_BODY_BYTES`; `filename.ts` names exports; `use-deck-export.ts` runs both downloads.

**Credit (`ImageMetadata`)** — Source and attribution of a library image (NASA or Wikimedia Commons), stored on `SlideData.imageMetadata`. `describeImageCredit` in `src/lib/image-credit.ts` describes it once (source label, credit line, source link, license, notes); each renderer only formats that description. A CC BY-SA Commons Credit is marked ShareAlike (`license.shareAlike`), and its notes state that the exported copy is an adapted copy that stays under the same license (`docs/adr/0011-commons-cc-by-sa.md`). AI-generated images have no Credit.

**Image intent** — A user request for a specific Slide image: a single regeneration or a library selection. A new Image intent supersedes any older in-flight result for that Slide, including a pending batch result.

**Image provider** — An automatic image-generation source implementing `ImageProvider` in `src/lib/providers/image/types.ts`: an `id` and `generate(ImageRequest)` returning raw base64. `ImageRequest` carries the description, optional title and variation. The OpenAI-compatible adapter owns its request details, response handling and retries; the Pexels adapter delegates to the existing search/download provider. `compose.ts` resolves the `ai` / `pexels` / `auto` order and preserves the first provider's error if all fail. `image-provider.ts` remains the public facade used by routes, batch generation and health checks.

**Image library** — A searchable source of manually selected images. `ImageLibrary` in `src/lib/image-library/library.ts` defines its source, label, selection schema, search/select operations and public error mapping. `nasa.ts` and `commons.ts` adapt the existing providers; `route-definitions.ts` supplies their shared route policy. Client-safe candidate types, labels, paths and selection helpers live in `types.ts`. To add a third library, add its adapter here, extend the source/metadata and candidate unions and library constants, wire its routes through the shared definitions, and add it to the picker and adapter contract tests.

**Image candidate** — A search result shown before selection, discriminated by `source` in `src/lib/image-library/types.ts`. NASA results carry a `nasaId`; Commons results carry a `fileId` and may be unselectable. `candidateId` identifies a displayed result and `selectRequestBody` sends only its ID to the select route; finished image attribution is `ImageMetadata`, not the candidate.

**Configuration** — Feature settings validated only when needed. `src/lib/env.ts` owns pure `readTextProviderConfig`, `readImageProviderConfig`, `readPexelsConfig` and `readAppConfig` readers, with matching lazy, cached `get*Config` accessors. `resetConfigCache` isolates tests; App Store auth remains in `src/lib/sessionAuth.ts`.

**Route** — An HTTP handler under `src/app/api/` assigned from `defineRoute` in `src/lib/api/`, which authenticates before parsing, caps bodies, optionally validates an `input` schema and sanitizes unexpected errors. `src/app/api/session/route.ts` bootstraps authentication and is the sole exception.

**Lesson session** — The teacher's selected `Session 1` through `Session 5`, listed in `src/lib/utils/session-options.ts` and validated for generation. It labels a lesson and its exports; it is unrelated to login.

**Auth session** — The signed `presentation_maker_pro_session` cookie created after the App Store handoff by `src/app/api/session/route.ts`. `requireSession` in `src/lib/sessionAuth.ts` checks it for protected API routes.
