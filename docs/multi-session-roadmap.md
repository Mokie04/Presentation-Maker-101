# Multi-session roadmap

## Phase 1 — Done (local implementation; not pushed or merged)

- One in-memory deck per Session 1–5, generated from the same original lesson and subject choice/provenance.
- Switching restores each session's selection, Normal/sorter view, edits and images.
- Shared monotonic slide IDs route background results across inactive sessions; versions and non-reused IDs drop stale work.
- Another session dialog supports replacement, failure/retry, abort and late-response rejection; session tabs support keyboard navigation and phone touch targets.
- Downloads and slideshow follow the active session. Start over remains immediate for one deck and confirms before clearing multiple decks.
- No data survives refresh; the generation and reset dialogs disclose this.

Decision: `docs/adr/0019-session-decks.md`.

## Phase 2 — Planned

- IndexedDB save and restore of the lesson, session decks, images and navigation state.
- A Clear saved data control.
- A 30-day expiry for saved data.
- Define storage schema/versioning, quota/error handling and restore validation before implementation. Do not treat in-memory Phase 1 as persistence evidence.

## Outside these phases

Removing an individual session, generating every session at once and detecting which sessions a lesson contains need separate requirements. No server or prompt change is part of Phase 1.
