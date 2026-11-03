# Setup Card Polish Plan

**Spec:** User attachment “Prompt: setup card polish (less generic upload card)”; approved landing/index.html v2.
**Branch/base:** ui/setup-card-polish from main 7cc3e8a; no commit, push or merge.

- [x] Add tests for step progression, bubble/describedby, decorative sheet/tags, small Mokie and shared part accents; edit only allowed old hint-copy expectations. Run RED.
- [x] Update UploadSection presentation, scoped CSS/tokens and HomeTrustStrip/part-badge helper; preserve upload/radio/subject/generation contracts. Run focused GREEN.
- [x] Append ADR section and roadmap line. No new production component files, so no component-map change.
- [x] Node 22 full tests (2 workers), typecheck, lint and build. Stubbed browser at 1440/1024/768/390/320: all states, native arrows, focus captures, reduced motion, axe including contrast and unchanged workspace. Review diff and report.

Design: warm tactile paper, navy outlines/hard shadows, sparse sun-yellow current/checked/action accents. Motion affects only float/position/shadow; foreground/background switch atomically to preserve contrast. All transforms stop under reduced motion. Timeline connectors stay behind content; phone fields use full width so five 44px tiles fit.

Current step progresses 1 -> 2 -> 3 for empty -> lesson -> lesson/session. Existing completed checks for upload/session remain; Step 3 retains its existing completed check while generating, and returns to current on retry. The existing generating panel layout/component is unchanged. Bubble is descriptive plain text, never a live region.

Protected: workspace, hero, generating panel, deck/routes/prompts/exports/dialogs, page/layout/fonts, persistence and assets. Reuse the existing small Mokie component in a locally sized wrapper. Existing assertions change only for the explicitly replaced hint copy.

## Verification record
- New tests failed before implementation; focused 38 tests passed after implementation.
- Final Node 22.23.4: 138 files / 1,513 tests PASS with maxWorkers=2; typecheck, lint, next build PASS.
- Independent read-only review: no actionable findings.
- Chromium: all states including generating/error/reduced motion at 1440/1024/768/390/320, four native arrow keys/wrap, real file chooser, step progression, bubble descriptions/no live region, >=44px targets and no horizontal overflow/page errors PASS. Full axe including contrast clean.
- Focus screenshots for a tile and Generate saved at every width. Workspace font/dimensions match baseline.
- Only old hint-copy expectations were changed in existing tests, as authorized. Phone Generate spans the full row below Mokie/bubble. Step 3 retains its existing completed check during generation.
- No changes to persistence/page/workspace/deck/routes/prompts/exports/hero/generating component/Mokie/assets. No push, merge or commit.
