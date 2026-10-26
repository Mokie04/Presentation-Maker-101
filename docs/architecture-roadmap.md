# Architecture roadmap: the path to an A+ codebase

Master plan. Individual items get their own roadmap or prompt when they start. Process for every item: the planner writes one prompt, a developer chat executes it on a branch, the planner verifies, then it ships through a PR, the Vercel preview and CI, and merges only after the user approves. Developers never push or merge on their own; nothing goes to `main` directly.

## What "A+" means (checkable)

1. **One home per domain rule.** No duplicated lesson-part, credit, image or export rules.
2. **One policy for every route.** Auth, validation, body caps and sanitized errors, enforced by a test that fails if a route bypasses it.
3. **Hermetic, gated tests.** The suite runs without secrets, and CI is a required check on `main`.
4. **Decisions written down.** An architecture map and ADRs so a new developer or an AI agent can navigate the code.

Beyond this list, refactoring has diminishing returns; later changes should be driven by features. The Bedrock image provider comes after this list (it is one new adapter once item 7 is done).

## Done so far

| Work | Result |
|---|---|
| Look selection Phase 2 (`docs/theme-style-roadmap.md`) | One lesson-level remembered look, hidden-until-needed header picker, active-theme previews/fit/split and validated optional PPTX themeId; default request and export bytes preserved. ADR 0023. |
| Theme module Phase 1 (`docs/theme-style-roadmap.md`) | Classic theme registry, optional renderer/fit/export parameters, font metrics registry and computed contrast policy with exact Classic exceptions; no visible or wire change. ADR 0022. |
| Home screen (`docs/home-screen-roadmap.md`) | Mokie hero, numbered setup with native session radios, honest indeterminate activity, scoped typography and shared header tagline; workspace redesign deferred |
| Slide deck module (`docs/slide-deck-roadmap.md`) | Slide identity, images and race rules in one reducer; `page.tsx` 664 to 478 lines |
| Credit module (`docs/image-credit-roadmap.md`) | Credit rules in one module; slideshow shows attribution |
| Route module, Phases 1-2 (`docs/route-module-roadmap.md`) | `defineRoute` on 5 routes: sanitized errors, validation, body caps |
| Regenerate variation | Regenerate shows a different Pexels photo |
| CI workflow | Typecheck, lint and tests on every PR |
| Pedagogical part (item 2) | Part names, labels, ordinals and image eligibility in one module |
| Export payload (item 3) | Shared PPTX request builder, compression and budget; the `'failed'` wire sentinel remains in current code |
| Configuration (item 4) | Lazy per-feature readers; direct environment reads restricted to config and session auth |
| Route Phase 3 (item 5) | Upload, NASA, Commons and health use `defineRoute`; architecture and auth tests cover the routes |
| Image library (item 6) | NASA and Commons adapters share route definitions and bounded retrieval |
| Image provider (item 7) | OpenAI-compatible and Pexels adapters selected by the provider composition module |
| Hygiene (item 8) | Unused eligibility module removed; tests linted; title formulas and Commons slideshow fit fixed |
| Architecture docs (item 9) | Architecture map, ADRs, glossary, README and documentation-path guard |
| Session decks Phase 1 (`docs/multi-session-roadmap.md`) | Independent in-memory session decks, ID-routed async images, selection/view restoration, cancel-safe generation, active-session exports and accessible tabs/dialogs; persistence planned for Phase 2 |
| Workspace layout (`docs/workspace-layout-roadmap.md`) | Normal view, Slide sorter, edit on the slide, slideshow on `SlideView` and an accessibility pass; the card grid is retired |

## Remaining items, in order

| # | Item | Size | Criterion | Status |
|---|---|---|---|---|
| 1 | Make the `verify` CI check required on `main` (GitHub Settings, Branches) | S | 3 | user action |
| 2 | **Pedagogical part module** (candidate 03): one list, normalizer, label, ordinal and image-eligibility rule | S | 1 | done |
| 3 | **Export payload module** (candidate 06): one Slide image value (removes the `'failed'` sentinel), testable `buildExportRequest` with the compression and 3.5 MB budget logic, de-duplicated filename and error parsing | M | 1 | done |
| 4 | **Env/config module**: validate settings per feature so image and health routes do not need text-provider keys; delete the CI placeholder env vars | M | 3 | done |
| 5 | **Route Phase 3**: migrate upload, NASA, Commons and health onto `defineRoute`; add an architecture test that fails if a route bypasses it; table-driven auth-protection | M | 2 | done |
| 6 | **Image library seam** (candidate 04): NASA and Commons as two adapters of one interface; one bounded-fetch; uniform route protections | M | 1, 2 | done |
| 7 | **Image provider seam**: `ImageProvider` interface with the OpenAI-compatible and Pexels adapters; request details (size, quality, format) move into each adapter | M | 1 | done |
| 8 | **Hygiene**: delete dead `nasa-search-eligibility.ts`, fix the 8 lint errors in old tests, fix the formula leak in the PPTX title slide, use `object-contain` for Commons images in the slideshow | S | 1, 3 | done |
| 9 | **Docs**: `ARCHITECTURE.md`, ADRs for the deck, credit, route, export and seam decisions, refreshed `GLOSSARY.md` | S | 4 | done |

6b complete: `src/lib/image-library/` owns the `ImageLibrary` interface, NASA and Commons adapters, client-safe candidate helpers, and shared `searchDefinition(library)` / `selectDefinition(library)` route definitions. Each library route stays one `defineRoute(...)` call. NASA candidates carry `source` and `selectable`; `ImageLibraryPicker` uses source discrimination and rejects selection metadata from another library.

Adding an image provider (for example Bedrock) = one adapter file implementing ImageProvider, registration in resolveImageProviders, and its own config reader in src/lib/env.ts; known issue to handle then: the OpenAI adapter's hard-coded size 1024x576.

Current-code qualification: `ImageProvider.id` and client-selectable image-source unions are closed. A selectable new provider also needs the source schema and route/facade types extended; see `ARCHITECTURE.md`.

Then: Bedrock image provider (see the Bedrock questions in the planning conversation: Nova Canvas, IAM role through Vercel OIDC, ships disabled, AWS Budgets alarm, AI-generated label).

## Notes

- Items run one at a time. Items 2 and 3 barely overlap in files and could run in parallel if speed matters; the cost is two merges to coordinate.
- Item 7 is the prerequisite for Bedrock; item 6 is independent of it.
- Each item that changes user-visible behaviour gets a smoke test on the Vercel preview before merge.

Architecture roadmap complete — 2026-10-23. Item 1 remains a user-owned GitHub branch-protection setting.
