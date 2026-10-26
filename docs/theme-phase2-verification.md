# Phase 2 Look picker verification

2026-10-26. Branch: feat/look-picker.
Base: main a594175062ed52825088c745bae9db0def02f3da (merged Phase 1).
No push, merge, deployment, live provider calls or new production looks/fonts.

## Diff summary

- List-built theme registry preserving the const ID tuple and Classic values.
  The second look exists only in tests/helpers/test-theme.ts.
- Lesson-level themeId/theme/setThemeId in useSlideDeck, outside reducers.
  Guarded browser preference under sayuna:look; session changes retain the choice,
  unknown IDs are ignored and Start over seeds from the remembered preference.
- Header LookPicker, hidden with one registered look. Named native radios, live
  selected-slide thumbnails, font notes, non-modal dismissal/focus, tactile frame,
  mobile sheet, two-tone focus and phone touch targets.
- Active theme passed to rail, stage, panel, sorter, slideshow and every fit/split
  decision. Thumbnail memoization includes the theme reference.
- Non-default PPTX requests include themeId; default and Markdown requests omit
  it. Server validates IDs and resolves the supplied theme without changing auth,
  body limits, error policy, filenames, image budgeting or generation.
- ADR 0023, glossary, architecture and roadmap updates. Seven new test files with
  26 tests; existing test assertions, helpers and snapshot files are unchanged.

## Verification gates

All gates ran with the production Classic-only registry after removing the
browser-only registration, using the installed Node 22.23.4 executable:

| Gate | Result |
|---|---|
| TypeScript tsc --noEmit | Exit 0 |
| Next lint --dir src --dir tests | Exit 0; no warnings/errors |
| Vitest run --maxWorkers=2 | Exit 0; 148 files, 1,549 tests pass |
| Next build | Exit 0 |
| Documentation path guard | Passes in full suite |
| Six slide XML goldens and all other snapshots | Pass unchanged |
| Separate read-only review | No actionable findings |

The suite prints existing jsdom canvas getContext notices, with no unhandled
errors. Tests cover storage failures/invalid preferences, shared session state,
same-event theme change/Split, picker dismissal/focus/label-blur regression,
real XML export, validation failures, default request identity, Markdown omission,
thumbnail memoization and theme propagation. Switching back restores exact stage
markup. The generation route, legacy theme constants and metrics table have no diff.

## Byte identity

Before editing product code, the Phase 1 harness was rerun on main with Date fixed
to 2026-10-26T00:00:00Z. Real async timers remained enabled. The branch's production
registry rebuilt the same fixtures. Each whole archive and every ZIP entry match
both main and the retained original Phase 1 fixture:

| Fixture | ZIP entries | Different entries | Whole archive identical |
|---|---|---|---|
| Short | 47 | 0 | Yes |
| Dense, shrinking and splitting | 55 | 0 | Yes |
| Credited Commons image | 44 | 0 | Yes |

Five serialized SlideView HTML cases (title, image, no image, dense, credited)
match exactly. Combined JSON SHA-256:
5a7e69f71767bb594bc00e1d103ff3729a73707930f39c55869ffa66b48d0660.

The default PPTX request body is byte-identical; its SHA-256 is
932644264549bcf937d6f341e336bbc5e174c6820b512e104ced9542256e9be4.
Tests also pin explicit Classic omission and non-default inclusion. A real route
export without themeId matches the existing generator's fixed-date bytes, while
exports with the registered test look contain its palette and Arial export face.
Unknown and non-string IDs return the normal sanitized 400 with the clear message
"themeId must be a supported look".

## Browser evidence

Chromium, 1440 / 768 / 390 px, viewport height 1000, device scale 1, reduced motion.
Session, generation and image responses are stubbed. No provider calls run.

Production registry: 21 screenshot comparisons against main (five slide cases
in Normal plus sorter and slideshow at each width). Picker absence was explicitly
asserted at all three widths, including after removing the temporary registration.
Workspace/slide content is visually unchanged. Sixteen PNGs are byte-identical;
five have sparse raster-edge differences, recorded without claiming full PNG
identity: two pixels each on two desktop card edges, four navigation-edge pixels
in desktop slideshow, one thumbnail-edge scanline on phone, and the final
full-page scanline below the phone viewport. The JSON manifest records bounds and
counts; no text, geometry or palette changes were found.

For the second-look checks, an UNCOMMITTED patch temporarily imported a local
copy of the test fixture into the registry. Twelve screenshots show the open
picker and switched Normal, sorter and slideshow at all three widths. Assertions
passed for:

- Native ArrowDown selection, immediate application and focus return.
- Preview-label click selection, Escape, outside click and restoration of Classic.
- No additional network requests when changing looks.
- Theme colours in Normal, sorter and slideshow.
- Popover staying in the viewport at all widths; phone sheet x=8, width=374 px
  inside a 390 px viewport.
- Visible keyboard focus: 2 px sky outline plus 2 px white edge.
- Axe on the open chooser, including real-browser contrast: zero violations.
  Decorative miniatures are inert; radio names and font notes remain accessible.

Browser verification caught and fixed two issues before completion: a 768 px
popover anchoring error and a pointer-induced blur that closed native labels
before activation. The label-blur failure has a regression test. All final
browser interactions passed after the fixes.

The temporary registry patch and src/lib/themes/test-look.local.ts were removed
BEFORE final tests, typecheck, lint and build. A source search confirms no test-look
registration/import or development flag remains in production. The patch copy
and screenshots are retained as evidence only, outside the repository.

## Choices and limits

- Registry construction lives in a pure createThemeRegistry helper. Classic's
  declaration uses as const satisfies SlideTheme so the list retains literal IDs.
- An absent export themeId retains the existing two-argument generator invocation
  to preserve existing API-call assertions; supplied IDs use the third argument.
- Null relatedTarget during pointer-induced blur does not dismiss the chooser;
  outside pointer presses and actual focus transfer outside still dismiss it.
- Mini previews are inert/pointer-passive so the label is the click target and
  Classic's unchanged, scaled slide colours are not treated as chooser text.
- Generation-time auto-fit remains on Classic, documented in ADR 0023. Other
  looks use active-theme notices and Split; switching never rewrites the deck.
- Saved-lesson persistence is not built; its future snapshot should store themeId.

[Comparison manifest, archive hashes and browser assertions](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase2/comparison.json)

[Production baseline screenshots](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase2/main/browser)

[Production branch screenshots](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase2/branch/browser)

[Two-look screenshots and assertions](/Users/johnnavarro/.codex/visualizations/2026/10/26/01a17661-7993-7300-86ae-70e4dbd458f7/theme-phase2/two-look-check)
