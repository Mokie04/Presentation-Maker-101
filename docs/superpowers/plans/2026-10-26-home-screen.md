# Home Screen Implementation Plan

**Goal:** Match the approved home mock with Mokie, numbered setup, native session radios and honest generating feedback.
**Spec:** User attachment “Prompt: home screen redesign (hero, Mokie mascot, step form, generating state)”.
**Branch:** ui/home-screen from main 7436d5a. No push/merge; leave changes uncommitted.

## Constraints and decisions
- Home only; shared Header changes are explicitly requested. No workspace/deck/route/prompt/export/dialog changes.
- Reuse existing local Poppins via a shared module (definition-only extraction from SlideView); home headings use that variable, home body uses existing Geist. Workspace retains Arial and its Poppins rendering.
- Existing provenance/race tests require setup controls during generation. Keep them available below the generating panel instead of replacing them as the mock script does.
- Native radios handle browser arrow navigation; jsdom does not simulate native keyboard defaults. Verify arrows in Chromium.
- Keep all existing assertions; change only upload-screen session-selection lines/imports. Another-session dropdown remains unchanged.
- Use existing badge colours, atomic chip text/background state, indeterminate bar, no percentage/time claims, reduced-motion support.

## Tasks
- [x] Add home component/controlled form tests; update permitted session-selection lines. Run red.
- [x] Add supplied assets, shared font, HomeHero/Mokie/GeneratingPanel, scoped style and sun tokens; restyle UploadSection preserving handlers/props/errors. Run focused tests green.
- [x] Add ADR 0020, home roadmap and architecture/glossary/Done table updates.
- [x] Run Node 22 typecheck/lint/full tests (2 workers), then build. Check approved mock and final app with stubbed requests at 1440/1024/768/390; session targets at 320; reduced motion, all setup states, workspace unchanged except requested Header. Save screenshots.
- [x] Independent review and final diff/protected-file audit.

## Execution record
- RED: new home component imports/radio selection failed before implementation.
- GREEN: focused tests passed after adding the HTML hidden attribute to the existing file input (jsdom has no Tailwind stylesheet and otherwise treats it as a nested interactive control).
- Full Node 22 suite: 136 files / 1,498 tests PASS with --maxWorkers=2 and default timeouts.
- Independent review: no actionable findings; old-test assertions and protected implementation boundaries verified.
- Browser checks found prohibited labels on completed generic step spans and the inherited dropzone visible-name mismatch. Regression failed before fix; step markers now have an image role and the full-card native upload button has a matching visible name. Existing drop/picker/keyboard handlers and required instructions remain.
- Final browser contrast run exposed radio colour interpolation at narrow widths. Removed the radio foreground/background fade so selection switches atomically; all other interaction feedback remains.
- Final gates: Node 22.23.4 typecheck PASS, lint PASS, next build PASS; 136 files / 1,500 tests PASS with two workers and default timeouts.
- Final Chromium run: all home states at 1440/1024/768/390; radios at 320; native file chooser, four arrow keys/wrap, visible focus, >=44px targets, no horizontal overflow or page errors; reduced-motion animations all none. Full browser axe scans including contrast PASS for every captured home state.
- Workspace before/after: Arial font and content dimensions match at all four widths; screenshots visually reviewed. Shared Header changes intentional; no claim of byte-identical screenshots.
- Screenshots and browser JSON are saved in the chat visualization directory, with screenshots.md linking all captured states. No live provider calls, new dependencies, commit, push or merge.
- Final screenshot review removed the enabled Generate foreground fade as well; white text now appears atomically with its dark gradient. Final browser harness asserts enabled-button colour immediately.
