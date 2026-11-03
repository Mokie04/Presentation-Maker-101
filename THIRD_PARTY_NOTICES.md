# Third-party notices

This application's own code is under the MIT licence in [LICENSE](LICENSE). It bundles or depends on the third-party material below, each under its own licence.

## Fonts

All font files are unmodified upstream releases. Each licence text is stored beside the fonts in `src/app/fonts/`. None of the font licences or name tables declares a Reserved Font Name.

| Font | Files | Licence | Licence text | Source |
|---|---|---|---|---|
| Poppins 4.004 (Regular, Bold, Italic) | `src/app/fonts/Poppins-Regular.ttf`, `src/app/fonts/Poppins-Bold.ttf`, `src/app/fonts/Poppins-Italic.ttf` | SIL Open Font License 1.1 | `src/app/fonts/Poppins-OFL.txt` | The Poppins Project Authors, [github.com/itfoundry/Poppins](https://github.com/itfoundry/Poppins). Byte-identical to Google Fonts `ofl/poppins` at commit [7dc16b7](https://github.com/google/fonts/tree/7dc16b7de42db624b902f2292b68ed9e489e5053/ofl/poppins). |
| Arimo 1.23 (Regular, Bold, Italic) | `src/app/fonts/Arimo-Regular.ttf`, `src/app/fonts/Arimo-Bold.ttf`, `src/app/fonts/Arimo-Italic.ttf` | Apache License 2.0 | `src/app/fonts/Arimo-Apache-2.0.txt` | Google Fonts archived Apache release at commit [5e49edb](https://github.com/google/fonts/tree/5e49edbd1875f214e0decae1e24b200066780fa8/apache/arimo); see ADR 0024. |
| Gelasio 1.008 (Regular, Bold, Italic) | `src/app/fonts/Gelasio-Regular.ttf`, `src/app/fonts/Gelasio-Bold.ttf`, `src/app/fonts/Gelasio-Italic.ttf` | SIL Open Font License 1.1 | `src/app/fonts/Gelasio-OFL.txt` | The Gelasio Project Authors, [SorkinType/Gelasio](https://github.com/SorkinType/Gelasio/tree/2c0540285e823e996a5276223807e2175515daae) at commit 2c05402; see ADR 0024. |
| Geist and Geist Mono 1.200 (variable) | `src/app/fonts/GeistVF.woff`, `src/app/fonts/GeistMonoVF.woff` | SIL Open Font License 1.1 | `src/app/fonts/Geist-OFL.txt` | Vercel in collaboration with basement.studio, [vercel/geist-font](https://github.com/vercel/geist-font/tree/63b548e95d4821c66fb74f9f93c7c8a693d48301) (tag 1.2.0). The two files are byte-identical to the Next.js 14.2.35 `create-next-app` template copies. |

## Images

| Asset | Files | Licence |
|---|---|---|
| Mokie mascot | `public/mascot/mokie-360.webp`, `public/mascot/mokie-640.webp` | Supplied by the product owner; source and licence to be confirmed by the owner. |
| Sayuna logo and app icons | `public/sayuna-logo.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico` | Supplied by the product owner; source and licence to be confirmed by the owner. |

## npm packages

Production dependencies (direct and transitive) as resolved by `package-lock.json`. Regenerate this list with `node scripts/licenses.mjs`; `tests/architecture/licenses.test.ts` fails if a production dependency is licensed only under GPL, AGPL or LGPL. Each package's own licence text ships inside its folder in `node_modules`. Development-only tools (test runner, linters, type definitions used only for checking) are not distributed and are not listed.

| Licence | Count | Packages |
|---|---|---|
| MIT | 46 | @next/env, @next/swc-* (platform binaries; one is installed per platform), @types/node, @xmldom/xmldom, argparse, base64-js, busboy, client-only, core-util-is, image-size, immediate, isarray, js-tokens, lie, loose-envify, nanoid, next, node-ensure, parse5, pdf-parse, postcss, pptxgenjs, process-nextick-args, queue, react, react-dom, readable-stream, safe-buffer, scheduler, setimmediate, streamsearch, string_decoder, styled-jsx, underscore, undici-types, util-deprecate, xmlbuilder, zod |
| BSD-2-Clause | 5 | dingbat-to-unicode, entities, lop, mammoth, option |
| ISC | 5 | graceful-fs, https, inherits, lucide-react, picocolors |
| Apache-2.0 | 3 | @swc/counter, @swc/helpers, openai |
| BSD-3-Clause | 2 | source-map-js, sprintf-js |
| CC-BY-4.0 | 1 | caniuse-lite (browser support data used by the build) |
| BSD | 1 | duck (its LICENSE file is the two-clause BSD text) |
| MIT OR GPL-3.0-or-later | 1 | jszip, used under MIT |
| MIT AND Zlib | 1 | pako |
| 0BSD | 1 | tslib |

Notes:

- `pdf-parse` bundles Mozilla pdf.js 1.10.100 (Apache License 2.0) inside its package.
- `busboy` and `streamsearch` declare MIT through the older `licenses` field.
- `@types/node` is a production dependency only because `pptxgenjs` declares it.
