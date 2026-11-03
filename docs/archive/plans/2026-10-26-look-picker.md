# Look picker Phase 2 plan

Goal: one lesson-level look across all sessions, previews, fit decisions and PPTX.
Spec: Phase 2 request; docs/theme-style-roadmap.md and ADR 0022.
Constraints: Classic-only production registry, hidden picker with fewer than two
looks, unchanged default bytes/assertions, no generation changes/providers/fonts.

- [x] Verify clean main a594175 and capture fixed-time Phase 1 fixtures, HTML,
  default request and stubbed 1440/768/390 workspace baselines before edits.
- [x] Add test-only look and failing state/picker/export/propagation tests.
- [x] Build registry from a list; add guarded preference reads/writes and
  lesson-level state outside reducers. Keep a synchronous theme reference for split.
- [x] Implement native-radio non-modal picker, focus/outside/Escape behavior,
  responsive phone sheet and accessible focus/touch styling.
- [x] Thread theme through all preview/fit/split paths; include theme in thumbnail
  memo comparison. Preserve exact default markup.
- [x] Add optional validated export themeId, omitted by default and from Markdown;
  preserve the existing two-argument generator call when themeId is absent.
- [x] Verify full suite/typecheck/lint/build under Node 22, bytes/HTML/request
  identity and production browser parity; temporarily register test look for
  browser interactions/screenshots, remove registration before final checks.
- [x] Write ADR 0023, update docs, independent review, commit; no push/merge.

Review focus: same-event set/split uses latest theme; storage is convenience only;
active lesson unaffected by external preference changes; native radio arrows must
not navigate slides; popover dismissal/focus works without a modal focus trap;
non-string and unknown export IDs have the same sanitized validation message.

Verification: Node 22.23.4 typecheck/lint/full suite/build passed. 148 test files,
1,549 tests; existing assertions and snapshots unchanged. Three PPTX archives
(146 entries), five HTML cases and default request bytes identical to main and
Phase 1 where applicable. Production picker hidden at all three widths; temporary
two-look browser checks passed arrows/preview clicks/Escape/outside/focus rings,
viewport bounds, real-browser axe and no extra requests. Temporary registration
removed before final suite/build. Separate reviewer found no actionable issues.
See docs/theme-phase2-verification.md for full evidence and decisions.
