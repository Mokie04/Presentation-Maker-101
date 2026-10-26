# Theme module Phase 1 implementation plan

Goal: parameterize Classic's rendering and fitting without changing default output.
Spec: Phase 1 request and docs/theme-style-roadmap.md (accepted decisions).
Architecture: retain legacy constants; compose a default theme and registry; pass
optional trailing theme arguments through fit, split, preview and PPTX paths.
No dependencies, new fonts, routes, schemas, picker or provider calls.

- [x] Capture main ff0d9ac: fixed-date short/dense/Commons PPTX, five SlideView
  serialized HTML cases, Normal/sorter/slideshow at 1440/768/390 pixels.
- [x] Add registry, legacy-equivalence, computed contrast/exception and metrics tests;
  observe missing-module failures, then implement themes and metrics lookup.
- [x] Add explicit-default parity and custom-theme propagation tests; implement
  theme parameters across fitting, splitting, auto-fit, preview/editing and PPTX.
- [x] Generalize metrics generation by font-face arguments; verify no-argument and
  explicit Poppins generation leave the existing table byte-identical.
- [x] Document ADR 0022 and update roadmap, architecture map and glossary.
- [x] Run typecheck, lint, full suite, next build; compare all ZIP entries, HTML
  and browser screenshots to main. Review the final diff and commit scoped files.

Review focus: no literal-valued geometry types preventing later looks; unknown
metrics fail explicitly; custom layout and font reach nested fitting/splitting;
Classic's native rounded rectangle emits no new DrawingML adjustment; exceptions
pin exact pairs and fail both on new regressions and on a previously failing fix.

Decisions: getTheme falls back to Classic for unknown IDs; isThemeId is the strict
registry guard. previewFont is the CSS font-family string; SlideView retains the
existing locally loaded Poppins variable class. PPTX omits a radius override for
Classic's exact radius, preserving the native roundRect XML.

Verification: 141 files / 1,523 tests pass on Node 22.23.4; typecheck, lint
and Next build pass. Existing assertions and snapshots unchanged. All three
fixed-time PPTX archives (146 entries) and five HTML cases are byte-identical.
Browser: 21 settled comparisons, unchanged slide content; 19 PNGs identical,
two have only a navigation edge / off-viewport final scanline difference.
Separate reviewer found no actionable issues. Node 26 produced an upload-stream
unhandled rejection despite all assertions passing; Node 22 CI runtime is clean.
See docs/theme-phase1-verification.md for the full evidence and decisions.
