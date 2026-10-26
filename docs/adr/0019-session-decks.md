# ADR 0019: Session decks in memory

Status: Accepted for Phase 1 (local implementation; release review pending)

## Context

A teacher needs separate slides for several sessions from the same lesson without losing edits, images or their place in another session. Generation already accepts a session label; server, prompt and export routes do not need changes. Refresh persistence is a separate lifecycle and storage concern.

## Decision

Key decks by the canonical Session 1–5 labels in `src/lib/utils/session-options.ts`. Each entry holds one deck, selected slide ID and Normal/sorter view. Successful generation atomically replaces only the requested entry, selects its first slide in Normal view, and activates it. Failed and canceled generation never dispatch a load.

`src/lib/deck/session-decks-reducer.ts` sits above the unchanged `deckReducer`, delegating edits, slide creation and image-version validation. It seeds every delegation with one workspace-wide monotonic ID counter; replacement and reset never reuse IDs. The session layer owns navigation state and reuses the existing selection reconciliation rules. Keeping one reducer per deck avoids duplicating slide/edit rules or introducing session awareness into slide components.

Async image results identify their owners by slide ID across all entries, independent of the active session. Batch positions still pair with the tokens captured at request time. The deck reducer then validates each token's version. Globally unique IDs reject results for replaced/deleted decks; versions reject older image intents for surviving slides. A session label alone would not distinguish an old deck from its replacement.

`src/lib/deck/use-slide-deck.ts` retains the active deck API and adds session/navigation controls. This extends the existing hook instead of adding a second image-request controller. `src/lib/generate-client.ts` shares request/error policy between upload and `src/components/workspace/SessionDialogs.tsx`. The dialog aborts and invalidates its request on cancel/unmount; signal checks after fetch and body reading also reject responses from transports that ignore cancellation. Submitted lesson text, filename and subject choice are captured in a committed lesson record separate from mutable upload-screen state from the first successful request, including omission of subject/provenance for Automatic.

## Consequences

Exports and slideshow consume the active session and its selected deck. Selection and view restore on switching; slide components and server routes remain unchanged. Multiple sessions require reset confirmation. Dialogs and confirmation disclose that refresh loses all decks.

Memory use grows with generated slides/images across up to five sessions. Pending image requests may finish after replacement but their results are dropped. Persistence, removing one session, bulk generation and session detection are deferred. Phase 2 plans IndexedDB save/restore, a Clear saved data control and a 30-day expiry; see `docs/multi-session-roadmap.md`.
