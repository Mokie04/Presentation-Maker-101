# Architecture decisions

Dates are recorded by month or day. Accepted describes the current design; Proposed and Not adopted do not describe shipped features. Each accepted ADR names the pull request that merged it. `tests/architecture/docs-paths.test.ts` checks that this index lists every ADR file and that each ADR has an allowed Status line.

| ADR | Status | PR | Decision |
|---|---|---|---|
| [0001](0001-slide-deck.md) | Accepted | 21 | Slide deck reducer, stable IDs and image versions |
| [0002](0002-image-credit.md) | Accepted | 21 | One credit description |
| [0003](0003-route-policy.md) | Accepted | 21 | One protected-route policy |
| [0004](0004-slide-image-export.md) | Accepted | 21 | Slide image wire value and export budget |
| [0005](0005-feature-configuration.md) | Accepted | 21 | Per-feature configuration |
| [0006](0006-image-library.md) | Accepted | 21 | NASA and Commons library seam |
| [0007](0007-image-provider.md) | Accepted | 21 | Image provider seam |
| [0008](0008-delivery-process.md) | Accepted | 21 | Branch, PR, CI and preview process |
| [0009](0009-ppt-master-not-adopted.md) | Not adopted | | ppt-master export engine |
| [0010](0010-bedrock-provider-plan.md) | Proposed | | Amazon Bedrock image provider |
| [0011](0011-commons-cc-by-sa.md) | Accepted | 23 | Accept CC BY-SA Commons images with ShareAlike credit notes |
| [0012](0012-slide-reordering.md) | Accepted | 26 | Reducer-owned reordering, duplication and add-after |
| [0013](0013-edit-on-slide.md) | Accepted | 27 | Plain-text on-slide editing through existing deck actions |
| [0014](0014-slideshow-on-slide-view.md) | Accepted | 28 | Shared slideshow renderer and clickable credit bar |
| [0015](0015-retire-the-card-grid.md) | Accepted | 29 | Retire the card grid; Normal and Slide sorter are the two views |
| [0016](0016-fit-slide-text.md) | Accepted | 31 | Shared glyph-based text fit, readability floors and reachable overflow |
| [0017](0017-split-a-full-slide.md) | Accepted | 32 | Reducer-owned splitting with retained original image ownership and selection |
| [0018](0018-slide-text-budget.md) | Accepted | 33 | Prompt text budget, generation-time body fit and explicit truncation errors |
| [0019](0019-session-decks.md) | Accepted | 34 | Session decks in memory |
| [0020](0020-home-screen.md) | Accepted | 35 | A guided home screen with Mokie |
| [0022](0022-slide-themes.md) | Accepted | 37 | Optional theme parameters, Classic compatibility, font metrics registry and pinned contrast exceptions |
| [0023](0023-look-selection.md) | Accepted | 38 | Lesson-level look state, hidden picker, remembered preference and optional export themeId |
| [0024](0024-office-safe-look-fonts.md) | Accepted | 39 | Office-safe looks, licensed stand-in fonts/metrics, theme link colours and measured render limits |
| [0025](0025-decoration-engine.md) | Accepted | 40 | Shared vector decoration engine |
| [0026](0026-chalkboard-treatments.md) | Accepted | 41 | Chalkboard treatments |
| [0027](0027-paper-notebook-treatments.md) | Accepted | 42 | Paper Notebook treatments |
| [0028](0028-export-picture-cover.md) | Accepted | 43 | Aspect-preserving cover sizing for ordinary export pictures |
| [0029](0029-export-integrity.md) | Accepted | 44 | Export integrity: text, pictures, credits and package |
| [0030](0030-input-hardening.md) | Accepted | 45, 46 | Input hardening: validation, document/provider bounds and route policy |

Number 0021 was reserved for the saved-lesson work and was never written.

PR 21 recorded ADRs 0001–0008 for work that had shipped in earlier PRs.
