# Roadmap: more usable Wikimedia Commons images

Same loop as the earlier roadmaps: one prompt per phase, a developer chat executes it on a branch, the planner verifies, and each phase ships through a PR, CI and the Vercel preview before the next prompt. Developers never push or merge on their own.

## Problem

Teachers often search Commons and find images they cannot use. Today the picker accepts only public domain, CC0 and plain CC BY (`docs/commons-provider.md`). Everything else is shown as unavailable with one vague message ("License or required creator metadata is unsupported or unclear."), the search returns only 5 results, and unusable results take up those slots, so a search can end with nothing usable.

## Decisions (accepted by the product owner)

| # | Decision |
|---|---|
| 1 | Phase 1 changes no licensing rule: unavailable results explain themselves, the search fetches more, usable results come first and unusable ones sit behind a "show unavailable" toggle. |
| 2 | Phase 2 accepts CC BY-SA (versions 1.0, 2.0, 2.5, 3.0, 4.0 with the matching canonical license URL), under the same checks as CC BY: identified Artist, attribution not declared unnecessary, no additional restrictions. |
| 3 | CC BY-NC, CC BY-ND and every other license stay excluded (commercial product; images are resized). |
| 4 | The owner accepted the ShareAlike obligations on 2026-10-24: attribution and the license link are always shown, the exported copy is marked as an adapted copy that stays under the same license, and the deck as a whole is not declared BY-SA by the app. This is a product decision, not legal advice; it is recorded in ADR 0011. |

## Phases

### Phase 1: usable results — done
- Specific `unavailableReason` texts that name the problem and the license (for example `License "CC BY-NC 4.0" is not supported in this version.`), with the license text length-capped.
- The Commons search fetches more results (bounded by the 512 KB JSON limit; measure and document), returns the selectable ones first in Commons' rank order, then a few unavailable ones.
- The picker shows selectable results and a "Show N unavailable results" toggle; an empty-usable state says so and offers the toggle.
- Done = no license rule changed; a search with mixed results shows usable images first.

### Phase 2: CC BY-SA — done
- `licenseKind` gains `cc-by-sa`; the Commons provider accepts BY-SA versions with a matching canonical URL under the same gates as CC BY.
- The credit description marks ShareAlike; the picker shows a short ShareAlike hint before selection; speaker notes and Markdown state that the exported copy is an adapted copy that remains under the same license, with the license link; the visible credit line keeps one source hyperlink.
- ADR 0011 records the decision and its consequences; `docs/commons-provider.md` and the glossary are updated.
- Done = a CC BY-SA image can be selected, credited and exported; CC BY output is byte-identical to before; NC and ND remain unavailable.

## Shipping rule

Same as the other roadmaps: green CI, preview smoke test, PR merge after approval. Phase 2 starts only after Phase 1 is merged.

## Risks

- More results mean larger responses: stay inside the bounded-fetch limit, and never let a long result list make a search fail.
- Provider errors must stay sanitized: reason texts are authored by us, only the license name comes from Commons and it is parsed to plain text and length-capped.
- License checks are metadata checks, not rights clearance (unchanged).
