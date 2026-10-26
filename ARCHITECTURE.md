# Architecture

Presentation Maker turns a teacher's lesson text into an editable slide deck and downloadable PowerPoint or Markdown. `src/components/UploadSection.tsx` accepts a pasted lesson or sends a document to `src/app/api/upload/route.ts`, which uses `src/lib/parsers/document-parser.ts`. `src/app/api/generate/route.ts` validates the lesson and session, then calls `src/lib/providers/text-provider.ts` for structured slides. `src/lib/deck/session-decks-reducer.ts` holds session decks and navigation above the existing deck reducer; `src/lib/deck/use-slide-deck.ts` exposes the active deck and owns image requests; `src/lib/services/image-batch.ts` requests eligible images, while `src/components/ImageLibraryPicker.tsx` lets a teacher select NASA or Commons images. `src/lib/export/use-deck-export.ts` sends the current deck to the PPTX and Markdown routes, which use `src/lib/services/pptx-generator.ts` and `src/lib/services/markdown-generator.ts`.

## Module map

| Module | Owns and exposes | Tests |
|---|---|---|
| `src/components/home/HomeHero.tsx`, `src/components/home/Mokie.tsx`, `src/components/home/HomeTrustStrip.tsx` | Home-only promise, workflow, decorative responsive WebP mascot and supporting copy. `src/app/page.tsx` renders these only without a deck. | `tests/components/HomeScreen.test.tsx` |
| `src/components/UploadSection.tsx`, `src/components/home/GeneratingPanel.tsx` | Numbered setup, native session radios, existing subject/drop/upload contracts, input-ready steps and real loading-stage announcements with decorative indeterminate activity. | `tests/components/UploadSection.test.tsx`, `tests/components/UploadAccessibility.test.tsx`, `tests/components/UploadSizeLimit.test.tsx`, `tests/components/HomeScreen.test.tsx` |
| `src/lib/fonts.ts` | One local Poppins definition shared by home and slide rendering. Home body/heading fonts are scoped in `src/app/globals.css`; workspace chrome retains its original font. | `tests/components/HomeScreen.test.tsx`, `tests/components/SlideView.test.tsx` |
| `src/lib/deck/session-decks-reducer.ts`, `src/lib/deck/use-slide-deck.ts` | In-memory decks keyed by session, per-session selection/view, one shared monotonic ID counter and ID-routed async images. Successful generation replaces only its session. | `tests/lib/deck/session-decks-reducer.test.ts`, `tests/lib/deck/session-decks-routing.test.tsx` |
| `src/lib/generate-client.ts` | Shared generation request, loading stages, existing error mapping and abort checks around response/body reading. | `tests/lib/generate-client.test.ts` |
| `src/components/workspace/SessionTabs.tsx`, `src/components/workspace/SessionDialogs.tsx` | Roving session tabs, generation/replacement/cancel and multi-session reset confirmation; refresh-loss disclosure and shared modal focus management. Exports/slideshow follow the active session in `src/app/page.tsx`. Persistence is deferred to Phase 2 (`docs/multi-session-roadmap.md`). | `tests/components/SessionDecks.test.tsx` |
| `src/components/SlideshowModal.tsx` | Full-screen navigation around the shared passive slide renderer, fitted to the available space, with clickable image attribution and a portrait phone rotate hint. | `tests/components/SlideshowModal.test.tsx`, `tests/components/SlideshowSlideView.test.tsx` |
| `src/components/workspace/use-swipe.ts` | Shared horizontal touch navigation for the Normal stage and slideshow; strict 60 px threshold with vertical, editing, panel and multitouch guards. It never prevents native page scrolling. | `tests/components/use-swipe.test.tsx`, `tests/components/TouchWorkspace.test.tsx` |
| `src/lib/deck/slide-split.ts`, `src/lib/slide-split.ts` | Continuation title numbering and the largest fitting body prefix. `slideSplit` in the reducer preserves original image ownership; deck and selection hooks pair the new ID with its original to retain selection before render. | `tests/lib/deck/slide-split.test.ts`, `tests/lib/suggest-split-index.test.ts`, `tests/lib/deck/use-slide-split.test.tsx` |
| `src/lib/deck/` | Stable slide IDs, image-version race rules and edits in `deckReducer`; `useSlideDeck` exposes client actions; selectors produce API and index-keyed views. | `tests/lib/deck/deck-reducer.test.ts`, `tests/lib/deck/use-slide-deck.test.tsx` |
| `src/lib/deck/use-slide-selection.ts` | Pure selection reconciliation and bounded navigation by stable slide ID; `useSlideSelection` supports standalone callers; the session layer reuses its pure rules to retain per-session selection outside the deck reducer. | `tests/lib/deck/use-slide-selection.test.ts` |
| `src/components/workspace/` | `PresentationWorkspaceView` renders per-session Normal/Slide sorter controls from the deck hook, the compact header, status and one navigation listener; `SlideRail` shows thumbnails, `SlideStage` fits the shared slide, and `SlidePanel` edits, duplicates, moves or adds after the selected stable ID. The card grid was retired in Phase 6 (`docs/adr/0015-retire-the-card-grid.md`). | `tests/components/NormalView.test.tsx`, `tests/components/PresentationWorkspace.test.tsx`, `tests/components/SlideRail.test.tsx`, `tests/components/SlideStage.test.tsx`, `tests/components/SlidePanel.test.tsx`, `tests/components/SlidePanelReorder.test.tsx` |
| `src/components/workspace/SlideSorter.tsx`, `src/components/workspace/SlideThumbnail.tsx` | Responsive sorter cards and shared memoized slide thumbnails; selection, open-in-Normal and numbered card actions. | `tests/components/SlideSorter.test.tsx`, `tests/components/Sorter.test.tsx` |
| `src/components/workspace/use-slide-reorder.ts`, `src/components/workspace/SlideMoveButtons.tsx` | Shared HTML5 drag ownership and target state, rail Alt+Arrow reordering, and visible earlier/later controls for touch. | `tests/components/use-slide-reorder.test.tsx`, `tests/components/SlideRailReorder.test.tsx` |
| `src/components/workspace/EditableSlideView.tsx`, `src/components/workspace/InlineText.tsx` | One active title/bullet field on the Normal stage; raw text input, live deck updates, cancellation, insertion/deletion, autosizing and IME handling. The derived writers line remains passive. | `tests/components/InlineText.test.tsx`, `tests/components/EditableSlideView.test.tsx`, `tests/components/EditOnSlide.test.tsx` |
| `src/components/workspace/use-dialog-focus.ts` | Modal focus for the slideshow, session generation and reset confirmation: moves focus into the dialog, traps Tab, makes the background inert, locks page scroll and restores focus to the opener on close. | `tests/components/SlideshowAccessibility.test.tsx`, `tests/components/WorkspaceAccessibility.test.tsx` |
| `src/components/workspace/use-media-query.ts` | Client media-query subscription enables stage editing from 768 px; the phone panel remains the editor. | `tests/components/EditableSlideView.test.tsx`, `tests/components/EditOnSlide.test.tsx` |
| `src/lib/deck/deck-reducer.ts`, `src/lib/deck/use-slide-deck.ts` | `bulletInserted` inserts an empty point after a bounded index; `insertBullet` shares the existing edit and image ownership boundaries. | `tests/lib/deck/bullet-insertion.test.ts`, `tests/lib/deck/use-slide-deck-insertion.test.tsx` |
| `src/lib/deck/deck-reducer.ts`, `src/lib/deck/use-slide-deck.ts` | Stable-ID move, duplicate and optional add-after actions; renumber ordered selectors while preserving image ownership and isolating duplicated image tokens. | `tests/lib/deck/deck-operations.test.ts`, `tests/lib/deck/deck-operations-selection.test.ts`, `tests/lib/deck/use-slide-deck-operations.test.tsx` |
| `src/components/SlideImageControls.tsx` | Original image generation, picker, failure and attribution markup in the Normal panel. | `tests/components/SlideImageControls.test.tsx`, `tests/components/NasaPicker.test.tsx` |
| `src/lib/pedagogy.ts` | Canonical lesson parts, labels, ordinals and automatic-image eligibility through `normalizePart`, `partLabel` and `partWantsAutoImage`. | `tests/lib/pedagogy.test.ts` |
| `src/lib/image-credit.ts` | `describeImageCredit` supplies one attribution description for renderers. | `tests/lib/image-credit.test.ts`, `tests/lib/services/credit-characterization.test.ts` |
| `src/lib/slide-theme.ts`, `src/components/SlideView.tsx` | Shared PPTX palette, type sizes and geometry; `slideLayoutFor` and `hasVisual` select layouts. `SlideView` renders real formula text with local Poppins and a passive thumbnail mode; optional title/point render functions let the stage wrap stored text for editing. | `tests/lib/slide-theme.test.ts`, `tests/components/SlideView.test.tsx`, `tests/components/SlideViewEditing.test.tsx`, `tests/lib/services/slide-layout-characterization.test.ts` |
| `src/lib/slide-fit.ts`, `src/lib/slide-fit-metrics.ts`, `scripts/generate-slide-fit-metrics.mjs` | Pure `fitText` and layout-aware `fitSlide` select the largest fitting sizes with shared floors and margins. Generated Poppins advances and line heights keep browser and export decisions consistent. | `tests/lib/slide-fit.test.ts`, `tests/lib/slide-fit-metrics.test.ts`, `tests/lib/slide-fit-calibration.test.ts`, `tests/fixtures/slide-fit-corpus.json`, `tests/lib/services/slide-fit-characterization.test.ts`, `tests/lib/services/slide-fit-dense.test.ts` |
| `src/components/workspace/SlideFitNotice.tsx` | Separate title/body overflow messages and a Split action in the stage and panel; rail and sorter share `getSlideOverflow` for accessible suffixes and visible markers. | `tests/components/SlideFit.test.tsx`, `tests/components/SlideFitIntegration.test.tsx`, `tests/components/SlideSplitNotice.test.tsx`, `tests/components/SlideSplitIntegration.test.tsx` |
| `src/lib/slide-image.ts` | Wire image sentinel, format and size checks through `FAILED_IMAGE`, `isUsableImage` and `hasWireImageFormat`. | `tests/lib/slide-image.test.ts` |
| `src/lib/export/` | `buildPptxExportRequest` compresses and budgets images; `useDeckExport` downloads both formats. | `tests/lib/export/build-export-request.test.ts`, `tests/lib/export/use-deck-export.test.tsx` |
| `src/lib/api/` | `defineRoute` orders auth, capped parsing, optional schema validation and response/error policy; `PublicError` carries safe client errors. | `tests/lib/api/define-route.test.ts`, `tests/architecture/routes-use-define-route.test.ts` |
| `src/lib/env.ts` | Lazy per-feature `get*Config` readers for text, image, Pexels and upload limits. | `tests/lib/env.test.ts`, `tests/architecture/config-boundary.test.ts` |
| `src/lib/image-library/` | `ImageLibrary` search/select contract, NASA and Commons adapters, candidate helpers and shared route definitions. | `tests/lib/image-library/contract.test.ts`, `tests/lib/image-library/route-definitions.test.ts` |
| `src/lib/providers/bounded-fetch.ts` | Server-side fetch with a byte limit and one deadline across headers and body. | `tests/lib/providers/bounded-fetch.test.ts` |
| `src/lib/providers/image/` | `ImageProvider.generate`, OpenAI-compatible and Pexels adapters, and `resolveImageProviders` fallback order. | `tests/lib/providers/image/contract.test.ts`, `tests/lib/providers/image/compose.test.ts` |
| `src/lib/providers/text-provider.ts` | OpenAI-compatible text client, model response schema and `generateSlideContent` retries. `TextOutputTruncatedError` bypasses retries on output-limit completion; the generate route maps it to the safe 422 response. | `tests/lib/providers/text-provider.test.ts`, `tests/lib/providers/text-provider-truncation.test.ts`, `tests/api/generate-truncation.test.ts`, `tests/components/GenerationTruncation.test.tsx` |
| `src/lib/prompts/slide-generation.ts` | Lossless continuation guidance, title/bullet text budgets and the assessment exception, retaining all canonical parts and the 25-slide minimum. | `tests/prompts/slide-text-budget.test.ts`, `tests/prompts/pedagogical-parts.test.ts` |
| `src/lib/auto-fit-deck.ts` | Pure generation-time body fitting via existing split helpers; 20-split rollback per original, unchanged no-op reference, renumbered continuations and preserved provenance. Called by the generate route. | `tests/lib/auto-fit-deck.test.ts`, `tests/api/generate-auto-fit.test.ts` |
| `src/lib/services/image-batch.ts`, `src/lib/deck/use-slide-deck.ts` | Client and server blank-visual filtering retains original batch indexes and image-result ownership. | `tests/lib/services/image-batch-blank-visual.test.ts`, `tests/lib/deck/blank-visual-batch.test.tsx` |
| `src/lib/utils/formula-parser.ts` | `parseFormulaToSegments` for PPTX/UI runs and `formatFormulaToUnicode` for Markdown. | `tests/lib/utils/formula-parser.test.ts` |
| `src/lib/sessionAuth.ts` | Signed App Store handoff, session cookie and `requireSession`; the bootstrap route is `src/app/api/session/route.ts`. | `tests/lib/sessionAuth.test.ts`, `tests/api/session.test.ts` |

