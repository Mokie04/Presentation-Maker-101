# ADR 0029: Export integrity

Date: 2026-10-26
Status: Accepted (local fix; PR and release pending)

## Defects

Pasted C0 controls could produce invalid slide or relationship XML. Formula parsing
could consume adjacent algebra, remove currency delimiters, or discard characters
from ordinary words. Markdown lost script markers when a Unicode glyph was absent.
Browser JPEG re-encoding flattened transparent diagrams to black. Compression
failures left credits for omitted pictures; budget omissions were invisible to
teachers. Uncompressed packages risked the platform response limit. Long visible
credits overflowed their fixed box, and picture descriptions were filenames.

## Decision

Use the pure stripIllegalXmlCharacters helper in `src/lib/utils/xml-text.ts` at
PPTX string sinks in `src/lib/services/pptx-generator.ts`. Remove exactly
U+0000–0008, U+000B, U+000C, U+000E–001F, U+FFFE and U+FFFF. Preserve tab, LF, CR,
XML special characters, emoji and right-to-left text. PptxGenJS remains responsible
for XML escaping and its existing paragraph/newline serialization. Sanitize slide
parts, formula inputs (including bullets and writer attribution), placeholders,
credits, notes, hyperlink targets, picture descriptions and presentation properties.
Topic and subject currently do not populate presentation properties; retain those
existing defaults and sanitize them. The request schema and authored preview text
are unchanged.

The shared parser in `src/lib/utils/formula-parser.ts` consumes an unbraced
exponent as optional sign plus digits, or one letter. Subscripts require a
single-letter variable, digit, closing bracket or whitelisted chemical formula
fragment as their base; their unbraced payload is digits or one letter. Chemical
prefixes such as CO, Fe, NaCl, H2SO, NH and Ca validate with the existing
whitelist. Preserve parsed counts within that fragment and consume chained
underscore forms one run at a time (Fe_2O_3, H_2SO_4, Ca_3(PO_4)_2). Multi-letter
word suffixes such as H2O_guide remain literal; email guards still apply. Braces
and parentheses retain grouped scripts.
Malformed/incomplete markup stays literal. Chemical recognition consumes the whole
candidate token using the 118 known element symbols, counts and an optional ion
charge. Hyphenated words, unknown symbols and stray lowercase letters stay literal.
Email tokens stay literal. Dollar delimiters unwrap only explicit math syntax (backslash, caret, underscore,
braces, equals) or a single-letter variable; currency retains its dollars.

Concatenated segment text preserves all ordinary characters and order. Explicit
supported markup is interpreted, and the existing arrow and radical conversions
remain intentional exceptions: -> / --> become →, and sqrt(...) becomes √(...).
This resolves the request's literal no-markup invariant against its simultaneous
requirement to preserve those existing passing tests. A deterministic 2,000-string
property-style test exercises ordinary letters, digits, hyphens, @, dots and spaces,
including whitespace-only input. Markdown uses Unicode only when every character
in a script run maps; otherwise it keeps readable caret/underscore markup, with
braces around longer runs. Preview and PPTX continue to share the same segments.

Browser compression in `src/lib/export/compress-image.ts` scans the scaled canvas
(up to 480 px) for alpha below 255. Preserve PNG for any transparency; opaque
images use JPEG. When pixel reads are unavailable or throw, paint white and redraw
before JPEG encoding. Existing fallback size limits and last-slide-first request
budget trimming remain in force, including for larger PNGs.

`src/lib/export/build-export-request.ts` records compression omissions (empty or
failed results) as well as budget omissions, removing their credit metadata from
the outgoing copy. The export hook exposes a dismissible, deck/session-scoped
status beside the workspace download buttons after a successful download. Its
copy says which pictures were omitted without claiming that every omission was
caused by file size. Platform HTTP 413 or FUNCTION_PAYLOAD_TOO_LARGE responses use
a friendly size message.

Pass compression: true to PptxGenJS write. Version 4.0.1 ignores that flag with
explicit nodebuffer output, so the final JSZip pass uses DEFLATE for **all** looks.
Retain entry order, content types and all uncompressed entry bytes, apart from
intentional picture descriptions and corrected formula runs. Existing non-default
look hyperlink color normalization remains unchanged.

Limit the PPTX visible credit to 160 Unicode code points including a final ellipsis
when truncated. Speaker notes retain the full credit metadata and the hyperlink
retains its full sanitized target. Do not change browser credit layout. Ordinary
pictures use visual description, falling back to slide title; library pictures use
the metadata title, falling back to slide title. Sanitize descriptions before
fallback selection. Decoration shapes receive no alt text.

## Verification and limits

`tests/lib/services/export-integrity.test.ts` covers every registered look and a
decorated test look with hostile text, every XML/relationship part, long credits,
picture descriptions, and 200-slide compression with per-entry byte/order checks.
`tests/lib/utils/xml-text.test.ts` independently pins the exact sanitizer rule.
Parser, component, canvas, request, hook and workspace regressions cover each
remaining behavior. See `docs/export-integrity-formulas.md` for actual before/after
preview/PPTX/Markdown cases and `docs/export-integrity-verification.md` for package
comparisons, rendering, browser checks, assertion changes and final gates.

No schema/security hardening, generation changes, new looks, layout/fit changes,
or NASA preview/export crop changes are included. LibreOffice/Chromium evidence
is local acceptance evidence; it does not establish native PowerPoint behavior.

## Underscore chemistry follow-up

Restore the original EditableSlideView CO_2 assertion. Parser and cross-render
regressions verify chemical, identifier and email cases in preview, PPTX and
Markdown, with a second 2,000-sample property check for underscores between prose
words. See the follow-up table in `docs/export-integrity-formulas.md`. Plain-digit
parenthesized chemical groups are deferred; explicit underscored group notation
is supported.
