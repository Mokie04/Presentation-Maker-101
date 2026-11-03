# ADR 0024: Office-safe look fonts and measured rendering

Date: 2026-10-26
Status: Accepted (theme roadmap Phase 3)
PR: [#39](https://github.com/Mokie04/Presentation-Maker-101/pull/39)

## Decision

Register Chalkboard and Paper Notebook beside Sayuna Classic. The two palettes
are the approved values in `src/lib/themes/chalkboard.ts` and
`src/lib/themes/paper-notebook.ts`; both reuse Classic's shape/layout references.
The registry-wide contrast test passes every new-look pair without exceptions.
Classic's three existing exceptions remain pinned without colour changes.

Chalkboard exports in Arial and previews/measures with Arimo; Paper Notebook
exports in Georgia and previews/measures with Gelasio. Office delivery relies on
installed Arial/Georgia, avoiding a requirement to install a new face on teachers'
PowerPoint machines. Stand-ins preserve nearly all supported Latin advances;
measured symbol differences and fallback limits are recorded below.

`src/lib/fonts.ts` bundles static Regular, Bold and Italic faces for each stand-in
(served as woff2 since the hygiene change; see Web font delivery below),
with display swap, preload false and --font-slide-arimo/--font-slide-gelasio.
Theme data remains pure and never imports next/font. SlideView applies all three
variable classes. The product owner explicitly accepted these extra root-class
tokens as the sole allowed Classic HTML difference; styles/content and Classic
PPTX bytes remain unchanged. Poppins loading and metrics are unchanged.

## Font provenance and licenses

Arimo uses the official archived Google Fonts Apache release at commit
5e49edbd1875f214e0decae1e24b200066780fa8 (upstream hotfix labelled v1.231; the font
name table says Version 1.23). Current Arimo upstream moved to SIL OFL in 2026;
its current files must not be described as Apache licensed. We use the pinned
Apache statics rather than relabeling the current OFL release or substituting a
font. Gelasio is the maintainer's static Version 1.008 at commit
2c0540285e823e996a5276223807e2175515daae, under SIL OFL 1.1. No variable-font
instancing or font modifications were needed. License texts are bundled beside
the fonts, following the existing Poppins precedent. All files are unmodified.

| Source file (now in src/app/fonts/source, licence texts in src/app/fonts) | Embedded version | SHA-256 | Upstream URL |
|---|---|---|---|
| Arimo-Regular.ttf | Version 1.23 | `eafef8c99e94d10f17506c125e24d98a84256e0e665e6c659498eca96b19e148` | [Pinned source](https://raw.githubusercontent.com/google/fonts/5e49edbd1875f214e0decae1e24b200066780fa8/apache/arimo/Arimo-Regular.ttf) |
| Arimo-Bold.ttf | Version 1.23 | `89a9a8f88a1da4cc2a96238a19239ef85e12205ea06122e226dd36932cbd482e` | [Pinned source](https://raw.githubusercontent.com/google/fonts/5e49edbd1875f214e0decae1e24b200066780fa8/apache/arimo/Arimo-Bold.ttf) |
| Arimo-Italic.ttf | Version 1.23 | `edcc229e781249b3f623061f5ac3f94b5fa6b880c85876f73b09b99b23ab6223` | [Pinned source](https://raw.githubusercontent.com/google/fonts/5e49edbd1875f214e0decae1e24b200066780fa8/apache/arimo/Arimo-Italic.ttf) |
| Arimo-Apache-2.0.txt | License text | `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30` | [Pinned source](https://raw.githubusercontent.com/google/fonts/5e49edbd1875f214e0decae1e24b200066780fa8/apache/arimo/LICENSE.txt) |
| Gelasio-Regular.ttf | Version 1.008; ttfautohint (v1.8.4.7-5d5b) | `48c797fbe0e07c48a18cb962e7bdfa23f19618327dddf54093265328dc9eb39d` | [Pinned source](https://raw.githubusercontent.com/SorkinType/Gelasio/2c0540285e823e996a5276223807e2175515daae/fonts/ttf/Gelasio-Regular.ttf) |
| Gelasio-Bold.ttf | Version 1.008; ttfautohint (v1.8.4.7-5d5b) | `e0ef3addf1acf35f5c6aef2be00d0a2c01363bf70a5950e16650976051a0c462` | [Pinned source](https://raw.githubusercontent.com/SorkinType/Gelasio/2c0540285e823e996a5276223807e2175515daae/fonts/ttf/Gelasio-Bold.ttf) |
| Gelasio-Italic.ttf | Version 1.008; ttfautohint (v1.8.4.7-5d5b) | `1d8bda4ff258bb8251eae4f7d7500c8d97d084136192bb264bc2305168765d1b` | [Pinned source](https://raw.githubusercontent.com/SorkinType/Gelasio/2c0540285e823e996a5276223807e2175515daae/fonts/ttf/Gelasio-Italic.ttf) |
| Gelasio-OFL.txt | License text | `b393cb01867c919b44381512120dc3e4c954c7b47e2035c405f3a324799a4d29` | [Pinned source](https://raw.githubusercontent.com/SorkinType/Gelasio/2c0540285e823e996a5276223807e2175515daae/OFL.txt) |

## Web font delivery (woff2)

The app serves woff2 copies of all nine Poppins, Arimo and Gelasio faces through
`next/font/local`; the unmodified TTFs move to `src/app/fonts/source/`, where the
metrics, comparison and render scripts read them and where they remain the
licence-compliant source. Neither licence forbids the conversion: Arimo is Apache
2.0, and the Poppins and Gelasio OFL statements and font name tables declare no
Reserved Font Name. Geist and Geist Mono already ship as woff and are unchanged.

Conversion used wawoff2 2.0.1 from npm (the WebAssembly build of the reference
woff2 encoder), run once outside the repository with default settings: plain
lossless compression, no subsetting, no hinting or glyph changes. It is not a
project dependency. `src/app/fonts/MANIFEST.json` records the SHA-256 and size of
every file in the fonts folder; `tests/lib/font-manifest.test.ts` fails when a
file changes without it (rewrite it with `node scripts/font-manifest.mjs`), and
`tests/lib/slide-fit-metrics-drift.test.ts` recomputes the Poppins, Arimo and
Gelasio metrics tables from the source TTFs in memory and requires them to equal
the committed modules, so a font swap without regenerated metrics fails.

| Face | TTF bytes | woff2 bytes | TTF SHA-256 | woff2 SHA-256 |
|---|---|---|---|---|
| Poppins-Regular | 160,316 | 51,528 | `7e65201e9b79159e2300267cc885e16c8dcef2424cdfa09a29bfb0980a94a7ba` | `168aae2bf5b20ff9931b7463deea95c2ea02d4dcad2128ad609575244a369a24` |
| Poppins-Bold | 155,996 | 51,012 | `983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c` | `eea0ca7c05cc5e893e9dbd497384ba4d7131e301195ebaeb716a62dd2bd18bc2` |
| Poppins-Italic | 184,544 | 58,836 | `4fa76ae75b40f926420514044722cb97f32186cafd3b38263cc34dad7174d46d` | `107a16d21f1845ea18957a07843d2f4a81c3b9b297987bea84b59f78bb541393` |
| Arimo-Regular | 436,180 | 172,620 | `eafef8c99e94d10f17506c125e24d98a84256e0e665e6c659498eca96b19e148` | `dd134d1f315347d1f4ca7bc0258b3d956c4138028ac0068872a08c0f8d689c6d` |
| Arimo-Bold | 438,516 | 173,024 | `89a9a8f88a1da4cc2a96238a19239ef85e12205ea06122e226dd36932cbd482e` | `19c44bb6532f8e93ff4955729ec9c7ba47da115bf0b7272864b8086086d45f48` |
| Arimo-Italic | 440,740 | 178,204 | `edcc229e781249b3f623061f5ac3f94b5fa6b880c85876f73b09b99b23ab6223` | `433018c9c87558b0fb75680203ecb681691ce5c9a0ae995f1d5e3c94272ada04` |
| Gelasio-Regular | 147,572 | 57,884 | `48c797fbe0e07c48a18cb962e7bdfa23f19618327dddf54093265328dc9eb39d` | `f1e9ac9e319e112a8d85a50803c676d4febd7afb1cbfaa488afff4d6e2d56aef` |
| Gelasio-Bold | 148,380 | 58,208 | `e0ef3addf1acf35f5c6aef2be00d0a2c01363bf70a5950e16650976051a0c462` | `a78b0df623d73cd776486975ecc18a7baa1deffeaebf6f788aa818b8b565fbe8` |
| Gelasio-Italic | 160,268 | 62,416 | `1d8bda4ff258bb8251eae4f7d7500c8d97d084136192bb264bc2305168765d1b` | `e25dcdb34084aede65011a504dc6afe690c6f04e0d050722d3ac8b56156eb7e4` |

Total 2,272,512 bytes of TTF become 863,732 bytes of woff2 (62.0% smaller). On
the wire the gain is smaller because servers gzip TTF: in a local `next start`
check, the six faces the looks load (Regular and Bold of each) transferred
775,115 bytes as gzipped TTF and 564,276 bytes as woff2.

Losslessness for our needs: each woff2 was decoded with the same tool and
compared with its TTF. The hmtx and cmap tables are byte-identical, the unrounded
advances for the 146-character metrics set (and the missing-glyph list) are
identical, and every glyph outline is identical (points, on-curve flags,
instructions, bounding boxes and composite components; 1,060 Poppins, 2,584 Arimo
and 1,069 or 1,070 Gelasio glyphs per face). The bytes that differ are the woff2
re-encoding of glyf/loca, the head checksum and the head flag that marks a
lossless conversion, and Poppins's empty 8-byte DSIG stub, which the WOFF2 format
drops. The committed metrics modules are byte-identical after regeneration from
the moved TTFs (Poppins SHA-256 unchanged, below).

Real-build check (Chromium, `next start`, 1280x800): every slide text box in the
rail and stage (48 per look, all three looks) has the same position and size to
0.01 px with TTF and woff2, and the network lists only woff2 slide fonts.
Loading: neither build recorded a layout-shift entry on the home screen, and the
home heading's line boxes are identical in Poppins and in Next's size-adjusted
fallback face at 320 to 1280 px widths, so a late swap does not move content.
`preload` therefore stays false for every face.

## Metrics and shaping boundary

`scripts/generate-slide-fit-metrics.mjs` exports the shared TTF reader and the
same 146-character set, and generates tables with Poppins Arimo Gelasio arguments.
`src/lib/slide-fit-metrics-registry.ts` registers poppins/arimo/gelasio. Poppins's
generated SHA-256 remains e530752277407e31aa2d732cd65d525a1ff6a024a91a31adf50f6e364f50c6e8.
No import of the reader regenerates files; only its CLI entry point does so.
New-look title previews explicitly use the selected metrics' line height rather
than inheriting Poppins's 1.5 leading. This avoids new-look multiline clipping and
leaves Classic styles unchanged. Body leading retains the shared layout policy.

The dev-only `scripts/compare-slide-font-advances.mjs` reads real system Arial and
Georgia in place and compares unrounded advances with bundled stand-ins. System
font files are never copied or committed. Values below are max / mean absolute
advance deviations per 1000 em over the full 146-character set:

| Pair | Regular | Bold | Italic |
|---|---|---|---|
| Arial / Arimo | 416.992 / 11.424 | 416.992 / 11.424 | 416.992 / 11.424 |
| Georgia / Gelasio | 512.207 / 26.143 | 472.168 / 21.468 | 512.207 / 25.835 |

These totals include missing-glyph (.notdef) widths and must not be presented as
ordinary Latin discrepancies. On shared glyphs, Arial/Arimo is exactly 0 / 0 for
all three styles (129 glyphs). Georgia/Gelasio is 90.332 / 0.659 regular,
52.734 / 0.385 bold, 43.945 / 0.321 italic (137 glyphs); the shared discrepancy is
Sigma. Gelasio lacks eight lowercase Greek glyphs in this set, and the installed
Arial lacks several superscript/subscript symbols. Browser/Office font fallback
for those symbols is platform-dependent; the table is coverage for estimation,
not a claim that every glyph exists in every bundled face. Advance measurement
does not prove kerning, shaping or fallback geometry on another platform.

Generation-time autoFitDeck remains on Classic. Nineteen slides produced by the
existing 24-bullet, credited 8-bullet and formula-dense fixtures still fit in both
new looks. Each gains title vertical slack on all 19 and body slack on one;
line-wrap thresholds tie on the other bodies. Separate wrapping stress tests
prove the narrower body metrics are used. No teacher text is shortened or
re-split when a look changes.

## PowerPoint font and hyperlink handling

For non-default looks only, createPresentationPptx sets the presentation head
and body font faces so later-added text uses Arial or Georgia. The completed
buildPresentationPptx package normalizes hlink and folHlink in its theme XML to
the look's muted credit colour. This protects renderers that ignore PptxGenJS's
explicit hyperlink-text-colour extension. Raw object-factory writes have the
font scheme; completed exports through the builder have the normalized link
scheme. The application export route uses that builder.

JSZip 3.10.2, already installed through PptxGenJS, is declared directly because
production now uses it for this package post-processing. No additional tool was
installed. The default export returns before this step: Classic archives and
every ZIP entry remain byte-identical, including the Phase 1 fixtures.

## Render evidence and limits

`scripts/render-pptx-compare.mjs` is a local dev harness, not CI or application
code. It builds six fixed slides per look, converts via installed LibreOffice,
rasterizes with Poppler, renders the same SlideView source with Chromium and the
real production formula CSS, and writes sheets to an ignored output folder.
See `scripts/README-slide-look-rendering.md` for invocation and tolerance.

LibreOffice's PDF font inventory confirms real Arial/Georgia in the new-look
renders. Colours, credit links, counters, card borders and dense 24 pt content
are readable; browser text boxes show no new-look overflow. Existing Classic
font substitution and glyph-ink overshoot are reported as baseline limitations.
Native PowerPoint PNG export was attempted but did not complete: a file-access
prompt blocked the open and AppleScript subsequently returned parameter error
-50. Native PowerPoint rendering remains NOT_PROVEN; LibreOffice is a separate
evidence layer. The initial Classic render substituted fonts. With explicit user approval, the
three bundled Poppins faces were temporarily registered for the login session,
all sheets rerendered, and registration removed in finally cleanup. The final
Classic PDF inventory confirms Poppins Regular/Bold/Italic; registration and
unregistration each succeeded for all three files. No system font file was copied.
This establishes a LibreOffice Poppins baseline, not native PowerPoint proof.

Accepted differences: existing PPTX text-box insets and bullet indentation,
formula sub/superscript placement, hyperlink underline, antialiasing and minor
native line placement. Accepted tolerance never includes missing text, a new-look
box overflowing, a substituted Office face or an unreadable credit link.

## How to add a look

1. Add a pure theme file with a unique ID, approved palette and layout/shape tokens;
   register it in the theme list. The header picker follows the list automatically.
2. Pass every foreground/background contrast pair; do not add implicit exceptions.
3. Bundle licensed static fonts, sources/hashes and local font variables; generate
   and register metrics. Compare Office delivery-face advances and fallback limits.
4. Add real-registry preview/export/state coverage and XML goldens using the shared
   legacy characterization inputs and six render fixtures.
5. For decoration, add one shared list, run validateDecorations, and add source/SVG/native parity plus strict XML coverage. Respect protected boxes and contrast; see `docs/adr/0025-decoration-engine.md`.
6. Run the local render harness and actual Next picker at all three breakpoints;
   verify fonts, fit, credits, payload IDs and Classic byte identity before release.

No decorations, textures, new frames, slide masters, generation-time look field,
other looks, saved lessons or image-style pairing are introduced in this phase.
