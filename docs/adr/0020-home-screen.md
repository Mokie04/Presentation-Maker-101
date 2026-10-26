# ADR 0020: A guided home screen with Mokie

Status: Accepted for local implementation; release review pending

## Context

Teachers need to understand how a lesson becomes a deck and choose the right session before starting generation. The approved home mock introduces a hero, the Mokie mascot, a numbered form and a generating state. The workspace and its editing/export contracts remain unchanged.

## Decision

`src/components/home/HomeHero.tsx` introduces the lesson-to-slides promise, three workflow steps and a decorative Mokie stage. The stage is hidden below 768 px to keep the form close to the top. `src/components/home/HomeTrustStrip.tsx` supplies the mock's three supporting explanations. `src/components/home/Mokie.tsx` selects the supplied transparent WebP assets by size, with explicit image dimensions and hero priority. The imagery and slide cards are decorative, with empty image alternatives and no extra announcements.

`src/components/UploadSection.tsx` retains its props and upload/generation handlers. The numbered form uses native radios for Session 1–5 (full accessible names) and the existing native subject dropdown, including Automatic and its existing provenance semantics. Native radio behavior supplies keyboard navigation; checked state follows the parent prop. Step completion means input readiness, not successful generation.

`src/components/home/GeneratingPanel.tsx` announces the real loadingStage supplied by the existing generation client. Decorative lesson-part chips light sequentially using `getPartBadgeInfo`; the last stays animated and the bar is indeterminate until the request ends. These animations describe activity, not provider stages, completion percentages or estimated time. Chip background and foreground change together; their pulse changes position rather than fading contrast. Reduced-motion settings disable the mascot, chip and bar animations.

The generating panel appears above the still-available setup controls. This differs from the mock's script, which hides the form. Keeping controls available preserves existing interaction and the provenance/race tests: later control changes must not alter the lesson/session/subject already submitted. The generation button remains disabled while loading. Newly mounted feedback scrolls into view once, without animated scrolling or repeated jumps as loadingStage changes.

## Typography and colour boundaries

`src/lib/fonts.ts` holds the single existing local Poppins definition, extracted without changing files, weights, variable or loading options. The slide renderer imports that same definition. Only the home wrapper applies Poppins to headings and the already-loaded Geist to body text; workspace chrome continues to use its prior font. No network font or new dependency is introduced.

Sun colours live in `tailwind.config.ts` and are confined to headline highlighting, mascot/header glow and the indeterminate bar. Informational home text uses slate-600 or darker on white/pale surfaces; coloured controls use contrasting text/background pairs. The shared Header keeps its logo/brand and receives the requested tagline and faint glow; that is the sole intentional workspace chrome change.

## Consequences

Home styling is isolated from the deck, workspace controls, routes, prompts, exports and Another session dialog. Existing test assertions remain unchanged; upload-screen session selection is adapted through `chooseSession`. Native keyboard behavior, responsive target sizes, reduced motion and actual contrast are also checked in a browser because jsdom cannot establish them.

Additional Mokie poses (thinking, oops and celebrate) and a workspace chrome redesign are deferred to `docs/home-screen-roadmap.md`.
