# UI and state sweep implementation plan

Base: main `34738ae`; branch `fix/ui-state-sweep`.
Spec: user attachment `/Users/johnnavarro/.codex/attachments/b2df76a7-ba8b-4be0-83cf-f7b8361f4553/Pasted text.txt`.

## Global Constraints

Do not push or merge. One commit per numbered section, no history rewriting.
No visual redesign, new features, provider/security/CI work, component rewrites, or export changes except section 7d's image-load timeout. Existing assertions change only when they lock a named bug; inventory every change. Work test-first for every bug, preserving exact RED and GREEN logs. Preserve teacher inputs, active-session ownership and stable slide IDs. No extra provider calls for duplicate-image handling. Use existing utilities, no dependencies.

## Execution

For each numbered task, inspect the named source/tests, add behavioral regressions, run and save RED, implement the smallest fix, run focused GREEN, self-review and write the task report. A separate reviewer checks the diff before the section's single commit. The controller owns commits and final validation. Run the full Node 22 gates and Node 24 suite after all sections; browser checks use local stub responses only. Keep a ledger outside tracked files and merge evidence into `docs/ui-state-sweep-verification.md` in section 10.

## Files and boundaries

1. SlidePanel, workspace, sorter, slideshow, page: last-slide/empty-deck guards.
2. InlineText and nearby tests: empty Escape and IME ordering.
3. EditableSlideView: theme/font scoped empty prompt; registered-look contrast test.
4. Workspace focus, download buttons, SessionDialogs, slide-navigation, page/HomeHero: focus/Escape/navigation/reset.
5. Workspace keyed panel/SlidePanel: native disclosure lifecycle.
6. UploadSection and page: sequenced uploads and one visible text source.
7. Slideshow open transition, page loading reset, generate abort helper, export image timeout, pending duplicate-image ownership.
8. LookPicker, slideshow options, bullet names, fit copy, Header/page heading, writers wrapping; Firefox check before any rail change.
9. getSlideOverflow in slide-fit and rail/sorter/panel consumers: bounded per-object memoization.
10. Real session reducer/hook tests and dead selection hook/plumbing; test strengthening; ADR0031 and affected ADRs, architecture/module docs, review resolution and evidence.

### Task 1: EMPTY-DECK AND SLIDESHOW GUARDS (U2)

Problem: Delete Slide in the panel has no last-slide guard (the sorter disables it at one slide), so a deck can be emptied. Preview then sets the slideshow active while SlideshowModal renders nothing, but its window key listener stays registered (Space and arrows are swallowed, Escape too), and a later "Add Slide" suddenly opens a fullscreen slideshow. An empty deck can also be exported.
Fix: disable Delete Slide in the panel when only one slide remains (same rule and a short title/aria explanation as the sorter); disable Preview and both download buttons when there are no slides; in SlideshowModal gate the keyboard listener and rendering on there being a current slide, and make the page close the slideshow whenever the slide count reaches zero. Check whether a deck can still become empty by any other route (generation returning zero slides, duplicate/move/split paths); if it can, add the sorter empty-state action ("Add slide"); if not, say so and skip it.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 2: INLINE EDITING (U3, IME)

Problem A: Escape on a freshly inserted empty bullet leaves an empty string bullet in the deck (Enter inserts '' and starts editing; Escape calls onChange(original) then onFinish with completed=true, so the blur path that deletes empty bullets never runs). Backspace and blur both delete it. src/components/workspace/InlineText.tsx. The existing test around line 220 asserts [['change:'],['finish']] and locks the bug in; change it deliberately.
Fix A: when Escape restores an original that is '' and an onEmptyBlur handler exists, call it (delete the bullet) instead of onFinish.
Problem B: Escape, Enter and Backspace run before the isComposing guard, so pressing Esc to cancel an IME composition reverts and ends the edit, and Safari fires compositionend before the Enter keydown.
Fix B: guard all three keys with `event.nativeEvent.isComposing || event.keyCode === 229`. Tests with composition events.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 3: THEME-AWARE EMPTY STATE (U1)

Problem: on an empty content slide the "Click to add a bullet" button in EditableSlideView.tsx (about line 65) uses fixed text-slate-600; on Chalkboard (background 22302C) its contrast is about 1.8 to 1 and it is effectively invisible; it also sits outside the slide's font scope.
Fix: use the active theme's palette (muted or textDark) and previewFont, and keep AA contrast for every registered look. Add a test that computes the contrast of that prompt for every registered theme and requires at least 4.5 to 1 (use the existing wcagContrast helper).


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 4: FOCUS AND KEYBOARD (U4, U5, navigation)

