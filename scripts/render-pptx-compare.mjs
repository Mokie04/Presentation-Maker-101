// Dev-only: installed LibreOffice/Poppler and a separately available Playwright are required.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'output/theme-render'));
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env } });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(`${command}: ${output}`)));
  });
}

const fontShim = path.join(out, 'font-shim.mjs');
await writeFile(fontShim, `export default options => ({ variable: options.variable.slice(2) });\n`);
const css = []; // Layout/reset/formula utilities come from the actual production stylesheet below.
for (const family of ['Poppins', 'Arimo', 'Gelasio']) {
  for (const [style, weight, slant] of [['Regular', 400, 'normal'], ['Bold', 700, 'normal'], ['Italic', 400, 'italic']]) {
    css.push(`@font-face{font-family:"${family} Preview";src:url("/src/app/fonts/${family}-${style}.ttf");font-weight:${weight};font-style:${slant};font-display:swap}`);
  }
  css.push(`.font-slide-${family.toLowerCase()}{--font-slide-${family.toLowerCase()}:"${family} Preview"}`);
}
const entry = path.join(out, 'harness.jsx');
await writeFile(entry, `import React from 'react';
import ${JSON.stringify(path.join(root, 'src/app/globals.css'))};
import {createRoot} from 'react-dom/client';
import {SlideView} from ${JSON.stringify(path.join(root, 'src/components/SlideView.tsx'))};
import {THEMES} from ${JSON.stringify(path.join(root, 'src/lib/themes/index.ts'))};
import {lookFixtureDeck as deck,lookFixtureImages as images} from ${JSON.stringify(path.join(root, 'tests/helpers/look-render-fixtures.ts'))};
const query=new URLSearchParams(location.search);const theme=THEMES.find(t=>t.id===query.get('theme'))||THEMES[0];
const index=Number(query.get('slide')||0);
createRoot(document.getElementById('root')).render(<div style={{width:1280,height:720}}><SlideView slide={deck.slides[index]} index={index} total={deck.slides.length} image={images[index]} originalWriters={deck.originalWriters} theme={theme}/></div>);
`);
const server = await createServer({
  configFile: false, root, plugins: [react(), { name: 'look-render-page', configureServer(vite) {
    vite.middlewares.use('/__look_render', async (request, response, next) => {
      if (request.url.startsWith('/sheet')) return next();
      const html = `<!doctype html><html><head><style>${css.join('\n')}</style></head><body><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`;
      response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml('/__look_render', html));
    });
  } }],
  resolve: { alias: { '@': path.join(root, 'src'), 'next/font/local': fontShim,
    react: path.join(root, 'node_modules/react'), 'react-dom': path.join(root, 'node_modules/react-dom') } },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, out] } },
});
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const { THEMES } = await server.ssrLoadModule('/src/lib/themes/index.ts');
  const { buildPresentationPptx } = await server.ssrLoadModule('/src/lib/services/pptx-generator.ts');
  const { fitSlide } = await server.ssrLoadModule('/src/lib/slide-fit.ts');
  const { autoFitDeck } = await server.ssrLoadModule('/src/lib/auto-fit-deck.ts');
  const { lookFixtureDeck: deck, lookFixtureImages: images } = await server.ssrLoadModule('/tests/helpers/look-render-fixtures.ts');
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const report = { dimensions: [1280, 720], themes: [], browserErrors: [] };
  page.on('pageerror', error => report.browserErrors.push(error.message));
  for (const theme of THEMES) {
    console.log(`Rendering ${theme.id}`);
    const directory = path.join(out, theme.id); await mkdir(directory, { recursive: true });
    const pptx = path.join(directory, 'deck.pptx');
    await writeFile(pptx, await buildPresentationPptx(deck, images, theme));
    await run(process.env.SOFFICE || '/opt/homebrew/bin/soffice', [
      `-env:UserInstallation=${pathToFileURL(path.join(out, 'lo-profile')).href}`, '--headless', '--convert-to', 'pdf', '--outdir', directory, pptx,
    ], { SAL_FONTPATH: path.join(root, 'src/app/fonts') });
    await run(process.env.PDFTOPPM || 'pdftoppm', ['-png', '-r', '96', path.join(directory, 'deck.pdf'), path.join(directory, 'libreoffice')]);
    const pdfFonts = await run('pdffonts', [path.join(directory, 'deck.pdf')]);
    const fontVerified = pdfFonts.toLowerCase().includes(theme.typography.exportFace.toLowerCase());
    if (theme.id !== 'sayuna-classic' && !fontVerified) throw new Error(`LibreOffice substituted ${theme.typography.exportFace}: ${pdfFonts}`);
    const fits = []; const browserTextBoxes = [];
    for (let index = 0; index < deck.slides.length; index++) {
      await page.goto(`${origin}/__look_render?theme=${theme.id}&slide=${index}`);
      await page.locator('[role="group"]').waitFor();
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images, img => img.decode().catch(() => {}))); });
      await page.screenshot({ path: path.join(directory, `browser-${index + 1}.png`) });
      browserTextBoxes.push(await page.locator('[role="group"]').evaluate(root => Array.from(root.querySelectorAll('h2, ul, p')).map(box => ({
        text: box.textContent, clientHeight: box.clientHeight, scrollHeight: box.scrollHeight,
        fontFamily: getComputedStyle(box).fontFamily, lineHeight: getComputedStyle(box).lineHeight,
      }))));
      fits.push(fitSlide(deck.slides[index], index, deck.originalWriters, theme));
    }
    const rows = [];
    for (let index = 1; index <= deck.slides.length; index++) {
      const native = (await readFile(path.join(directory, `libreoffice-${index}.png`))).toString('base64');
      const preview = (await readFile(path.join(directory, `browser-${index}.png`))).toString('base64');
      rows.push(`<section><p>Slide ${index}: Chromium / ${theme.typography.metricsId} (left), LibreOffice / ${theme.typography.exportFace} (right)</p><div><img src="data:image/png;base64,${preview}"><img src="data:image/png;base64,${native}"></div></section>`);
    }
    const sheet = `<!doctype html><html><style>body{margin:0;background:#fff;font:16px sans-serif}p{margin:12px}section>div{display:flex}img{width:960px;height:540px}section{border-bottom:2px solid #999}</style><h1>${theme.name}</h1>${rows.join('')}</html>`;
    await writeFile(path.join(directory, 'comparison.html'), sheet);
    const sheets = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
    await sheets.setContent(sheet); await sheets.screenshot({ path: path.join(directory, 'comparison.png'), fullPage: true }); await sheets.close();
    report.themes.push({ id: theme.id, exportFace: theme.typography.exportFace, metricsId: theme.typography.metricsId, pdfFonts, fontVerified, fits, browserTextBoxes });
  }
  const bullet = 'Identify the different kinds of small bodies in the Solar System like meteoroids, asteroids, and dwarf planets.';
  const dense = autoFitDeck({ ...deck, slides: [deck.slides[0], { ...deck.slides[1], title: 'Bodies', contentPoints: Array.from({ length: 24 }, (_, i) => `${i + 1}. ${bullet}`) }] });
  report.generationAutoFit = THEMES.map(theme => {
    let gainedBodySlack = 0, gainedTitleSlack = 0;
    const measured = dense.slides.map((slide, index) => {
      const baseline = fitSlide(slide, index, dense.originalWriters, THEMES[0]);
      const fit = fitSlide(slide, index, dense.originalWriters, theme);
      if (fit.body.fontSize > baseline.body.fontSize || fit.body.lines < baseline.body.lines) gainedBodySlack++;
      if (fit.title.lines * fit.title.lineHeightPt < baseline.title.lines * baseline.title.lineHeightPt) gainedTitleSlack++;
      return { titleFits: fit.title.fits, bodyFits: fit.body.fits };
    });
    return { id: theme.id, slides: dense.slides.length, gainedBodySlack, gainedTitleSlack, measured };
  });
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(out, 'README.md'), '# Look render evidence\n\nEach look has deck.pptx, LibreOffice PDF/PNGs, Chromium PNGs and a side-by-side comparison sheet.\nSee report.json for actual PDF font names, estimator results and browser errors.\nFont fallback is evidence, not proof that the requested font was used.\nSee scripts/README-slide-look-rendering.md for invocation and tolerance.\n');
  if (report.browserErrors.length) throw new Error(report.browserErrors.join('\n'));
  console.log(`Evidence: ${out}`);
} finally {
  await browser?.close(); await server.close();
}
