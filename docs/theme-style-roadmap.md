# Roadmap: more slide themes and styles

Same loop as the earlier roadmaps: the planner writes one prompt per phase, a developer chat executes it on a branch, the planner verifies, and each phase ships through a PR, CI and the Vercel preview before the next prompt. Developers never push or merge on their own.

Status: **Phase 1 merged (a594175); Phase 2 implemented 2026-10-26, release pending planner review.** Phase 0 investigation and product decisions are accepted. See [ADR 0022](adr/0022-slide-themes.md) for the module, compatibility strategy and Classic contrast exceptions.

## What the product owner asked for

Add another theme and style to the generated decks. First read the ppt-master skill (https://github.com/hugohe3/ppt-master) and audit before planning.

## Part 1 — Investigation: what ppt-master is

Read at commit `78759bf` (2026-10-24), version 6.7.3. Cloned shallow into an isolated scratch folder and **only read**; no script from it was run.

### Facts

| Topic | Finding |
|---|---|
| What it is | A "skill": an agent workflow (route, role and gate documents) plus about 84 Python scripts. An AI agent plans the argument, writes one SVG per slide, and deterministic scripts convert the SVG into a native `.pptx` (`svg_to_pptx`, `python-pptx`). It runs on the user's machine inside an agent-capable AI tool. |
| Size | 13,111 files, 164 MB. Templates 62 MB (12,027 icons, sounds, brand packs), scripts 11 MB, references 3.2 MB. |
| Workflow shape | Multi-step with `BLOCKING` human confirmation gates; a run has Plan, then Do/Check/Act. Quality ceiling is the model; its own README says not to expect a finished deck in one shot. |
| Dependencies | 19 Python packages, including `flask`, `google-genai`, `edge-tts`, `curl_cffi`, `requests`, `PyMuPDF`, `skia-pathops`, `uharfbuzz`. |
| License | Repository and skill are MIT. Third-party assets carry their own licences (the icon notices say MIT does not replace them). Brand packs (McKinsey, Deloitte, Google, Microsoft and others) are trademarked identities. |
| Attribution guard | `scripts/attribution_guard.py` is a fail-closed integrity check: it hashes `LICENSE`, requires sponsor files and fixed metadata, and several scripts refuse to run if the package is modified. Vendoring or trimming the skill breaks it by design. |
| Instructions inside it | SKILL.md tells an agent to run that guard and to follow its routes. We treat all of it as data, not instructions, and ran nothing. |

### Fit with this product (conclusion)

**Do not adopt the engine. Borrow the design vocabulary.** ADR 0009 stands.

Why the engine does not fit:
1. Wrong runtime: our export is a Next.js route on Vercel (`maxDuration` 120 s for export, 300 s for generation). ppt-master needs a Python environment, an agent loop and several human gates.
2. Wrong cost model: each deck needs many model calls plus AI images. It would need spend controls and a sandbox first (the conditions already written in ADR 0009).
3. Licence and supply-chain surface: `PyMuPDF` is AGPL or commercial, 19 packages, a local Flask UI. Running it as a hosted service raises review work we do not need.
4. It would replace what already works: stable slide fitting, split, editing, per-session decks, and a 3.5 MB export budget.

What is genuinely useful to us:
1. **Its separation of concerns.** It keeps Brand (colour, typography), Style (shape language, decoration, whitespace, texture), Layout (structure) and Deck as independent kinds, and says a style "carries no fixed HEX". That is the right model for the request: a *theme* (palette and typography) and a *style* (how shapes, decoration and texture behave) are two axes.
2. **Its 18 visual styles**, described as shape language, composition, typography character, colour discipline and texture. Several suit a primary-school audience: `chalkboard`, `sketch-notes`, `paper-cut`, `soft-rounded`, `memphis`; `swiss-minimal` suits older grades.
3. **Font portability rule**: PPTX faces must be installed on the delivery machine; the authoring machine's fonts must not decide export faces. This is our biggest real risk (below).
4. **A discipline for text fit and legibility** that matches what we already built (restructure, shorten, split; do not silently miniaturise).

What we will not copy: brand packs, sound and icon libraries, sponsor material, or any verbatim style text (we write our own descriptions; if any wording is ever copied the MIT notice must travel with it). We will credit it as inspiration in the ADR.

## Part 2 — Audit of our codebase

### How "look" works today

One hard-coded theme in `src/lib/slide-theme.ts`: colours (`SHADE_PRIMARY`, `SHADE_SECONDARY`, `SHADE_BACKGROUND`, `SHADE_TEXT_DARK`, `FALLBACK_BG`, `FALLBACK_BORDER`, `TEXT_HEADING`, `TEXT_MUTED`, `TEXT_SUBTLE`), one font (`DEFAULT_FONT_FACE = 'Poppins'`), geometry (`TITLE_LAYOUT`, `CONTENT_LAYOUT`, credit and counter boxes), fit floors and margins.

Coupling map (who reads the constants):

| Consumer | Uses | Theme work needed |
|---|---|---|
| `src/components/SlideView.tsx` | colours as inline hex, geometry, Poppins through `src/lib/fonts.ts` | take colours, font and decoration from a theme object |
| `src/components/workspace/EditableSlideView.tsx` | geometry only | follows geometry from the theme |
| `src/lib/slide-fit.ts` | geometry, floors, `POPPINS_METRICS` (glyph widths) | **fit is font-specific**: each theme font needs its own metrics table; the function needs the theme passed in |
| `src/lib/services/pptx-generator.ts` (260 lines) | every constant above, `fontFace` on each text call, `slideObj.background` | take the theme as a parameter; add decoration drawing |
| `src/lib/slide-split.ts`, auto-fit (`autoFitDeck`) | call `fitSlide` | follow the new `fitSlide` signature |
| Tests | `tests/lib/slide-theme.test.ts`, `tests/lib/services/pptx-generator.test.ts` pin the constants; XML golden snapshots in `tests/lib/services/__snapshots__/` | **default theme must stay byte-identical**; those tests are the safety net |
| `PresentationData`, export schema, `download-pptx` route | no theme field | add an optional, validated `themeId` (default = current look) |
| Session decks state (merged) | holds decks per session | theme is lesson-level state outside `deckReducer`, like selection and view |
| Saved lesson (Phase 2, not built) | snapshot format not final | include `themeId` in the snapshot from the start |
| Markdown export, rail and part badges | not part of the slide look | unchanged |

### Findings and risks

1. **Fonts are the real constraint.** The PPTX names the font (`Poppins`); a teacher's PowerPoint without Poppins substitutes another, which is why the fit estimator keeps a safety margin. New themes with new fonts make this worse. `pptxgenjs` cannot embed fonts. Safe options:
   - Sayuna Classic keeps Poppins.
   - New themes use fonts present in Microsoft Office on Windows and Mac (Arial, Calibri, Georgia), and the browser, the slideshow and the fit estimator use their **metric-compatible OFL stand-ins** (Arimo or Liberation Sans for Arial, Carlito for Calibri, Gelasio for Georgia). Then browser, estimator and PowerPoint agree.
   - Handwritten or chalk fonts are out of scope (not installed on school PCs); the style comes from colour, shape and texture instead.
2. **Fit estimator** is wired to Poppins. Every new font needs `scripts/generate-slide-fit-metrics.mjs` generalised per font, and a test that the estimator matches measured widths.
3. **Contrast.** A dark theme (chalkboard) changes the credit line, counter, placeholder and image card colours, which are currently tuned for a light page. Every theme must pass WCAG AA for each foreground and background pair, enforced by a computed test over the tokens, not by eye.
4. **Two renderers must agree.** The browser (`SlideView`) and the PPTX (`pptxgenjs`) draw the same slide separately. Decoration (rounded frames, ribbons, layered sheets, shadows, background texture) must be implemented in both, with a parity test per theme, or the preview will lie.
5. **Export budget.** Background textures embedded as images count against the 3.5 MB export budget. Prefer vector shapes and solid or gradient fills; any texture image must be tiny and tested.
6. **Images.** Slides use Pexels photos (and optionally generated images). Dark themes and decorative frames change how photos sit; the generation prompt's "cartoon-style" wording does not change Pexels results. Pairing image style with theme is a later, separate decision, not v1.
7. **Verification gap we can close now.** An earlier open item is that native PowerPoint rendering of fitted text was never checked. This machine has both LibreOffice (`soffice`) and Microsoft PowerPoint installed. A render harness (PPTX to PDF to PNG through LibreOffice headless; optional spot checks in PowerPoint) lets us compare browser and PPTX per theme before shipping.
8. **Persistence timing.** Phase 2 (saved lessons, a separate branch to be built) should reserve `themeId`; otherwise a snapshot version bump is needed later.
9. **Per-lesson, not per-slide.** One look per lesson (all sessions) keeps it simple and consistent. Per-deck override is a later option.

## Design

### Model

```
Theme  = palette tokens + typography (export face, browser stand-in, metrics) + shape tokens
Style  = decoration treatment (frames, ribbons, layering, backgrounds) drawn by both renderers
Look   = Theme x Style, selected by one id
```

Ship **themes first** (colour and typography only, plus the small shape tokens that already exist: corner radius, frame border). Add **style treatments** after the theme plumbing is proven.

Switching a look is a pure render change: the slides are data, so it is instant, free (no provider calls) and reversible.

### Candidate looks (directions, hex decided in the Phase 0 mock)

| Look | Character | Inspired by | Audience |
|---|---|---|---|
| Sayuna Classic | current sky blue and cyan on pale blue, Poppins | existing | default, unchanged |
| Chalkboard | dark slate, chalk-white text, pastel accents, high contrast | `chalkboard` | all grades, projectors |
| Paper Notebook | warm cream, ink text, soft pastel blocks, rounded frames | `sketch-notes` / `paper-cut` | Kinder to Grade 3 |
| Bright Classroom | saturated friendly colour blocks, bold shapes | `memphis` / `soft-rounded` | primary |
| Clean Minimal | white, one accent, generous space | `swiss-minimal` | Grades 7 and up, formal |

Final list and count are a product decision (see below).

## Phases

### Phase 0: investigation, audit and plan (planner) — done
This document. Next: a clickable mock of the 4 or 5 looks on the real slide layout (same pattern as the workspace and home-screen mocks), approved before Phase 1.

### Phase 1: a theme module, no visible change — merged
- A `SlideTheme` object (palette, fonts with export face and browser stand-in, shape tokens), a registry (`getTheme(id)`), and the default theme equal to today's constants.
- `SlideView`, `EditableSlideView`, `slide-fit`, `slide-split`, `autoFitDeck` and `pptx-generator` take the theme as a parameter. Constants re-exported so existing tests stay valid.
- Fit metrics generalised per font; a computed WCAG contrast test over theme tokens.
- Done = all existing tests pass unchanged; the six XML golden snapshots and the three sample PPTX archives are byte-identical for the default theme; `SlideView` DOM tests unchanged.

### Phase 2: theme selection and export wiring — done (release pending review)
- See [ADR 0023](adr/0023-look-selection.md): the picker stays hidden until at least two looks are registered; Classic-only production remains visually unchanged.
- Lesson-level `themeId` in workspace state (outside `deckReducer`), a "Look" picker in the workspace header with live thumbnails (reusing `SlideView`), remembered per browser.
- `exportRequestSchema` accepts an optional `themeId` validated against the registry (unknown ids are rejected with the sanitized 400); `download-pptx` passes it through. Markdown export unchanged. Slideshow follows the active look.
- Reserve `themeId` in the saved-lesson snapshot design (coordinate with Phase 2 of multi-session).
- Done = switching looks restyles rail, stage, sorter and slideshow instantly; export matches the chosen look; default export bytes unchanged.

### Phase 3: the first new looks (colour and typography)
- Chalkboard and Paper Notebook (and any others approved), using Office-safe export fonts with metric-compatible stand-ins.
- Per-theme XML golden snapshots, contrast and fit tests, credit and counter colours, placeholder and image-card tokens.
- Render harness: LibreOffice headless PPTX to PNG compared against the browser render per look; documented tolerance; spot check in PowerPoint.

### Phase 4: style treatments
- Decoration drawn by both renderers: rounded or layered image frames, title banners, background treatments, title-slide variants, soft shadows (paper-cut).
- Parity tests per treatment; texture images only if tiny and inside the export budget; vector first.

### Phase 5: polish and decisions that need data
- Pair image style hints with looks only if it measurably helps (Pexels query changes are risky).
- Per-deck override of the look; teacher-defined palette is out of scope.

## Risks

- Browser and PPTX drift (mitigated by parity tests and the render harness).
- Fonts on teachers' computers (mitigated by Office-safe faces and metric-compatible stand-ins; Poppins limitation stays for Classic and is documented).
- Dark themes expose contrast and credit-line problems (mitigated by token tests).
- Scope creep into per-slide styling or a theme editor (explicitly out of scope).

## Out of scope

Adopting ppt-master or any Python workflow, brand packs, sound or icon libraries, handwritten fonts, font embedding in PPTX, per-slide looks, a custom palette editor, new image providers, changing generation prompts.

## Decisions (accepted by the product owner, 2026-10-26)

| # | Decision |
|---|---|
| 1 | First looks: **Chalkboard** and **Paper Notebook**. Bright Classroom and Clean Minimal come later if wanted. |
| 2 | **Colour and typography first**; shape and decoration (Phase 4) afterwards. |
| 3 | New looks export in **Office-safe fonts** (Chalkboard: Arial, Paper Notebook: Georgia). Browser preview, slideshow and the fit estimator use metric-compatible open stand-ins (Arimo, Gelasio). |
| 4 | **One look per lesson** (all sessions share it). |
| 5 | The picker lives in the **workspace header**. |

Clickable mock for approval: Phase 0 mock of the Look picker, the three looks on the real layout geometry (title, content and assessment slides), per-look font notes and computed contrast.

## Finding: the current look fails WCAG AA in three places

Computed from the theme tokens (relative luminance contrast):

| Pair in Sayuna Classic | Ratio | Needs | Result |
|---|---|---|---|
| Part label `06B6D4` on `F0F9FF` (14 pt bold) | 2.28:1 | 4.5:1 | fails |
| Slide counter `94A3B8` on `F0F9FF` (11 pt) | 2.41:1 | 4.5:1 | fails |
| Visual placeholder `0284C7` on `E0F2FE` (13 pt italic) | 3.57:1 | 4.5:1 | fails |
| Title `0284C7` on `F0F9FF` (45 pt, large text) | 3.84:1 | 3:1 | passes |
| Body, heading, muted text | 7.1:1 or higher | 4.5:1 | pass |

The proposed Chalkboard and Paper Notebook palettes pass every text pair (lowest 5.0:1). Phase 1's automatic contrast test covers new looks and records these three Classic pairs as known exceptions, because fixing them changes today's export bytes. Whether to fix Classic's failing text colours (a visible but small change) is a separate product decision.

## Shipping rule

Same as the other roadmaps: green CI, preview smoke test, PR merge after approval.
