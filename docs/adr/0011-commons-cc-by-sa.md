# 0011 — Accept CC BY-SA Commons images

Date: 2026-10
Status: Accepted

## Context

Teachers often found Commons images they could not use. The first Commons version accepted only public domain, CC0 and plain CC BY; CC BY-SA, the most common license on Commons, was shown as unavailable.

## Decision

`src/lib/providers/commons-provider.ts` accepts CC BY-SA 1.0, 2.0, 2.5, 3.0 and 4.0 as licenseKind `cc-by-sa` under the same metadata gates as CC BY: the license URL is the canonical `https://creativecommons.org/licenses/by-sa/<version>/` for that version, the Artist is identified and not "unknown", attribution is not declared unnecessary, and there are no additional restrictions. CC BY-NC, CC BY-ND and every other license stay excluded, because the app is commercial and resizes images.

## Owner decision

The product owner accepted the ShareAlike obligations on 2026-10-24.

## Consequences

- Attribution and the license link are always shown, as for CC BY.
- `src/lib/image-credit.ts` marks the credit as ShareAlike; the speaker notes and Markdown export state that the exported copy is an adapted copy that stays under the same license. The visible PowerPoint credit keeps one source hyperlink.
- The picker shows a short ShareAlike hint before selection.
- The app does not declare the deck as a whole to be CC BY-SA.
- This is a product decision, not legal advice. The checks are metadata checks, not rights clearance.

## Alternatives considered

Staying conservative (no BY-SA) kept teachers blocked from most Commons images. Accepting NonCommercial licenses was rejected because the app is a commercial product. See `docs/commons-provider.md` and `docs/commons-licenses-roadmap.md`.
