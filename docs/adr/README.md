# Architecture decisions

Dates are recorded by month. Accepted describes the current design; Proposed and Not adopted do not describe shipped features.

| ADR | Status | Decision |
|---|---|---|
| [0001](0001-slide-deck.md) | Accepted | Slide deck reducer, stable IDs and image versions |
| [0002](0002-image-credit.md) | Accepted | One credit description |
| [0003](0003-route-policy.md) | Accepted | One protected-route policy |
| [0004](0004-slide-image-export.md) | Accepted | Slide image wire value and export budget |
| [0005](0005-feature-configuration.md) | Accepted | Per-feature configuration |
| [0006](0006-image-library.md) | Accepted | NASA and Commons library seam |
| [0007](0007-image-provider.md) | Accepted | Image provider seam |
| [0008](0008-delivery-process.md) | Accepted | Branch, PR, CI and preview process |
| [0009](0009-ppt-master-not-adopted.md) | Not adopted | ppt-master export engine |
| [0010](0010-bedrock-provider-plan.md) | Proposed | Amazon Bedrock image provider |
| [0011](0011-commons-cc-by-sa.md) | Accepted | Accept CC BY-SA Commons images with ShareAlike credit notes |
| [0012](0012-slide-reordering.md) | Accepted | Reducer-owned reordering, duplication and add-after |
| [0013](0013-edit-on-slide.md) | Accepted | Plain-text on-slide editing through existing deck actions |
| [0014](0014-slideshow-on-slide-view.md) | Accepted | Shared slideshow renderer and clickable credit bar |
| [0015](0015-retire-the-card-grid.md) | Accepted | Retire the card grid; Normal and Slide sorter are the two views |
| [0016](0016-fit-slide-text.md) | Accepted | Shared glyph-based text fit, readability floors and reachable overflow |
| [0017](0017-split-a-full-slide.md) | Accepted | Reducer-owned splitting with retained original image ownership and selection |
| [0018](0018-slide-text-budget.md) | Accepted | Prompt text budget, generation-time body fit and explicit truncation errors |
| [0022](0022-slide-themes.md) | Accepted | Optional theme parameters, Classic compatibility, font metrics registry and pinned contrast exceptions |
| [0023](0023-look-selection.md) | Accepted | Lesson-level look state, hidden picker, remembered preference and optional export themeId |
| [0024](0024-office-safe-look-fonts.md) | Accepted | Office-safe looks, licensed stand-in fonts/metrics, theme link colours and measured render limits |

- [ADR 0030: Input hardening](0030-input-hardening.md) — validation, document/provider bounds and route policy.
