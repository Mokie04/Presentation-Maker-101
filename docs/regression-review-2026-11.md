# Regression review, 2026-11

Scope: everything merged after the [2026-10-26 review](code-review-2026-10-26.md), that is `1ee7d7d..249440e` (PRs 44, 45, 46, 47, 54, 57, 58 and Dependabot PRs 48 and 56). The question was "what got worse", not style. Line numbers refer to `249440e` unless a fix commit is named.

Method: four read-only reviews (deck state and overflow cache; export; uploads and input hardening; UI sweep, config and CI) plus the generation path, each suspected problem backed by a failing test or a command, then a manual pass in the production build (`next build` + `next start`) against a local fake of the upstream text and image services. Fixes were written test-first, one commit per finding.

## Findings

Severity: **Critical** = data loss, wrong output or production failure; **Major** = visible bug with a workaround; **Minor** = everything else.

| ID | Severity | Area | Location | Reproduced | Fixed |
|---|---|---|---|---|---|
| R1 | Major | Uploads | [UploadSection.tsx:79](../src/components/UploadSection.tsx) | Yes | Yes |
| R2 | Major | Workspace layout | [PresentationWorkspaceView.tsx:66](../src/components/workspace/PresentationWorkspaceView.tsx) | Yes | Yes |
| R3 | Major | Formulas (editor, PPTX, outline) | [formula-parser.ts:165, 174](../src/lib/utils/formula-parser.ts) | Yes | Yes |
| R4 | Major | Export credit | [pptx-generator.ts:108-109](../src/lib/services/pptx-generator.ts) | Yes | Yes |
| R5 | Major | Keyboard focus | [PresentationWorkspaceView.tsx:49](../src/components/workspace/PresentationWorkspaceView.tsx) | Yes | Yes |
| M1 | Minor | Picture status | [use-slide-deck.ts:167-173](../src/lib/deck/use-slide-deck.ts) | Yes | No |
| M2 | Minor | Uploads copy | [UploadSection.tsx:226](../src/components/UploadSection.tsx), [page.tsx:140](../src/app/page.tsx) | Yes | No |
| M3 | Minor | DOCX limits | [document-parser.ts:52, 92](../src/lib/parsers/document-parser.ts) | Yes (synthetic file) | No |
| M4 | Minor | PDF page pre-check | [document-parser.ts:128-133](../src/lib/parsers/document-parser.ts) | Yes (synthetic file) | No |
| M5 | Minor | Formulas | [formula-parser.ts:191](../src/lib/utils/formula-parser.ts) | Yes | No |
| M6 | Minor | Overflow cache | [slide-fit.ts:133](../src/lib/slide-fit.ts) | Yes (NUL in text only) | No |
| M7 | Minor | Generation client | [generate-client.ts](../src/lib/generate-client.ts), [page.tsx](../src/app/page.tsx) | Suspected, not reproduced | No |
| M8 | Minor | Validation message | [generate/route.ts:25](../src/app/api/generate/route.ts) | Code reading | No |
| M9 | Minor | Dead route | [generate-images/route.ts](../src/app/api/generate-images/route.ts) | Code reading | No |
| M10 | Minor | Architecture guards | [guards.ts](../tests/architecture/guards.ts), [routes-use-define-route.test.ts](../tests/architecture/routes-use-define-route.test.ts) | Yes | No |
| M11 | Minor | Node range vs test tools | [package.json](../package.json) engines | Code reading | No |
| M12 | Minor | Docs drift | [ADR 0031](adr/0031-ui-state-sweep.md), [ADR 0030](adr/0030-input-hardening.md), CI audit summary | Yes | Partly (ADR 0031 focus line) |
| M13 | Minor | PDF on Node 26 | [document-parser.ts:135](../src/lib/parsers/document-parser.ts) | Only on Node 26 | No |
| P1 | Major, not a regression | Export bullets | [pptx-generator.ts:40](../src/lib/services/pptx-generator.ts) | Yes | No |
| P2 | Minor, not a regression | Health check | [health.ts:25](../src/lib/health.ts) | Code reading | No |
| P3 | Minor, not a regression | Header logo | [Header.tsx](../src/components/Header.tsx) | Yes | No |
| E6 | Open, kept on purpose | NASA preview vs export | [SlideView.tsx:142](../src/components/SlideView.tsx), [pptx-generator.ts:181, 266](../src/lib/services/pptx-generator.ts) | Yes, still | No |

### R1 (Major, fixed): a failed upload wiped the lesson

`processFile` clears the lesson (`onUploadSuccess('', '')`) before the request and, since PR 45, the paste box is bound to that same text. When the server rejected the file (422, 500) or the network failed, nothing put the old text back. A teacher who pasted a lesson and then dropped an unreadable PDF lost the paste. The repo already kept the text for a file rejected on the client for size, so this was inconsistent.

