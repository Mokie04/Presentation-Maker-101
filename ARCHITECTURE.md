# Architecture

Presentation Maker turns a teacher's lesson text into an editable slide deck and downloadable PowerPoint or Markdown. `src/components/UploadSection.tsx` accepts a pasted lesson or sends a document to `src/app/api/upload/route.ts`, which uses `src/lib/parsers/document-parser.ts`. `src/app/api/generate/route.ts` validates the lesson and session, then calls `src/lib/providers/text-provider.ts` for structured slides. `src/lib/deck/use-slide-deck.ts` holds edits and image requests; `src/lib/services/image-batch.ts` requests eligible images, while `src/components/ImageLibraryPicker.tsx` lets a teacher select NASA or Commons images. `src/lib/export/use-deck-export.ts` sends the current deck to the PPTX and Markdown routes, which use `src/lib/services/pptx-generator.ts` and `src/lib/services/markdown-generator.ts`.

## Module map

| Module | Owns and exposes | Tests |
|---|---|---|
| `src/components/SlideshowModal.tsx` | Full-screen navigation around the shared passive slide renderer, fitted to the available space, with clickable image attribution and a portrait phone rotate hint. | `tests/components/SlideshowModal.test.tsx`, `tests/components/SlideshowSlideView.test.tsx` |
| `src/components/workspace/use-swipe.ts` | Shared horizontal touch navigation for the Normal stage and slideshow; strict 60 px threshold with vertical, editing, panel and multitouch guards. It never prevents native page scrolling. | `tests/components/use-swipe.test.tsx`, `tests/components/TouchWorkspace.test.tsx` |
| `src/lib/deck/` | Stable slide IDs, image-version race rules and edits in `deckReducer`; `useSlideDeck` exposes client actions; selectors produce API and index-keyed views. | `tests/lib/deck/deck-reducer.test.ts`, `tests/lib/deck/use-slide-deck.test.tsx` |
| `src/lib/deck/use-slide-selection.ts` | Pure selection reconciliation and bounded navigation by stable slide ID; `useSlideSelection` keeps selection outside the deck reducer. | `tests/lib/deck/use-slide-selection.test.ts` |
| `src/components/workspace/` | `PresentationWorkspaceView` owns Normal/Slide sorter switching, the compact header, status and one navigation listener; `SlideRail` shows thumbnails, `SlideStage` fits the shared slide, and `SlidePanel` edits, duplicates, moves or adds after the selected stable ID. The card grid was retired in Phase 6 (`docs/adr/0015-retire-the-card-grid.md`). | `tests/components/NormalView.test.tsx`, `tests/components/PresentationWorkspace.test.tsx`, `tests/components/SlideRail.test.tsx`, `tests/components/SlideStage.test.tsx`, `tests/components/SlidePanel.test.tsx`, `tests/components/SlidePanelReorder.test.tsx` |
| `src/components/workspace/SlideSorter.tsx`, `src/components/workspace/SlideThumbnail.tsx` | Responsive sorter cards and shared memoized slide thumbnails; selection, open-in-Normal and numbered card actions. | `tests/components/SlideSorter.test.tsx`, `tests/components/Sorter.test.tsx` |
| `src/components/workspace/use-slide-reorder.ts`, `src/components/workspace/SlideMoveButtons.tsx` | Shared HTML5 drag ownership and target state, rail Alt+Arrow reordering, and visible earlier/later controls for touch. | `tests/components/use-slide-reorder.test.tsx`, `tests/components/SlideRailReorder.test.tsx` |
| `src/components/workspace/EditableSlideView.tsx`, `src/components/workspace/InlineText.tsx` | One active title/bullet field on the Normal stage; raw text input, live deck updates, cancellation, insertion/deletion, autosizing and IME handling. The derived writers line remains passive. | `tests/components/InlineText.test.tsx`, `tests/components/EditableSlideView.test.tsx`, `tests/components/EditOnSlide.test.tsx` |
| `src/components/workspace/use-dialog-focus.ts` | Modal focus for the slideshow: moves focus into the dialog, traps Tab, makes the background inert, locks page scroll and restores focus to the opener on close. | `tests/components/SlideshowAccessibility.test.tsx`, `tests/components/WorkspaceAccessibility.test.tsx` |
| `src/components/workspace/use-media-query.ts` | Client media-query subscription enables stage editing from 768 px; the phone panel remains the editor. | `tests/components/EditableSlideView.test.tsx`, `tests/components/EditOnSlide.test.tsx` |
| `src/lib/deck/deck-reducer.ts`, `src/lib/deck/use-slide-deck.ts` | `bulletInserted` inserts an empty point after a bounded index; `insertBullet` shares the existing edit and image ownership boundaries. | `tests/lib/deck/bullet-insertion.test.ts`, `tests/lib/deck/use-slide-deck-insertion.test.tsx` |
| `src/lib/deck/deck-reducer.ts`, `src/lib/deck/use-slide-deck.ts` | Stable-ID move, duplicate and optional add-after actions; renumber ordered selectors while preserving image ownership and isolating duplicated image tokens. | `tests/lib/deck/deck-operations.test.ts`, `tests/lib/deck/deck-operations-selection.test.ts`, `tests/lib/deck/use-slide-deck-operations.test.tsx` |
| `src/components/SlideImageControls.tsx` | Original image generation, picker, failure and attribution markup in the Normal panel. | `tests/components/SlideImageControls.test.tsx`, `tests/components/NasaPicker.test.tsx` |
| `src/lib/pedagogy.ts` | Canonical lesson parts, labels, ordinals and automatic-image eligibility through `normalizePart`, `partLabel` and `partWantsAutoImage`. | `tests/lib/pedagogy.test.ts` |
| `src/lib/image-credit.ts` | `describeImageCredit` supplies one attribution description for renderers. | `tests/lib/image-credit.test.ts`, `tests/lib/services/credit-characterization.test.ts` |
| `src/lib/slide-theme.ts`, `src/components/SlideView.tsx` | Shared PPTX palette, type sizes and geometry; `slideLayoutFor` and `hasVisual` select layouts. `SlideView` renders real formula text with local Poppins and a passive thumbnail mode; optional title/point render functions let the stage wrap stored text for editing. | `tests/lib/slide-theme.test.ts`, `tests/components/SlideView.test.tsx`, `tests/components/SlideViewEditing.test.tsx`, `tests/lib/services/slide-layout-characterization.test.ts` |
| `src/lib/slide-image.ts` | Wire image sentinel, format and size checks through `FAILED_IMAGE`, `isUsableImage` and `hasWireImageFormat`. | `tests/lib/slide-image.test.ts` |
| `src/lib/export/` | `buildPptxExportRequest` compresses and budgets images; `useDeckExport` downloads both formats. | `tests/lib/export/build-export-request.test.ts`, `tests/lib/export/use-deck-export.test.tsx` |
| `src/lib/api/` | `defineRoute` orders auth, capped parsing, optional schema validation and response/error policy; `PublicError` carries safe client errors. | `tests/lib/api/define-route.test.ts`, `tests/architecture/routes-use-define-route.test.ts` |
| `src/lib/env.ts` | Lazy per-feature `get*Config` readers for text, image, Pexels and upload limits. | `tests/lib/env.test.ts`, `tests/architecture/config-boundary.test.ts` |
| `src/lib/image-library/` | `ImageLibrary` search/select contract, NASA and Commons adapters, candidate helpers and shared route definitions. | `tests/lib/image-library/contract.test.ts`, `tests/lib/image-library/route-definitions.test.ts` |
| `src/lib/providers/bounded-fetch.ts` | Server-side fetch with a byte limit and one deadline across headers and body. | `tests/lib/providers/bounded-fetch.test.ts` |
| `src/lib/providers/image/` | `ImageProvider.generate`, OpenAI-compatible and Pexels adapters, and `resolveImageProviders` fallback order. | `tests/lib/providers/image/contract.test.ts`, `tests/lib/providers/image/compose.test.ts` |
| `src/lib/providers/text-provider.ts` | OpenAI-compatible text client, model response schema and `generateSlideContent` retries. | `tests/lib/providers/text-provider.test.ts` |
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

- `src/lib/env.ts` defaults `MAX_FILE_SIZE_MB` to 10, and `src/app/api/upload/route.ts` checks that file-size limit. Vercel Functions currently cap request payloads at [4.5 MB](https://vercel.com/docs/functions/limitations#request-body-size), so a nominally allowed upload can be rejected before this route runs.
- `src/lib/providers/image/openai.ts` sends a fixed `1024x576` size even though the request interface does not carry a size.
- `FAILED_IMAGE` is still the `'failed'` wire value in `src/lib/slide-image.ts`; `src/lib/deck/selectors.ts` can emit it for failed slides, and `src/app/api/download-pptx/route.ts` accepts it. It is not an image to render or credit.