a. PresentationWorkspaceView changeView arms focusContent before setView; if the view does not change (clicking the active "Normal" or "Slide sorter" button) no render happens and the stale flag later yanks focus to "Slide stage" while the teacher types in a panel field. Only arm it when the mode actually changes.
b. The "lost focus" recovery also fires when the focused button merely becomes disabled (Download while downloading, Next or Previous at the ends), moving focus to the stage. Restrict recovery to elements that were removed from the document. For the download buttons keep focus on the same button (use aria-disabled with a guard instead of `disabled` while a download is running, and announce state through the existing label text).
c. Session dialogs (SessionDialogs.tsx): Escape is handled only by onKeyDown on the dialog panel, so after clicking the backdrop (focus goes to body) Escape does nothing; Escape is also swallowed while generating. Register Escape at the document level while a dialog is open (as the slideshow does), closing the topmost layer only, and let Escape cancel an in-flight generation through the same abort path as the Cancel button.
d. slide-navigation.ts hijacks Home, End, PageUp, PageDown, ArrowUp and ArrowDown from any focused button or link (PageDown on the focused Download button changes slides). Handle those keys only when the target is the body, the stage, the rail or the workspace container, not on buttons, links, tabs, summaries or form fields. Keep Alt+Arrow reorder and the existing form-field exclusions.
e. After "Start over" is confirmed the workspace unmounts and focus falls to body (use-dialog-focus restore is skipped because the opener is gone). Move focus to the home page's main heading (give it tabIndex -1) after reset.
Tests for each (jsdom plus userEvent or fireEvent as the repo does).


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 5: PHONE AND PANEL STATE (U6)

Problem: the panel is remounted per slide (key={selectedId}) and an effect resets the "Image" details element to its default, so on phones (below 768 px) an opened Image section collapses on every Next, contradicting ADR 0014's "retains the teacher's choice".
Fix: hold the disclosure state above the keyed panel (or drop the key and reset only on a breakpoint change). Test: open the section, go to the next slide, it stays open; crossing the breakpoint resets it.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 6: UPLOAD RACES (U7)

Problems in UploadSection.tsx and page.tsx: no sequencing, so a slower older upload can overwrite a newer one or pasted text; a late upload refills the home screen after Start over; the paste box can show text A while Generate sends file text B (the textarea state is not tied to the extracted text); the same file cannot be picked again after a failed upload (the input value is never reset).
Fix: a request counter or AbortController in processFile that ignores stale results and aborts on unmount and on Start over; mark the drop zone busy while uploading; one source of truth for the lesson text shown in the paste box (uploading a file clears the paste box; pasting clears the file name); reset the file input value after reading the file. Keep the existing messages and roles. Tests with delayed fetch mocks for each scenario.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 7: SLIDESHOW AND SMALL STATE ITEMS

a. SlideshowModal re-seeds currentIndex in an effect after isOpen flips, so the first render on open uses a stale index (one wrong slide flashes, or null if out of range). Derive the index on open (reset state during the open transition or key an inner component per opening).
b. handleReset in page.tsx aborts generation but does not clear isLoading or loadingStage, so after a reset mid-generation the Generate button would stay disabled. Clear both.
c. generate-client.ts and any other place call AbortSignal.throwIfAborted(), which older iOS and Android WebViews lack (Chrome 100, Safari 15.4, Firefox 97 needed). Replace with a small helper that throws a DOMException named AbortError when signal.aborted. Search the whole src tree.
d. compressImageForExport never settles if an http(s) image load stalls, leaving the PPTX button on "Compiling PPTX..." forever. Add a timeout (about 15 s) that falls back exactly like a load error (the picture is then reported as left out by the existing notice).
e. Duplicating a slide before its automatic picture arrives leaves the duplicate without a picture (the load result is routed only to the original id). Reproduce it with the per-slide loading added in PR 45. Fix only if it is small and does not spend extra provider calls (for example, apply a result to slides duplicated from the original while the request was in flight); otherwise document the limitation in the ADR and skip.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 8: ACCESSIBILITY AND COPY (smaller items)