- Repro: paste text, hide the paste box, drop a broken `.pdf`. Before the fix the paste box is empty; after it, the text is back with the error shown. Tests: `restores the previous lesson after a server rejection | a network failure` and `restores the lesson from before the first of two failed uploads` in [UploadRaces.test.tsx](../tests/components/UploadRaces.test.tsx).
- Fix: remember the lesson from before a run of uploads and restore it when the current upload fails.

### R2 (Major, fixed): the deck title collapsed between 1024 and about 1100 px

From the `lg` breakpoint the title column has `flex-basis: 0` and `min-width: 0`, and the action buttons keep their natural width. PR 57 made the Look trigger about 52 px wider (swatch and chevron). At 1024 px (an iPad in landscape) the title column measured 10.7 px, so "The Water Cycle" and the writers line wrapped one letter per line. With the pre-sweep trigger the same row measured 62.7 px (one word per line), so the problem existed in a milder form and the sweep made it unreadable.

- Repro: production build at 1024×768, any deck: `h1.parentElement.getBoundingClientRect().width` was 10.7.
- Fix: `lg:min-w-64` on the title column. The buttons now wrap to their own row when they don't fit (title 950 px at 1024; unchanged at 1280). The class is pinned in [WorkspaceAccessibility.test.tsx](../tests/components/WorkspaceAccessibility.test.tsx) because jsdom has no layout; the layout itself was checked in the browser.

### R3 (Major, fixed): multi-letter scripts and bare charges rendered wrongly

The X2 rewrite limited an unbraced script to one letter or a signed number. That fixed the greedy cases but broke common science notation, in the editor, the PowerPoint and the outline alike:

| Input | Before the range | 249440e |
|---|---|---|
| `F_net = ma` | F<sub>net</sub> = ma | F<sub>n</sub>et = ma |
| `v_max`, `K_sp`, `R_total` | whole subscript | first letter only |
| `e^-x`, `e^-kt` | superscript | raw caret |
| `NO_3^-` | NO₃⁻ | NO₃^- |
| `SO_4^2-` | SO₄²⁻ | SO₄²- |
| `λ_max` | subscript | literal |

- Repro: the LibreOffice render of an exported slide showed "F<sub>n</sub>et = ma", "e^-x decays" and "NO₃^- is nitrate". Tests: `keeps multi-letter scripts and charges whole in …` in [formula-parser.test.ts](../tests/lib/utils/formula-parser.test.ts).
- Fix: an unbraced script may be a whole word or a bare charge sign when it ends the token, and any Latin or Greek letter can carry a subscript. All X2 cases (`3x^2-4x+1`, `x_1+x_2`, `snake_case_word`, `H2O_guide`, e-mail addresses) and the 2,000-identifier property test still pass. One trade-off: `v2_final` now renders as v2<sub>final</sub> (as before the range); 249440e gave v2<sub>f</sub>inal, which was also wrong.

### R4 (Major, fixed): the licence name could be cut off the slide

PR 44 capped the visible credit at 160 code points by cutting from the end. A Commons credit reads `Commons — Creator: …; License: CC BY-SA 4.0`, and the creator has no length limit, so a creator of about 140 characters replaced the licence name with "…". The notes and the link kept it, but CC BY and CC BY-SA pictures must name the licence where they are shown.

- Repro: the 160-character test in [export-integrity.test.ts](../tests/lib/services/export-integrity.test.ts) now requires the credit to end with `…; License: <name>`; it failed in every look before the fix.
- Fix: shorten the creator and keep the licence suffix whole (when it is under 80 code points). The cap, notes and link are unchanged.

### R5 (Major, fixed): keyboard focus fell to the page at a slide boundary

PR 57 stopped recovering focus for a control that became disabled, and its test asserted that focus stays on the disabled Next button. Only jsdom does that. Chrome keeps `activeElement` on the button synchronously and moves it to `<body>` at the next frame (checked in the browser), after which arrow keys no longer reach the workspace's `onKeyDown`. Pressing Next slide to the last slide, Previous to the first, or a Move button to an edge lost the keyboard position. Before the range focus went to the stage.

- Repro: production build, Next slide clicked to the last slide: before the fix `document.activeElement` was `<body>`; after it, the "Slide stage" region. Test: `moves focus to the stage when Next slide | Previous slide reaches its disabled boundary`.
- Fix: restore the `:disabled` recovery. The download buttons, the reason for removing it, already use `aria-disabled` and keep focus (their tests pass). The ADR 0031 focus line is amended.

### Minor findings (reported, not fixed)

