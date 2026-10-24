# 0013 — Edit title and bullets on the slide

Date: 2026-10
Status: Accepted

## Context

Teachers need to edit the text they see on the Normal stage while keeping the settings panel, thumbnails and exported deck in sync. Browser rich-text editing would introduce HTML and selection state into a plain-text slide model.

## Decision

`src/components/workspace/EditableSlideView.tsx` wraps the passive slide renderer through optional title and point render functions. `src/components/workspace/InlineText.tsx` replaces one formatted text run with a plain textarea that inherits its typography and grows with its content. Fields show raw formula syntax; resting text uses the existing formula renderer. We do not use contentEditable.

Typing calls the same deck actions as the panel, so changes are live. Escape restores the value captured when editing started. Bullet Enter inserts an empty point through the reducer; empty Backspace deletes and edits the previous point, while empty blur deletes and finishes. IME composition keeps its Enter and Backspace events.

## Consequences

- The renderer identifies the appended writers line as derived, so it stays passive. Stored writer text remains editable.
- Only the Normal stage passes editing render functions. Thumbnails and slideshow stay passive, and the renderer without these functions keeps its original markup.
- Editing is enabled from 768 px through `src/components/workspace/use-media-query.ts`; phones retain panel editing. A new selected stable slide ID starts a new editing session.
- Browser fields inherit container-scaled type and retain the slide's clipping. Long text can exceed the visible box; the browser does not implement PowerPoint shrink-to-fit. Raw formula syntax can wrap differently from formatted formulas.

## Alternatives considered

contentEditable was rejected because the model stores plain text and requires predictable keyboard, cancellation and IME behavior. Separate saved drafts would delay panel and thumbnail updates. See `docs/workspace-layout-roadmap.md`.