## Enforced boundaries

- Every protected HTTP handler is assigned directly from `defineRoute`; the session bootstrap is the sole exception. `tests/architecture/routes-use-define-route.test.ts` checks the route files and `tests/api/auth-gate.test.ts` checks auth before body reads.
- `defineRoute` caps parsed request bodies, applies a declared Zod `input` schema and returns each route's fixed `failureMessage` for unexpected failures. `PublicError` is the explicit way for a handler to return its own safe message; auth and validation failures have their own client responses. See `tests/lib/api/define-route.test.ts`, `tests/api/input-validation.test.ts` and `tests/api/error-sanitization.test.ts`.
- Direct `process.env` reads in `src/` are confined to `src/lib/env.ts` and `src/lib/sessionAuth.ts`, checked by `tests/architecture/config-boundary.test.ts`.
- The reducer rejects image results whose slide ID has disappeared or whose version was superseded; `tests/lib/deck/deck-reducer.test.ts` covers this. Part rules, credit descriptions and wire-image rules live respectively in `src/lib/pedagogy.ts`, `src/lib/image-credit.ts` and `src/lib/slide-image.ts`.

## How to add

**An API route**

1. Add a handler under `src/app/api/` using `defineRoute` from `src/lib/api/`.
2. Choose `parse` and an `input` Zod schema; set `maxBodyBytes` for the payload.
3. Set a route-specific, safe `failureMessage`; throw `PublicError` only for safe, intentional client messages.
4. Keep any Next.js segment exports such as `maxDuration` in the route file.
5. Extend `tests/api/input-validation.test.ts` and route-specific tests; the route guard must still pass.

