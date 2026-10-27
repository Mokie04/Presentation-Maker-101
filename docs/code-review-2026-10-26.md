# Code review: bugs and regressions, 2026-10-26

Scope: `main` at `1ee7d7d` (after PRs 34 to 43: session decks, home screen, looks, decoration engine, export picture fix). Five independent read-only reviews (client state, export and theme engine, API and security, UI, tests/CI/production) plus a baseline (`next build` passes; `npm audit --omit=dev` reports 6 vulnerabilities). Nothing was changed by the review.

**How to read the verification column**
- **Reproduced (lead)**: the planner re-ran it and saw the bug.
- **Reproduced (reviewer)**: the reviewer proved it with a script, measurement or test, not independently re-run.
- **Code reading**: confirmed by reading the code path; not executed.
- **Hypothesis**: plausible but depends on platform behaviour not observed here.

## Ranked findings

### P1: fix first (silent content corruption, broken files, outages)

| ID | Area | Finding | Evidence |
|---|---|---|---|
| X1 — fixed locally | Export | Control characters in text (vertical tab and form feed are common in text pasted from Word or PDF) are written unescaped into slide XML, so the slide part is not well-formed. PowerPoint shows a repair prompt or drops the slide; LibreOffice stops drawing at that character. All three looks. Credits and notes too. `src/lib/services/pptx-generator.ts` text paths; request schema allows any string. Fix: one sanitiser at the generator boundary stripping `[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]` from every string passed to `addText` and `addNotes`. | Reproduced (lead): pptxgenjs writes both characters into `slide1.xml`; reproduced (reviewer) on our generator |
| X2 — fixed locally | Export, preview, Markdown | Formula parser corrupts ordinary text (`src/lib/utils/formula-parser.ts`): unbraced `^` and `_` swallow the tail ("3x^2-4x+1" becomes a superscript "2-4x+1"; "x_1+x_2" subscripts "1+x"; "teacher_name@school.edu" is mangled); the chemical heuristic drops characters from hyphenated names ("Wi-Fi" becomes "WiFi", "X-Ray" becomes "XRa") and subscripts "COVID-19", "B-52"; `$5 ... $10` loses both dollar signs (treated as LaTeX). Fix: unbraced forms take only a signed digit run or one letter; formula detection by element whitelist with no hyphen except an ion charge; strip `$` only when the content looks like math. | Reproduced (lead), all cases |
| S1 — fixed locally | Security, availability | Zod 4.6.5 memory exhaustion: an authenticated 4.2 MB POST of `slides: [{},{},...]` to `download-pptx` or `download-markdown` used 3.5 GB heap and 29 s. Fix: upgrade to zod 4.6.6 or later (patch within `^4.6.5`); optionally cheap early length check. | Reproduced (reviewer, same schema shape); fix confirmed (4.6.6 returns in 1 ms) |
| S2 — fixed locally | Security, availability | `.docx` zip bomb: 292 KB file inflating to 100 MB exhausted a 2 GB heap (81 s GC thrash then crash). `src/lib/parsers/document-parser.ts` passes it straight to mammoth; the 4 MB cap bounds only the compressed size. Fix: inspect the zip first, reject if summed uncompressed size is over about 20 MB or an entry over about 10 MB; cap extracted text. | Reproduced (reviewer) |
| S3 — fixed locally | Security, availability | `pdf-parse` (pdf.js 1.10, 2018) has no page cap or timeout: a 3 MB PDF with 40,000 empty pages burned 72 s of CPU on the event loop. Fix: reject by page count before parsing, `max` option, hard timeout. | Reproduced (reviewer) |
| P1 — fixed locally | Production reliability | The text-generation client is built with no `timeout` or `maxRetries` (`src/lib/providers/text-provider.ts:36`): OpenAI SDK defaults (10-minute timeout, 2 retries) stack with the app's 6 attempts and up to 31 s backoff, and 4xx errors (bad key, bad model) are retried the full count. One slow call plus one retry passes the 300 s function limit, so Vercel returns a non-JSON 504. Fix: `timeout` about 100 s, `maxRetries: 0`, an overall deadline about 240 s, retry only 408/429/5xx and parse failures. | Code reading (lead: no timeout or maxRetries set) |
| N1 — mitigated locally | Runtime, PDF | pdf-parse 1.1.4 (pdf.js 1.10.100) fails on Node 26 for real PDFs with 'bad XRef entry' (other parser exceptions can also occur); the reported LibreOffice PDF parses on Node 22 and 24. Mitigated by pinning engines to `>=22.12 <25`; PDF parsing is unsupported on Node 25 and later. The real fix is replacing pdf-parse with a maintained parser (separate task). | User reproduced a LibreOffice-made PDF on 22.23.4/24.22.1/26.3.0; local original real-PDF test also fails on Node 26.3.0 with UnknownErrorException. Follow-up: its existing pooled-Buffer workaround needed a larger fixture on Node 24 (32 KiB threshold); that padded fixture also parses on Node 26, so failure is not universal. The supported-version integration assertion remains active and unchanged. |

