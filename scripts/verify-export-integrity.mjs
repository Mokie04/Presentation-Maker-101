// Local dev evidence only. Requires existing LibreOffice, Poppler and Playwright.
import { mkdir, readFile, writeFile, symlink, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'output/export-integrity'));
const baselineRef = process.env.EXPORT_BASELINE || '1ee7d7d';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const hash = value => createHash('sha256').update(value).digest('hex');
const fixedTime = '2026-10-26T00:00:00Z';
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [fixedTime])); }
  static now() { return new NativeDate(fixedTime).getTime(); }
};
async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: { ...process.env, ...options.env } });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(`${command}: ${output}`)));
  });
}
const save = async (name, data) => writeFile(path.join(out, name), typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2));
await mkdir(out, { recursive: true });
const baseline = path.join(out, 'baseline-source');
await mkdir(baseline, { recursive: true });
await run('git', ['archive', '--format=tar', '-o', path.join(out, 'baseline.tar'), baselineRef]);
await run('tar', ['-xf', path.join(out, 'baseline.tar'), '-C', baseline]);
try { await access(path.join(baseline, 'node_modules')); } catch { await symlink(path.join(root, 'node_modules'), path.join(baseline, 'node_modules')); }
const fontShim = path.join(out, 'font-shim.mjs');
await writeFile(fontShim, 'export default options => ({variable:options.variable.slice(2)});\n');
let browser;
const servers = [];
async function loadTree(directory) {
  const server = await createServer({ configFile: false, root: directory, plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom'], alias: { '@': path.join(directory, 'src'), 'next/font/local': fontShim } },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [root, out] } } });
  servers.push(server);
  const load = file => server.ssrLoadModule(file);
  return { server, generator: await load('/src/lib/services/pptx-generator.ts'),
    themes: (await load('/src/lib/themes/index.ts')).THEMES,
    formulas: await load('/src/lib/utils/formula-parser.ts'),
    Formula: (await load('/src/components/FormattedFormula.tsx')).FormattedFormula,
    autoFit: (await load('/src/lib/auto-fit-deck.ts')).autoFitDeck,
    samples: (await load('/tests/lib/services/credit-samples.ts')).samples,
    picture: (await load('/tests/helpers/picture-cover-fixtures.ts')).pictureFixture,
    look: await load('/tests/helpers/look-render-fixtures.ts'),
    layouts: (await load('/tests/lib/services/slide-layout-cases.ts')).slideLayoutCases };
}
function maskPictureDescriptions(xml) {
  return xml.replace(/<p:pic\b[\s\S]*?<\/p:pic>/g, picture => picture.replace(/\sdescr="[^"]*"/g, ' descr="[PICTURE ALT TEXT]"'));
}
async function compareArchives(before, after, allowAltText) {
  const [a, b] = await Promise.all([JSZip.loadAsync(before), JSZip.loadAsync(after)]);
  const names = Object.keys(a.files);
  assert.deepEqual(Object.keys(b.files), names, 'ZIP entry names/order');
  const entries = [];
  for (const name of names) {
    const [left, right] = await Promise.all([a.files[name].async('nodebuffer'), b.files[name].async('nodebuffer')]);
    const exact = left.equals(right);
    const altOnly = !exact && allowAltText && /^ppt\/slides\/slide\d+\.xml$/.test(name)
      && maskPictureDescriptions(left.toString()) === maskPictureDescriptions(right.toString());
    entries.push({ name, beforeBytes: left.length, afterBytes: right.length, beforeSha256: hash(left), afterSha256: hash(right), result: exact ? 'identical' : altOnly ? 'picture descr only' : 'UNEXPECTED DIFFERENCE' });
  }
  return { beforeBytes: before.length, afterBytes: after.length, entryOrderIdentical: true,
    contentTypesIdentical: entries.find(entry => entry.name === '[Content_Types].xml')?.result === 'identical',
    pass: entries.every(entry => entry.result !== 'UNEXPECTED DIFFERENCE'), entries };
}
const text = xml => [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(match => match[1].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'")).join('');
try {
  const [before, after] = await Promise.all([loadTree(baseline), loadTree(root)]);
  const image = before.look.lookFixtureImage;
  const title = { slideNumber: 1, part: 'Title Page', title: 'Water and energy', contentPoints: ['Grade 7 Science', 'Observe the world'], visualDescription: '' };
  const content = { ...title, slideNumber: 2, part: 'Discussion', title: 'Observe H_2O', contentPoints: ['Compare water and ice', 'Record your findings'], visualDescription: 'A water cycle diagram' };
  const dense = { ...content, title: 'Investigating water and energy in the classroom', contentPoints: Array.from({ length: 10 }, (_, i) => `Observation ${i + 1}: Explain how water changes when energy is transferred and compare your findings with the evidence collected in class.`) };
  const deck = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria', slides: [title, content, { ...content, visualDescription: '' }, dense, { ...content, imageMetadata: before.samples.commonsFull }] };
  const fixtures = [
    { name: 'short', deck: { ...deck, slides: deck.slides.slice(0, 3) } },
    { name: 'dense', deck: before.autoFit({ ...deck, slides: [title, dense] }) },
    { name: 'commons', deck: { ...deck, slides: [title, deck.slides[4]] }, images: { 1: image } },
    ...['wide', 'tall', 'square', 'box'].flatMap(aspect => ['png', 'jpg'].map(format => ({ name: `${aspect}-${format}`, deck: { ...deck, slides: [title, content] }, images: { 1: before.picture(aspect, format) } }))),
  ];
  await save('fixture-inputs.json', fixtures);
  const comparisons = [];
  await mkdir(path.join(out, 'before'), { recursive: true });
  await mkdir(path.join(out, 'after'), { recursive: true });
  for (const theme of after.themes) for (const fixture of fixtures) {
    const name = `${theme.id}-${fixture.name}.pptx`;
    const old = await before.generator.buildPresentationPptx(fixture.deck, fixture.images, before.themes.find(item => item.id === theme.id));
    const current = await after.generator.buildPresentationPptx(fixture.deck, fixture.images, theme);
    await save(`before/${name}`, old); await save(`after/${name}`, current);
    comparisons.push({ name, ...await compareArchives(old, current, true) });
    console.log(`Compared ${name}`);
  }
  await save('per-entry-comparison.json', comparisons);
  // The snapshot matrix isolates generator changes from intentionally corrected parser behavior.
  // Baseline generator imports CURRENT parser bytes only; all other baseline files stay at main.
  await writeFile(path.join(baseline, 'src/lib/utils/formula-parser.ts'), await readFile(path.join(root, 'src/lib/utils/formula-parser.ts')));
  before.server.moduleGraph.invalidateAll();
  const baselineCurrentParser = (await before.server.ssrLoadModule('/src/lib/services/pptx-generator.ts')).buildPresentationPptx;
  const controlledOriginal = [];
  for (const theme of after.themes) for (const fixture of fixtures) {
    const a = await baselineCurrentParser(fixture.deck, fixture.images, before.themes.find(item => item.id === theme.id));
    const b = await after.generator.buildPresentationPptx(fixture.deck, fixture.images, theme);
    controlledOriginal.push({ name: `${theme.id}-${fixture.name}`, ...await compareArchives(a, b, true) });
  }
  await save('controlled-phase1-comparison.json', controlledOriginal);
  assert(controlledOriginal.every(item => item.pass), 'original fixtures, generator isolated from parser');
  const snapshotComparisons = [];
  const snapshotFixtures = [
    ...after.layouts.map((item, index) => ({ name: `layout-${index + 1}`, deck: { subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria', slides: item.slides }, images: item.images })),
    { name: 'look-fixture', deck: after.look.lookFixtureDeck, images: after.look.lookFixtureImages },
  ];
  for (const theme of after.themes) for (const fixture of snapshotFixtures) {
    const a = await baselineCurrentParser(fixture.deck, fixture.images, before.themes.find(item => item.id === theme.id));
    const b = await after.generator.buildPresentationPptx(fixture.deck, fixture.images, theme);
    snapshotComparisons.push({ name: `${theme.id}-${fixture.name}`, ...await compareArchives(a, b, true) });
  }
  await save('snapshot-generator-comparison.json', snapshotComparisons);
  // Restore baseline parser before formula before/after evidence.
  await run('git', ['show', `${baselineRef}:src/lib/utils/formula-parser.ts`]).then(source => writeFile(path.join(baseline, 'src/lib/utils/formula-parser.ts'), source));
  before.server.moduleGraph.invalidateAll();
  before.formulas = await before.server.ssrLoadModule('/src/lib/utils/formula-parser.ts');
  before.Formula = (await before.server.ssrLoadModule('/src/components/FormattedFormula.tsx')).FormattedFormula;
  before.generator = await before.server.ssrLoadModule('/src/lib/services/pptx-generator.ts');
  const cases = ['3x^2-4x+1', 'x^n', 'x_1+x_2', 'a_n', 'snake_case_word', 'teacher_name@school.edu', 'Wi-Fi', 'X-Ray', 'COVID-19', 'B-52', 'R2-D2', 'MP3', 'Q1', 'H2O', 'CO2', 'C6H12O6', 'Ca2+', '2H2 + O2 -> 2H2O', 'x^2', 'a^3', '10^5', '(a+b)^2', 'v_0', 'sqrt(16)', 'x^{10}', 'a_{n+1}', 'A pen costs $5 and a book $10.', '$1,000', '$5.50', '$x$', '$x=2$', 'x^k'];
  const formulaEvidence = cases.map(input => ({ input }));
  for (const [label, tree] of [['before', before], ['after', after]]) {
    const formulaDeck = { ...deck, slides: [title, ...cases.map((input, i) => ({ ...content, slideNumber: i + 2, title: input, contentPoints: [], visualDescription: '' }))] };
    const bytes = await tree.generator.buildPresentationPptx(formulaDeck);
    await save(`${label}/formulas.pptx`, bytes);
    const zip = await JSZip.loadAsync(bytes);
    for (let i = 0; i < cases.length; i++) {
      const xml = await zip.file(`ppt/slides/slide${i + 2}.xml`).async('string');
      const shapes = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)];
      formulaEvidence[i][label] = { previewHtml: renderToStaticMarkup(React.createElement(tree.Formula, { text: cases[i] })),
        previewText: tree.formulas.parseFormulaToSegments(cases[i]).map(segment => segment.text).join(''),
        pptxText: text(shapes[1][0]), markdownText: tree.formulas.formatFormulaToUnicode(cases[i]), segments: tree.formulas.parseFormulaToSegments(cases[i]) };
    }
  }
  await save('formula-reproduction.json', formulaEvidence);
  await save('formula-reproduction.md', '| Input | Before preview / PPTX | After preview / PPTX | Before Markdown | After Markdown |\n|---|---|---|---|---|\n' + formulaEvidence.map(row => `| ${row.input} | ${row.before.previewText} / ${row.before.pptxText} | ${row.after.previewText} / ${row.after.pptxText} | ${row.before.markdownText} | ${row.after.markdownText} |`).join('\n'));
  const sizes = [];
  for (const theme of after.themes) {
    const big = { ...deck, slides: Array.from({ length: 200 }, (_, i) => ({ ...content, slideNumber: i + 1, title: `Lesson slide ${i + 1}`, contentPoints: ['Observe water changes', 'Compare evidence'], visualDescription: '' })) };
    const compressed = await after.generator.buildPresentationPptx(big, {}, theme);
    const raw = await after.generator.createPresentationPptx(big, {}, theme).write({ outputType: 'nodebuffer', compression: false });
    const zip = await JSZip.loadAsync(raw);
    if (theme.id !== 'sayuna-classic') for (const name of Object.keys(zip.files).filter(name => /^ppt\/theme\/theme\d+\.xml$/.test(name))) {
      const xml = await zip.file(name).async('string');
      zip.file(name, xml.replace(/<a:(hlink|folHlink)>[\s\S]*?<\/a:\1>/g, (_, tag) => `<a:${tag}><a:srgbClr val="${theme.palette.muted}"/></a:${tag}>`));
    }
    const uncompressed = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
    await save(`after/${theme.id}-200-slides.pptx`, compressed);
    const comparison = await compareArchives(uncompressed, compressed, false);
    assert(comparison.pass); assert(compressed.length < 1_500_000);
    sizes.push({ theme: theme.id, ...comparison });
  }
  await save('compression-200-slides.json', sizes);
  const chalkboard = after.themes.find(theme => theme.id === 'chalkboard');
  const creator = ('Creator name and institution with a long scholarly attribution; ').repeat(6).slice(0, 300);
  const longCredit = { ...deck, slides: [title, { ...content, title: 'Long credited image', imageMetadata: { ...after.samples.commonsFull, creator } }] };
  const controlDeck = { ...deck, originalWriters: 'Before\u000bAfterVTWriter\u000cAfterFFWriter', slides: [
    { ...title, title: 'Before\u000bAfterVTTitle\u000cAfterFFTitle', contentPoints: ['Before\u000bAfterVTBullet\u000cAfterFFBullet'] },
    { ...content, title: 'Complete second slide', contentPoints: ['Before\u000bAfterVTBody\u000cAfterFFBody'], visualDescription: '' },
  ] };
  const openLooks = [];
  for (const theme of after.themes) {
    const directory = path.join(out, `open-${theme.id}`); await mkdir(directory, { recursive: true });
    const pptx = path.join(out, 'after', `${theme.id}-short.pptx`);
    const log = await run(process.env.SOFFICE || '/opt/homebrew/bin/soffice', [`-env:UserInstallation=${pathToFileURL(path.join(out, 'lo-profile')).href}`, '--headless', '--convert-to', 'pdf', '--outdir', directory, pptx]);
    const extracted = await run('pdftotext', ['-layout', path.join(directory, `${theme.id}-short.pdf`), '-']);
    assert(extracted.includes('Water and energy')); assert(extracted.includes('Record your findings'));
    openLooks.push({ theme: theme.id, log, text: extracted });
  }
  await save('native-open-all-looks.json', openLooks);
  const native = [];
  for (const [name, data, images] of [['chalkboard-long-credit', longCredit, { 1: before.picture('wide', 'png') }], ['control-characters', controlDeck, {}]]) {
    const directory = path.join(out, name); await mkdir(directory, { recursive: true });
    const pptx = path.join(directory, `${name}.pptx`);
    await writeFile(pptx, await after.generator.buildPresentationPptx(data, images, chalkboard));
    const log = await run(process.env.SOFFICE || '/opt/homebrew/bin/soffice', [`-env:UserInstallation=${pathToFileURL(path.join(out, 'lo-profile')).href}`, '--headless', '--convert-to', 'pdf', '--outdir', directory, pptx], { env: { SAL_FONTPATH: path.join(root, 'src/app/fonts') } });
    await run('pdftoppm', ['-png', '-r', '96', path.join(directory, `${name}.pdf`), path.join(directory, 'slide')]);
    const extracted = await run('pdftotext', ['-layout', path.join(directory, `${name}.pdf`), '-']);
    await writeFile(path.join(directory, 'extracted.txt'), extracted);
    if (name === 'control-characters') for (const marker of ['AfterVTTitle', 'AfterFFTitle', 'AfterVTBullet', 'AfterFFBullet', 'AfterVTBody', 'AfterFFBody', 'Complete second slide']) assert(extracted.includes(marker), marker);
    native.push({ name, log, text: extracted });
  }
  const creditZip = await JSZip.loadAsync(await readFile(path.join(out, 'chalkboard-long-credit/chalkboard-long-credit.pptx')));
  const creditXml = await creditZip.file('ppt/slides/slide2.xml').async('string');
  const creditShape = [...creditXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].find(match => text(match[0]).startsWith('Commons —'));
  const visibleCredit = text(creditShape[0]);
  const fullNotes = text(await creditZip.file('ppt/notesSlides/notesSlide2.xml').async('string'));
  const hyperlinkRels = await creditZip.file('ppt/slides/_rels/slide2.xml.rels').async('string');
  assert.equal(Array.from(visibleCredit).length, 160); assert(visibleCredit.endsWith('…'));
  assert(fullNotes.includes(creator)); assert(hyperlinkRels.includes(after.samples.commonsFull.sourceUrl));
  await save('credit-verification.json', { creatorLength: creator.length, visibleCredit, visibleCodePoints: Array.from(visibleCredit).length, fullCreatorInNotes: true, originalHyperlinkPreserved: true });
  await save('native-render.json', native);
  // Real Chromium around production hooks/workspace; API responses remain local and deterministic.
  const entry = path.join(out, 'browser-harness.jsx');
  await writeFile(entry, `import React,{useEffect,useState} from 'react';import{createRoot}from'react-dom/client';
import ${JSON.stringify(path.join(root, 'src/app/globals.css'))};
import{useSlideDeck}from ${JSON.stringify(path.join(root, 'src/lib/deck/use-slide-deck.ts'))};
import{useDeckExport}from ${JSON.stringify(path.join(root, 'src/lib/export/use-deck-export.ts'))};
import{PresentationWorkspaceView}from ${JSON.stringify(path.join(root, 'src/components/workspace/PresentationWorkspaceView.tsx'))};
import{SlideView}from ${JSON.stringify(path.join(root, 'src/components/SlideView.tsx'))};
import{THEMES}from ${JSON.stringify(path.join(root, 'src/lib/themes/index.ts'))};
const data=${JSON.stringify({ ...deck, slides: [title, content, { ...content, title: 'Dropped picture', imageMetadata: after.samples.commonsFull }] })};
const credit=${JSON.stringify(longCredit)};
function App(){const deck=useSlideDeck();const[error,setError]=useState('');useEffect(()=>{deck.loadPresentation(data);deck.setThemeId('chalkboard')},[]);const downloads=useDeckExport({presentationData:deck.presentationData,slideImages:deck.slideImages,session:'Session 1',themeId:deck.themeId,onError:setError});window.exportReady=Object.keys(deck.slideImages).length===2;return <><div>{error}</div><PresentationWorkspaceView deck={deck} downloads={downloads} session="Session 1" onReset={()=>{}} onPreview={()=>{}}/><div id="long-credit-preview" style={{width:1280,height:720}}><SlideView slide={credit.slides[1]} index={1} total={2} image=${JSON.stringify(before.picture('wide', 'png'))} originalWriters={credit.originalWriters} theme={THEMES.find(t=>t.id==='chalkboard')}/></div></>};createRoot(document.getElementById('root')).render(<App/>);`);
  const css = ['Poppins', 'Arimo', 'Gelasio'].flatMap(family => [400, 700].map(weight => `@font-face{font-family:"${family} Preview";src:url("/src/app/fonts/${family}-${weight === 700 ? 'Bold' : 'Regular'}.ttf");font-weight:${weight}}.font-slide-${family.toLowerCase()}{--font-slide-${family.toLowerCase()}:"${family} Preview"}`)).join('\n');
  after.server.middlewares.use('/__export_integrity', async (request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(await after.server.transformIndexHtml('/__export_integrity', `<!doctype html><html><head><style>${css}</style></head><body><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`));
  });
  // Vite has already installed its terminal 404; move this scoped local harness before it.
  after.server.middlewares.stack.unshift(after.server.middlewares.stack.pop());
  await after.server.listen();
  const origin = `http://127.0.0.1:${after.server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const browserErrors = []; page.on('pageerror', error => browserErrors.push(error.message));
  const transparent = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const context = canvas.getContext('2d'); context.fillStyle = '#ff0000'; context.fillRect(16, 16, 32, 32); return canvas.toDataURL('image/png'); });
  const invalid = 'iVBORw0KGgo' + 'A'.repeat(160000);
  await page.route('**/api/generate-images', route => route.fulfill({ json: { images: { 1: transparent, 2: invalid } } }));
  let exportRequest;
  await page.route('**/api/download-pptx', async route => {
    exportRequest = route.request().postDataJSON();
    const bytes = await after.generator.buildPresentationPptx(exportRequest.presentationData, exportRequest.slideImages, chalkboard);
    await route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', body: bytes });
  });
  await page.goto(`${origin}/__export_integrity`);
  await page.waitForFunction(() => window.exportReady === true);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PowerPoint', exact: true }).click();
  const download = await downloadEvent;
  const downloaded = path.join(out, 'browser-export.pptx'); await download.saveAs(downloaded);
  const notice = page.getByRole('status').filter({ hasText: 'left out' });
  await notice.waitFor(); const noticeText = await notice.innerText();
  await page.screenshot({ path: path.join(out, 'browser-notice.png'), fullPage: true });
  await page.getByRole('button', { name: 'Dismiss export notice' }).click();
  assert.equal(await page.getByRole('button', { name: 'Dismiss export notice' }).count(), 0);
  await save('browser-request.json', exportRequest);
  assert(!exportRequest.presentationData.slides[2].imageMetadata, 'dropped credit removed');
  const browserZip = await JSZip.loadAsync(await readFile(downloaded));
  const mediaName = Object.keys(browserZip.files).find(name => /^ppt\/media\/.*\.png$/.test(name));
  assert(mediaName, 'transparent picture stays PNG');
  const media = await browserZip.file(mediaName).async('nodebuffer');
  await save('exported-transparent-picture.png', media);
  const alpha = await page.evaluate(async base64 => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, corner: [...ctx.getImageData(0, 0, 1, 1).data], center: [...ctx.getImageData(32, 32, 1, 1).data] };
  }, media.toString('base64'));
  assert.equal(alpha.corner[3], 0); assert.deepEqual(alpha.center, [255, 0, 0, 255]);
  await page.locator('#long-credit-preview').screenshot({ path: path.join(out, 'browser-long-credit.png') });
  const creditBoxes = await page.locator('#long-credit-preview p').filter({ hasText: 'Commons —' }).evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, rect: node.getBoundingClientRect().toJSON(), parent: node.parentElement.getBoundingClientRect().toJSON() })));
  await save('browser-verification.json', { noticeText, dismisses: true, droppedCreditRemoved: true, mediaName, mediaSha256: hash(media), alpha, browserErrors, creditBoxes });
  assert.deepEqual(browserErrors, []);
  assert(snapshotComparisons.every(item => item.pass), 'snapshot fixture generator bytes match except picture descriptions');
  await save('summary.json', { baselineRef, fixedTime, originalArchives: comparisons.length, originalEntries: comparisons.reduce((n, item) => n + item.entries.length, 0), originalDescrOnlyPass: comparisons.every(item => item.pass), snapshotArchives: snapshotComparisons.length, snapshotEntries: snapshotComparisons.reduce((n, item) => n + item.entries.length, 0), sizes: sizes.map(item => ({ theme: item.theme, uncompressed: item.beforeBytes, compressed: item.afterBytes })), browser: { noticeText, alpha }, native: native.map(item => item.name), requestedDescrOnlyComparisonPass: comparisons.every(item => item.pass), controlledPhase1ComparisonPass: controlledOriginal.every(item => item.pass), controlledGeneratorComparisonPass: snapshotComparisons.every(item => item.pass), compressionPass: sizes.every(item => item.pass), browserPass: true, nativeControlTextPass: true });
  console.log(`Evidence complete: ${out}`);
} finally { await browser?.close(); await Promise.all(servers.map(server => server.close())); globalThis.Date = NativeDate; }