- **M1, picture status during Regenerate.** After automatic pictures finish, a manual Regenerate puts that slide back to `pending` while it is still in the automatic load's slide list, so "Adding pictures… 2 of 3" reappears for a manual action. Fix: count a slide as loading only while its automatic request is unsettled.
- **M2, pasted lessons lost their name.** Pasted text is now stored with file name `''`, so the green "ready" card no longer appears for a paste and the Another session dialog shows "Lesson · N characters" instead of "Pasted Lesson Plan". Fix: a fallback name for pasted text in the card and `page.tsx:140`.
- **M3, DOCX pictures count toward the unpacked limits.** The 10 MiB per-part and 20 MiB total checks include `word/media/*`, which the text extractor never reads. A small DOCX with a highly compressible picture (BMP or TIFF scan) is rejected as "too large once unpacked". Only reproduced with a synthetic bitmap. Fix: size-check only the parts the extractor reads, keep the file-count and directory checks.
- **M4, PDF page pre-check.** `/Type /Page` is counted over the raw file, so a 120-page PDF saved incrementally once (annotated or signed) counts 240 and is refused, while the parser reports 120. The ADR accepts over-counting; this is a realistic way to hit it. Fix: a higher pre-check threshold and let the parser's page count enforce 200.
- **M5, chemistry after a hyphen or dot.** `pre-H2O` and `x.CO2` are no longer subscripted (`-` and `.` stopped being word starts). On balance better: the old parser also dropped the text after `CO2-rich`.
- **M6, overflow cache key.** Key fields are joined with `\0` without escaping, so two slides whose part and visual description differ only by where a NUL sits can share a result. Needs NUL characters in the generated JSON; no editing path produces them. Fix: `JSON.stringify` the key fields. Related contract (not reachable today): the cache is keyed by the `contentPoints` array identity, so in-place edits would go stale; every current caller replaces the array.
- **M7, client and rate limits (suspected, not reproduced).** The route answers 429 with `Retry-After: 60` and the message asks the teacher to wait a minute, but the browser re-enables Generate immediately and ignores the header. A teacher who retries at once starts another server-side schedule of up to four upstream requests. Suggest disabling Generate until the Retry-After has passed.
- **M8, long paste message.** A paste over 250,000 characters is refused with `Invalid request: text: This lesson is too long…` (the schema prefix leaks into the teacher's message). The client has no length check before sending.
- **M9, unused route.** `/api/generate-images` has had no browser caller since PR 45 (pictures are requested per slide) but is still deployed with `maxDuration = 300` and still documented in README and ARCHITECTURE.md.
- **M10, guard gaps.** The define-route and `maxDuration` guard only lists files under `src/app/api`; a `route.ts` elsewhere in `src/app` would skip both (none exist). The env-read guard misses aliased reads such as `const p = process; p.env.X`.
- **M11, Node range.** `engines` allows `>=22.12 <25`, but jsdom 30.1.3 (tests only) needs `^22.22.2 || ^24.15.0`; `npm ci` on 22.12–22.22.1 or 24.0–24.14 installs and then the test suite fails. CI is fine (`setup-node` takes the latest minor). README mentions 22.22.2 but not 24.15.
- **M12, docs drift.** ADR 0031 says the slide keys work when the target is "the page"; the handler is on the workspace element, so keys pressed with focus on `<body>` never reach it (pre-existing wording, but it hid R5). The top-level image-size is now 2.0.4, so the remaining audit finding is only pptxgenjs's nested image-size 1.2.1; the CI summary and ADR 0030 text calling image-size deferred are stale.
- **M13, PDF parsing on Node 26 (N1 still open).** A real 13,543-byte one-page PDF parses through the upload path on Node 22.23.4 and 24.22.2 and fails on 26.3.0 (`bad XRef entry`). A reviewer emulation suggested Node 24 would fail too; real Node 24 does not, because the route builds an unpooled buffer. Inside the supported range this is not reproduced; it remains a reason to replace pdf-parse.

### Not regressions, noted for the backlog

- **P1 (Major-looking, present before the range): bullets that contain a formula lose their bullet in the PowerPoint.** pptxgenjs puts `bullet` only on the first run and writes a `<a:pPr>…<a:buNone/>` between later runs of the same paragraph, which is not valid there. In LibreOffice those bullets have no marker and no indent. The old parser produced the same runs. Not checked in PowerPoint itself. Fix idea: strip a `<a:pPr>` that sits between two runs while `buildPresentationPptx` rewrites the zip.
- **P2, health check uses the text service.** Each `/api/health` call makes a real completion request, which counts toward the upstream rate limit. It needs a session, so outside monitors cannot call it.
- **P3, header logo size.** `sm:w-13 sm:h-13` generates no CSS in Tailwind 3, so the logo stays 44 px at `sm` and up.
- **E6 (kept on purpose in ADR 0028): NASA preview vs export.** Still reproduces in all three looks: the preview crops NASA pictures (`object-cover`, title and content slides) and the export fits the whole picture. Commons, AI and stock pictures agree between preview and export. Scope unchanged since the last review.

## The production 429 (`rate_limit_exceeded`)

Nothing on our side was found to multiply requests:

- One click sends one request. A double click on Generate produced exactly one upstream text request (the button disables in the same event). Generation is only started by a click, never by an effect, so React strict-mode double effects do not apply. The Another session dialog ignores a second click while one is running.
- Cancelling stops the upstream request. With `next start`, aborting the browser request after 4 s closed the upstream request at 3.9 s and no retry followed (Vercel's own propagation was not tested).
- The 429 schedule behaves as designed end to end: upstream requests at 0, +9.9, +21.6 and +50.3 s (8, 20 and 45 s plus jitter and a 1.5 s fake response time), then a 429 to the browser with `Retry-After: 60` and the neutral message. Every wait is checked against the 270 s deadline, attempts are capped at 150 s and at the remaining deadline, and timers and abort listeners are removed on every path. An injected `backoffDelays` applies to 429 too; `maxRetries` caps both schedules.
- The browser shows the route's 503, 502, 429 and 422 messages unchanged; none of them contain "timeout", so the special non-JSON timeout branch in the client cannot catch them.
- Prompt size: the lesson is capped at 250,000 characters (new in the range; before it was uncapped), and a short lesson sends about 8 KB, most of it the fixed instructions.
- Each Generate is followed by automatic picture requests (three at a time, one per slide) to the image service. If production points the image service at the same upstream as the text service, they share its limit; the configuration was not inspected.

The remaining contributors are M7 (an immediate manual retry after a 429) and P2 (health checks).

## Checked and clean

- **Generation path:** retry classification and schedules, Retry-After (numeric and date, capped at 60 s), deadline and per-attempt bounds, abort during an attempt and during a wait, listener and timer cleanup, route status and message mapping, client message display.
- **Deck state:** the removed `useSlideSelection` hook was only used by its own test; every behaviour is covered in `slide-selection.test.ts`, `session-decks-selection.test.tsx` and `use-slide-split.test.tsx`. Selection after add, delete, duplicate (selects the copy), split, move, reload, session switch and reset; late picture results after reset, after a session is replaced and for a background session; slide ids stay unique across reset.
- **Overflow cache:** every input `fitSlide` reads is in the key; growth is bounded (at most 8 results per bullet array per look, WeakMap outside); non-array bullets behave like the uncached path.
- **Export:** the export calls the same `fitSlide` as the editor with the same boxes and metrics; title and body sizes agree for 8 slides in each look. The woff2 files give the same metrics as the source TTFs. image-size 2.0.4 is used in two places, both on bytes; version 1 and 2 return identical dimensions on 18 PNG, JPEG, GIF, WebP and SVG variants; pptxgenjs never calls its nested image-size 1.2.1. Exported decks open in LibreOffice in all three looks.
- **Uploads and input hardening:** the pdf-parse entry point has no debug harness; the `max` page option plus the real page count; exactly 250,000 characters accepted and 250,001 refused on both routes; server-side file size limit; content-type and cross-site checks do not block real callers; the image compress timeout cannot resolve twice or leak; upload ordering, abort on paste and on unmount; navigation keys are ignored in text fields; Escape closes only the top dialog.
- **UI sweep:** one `h1` per screen; no references to the removed `logo.png`; every Look trigger class compiles and navy on sun-500 is about 7.7:1; "Remove bullet N" renumbers after a delete; the slideshow opens on the chosen slide, arrows advance and Escape returns focus to Preview; the Look picker is a bottom sheet on a phone and returns focus to its trigger. The app has no dark theme, so the Look button is the same in both colour schemes.
- **Config and CI:** every `process.env` read in `src/` is in `.env.example` and the README, and nothing documented is unused; every route sets `maxDuration` and `vercel.json` has no `functions` block; Dependabot YAML is valid, covers npm and GitHub Actions and ignores only majors; CI has no path filters or `|| true`, `continue-on-error` is only on the audit step, and the branch-protection doc matches the job names.

## Gates for the fix branch

`npx tsc --noEmit` exit 0; `npx next lint` exit 0 ("No ESLint warnings or errors"); `npx vitest run` exit 0 (191 files, 2,092 passed, 1 skipped); `npx next build` exit 0. Run locally on Node 26.3.0, which is outside the engine range; CI runs the same gates on Node 22 and 24.

## Not verified

- Which Node version and plan Vercel uses in production, and whether its platform forwards a browser abort to the function.
- Whether the production image service shares the text service's upstream (relevant to the 429).
- PowerPoint desktop rendering (LibreOffice only); `scripts/render-pptx-compare.mjs` and `scripts/verify-export-integrity.mjs` need Playwright, which is not installed.
- Screen reader announcements (for example the "Adding pictures" status).
- The test suite on real Node 22 and 24 locally (left to CI).
