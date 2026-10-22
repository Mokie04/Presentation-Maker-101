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
| Slide deck module (`docs/slide-deck-roadmap.md`) | Slide identity, images and race rules in one reducer; `page.tsx` 664 to 478 lines |
| Credit module (`docs/image-credit-roadmap.md`) | Credit rules in one module; slideshow shows attribution |
| Route module, Phases 1-2 (`docs/route-module-roadmap.md`) | `defineRoute` on 5 routes: sanitized errors, validation, body caps |
| Regenerate variation | Regenerate shows a different Pexels photo |
| CI workflow | Typecheck, lint and tests on every PR |

## Remaining items, in order

| # | Item | Size | Criterion | Status |
|---|---|---|---|---|
| 1 | Make the `verify` CI check required on `main` (GitHub Settings, Branches) | S | 3 | user action |
| 2 | **Pedagogical part module** (candidate 03): one list, normalizer, label, ordinal and image-eligibility rule | S | 1 | done |
| 3 | **Export payload module** (candidate 06): one Slide image value (removes the `'failed'` sentinel), testable `buildExportRequest` with the compression and 3.5 MB budget logic, de-duplicated filename and error parsing | M | 1 | |
| 4 | **Env/config module**: validate settings per feature so image and health routes do not need text-provider keys; delete the CI placeholder env vars | M | 3 | |
| 5 | **Route Phase 3**: migrate upload, NASA, Commons and health onto `defineRoute`; add an architecture test that fails if a route bypasses it; table-driven auth-protection | M | 2 | |
| 6 | **Image library seam** (candidate 04): NASA and Commons as two adapters of one interface; one bounded-fetch; uniform route protections | M | 1, 2 | |
| 7 | **Image provider seam**: `ImageProvider` interface with the OpenAI-compatible and Pexels adapters; request details (size, quality, format) move into each adapter | M | 1 | |
| 8 | **Hygiene**: delete dead `nasa-search-eligibility.ts`, fix the 9 lint errors in old tests, fix the formula leak in the PPTX title slide, use `object-contain` for Commons images in the slideshow | S | 1, 3 | |
| 9 | **Docs**: `ARCHITECTURE.md`, ADRs for the deck, credit, route, export and seam decisions, refreshed `GLOSSARY.md` | S | 4 | last |

Then: Bedrock image provider (see the Bedrock questions in the planning conversation: Nova Canvas, IAM role through Vercel OIDC, ships disabled, AWS Budgets alarm, AI-generated label).

## Notes

- Items run one at a time. Items 2 and 3 barely overlap in files and could run in parallel if speed matters; the cost is two merges to coordinate.
- Item 7 is the prerequisite for Bedrock; item 6 is independent of it.
- Each item that changes user-visible behaviour gets a smoke test on the Vercel preview before merge.
