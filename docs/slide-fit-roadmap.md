# Roadmap: slide text that fits

Same loop as the earlier roadmaps: one prompt per phase, a developer chat executes it on a branch, the planner verifies, and each phase ships through a PR, CI and the Vercel preview before the next prompt. Developers never push or merge on their own.

## Problem

Generated slides often carry more text than the layout can hold. Body text is 35pt in a box about 7.3 in wide and 4.6 in tall, which holds roughly 26 characters per line and about 7 lines (around 180 characters), while the generation prompt asks for exhaustive, unsummarized content. On the big slide each text box centres its text and hides what overflows, so the first and last lines are cut off and cannot be reached or edited there. In the downloaded PowerPoint the generator asks PowerPoint to shrink text (`fit: 'shrink'`), which PowerPoint usually only applies after the box is edited, so on open the text can spill out of its box and overlap the neighbouring element. Nothing tells the teacher which slides are too full.

## Decisions (accepted by the product owner)

| # | Decision |
|---|---|
| 1 | Text shrinks to fit, down to a floor of 24pt for bullets and 28pt for titles. Content that still does not fit is flagged. |
| 2 | The downloaded PowerPoint changes for dense slides only: explicit smaller sizes that fit, instead of text that overflows on open. Slides that already fit stay byte-identical. |
| 3 | One shared fit estimator decides the size for the big slide, the slideshow, the rail and the export, so what the teacher sees is what they download. |

## Phases

### Phase A: fit the text and make overflow visible — done (local implementation)
- A pure estimator (`slide-fit`) that wraps text with real Poppins glyph widths and returns the largest font size that fits the box, a `fits` flag and the line count.
- `SlideView` and `pptx-generator.ts` use it: unchanged size when the text fits, smaller size down to the floor when it does not.
- Slides that still do not fit are flagged on the rail thumbnail, under the big slide and in the panel; their text box aligns to the top and scrolls on the big slide so every line can be reached and edited.
- Done = dense slides show and export fitted text; slides that already fit are byte-identical in the export. Implemented in ADR 0016; branch publication, CI and preview smoke remain shipping gates.

### Phase B: split a full slide — done (local implementation)
- A "Split into two slides" action (deck action `slideSplit`, panel and stage notices) keeps the largest fitting bullet prefix and moves the rest to a continuation directly after the original, with the same part and no visual, image or credit. The original retains its image and selection.
- Implemented in ADR 0017; branch publication, CI and preview smoke remain shipping gates.

### Phase C: prompt tuning
- Ask the model for shorter bullets and fewer per slide, spreading long content across slides (needs the owner's input on the rules).

## Risks

- The estimator cannot match PowerPoint exactly (teachers' computers may lack Poppins and substitute another font). A safety margin keeps it conservative; the export keeps `fit: 'shrink'` as a second line of defence.
- Live shrinking while typing on the slide changes the text size as the teacher types.
- 35pt body text exists for classroom projection; the floor of 24pt trades size for fit, and the Split action is the other way out.

## Shipping rule

Same as the other roadmaps: green CI, preview smoke test, PR merge after approval.