**An image library**

1. Add an adapter implementing `ImageLibrary` in `src/lib/image-library/` with search, selection schema, select and error mapping.
2. Extend the source and candidate unions and `IMAGE_LIBRARIES` in `src/lib/image-library/types.ts`.
3. Extend `ImageMetadata` in `src/lib/image-metadata.ts` and its credit in `src/lib/image-credit.ts`.
4. Add search/select routes under `src/app/api/` using `searchDefinition`, `selectDefinition` and `defineRoute`.
5. Wire `src/components/ImageLibraryPicker.tsx`; extend `tests/lib/image-library/contract.test.ts`.

**An image provider, such as Bedrock**

1. Add an adapter implementing `ImageProvider.generate` in `src/lib/providers/image/` and extend its ID union in `src/lib/providers/image/types.ts`.
2. Register its selection and fallback order in `resolveImageProviders` in `src/lib/providers/image/compose.ts`.
3. Add a feature-specific config reader in `src/lib/env.ts`; connect the facade in `src/lib/providers/image-provider.ts`.
4. If callers can select it, extend `src/lib/schemas/image-request.ts` and the source types in the facade and image routes.
5. Extend `tests/lib/providers/image/contract.test.ts` and `tests/lib/providers/image/compose.test.ts`.
6. Review the OpenAI adapter's fixed `1024x576` size in `src/lib/providers/image/openai.ts` before sharing request settings.

