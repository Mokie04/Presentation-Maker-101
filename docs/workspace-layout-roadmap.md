# Roadmap: a PowerPoint-style workspace

Same loop as the earlier roadmaps: one prompt per phase, a developer chat executes it on a branch, the planner verifies, and each phase ships through a PR, CI and the Vercel preview before the next prompt. Developers never push or merge on their own.

## Problem

After generation the workspace is a two-column grid of tall slide cards with an "Edit Slides" toggle that turns each card into a form. It is hard to scan and edit, and it does not look like the deck the teacher will download. A slide is also drawn three separate ways: the editing card (`SlideCard`), the fullscreen slideshow (`SlideshowModal`) and the PowerPoint export (`pptx-generator.ts`).

## Target

The familiar PowerPoint layout:
- a left rail of numbered slide thumbnails with the current slide highlighted;
- a large 16:9 slide in the centre that looks like the exported slide;
- a right panel with the controls for the selected slide (lesson part, title, bullets, image: regenerate, find image, credit);
- a status bar ("Slide 3 of 28") and a view switch: Normal, Slide sorter, Slideshow;
- a Slide sorter view (thumbnail grid) for reordering, duplicating and deleting.

## Decisions (accepted by the product owner)

| # | Decision |
|---|---|
| 1 | Laptops and tablets get the full three-pane layout; phones get a simplified stacked layout (thumbnail strip at the bottom, panel in a drawer). |
| 2 | Phase 2 edits text in the right-hand panel; editing directly on the big slide comes later (Phase 4). |
| 3 | The old card grid is replaced by the Slide sorter view; the editing cards are removed at the end. |
| 4 | Drag-to-reorder, duplicate and add-after-current are in scope (Phase 3), with new deck actions tested in the reducer. |
| 5 | The big slide mirrors the PowerPoint export (hero title slide, then content slides with bullets left and the image right), driven by shared theme tokens and layout geometry, so what teachers see is close to what they download. Fonts may differ slightly; this is documented. |
| 6 | A clickable layout mock is approved before Phase 2 starts. |

## Phases

### Phase 0: layout mock (planner)
A clickable HTML mock of the Normal view and the Sorter view, approved before Phase 2.

### Phase 1: one definition of how a slide looks — done
- `src/lib/slide-theme.ts`: colours, font face, type sizes and layout geometry (positions and sizes of the title, bullets, image box and credit line on the 13.333 x 7.5 in slide), plus which layout a slide uses (hero title for the first slide, content layout for the rest). `pptx-generator.ts` reads from it; the exported PPTX XML must stay byte-identical (characterization first).
- `src/components/SlideView.tsx`: renders a slide at 16:9 from the same tokens and geometry, scaling with its container (CSS container units, no JavaScript measuring), with a thumbnail mode for the rail. Not wired into the app yet (it ships unused, like the deck module did in its Phase 1).
- Done: six slide XML snapshots captured before extraction still pass unchanged; `SlideView` is tested for both layouts, image or placeholder, formulas, credit without an image, thumbnail accessibility and shared geometry. It remains unused by the app.
- Local verification also compared the three sample PPTX archives against the generator on main with a fixed export time: whole archives were byte-identical.
- Poppins regular, bold and italic are bundled locally under `src/app/fonts/` with their SIL Open Font License and loaded only by `SlideView` through `next/font/local`. Builds need no Google Fonts connection. Browser wrapping and PowerPoint shrink-to-fit may still differ, especially for dense text; the PPTX remains the source of truth.

### Phase 2: Normal view — done
- Implemented: Normal is the default, with a memoized `SlideView` rail, a fitted 16:9 stage, an always-editable selected-slide panel, a compact header and a live status bar with Normal/Grid switching. Selection uses stable slide IDs in `useSlideSelection`, outside the deck reducer; one workspace keyboard listener handles arrows, page keys, Home and End while leaving form keys alone.
- At lg (1024 px) and above the rail and panel are 188 px and 300 px with an expanding stage. At md the panel moves below the stage; below md the stage, horizontal rail and panel stack. Rail and panel scroll independently, and reduced-motion preferences are respected.
- Grid view, its Edit Slides toggle and Add Slide button, and the legacy card integration tests stay until Phase 6. Their opening helpers choose Grid; assertions and race checks remain intact. Image controls are shared by `SlideCard` and `SlidePanel` with unchanged card markup.
- Local visual verification uses eight stubbed slides at 1440, 1024, 768 and 390 px; no provider credits are spent. The slide renderer, reducer, routes and exports remain unchanged.

