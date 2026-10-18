# Roadmap: one Credit description, many renderers

Source: architecture review candidate 02/03 (2026-10-18). Same loop as `docs/slide-deck-roadmap.md`: the planner writes one prompt per phase, a developer chat executes it, the planner verifies, and the phase ships through a PR and a Vercel preview before the next prompt is issued.

## Goal

Credit rules for a library image (NASA, Wikimedia Commons) are re-derived in five places: `SlideCard`, `markdown-generator`, `pptx-generator`, `NasaImagePicker`, and the text builders in `image-metadata.ts`. The copies have drifted: the license link is shown in 2 of 5 places and `SlideshowModal` shows no attribution at all, a likely CC BY compliance gap. One **Credit** module describes an image's credit once; each renderer only formats it for its medium.

## Design decisions (accepted)

| # | Decision | Choice |
|---|---|---|
| Q1 | Scope | `describeImageCredit(metadata: ImageMetadata)` for finished metadata only. The picker works on search candidates (a different shape), so it shares only the source label helper. |
| Q2 | Location | New `src/lib/image-credit.ts`. `imageCreditText` and `imageSourceNotes` move into it; `image-metadata.ts` keeps schemas and types only. No re-export shims; imports updated. |
| Q3 | Sequencing | Phase 1 = refactor with byte-identical output. Phase 2 = visible changes. Separate PRs. |
| Q4 | Visible changes (Phase 2) | License link in the `SlideCard` credit block for Commons images; credit caption in the fullscreen slideshow (credit line plus source and license links, only when the Slide has an image credit). PPTX visible line stays a single hyperlink to the source; license link stays in speaker notes. |
| Q5 | Wording | Every renderer keeps today's exact visible strings, including the PPTX `NASA <id>` prefix. Existing credit tests are the parity contract. |
| Q6 | Out of scope | Pexels photographer credit and AI-image credit (needs a new `ImageMetadata` variant and schema change). Backlog. |

Shape of the module (the developer may refine names, not behaviour):

```ts
describeImageCredit(metadata: ImageMetadata): {
  source: 'nasa' | 'commons';
  sourceLabel: 'NASA' | 'Commons';
  heading: string;          // 'NASA <nasaId>' | 'Commons' (PPTX visible prefix)
  creditLine: string;       // today's imageCreditText
  sourceLink: string;       // sourceUrl ?? assetUrl
  license?: { name: string; url?: string };   // Commons only
  description?: string;
  notes: string;            // today's imageSourceNotes
}
imageSourceLabel(source: 'nasa' | 'commons'): 'NASA' | 'Commons'   // for the picker
imageCreditText(candidateOrMetadata)   // unchanged signature; the picker still passes candidates
```

## Phases

### Phase 1: Credit module, renderers migrated, output unchanged — done
- Characterization first: before editing any renderer, capture today's Markdown output and PPTX credit text and notes for one NASA and one Commons sample (including missing optional fields) as hard-coded expectations.
- Add `src/lib/image-credit.ts` and `tests/lib/image-credit.test.ts` (table-driven, both sources, missing `photographer` / `creator` / `licenseUrl` / `sourceUrl`).
- Migrate `markdown-generator`, `pptx-generator`, `SlideCard` and `NasaImagePicker` onto it. `SlideshowModal` is untouched.
- Done = new tests green, existing suite green with the credit tests unmodified, no visible change anywhere.

### Phase 2: license link and slideshow caption
- `SlideCard` credit block gains the Commons license link.
- `SlideshowModal` shows a credit caption for Slides with an image credit.
- New tests: SlideCard license link; slideshow caption for NASA and Commons, none for AI images.
- Done = the slideshow no longer displays a library image without attribution.

## Shipping rule

Identical to `docs/slide-deck-roadmap.md`: green suite and typecheck; Phase 2 gets a manual smoke test on the Vercel preview; commit on `credit/phase-N`, push as a branch, merge through a PR after the user approves. Developers never push or merge on their own and nothing goes to `main` directly. Rollback is `git revert` of the merge commit or Vercel promote-previous.

## Risks

- Markdown escaping is a renderer concern; the module must return plain unescaped strings.
- PPTX uses one hyperlink per text run; do not try to add a second link to the visible line.
- Credit strings are asserted by exported XML in `nasa-credits` and `commons-credits`; any wording drift fails those tests, which is the point.
