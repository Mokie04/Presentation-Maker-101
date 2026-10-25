# 0018 — Slide text budget

Date: 2026-10
Status: Accepted

## Context

Font-size instructions cannot make the model lay out a slide. Exhaustive content can still arrive as paragraphs, and output limits can cut off the deck. Prompt guidance needs a deterministic fit pass that preserves the lesson text and an actionable error when generation is incomplete.

## Decision

`src/lib/prompts/slide-generation.ts` asks for titles up to 45 characters, at most four content bullets of 60 characters each, and no paragraph-length bullets. Assessment slides may use a question up to 100 characters followed by options A to D as separate bullets. Reading passages, stories, explanations, instructions and rubrics continue across slides with the same part and a trailing continuation title. The 25-slide minimum and No Truncation rule remain; there is no maximum slide count.

`src/lib/auto-fit-deck.ts` runs immediately after generation. It enforces body fit with the shared estimator and existing whole-bullet split suggestion, preserving all text and provenance. Continuations have no visual or image credit. Numeric prompt budgets are not schema rejection or text-truncation rules: fitting decks pass through unchanged, while titles and individual long bullets remain available for the UI to flag. Each original gets at most 20 tentative splits; if it would need another, that original is retained unchanged and its tentative pieces are discarded. Other originals still process independently. This keeps both normal and capped output idempotent.

## Consequences

- The generation response renumbers accepted continuations and retains server-recorded subject evidence. Neither prompt compliance nor scientific quality is proven by mocked responses or fit checks.
- Client batch requests omit blank visual descriptions after assigning real slide indexes. The server also skips them, producing no image result or failed-image marker for those slides.
- A model finish reason of length throws TextOutputTruncatedError immediately, without retries or backoff. The generate route returns 422: "This lesson is too long to convert in one pass. Choose a shorter session or paste a smaller part of the lesson plan."
- The page already displays the route's error text. Other failures keep their existing retry and fixed 500 policies. No max_tokens value is added.

## Alternatives considered

Prompt-only limits leave dense responses dependent on model compliance. Cutting text to a character count would discard teacher content; sentence-level splitting is outside this phase. Keeping a partially split capped original would break idempotence on the next pass. Retrying truncated output repeats the same limit failure.