### Phase 3: Slide sorter and reordering — done
- Responsive memoized thumbnail grid, shared drag handling in the sorter and Normal rail, visible move buttons, duplication and deletion. Alt+ArrowUp/ArrowDown moves the selected rail slide; plain arrows retain selection navigation.
- Reducer actions move by stable ID, duplicate with independent content and image metadata, and insert after a given ID. Moves retain image versions, credits and pending state; duplicate IDs isolate late image results. The panel adds after the selection; Grid still appends.
- New reducer, selection, interaction and integration tests cover ownership, renumbering and the PowerPoint request's reordered slides, images and credits. Existing tests remain unchanged. Local eight-slide browser checks cover 1440, 768 and 390 px, both drag surfaces and the visible controls without provider calls.
- The first-slide title layout stays an export rule. See `docs/adr/0012-slide-reordering.md`; preview smoke and CI remain release gates.

### Phase 4: edit on the slide — done
- Normal stage titles and stored bullets open as plain textareas with inherited typography, a visible focus ring and raw formula syntax. Live updates use the same deck handlers as the panel; Enter finishes a title or inserts/focuses a new bullet, empty Backspace deletes and edits the previous bullet, empty blur deletes, and Escape restores the session's starting text. Composition events retain Enter/Backspace behavior.
- `SlideView` remains passive with optional title/point render functions. The derived writers line, part, visual, credit and counter stay passive; thumbnails and the slideshow never pass editing functions. Phones use the panel; on-slide editing starts at 768 px.
- New reducer, field, wrapper and workspace tests cover insertion, cancellation, focus, navigation, breakpoint behavior and panel/thumbnail synchronization. Existing tests remain unchanged. Local eight-slide browser checks cover 1440, 1024, 768 and 390 px without provider calls.
- Long text is clipped by the browser slide boxes rather than shrunk to fit; raw and formatted formulas can wrap differently. See `docs/adr/0013-edit-on-slide.md`; CI and preview smoke remain release gates.

### Phase 5: phones, accessibility, polish — done
- The slideshow draws the current slide with `SlideView`, fitted at 16:9 between its bars; credited images keep clickable source and license links below the slide, and portrait phones get a dismissible rotate hint. See `docs/adr/0014-slideshow-on-slide-view.md`.
- Touch: status-bar Previous/Next, a shared `useSwipe` for the stage and slideshow, 44 px targets below 768 px and collapsible Slide details/Image panel sections on phones.
- Accessibility: view switching and slide removal keep focus in the workspace, the slideshow traps focus and returns it to Preview, form fields and the upload drop zone are named, focus rings are two-tone, reduced motion is honoured and UI chrome text meets WCAG AA. An axe-core jsdom run (colour contrast excluded) covers Normal, Slide sorter, Grid and the slideshow.
- Existing tests remain unchanged except slideshow assertions that pinned the old layout. Local eight-slide browser checks cover 320, 390, 768, 1024 and 1440 px without provider calls. Part badges and slide colours keep their palette; their contrast findings are recorded for a later change.

### Phase 6: retire the old grid — done
- The card grid, its Edit Slides toggle and its append-only add button are removed; the workspace has two views, Normal and Slide sorter. See `docs/adr/0015-retire-the-card-grid.md`.
- The legacy integration tests now select a slide in the rail and act in the panel, with every scenario kept; the retired card tests moved to the panel's image controls where they were not already covered.
- The slideshow opens on the selected slide, and the Review, Motivation, Lesson Presentation and unknown-part badges use -700 shades for WCAG AA contrast with white text.
- Local eight-slide browser checks cover 1440, 768 and 390 px without provider calls.

Workspace layout roadmap complete — 2026-10-24.

## Risks

- The integration tests are tied to the card grid; Phase 2 must adapt them deliberately, not delete them.
- Fidelity has limits: the browser does not use PowerPoint's text layout, so fonts and line breaks differ slightly. The PPTX stays the source of truth.
- Thumbnails of 30 or more slides must stay cheap: no per-thumbnail JavaScript measuring and no re-rendering of unchanged slides.
- Selection is UI state, kept outside the deck reducer and keyed by the stable slide id.

## Shipping rule

Same as the other roadmaps: green CI, preview smoke test, PR merge after approval.