- LookPicker: the radio's aria-label overrides its label, so screen readers never hear the "PowerPoint font: ..." note. Name the radio from the look name (aria-labelledby) and link the note with aria-describedby.
- SlideshowModal jump-to-slide options always append "..." even for short titles: only when truncating.
- Every "Remove Bullet" button has the same name: "Remove bullet 2" and so on.
- SlideFitNotice says "or split the slide" even when no Split button is offered (title slide, single overflowing bullet): make the sentence conditional on onSplit.
- Two h1 elements on the home screen (Header and HomeHero): keep exactly one h1 per screen. Header's brand text must not be a heading on the home screen; on the workspace screen make sure there is still one h1 (use the existing presentation title or an sr-only heading). Update tests that look up the Header heading, listing each.
- UserCheck writers line can shrink on long unbroken writer names at 320 px: allow wrapping with overflow-wrap anywhere.
- Rail drag in Firefox (hypothesis): rail options are <button draggable>, which Firefox does not drag. If you can run Firefox here (Playwright's Firefox), reproduce; if it is broken, convert the option to a non-button element with role option and tabIndex -1 while keeping ADR 0012 behaviour and tests; if you cannot test Firefox, leave it and note it as unverified.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 9: PERFORMANCE (measured by the reviewer: about 30 ms per rail render for 30 dense overflowing slides, on every keystroke in Normal view)

SlideRail, SlideSorter and SlidePanel call getSlideOverflow (a full fitSlide) for every slide on every deck change. Memoize the overflow result per slide content, index, writers and theme (a WeakMap keyed by the slide object plus a small key, or compute once in a selector and pass down) so typing in one slide recomputes only that slide. Test with a call-count spy: editing one slide of 30 recomputes one overflow, not 30. Keep the results identical.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

### Task 10: TESTS THAT CANNOT FAIL (T1)

- tests/components/SessionDecks.test.tsx "exports and previews the active session": give the two session decks different titles and assert the export request body and the slideshow slide come from the ACTIVE deck.
- useSlideSelection (src/lib/deck/use-slide-selection.ts) and the deck.splitSelection plumbing are dead in production (selection runs through reconcileSelection in session-decks-reducer). Delete the dead hook and its plumbing and migrate the useful assertions from use-slide-split.test.tsx, deck-operations-selection.test.ts and SlideRail.test.tsx to the reducer/real hook path; keep every scenario, change only the subject under test, and list each migrated test.
- Add a session-decks-reducer test for a late async result after a session-level reset (it exists only at deck-reducer level).
- LookPicker "leaves arrow keys..." test: assert that arrow keys change the selected radio and close behaviour as designed, not just that keyDown is not default-prevented.
- GeneratingPanel chip test advances 20 s before asserting: assert the chips light progressively (checks at intervals) so it fails if all are lit at once.
- DecorationEditing: assert the behind layer precedes the text and the front layer follows it in DOM order.
- NewLooksPicker: assert onChange is not called when the already-selected look is clicked.


Method: add failing regressions for each sub-item; save RED output, implement, save GREEN output. Report assertion edits and any justified skips. Do not commit; controller reviews and creates this section's single commit.

Final documentation and verification requirements:

- docs/adr/0031-ui-state-sweep.md: the defects, the fixes, the rules adopted (last-slide guard, document-level Escape for dialogs, focus-recovery rule, navigation-key target rule, one h1, disclosure state above keyed panels, overflow memoization) and anything deliberately skipped (duplicate-before-image if skipped, Firefox rail drag if untested).
- Update docs/code-review-2026-10-26.md (mark U1 to U8, T1 and the state items fixed with the PR), and any ADR whose stated behaviour you changed (0013 edit-on-slide Escape rule, 0014 phone panel, 0019 dialogs). Keep tests/architecture/docs-paths.test.ts green.

OUT OF SCOPE
Visual redesign, new features, export and PPTX code (except the image-load timeout in 7d), security or provider work, CI hygiene, architecture guard tests, Next or React upgrades.

VERIFY (include evidence in your report)
- Typecheck, lint, the full test suite and `next build` pass (Node 22; also run the suite on Node 24).
- The RED then GREEN evidence table for every bug.
- Browser check with stubbed responses at 1440, 768 and 390 px: delete down to one slide and confirm Delete is disabled, Preview and downloads disabled at zero slides via the sorter path if reachable; Escape on a new bullet; type in a panel field after clicking the active view button (focus stays); keyboard Tab and Enter on Download keeps focus; PageDown on a focused button does not change slides; backdrop click then Escape closes a dialog; phone Image section stays open across Next; an empty Chalkboard content slide shows a clearly visible prompt (include a screenshot); delayed upload responses in both orders; Start over then focus lands on the home heading; slideshow opens on the right slide with no flash.
- Accessibility tree dump (or axe) of the Look picker radios showing the font note as a description, and of the home screen showing a single h1.
- The list of existing test assertions you changed and why.
