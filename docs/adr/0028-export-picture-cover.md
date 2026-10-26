# ADR 0028: Aspect-preserving cover sizing for ordinary export pictures

Date: 2026-10-26
Status: Accepted (local fix; release pending review)

## Defect

Classic and Chalkboard supplied the content picture box as the source width/height
to PptxGenJS's legacy sizing API. That API derives source aspect from those values,
not the image bytes. Landscape/portrait photos were stretched into the near-square
box; the exported width was also 4.2 inches versus the preview's 32% (about 4.267).
Browser object-cover retains natural proportions with a centred crop. ADR 0027
corrected only Paper Notebook's new rotated path to preserve the other looks then.

## Decision

Generalize that private helper into addCoverImage for all ordinary content pictures
in `src/lib/services/pptx-generator.ts`. Decode width/height with existing image-size,
pass the real source aspect, and cover the theme's existing content image box.
Use centred native srcRect cropping. Optional rotation defaults to zero and emits
no option when zero; Paper retains its 2° path and byte-identical valid exports.

Catch only dimension-decoding exceptions and reject missing/zero dimensions from
the cover path. Return to the existing legacy contain block in that case, preserving
ordinary-image export behavior without adding a decode failure. This fallback does
not repair corrupt pixels. Leave the imageSizing layout token in place: it is still
used by the fallback, although successful ordinary exports now use the preview box.

Library images (metadata present, including Commons/NASA) retain existing aspect-fit
containment and decode errors. Title images, placeholders, picture geometry,
rounding, decorations, fit/split, routes and the entire preview are unchanged.
Classic/Chalkboard ordinary-image bytes deliberately change only in picture extent
and srcRect; no other part of their slide construction changes.

## Verification

Node tests cover JPEG/PNG at 3:2, 2:3, 1:1 and box-matching 32:33, independent crop
math, zero rotation, malformed-image fallback, library error/containment behavior
and strict XML. Three snapshot entries change, confined to picture extent/crop and
hashes; Paper and all other snapshots remain unchanged. Whole-package comparisons
against PR42 head 2de3737 prove Paper and library identities. See
`docs/export-picture-cover-verification.md` for exact ZIP entries, render sheet,
local landscape-photo-like evidence, temporary Poppins cleanup and final gates.
