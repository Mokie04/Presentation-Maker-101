# Local slide look verification

Dev tools only; no provider requests, production routes, or CI integration.
Use Node 22.23.4 (the repo's CI major). LibreOffice, pdftoppm and pdffonts must
already be installed; these scripts do not install anything. Arial and Georgia
are read from macOS Supplemental Fonts in place and are never copied.

Regenerate committed metrics:

```sh
node scripts/generate-slide-fit-metrics.mjs Poppins Arimo Gelasio
```

Compare raw, unrounded advances for the 146-character metrics set:

```sh
node scripts/compare-slide-font-advances.mjs output/theme-render/font-deviations.json
```

Create the output directory first if running the comparison alone. The report
separates all characters (including .notdef advances) from glyphs supported by
both files. These are font-file advances per 1000 em, not a shaping/kerning test.

Render all three looks using an already available Playwright package/Chromium:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/node_modules/playwright \
CHROMIUM_EXECUTABLE=/absolute/path/to/Chromium \
node scripts/render-pptx-compare.mjs
```

Omit those variables if Playwright and its browser are resolvable normally.
SOFFICE and PDFTOPPM can override command locations. An optional first argument
selects the output directory; the default output/theme-render is Git-ignored.
The harness uses an isolated LibreOffice profile and a local Vite wrapper around
the real SlideView, production globals.css/Tailwind formula styles, and bundled
fonts. Its small next/font/local shim only supplies the CSS-variable class names;
the separate real-Next browser check verifies Next's actual font loading.

Each look produces a six-slide PPTX, PDF, LibreOffice PNGs, Chromium PNGs and
comparison.html/comparison.png side-by-side sheets. report.json includes actual
PDF font names, estimator results, browser text-box dimensions and page errors.
The native PNG may be one pixel wider after PDF rasterization rounding.
Font substitution is explicitly recorded; it is not proof of the requested face.
No system fonts are installed or registered by the script.

Acceptance: approved colours, readable links/counters, all content present and
no new-look clipping at the 24 pt floor. Browser/PPTX are not pixel-equivalent:
PowerPoint text-box insets/bullets, native formula script placement, underline,
font rasterization and line placement can differ. A missing line, overflowing
box, substituted Office face or illegible link is a failure, not tolerance.
Classic's existing font-substitution/contrast limitations are reported separately.
PowerPoint automation is a separate optional spot check; LibreOffice does not
prove native PowerPoint rendering.