**A credit source**

1. Add its metadata variant to `src/lib/image-metadata.ts`.
2. Extend `describeImageCredit` and source labels in `src/lib/image-credit.ts`.
3. Update library selection to produce the new metadata variant.
4. Extend export validation in `src/lib/schemas/presentation-export.ts` through the metadata schema.
5. Check each renderer through `tests/lib/image-credit.test.ts` and the PPTX/Markdown credit tests.

**A lesson part**

1. Add the name and normalization rule in `src/lib/pedagogy.ts`.
2. Decide its ordinal and automatic-image eligibility in the same module.
3. Add its badge colour in `src/components/part-badge.ts`.
4. Update generation instructions in `src/lib/prompts/slide-generation.ts` if the new part should be generated.
5. Extend `tests/lib/pedagogy.test.ts` and `tests/prompts/pedagogical-parts.test.ts`.

## Working agreements and limitations

Use one branch per change, open a PR, require green `verify` CI and a Vercel preview smoke test, then merge after approval; do not commit directly to `main`. `.github/workflows/ci.yml` runs typecheck, lint and `npm test` without provider secrets. Branch-protection configuration is separate from this repository; `docs/architecture-roadmap.md` still lists making `verify` required as a user action.

- `src/lib/upload-limits.ts` sets the 4 MB default that `src/lib/env.ts` uses for `MAX_FILE_SIZE_MB`; it fits under the [4.5 MB](https://vercel.com/docs/functions/limitations#request-body-size) Vercel request-body limit, and `src/components/UploadSection.tsx` refuses larger files before sending and explains a 413. An override above about 4.4 MB will still fail on Vercel before `src/app/api/upload/route.ts` runs, and the browser pre-check always uses the 4 MB default.
- `src/lib/providers/image/openai.ts` sends a fixed `1024x576` size even though the request interface does not carry a size.
- `FAILED_IMAGE` is still the `'failed'` wire value in `src/lib/slide-image.ts`; `src/lib/deck/selectors.ts` can emit it for failed slides, and `src/app/api/download-pptx/route.ts` accepts it. It is not an image to render or credit.