### P2: real bugs, fix soon

| ID | Area | Finding | Evidence |
|---|---|---|---|
| U1 | UI regression (our looks work) | Empty content slide: the "Click to add a bullet" prompt uses fixed `text-slate-600`, so on Chalkboard (`22302C`) its contrast is about 1.8:1 and it is invisible; it also sits outside the slide font scope. `EditableSlideView.tsx:65`. Fix: use the theme palette. | Code reading plus computed contrast |
| U2 | UI | Delete Slide in the panel has no last-slide guard (the sorter has one), so a deck can be emptied; Preview then sets `isSlideShowActive` with nothing to show, its key listener stays active (Space and arrows are swallowed), and "Add Slide" later pops a fullscreen slideshow. An empty deck is also exportable. Fix: disable Delete on the last slide (or confirm), disable Preview and exports at zero slides, gate the listener on a current slide. | Reproduced (lead, guard absent by code); reproduced (reviewer, behaviour) |
| U3 | UI | Escape on a freshly inserted empty bullet leaves `""` in the deck (Backspace and blur delete it). `InlineText.tsx:106`; the existing test locks in the leak. | Reproduced (lead, code); reproduced (reviewer, test) |
| U4 | UI | Focus yank in `PresentationWorkspaceView.tsx:39-46`: clicking the already-active view button arms a flag that later moves focus to the stage while typing in a panel field; also any focused button that becomes disabled (Download while downloading, Next at the end) loses focus to the stage. | Reproduced (reviewer, tests) |
| U5 | UI | Dialog Escape only works with focus inside the dialog; after clicking the backdrop Escape does nothing (`SessionDialogs.tsx:19`). Escape is also swallowed while generating. | Reproduced (reviewer) |
| U6 | UI | Phone: the panel is remounted per slide (`key={selectedId}`), so the open "Image" section collapses on every Next. | Reproduced (reviewer) |
| U7 | UI | Upload races: no sequencing, so a slower older upload overwrites a newer one or pasted text; the paste box and the text sent to Generate can disagree; the same file cannot be re-picked after a failed upload; a late upload refills the home screen after Start over. `UploadSection.tsx`, `page.tsx`. | Reproduced (reviewer for paste mismatch); code reading for the rest |
| E1 — fixed locally | Export | Transparent PNG pictures (Commons diagrams, maps) are flattened onto a transparent canvas and encoded as JPEG, so they export with a black background while the preview shows the card colour. `compress-image.ts:30-34`. Fix: fill white before drawing, or keep PNG. | Hypothesis (known canvas behaviour) |
| E2 — fixed locally | Export | When compression returns `''` (decode failure, image over 150k characters) the slide keeps its credit line, hyperlink and notes for a picture that is not in the file; budget-dropped images are not reported to the teacher either (`droppedImageIndexes` is ignored by `use-deck-export.ts`); a platform 413 shows raw text. | Code reading |
| E3 — fixed locally | Export | The package is written uncompressed (STORE). A 200-slide text-only deck is 4.25 MB; about 100 slides with images can exceed Vercel's 4.5 MB response limit. Fix: `compression: true` and `DEFLATE` in the final `generateAsync`. | Reproduced (reviewer, size) |
| E4 — fixed locally | Export | A long credit line (about 300 characters) overflows its box in PowerPoint and spills over the Chalkboard frame (`fit: 'shrink'` is not applied until edited). Fix: truncate on the slide (full text stays in notes). | Reproduced (reviewer, render) |
| E5 — fixed locally | Export | Exported pictures have no useful alt text (`descr="preencoded.png"`). Fix: `altText` from the visual description or title. | Reproduced (reviewer, XML) |
| E6 | Export | NASA pictures are cropped (`object-cover`) in the preview but aspect-fit in the PPTX (a WYSIWYG break, kept on purpose in ADR 0028). | Code reading |
| I1 — fixed locally | Images, production | The batch route returns every image as base64 in one JSON response, generated one after another: with an AI image provider this can pass the 4.5 MB response limit or 300 s, and the client only `console.error`s, so teachers see no images and no message. Pexels-only (today's production) is fine. Fix: per-slide calls with limited concurrency from the client, a visible failure state, abort on reset or replace. `use-slide-deck.ts:66-92`. | Code reading (sizes estimated) |
| I2 — fixed locally | Images | Default image model `dall-e-3` with size `1024x576` is not an accepted size; every AI call would 400 and be retried (about 12 calls per image). Not hit in production today (Pexels-only). | Code reading |
| C1 — fixed locally | CI | The `verify` job has no `next build`, so font config and route segment config are only checked by Vercel; `next/font/local` is stubbed in tests. | Reproduced (reviewer) |
| C2 — fixed locally | Config | `vitest.config.mts` is not type-checked and sets a non-existent option (`environmentMatchGlobs`); component tests work only through per-file docblocks. | Reproduced (reviewer) |
| C3 | Process | Making `verify` a required check (ADR 0008) is still a pending user action; `main` auto-deploys. | Known |

### P3: hardening and smaller items

| ID | Area | Finding |
|---|---|---|
| S4 | Cost abuse | No rate limit or quota on paid routes (`generate`, `generate-image(s)`, `health` makes a real chat completion per call); a valid session can fan out many paid calls. Needs a shared store (KV) and a product decision. |
| S5 — fixed locally | CSRF | Cookie is `SameSite=None; Secure` and routes accept any content type, so a cross-site form can run authenticated paid POSTs under a victim's session (cost and attribution only). Fix: require `application/json`, check `Sec-Fetch-Site` or `Origin`. |
| S6 | Auth | The `?access=` handoff token: replay protection is an in-memory map (per serverless instance), the token appears in request URLs and logs, and it is stripped from the address bar only after success. |
| S7 — fixed locally | Hardening | Pexels and image-provider URL fetches are unbounded (no timeout, size cap or host allowlist); `boundedFetch` already exists. Legacy `subject` is unvalidated and interpolated into the prompt; export filename has no length cap; no security headers (`nosniff`, `Referrer-Policy`, `frame-ancestors` if embedding is intended); `noStore` missing on most routes; `.gitignore` does not cover `.env.production`. |
| S8 | Dependencies | See the advisory table. |
| U8 | UI | IME: Escape runs before the `isComposing` guard in `InlineText.tsx`; `AbortSignal.throwIfAborted` needs newer browsers (older WebViews would fail every generation); duplicating a slide before its batch image lands leaves the duplicate without an image; `handleReset` does not clear `isLoading`; the rail uses `<button draggable>` (likely dead in Firefox, hypothesis); navigation keys (PageDown, Home, arrows) are hijacked from any focused button; the radio `aria-label` in the Look picker hides the "PowerPoint font" note; a jump-to-slide label always ends in "..."; "Remove Bullet" buttons share one name; per-keystroke overflow maths costs about 30 ms for 30 dense slides; slideshow index flashes a stale slide on open. |
| E7 — fixed locally | Export | Markdown sub and superscripts lose letters outside the small unicode maps ("a_n" becomes "an"); a corrupt library image fails the whole export with the generic 500 (by design in ADR 0028). |
| T1 | Tests | Weak or dead tests: the SessionDecks export test cannot fail if the wrong deck is exported (both decks share one object); `useSlideSelection` and `splitSelection` are production-dead but tests exercise them; the LookPicker arrow-key test never checks selection; GeneratingPanel chip test cannot fail; DecorationEditing does not check z-order; architecture guards miss `process?.env`, `route.tsx`, a local fake `defineRoute`, and docs paths outside a few files; the Node 26 `upload.test.ts` error is a test artefact (FormData body without Content-Length), not a production bug; no `engines` or `.nvmrc`. |
| D1 | Docs and assets | ADR index stops at 0024 (0019, 0020, 0025 to 0028 missing); several ADRs and the theme roadmap still say "release pending review"; old plans under `docs/superpowers/plans` contradict code; README says MIT but there is no `LICENSE`; Geist and the Mokie mascot have no recorded licence or provenance; `public/logo.png` duplicates `sayuna-logo.png`; fonts ship as raw TTF (about 2.2 MB, no woff2). |

## Dependency advisories (`npm audit --omit=dev`)

| Package | Reachable from this app? | Action |
|---|---|---|
| zod 4.6.5 | **Yes** (S1) | `npm update zod` to 4.6.7: non-breaking |
| undici (transitive, dev and optional) | No | `npm update undici`: non-breaking |
| image-size 1.2.1 and pptxgenjs (via it) | No for user input: the export wire check forces a PNG or JPEG signature, and the vulnerable parsers (JXL, HEIF, ICNS) cannot run | Keep the guard; bump to image-size 2.x later (major) |
| next 14.2.35 (critical advisories) | Mostly no: empty `next.config`, no middleware, rewrites or server actions, `next/image` only for two local mascot files. The RSC deserialization DoS is unsure | No 14.x fix exists. Plan a separate upgrade to Next 15.5 (backport line) with React 19 and `eslint-config-next` 15.5 |
| postcss (transitive, build-time) | No | Resolved by the Next upgrade |

## Areas the reviewers found sound

Reducer layer (300-run fuzz of the session reducer: unique ids, valid selection, no stale state), slide-id routing of late image results, abort handling in generation and the Another session dialog, auth order in every route, session token signing, body caps, image-library host allowlists and `boundedFetch`, upload extension and size limits, export request budgeting, OOXML attribute validity (srcRect, rotations, alpha, shadow order, custGeom, roundRect), decoration engine and z-order, fit and split termination, focus traps in the slideshow and session dialogs, Look picker dismissal, tab roving focus, contrast of the chrome, filename slugging, CI permissions.

## Proposed fix order

1. **Export integrity**: X1, X2, E1, E2, E3, E4, E5 (and E7).
2. **Input hardening and reliability**: S1, S2, S3, P1, S7, undici update, I1 and I2 (client batch calls), C1, C2.
3. **UI and state sweep**: U1 to U8, T1.
4. **Hygiene**: C3 (user), D1, test guards, engines.
5. **Decisions needed**: S4 (rate limits), S5 and S6 (CSRF and handoff token), E6, and the Next 15 upgrade as its own project.

## Export integrity resolution (2026-10-26)

X1, X2, E1–E5 and E7 are fixed on `fix/export-integrity`; PR creation and release
remain pending because this task prohibits pushing or merging. See
`docs/adr/0029-export-integrity.md` and `docs/export-integrity-verification.md`.
E7’s Unicode fallback is fixed; corrupt library-image decode errors retain the
ADR 0028 behavior, as required by this phase’s scope. All other findings remain open.

## Input hardening resolution (2026-10-27)

S1, S2, S3, S5, S7, P1, I1, I2, C1 and C2 have local fixes on
fix/input-hardening; PR/release are pending under the no-push/no-merge instruction.
S3 gains page/text caps but a hard PDF worker timeout remains open (allowed bundling
fallback). Zod is 4.6.7 and Undici 8.12.3. Other dependency upgrades remain separate.
S4 and S6 remain open. Frame/embedding restrictions require a product decision.
See `docs/adr/0030-input-hardening.md` and `docs/input-hardening-verification.md`.
