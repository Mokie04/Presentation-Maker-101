# ADR 0023: One remembered look per lesson

Date: 2026-10-26
Status: Accepted (Phase 2 implementation; release pending review)

## Context

[ADR 0022](0022-slide-themes.md) introduced optional theme arguments while keeping
Classic's bytes and appearance. Teachers need one choice applied consistently
across session decks, previews, text-fit decisions and PowerPoint downloads.
Only Classic ships until Phase 3, so Phase 2 must add no visible production UI.

## Decision

`src/lib/themes/registry.ts` builds ordered themes, a const ID tuple, lookup and
validation from one list. `src/lib/themes/index.ts` registers only Sayuna Classic.
Tests replace the module with a registry containing the test-only fixture in
`tests/helpers/test-theme.ts`; production has no test-look registration or flags.

`src/lib/deck/use-slide-deck.ts` owns themeId, theme and setThemeId next to session
state, outside both reducers. One look belongs to the lesson, survives session
loads/switches and leaves slide content/image ownership untouched. Unknown IDs
are ignored. A synchronous reference ensures a set and Split in the same event
uses the latest theme, matching the hook's existing synchronous deck references.

`src/lib/themes/preference.ts` remembers the last choice under sayuna:look in
localStorage. Every storage operation is guarded; missing/invalid IDs and read
failures fall back to Classic, and write failures do not block the active choice.
The preference seeds a newly mounted workspace or Start over with a new lesson.
It is a browser convenience, not lesson data; external storage changes do not
restyle an active lesson. A future saved-lesson snapshot should store themeId
explicitly and validate it when restoring the lesson.

`src/components/workspace/LookPicker.tsx` lives in the workspace header. It returns
nothing when fewer than two looks are registered, preserving current chrome.
When there are alternatives, its Look: name button opens a non-modal popover
with a named native radio group, live selected-slide previews via SlideThumbnail,
look names and PowerPoint font notes. Visual-only miniatures are inert; option
names and font notes provide the accessible information without treating scaled
slide text as picker instructions. Selection applies immediately and closes;
selection/Escape return focus to the button. Outside pointer presses and focus
leaving the chooser dismiss it without trapping focus. Native arrow-key radio
behavior is retained, and the existing workspace navigation ignores form inputs.
The frame uses a tactile outline/shadow, becomes a full-width inset sheet on
phones, and retains visible two-tone focus, 44 px phone targets and reduced-motion
support. No look picker appears on the home screen.

The workspace passes theme through rail, stage, settings panel and sorter; the
page passes it to slideshow. Thumbnail memoization includes the theme reference,
while still ignoring unrelated parent/drag changes. Every overflow and split
suggestion uses the active theme, including the hook's Split action.

## Export contract

`src/lib/export/build-export-request.ts` includes themeId only for non-default
PPTX requests, inside the existing serialized-size budgeting loop. Omitted and
explicit Classic produce the exact previous request body. `useDeckExport` receives
the current lesson ID; Markdown still sends only presentationData and session.
Filenames and image/credit budgeting behavior are unchanged.

`src/lib/schemas/presentation-export.ts` accepts an optional themeId validated by
isThemeId, including the type check. Unknown and non-string values use the normal
sanitized 400 with the message themeId must be a supported look. The PPTX handler
resolves a supplied ID with getTheme and passes the theme to buildPresentationPptx.
An absent ID retains the existing two-argument generator invocation, preserving
both its API-call contract in existing tests and default export bytes. Auth, body
caps, defineRoute and error policy are unchanged.

## Generation and limits

The generation route and prompts are unchanged. Generation-time autoFitDeck
continues to measure and split with Classic metrics because the look is selected
after generation. A slide that overflows under another look uses the existing
fit notices and Split button, measured with that look. Switching looks never
requests generation or images and never rewrites or automatically re-splits text.

No new looks, fonts, metrics, textures, decoration, per-session overrides, home
picker or saved-lesson persistence ship here. Phase 3 only needs to register new
theme definitions and their font/metrics dependencies. Classic's known contrast
exceptions remain as documented in ADR 0022. Native PowerPoint rendering of
future fonts remains a separate verification layer.
