# Session Decks Implementation Plan

**Goal:** Implement the supplied Phase 1 specification: multiple session decks for one lesson in memory.
**Architecture:** A session reducer delegates all deck edits and image token checks to the unchanged deck reducer. The existing hook exposes the active deck API plus session navigation; selection and view live in the session layer. A shared generation client and modal handle aborts without committing failed/canceled results.
**Tech stack:** Existing React, TypeScript, Next.js, Vitest and Testing Library. No new dependencies.
**Spec:** User attachment, “Prompt: Phase 1, more than one session from the same lesson (in memory)”.

## Constraints
- Branch feat/session-decks from main; no push or merge. Leave changes uncommitted for review.
- No server, prompt, export route, deckReducer or existing-test changes.
- Session labels from SESSION_OPTIONS; one shared monotonic slide ID counter, retained on reset.
- No persistence, removal, automatic session detection or all-session generation.

## Tasks
- [x] Add reducer/hook tests for independent decks, replacement, IDs, background routing/version races, selection/view and reset; run red, implement, run green.
- [x] Add integration/client tests for subject provenance, request reuse, cancellation (including late body/422), failures, tabs, exports, reset and focus/axe; run red, implement shared client and UI, run green.
- [x] Add ADR 0019, Phase 1/2 roadmap and update architecture/glossary/Done so far.
- [x] Run typecheck, lint, full tests with maxWorkers=2 and next build; review the diff. Verify 1440/768/390 layouts and interactions using stubbed responses only.

## Review focus
- Global IDs after add/duplicate/split, replacement and reset.
- Late results during inactive-session edits and after replacement.
- Abort between fetch and response-body parsing, including non-abort-aware stubs.
- First submitted subject/session captured despite upload control changes while loading.
- Tabs consume Home/End/arrow keys without changing selected slides; focus returns after dialogs.

## Execution record
- Existing deck tests: 135/135 passed after session-layer implementation.
- Initial UI/client tests failed for the missing feature, then passed. All original upload, truncation, provenance, workspace and accessibility tests remain untouched.
- Extended useSlideDeck over the session reducer rather than introducing a second hook/controller. Retained its one-argument loadPresentation default for existing callers.
- Retained the legacy reset title attribute for compatibility; visible text and accessible name are Start over with a new lesson.
- Independent reviewer found a late-upload provenance race. Both completion-order regressions failed before the fix and passed after capturing a committed lesson record (text/name/subject).
- Current host Node 26 and bundled Node 24 reproduce an unhandled Undici stream error in the unchanged upload API test. Node 22.23.4 (matching CI) passes that test cleanly; final gates use Node 22.
- Stubbed Chromium checks covered 1440/768/390 px; new dialogs have no axe violations including contrast. Full workspace scan flags contrast and label/name issues in unchanged slide components; the same categories reproduced against main at all three widths.
- Final verification on Node 22.23.4: typecheck PASS, lint PASS, next build PASS; 135 test files / 1,485 tests PASS with --maxWorkers=2 --testTimeout=15000 (CLI allowance for host contention; no assertions or existing tests changed). The prior concurrent build/test run exceeded 5-second test timeouts in SessionDecks and the unchanged Sorter test; serial rerun completed in 41 seconds.
- Independent review complete: only the provenance race was found; covered by two RED-to-GREEN regressions.
- Final production-build browser refresh PASS at 1440/768/390 px; no page errors or horizontal overflow. New session/reset dialogs remain axe clean. Screenshots and browser/main-baseline JSON are saved outside the repo in the chat visualization directory. Temporary servers stopped.
