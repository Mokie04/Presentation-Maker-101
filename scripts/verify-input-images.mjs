// Real Chromium around production Home/hooks/workspace with deterministic API stubs.
// PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE may point to existing local installations.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(import.meta.dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'output/input-images'));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
await mkdir(out, { recursive: true });
const fontShim = path.join(out, 'font-shim.mjs');
const imageShim = path.join(out, 'image-shim.jsx');
const entry = path.join(out, 'image-harness.jsx');
await writeFile(fontShim, 'export default options => ({variable:options.variable.slice(2)});\n');
await writeFile(imageShim, 'import React from "react";export default function Image({priority,fill,...props}){return <img {...props}/>};\n');
await writeFile(entry, `import React from 'react';import{createRoot}from'react-dom/client';import ${JSON.stringify(path.join(root, 'src/app/globals.css'))};import Home from ${JSON.stringify(path.join(root, 'src/app/page.tsx'))};createRoot(document.getElementById('root')).render(<Home/>);`);
const server = await createServer({ configFile: false, root, plugins: [react()],
  optimizeDeps: { include: ['react', 'react-dom/client', 'lucide-react', 'zod'] },
  resolve: { dedupe: ['react', 'react-dom'], alias: { '@': path.join(root, 'src'), 'next/font/local': fontShim, 'next/image': imageShim } },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, out] } } });
server.middlewares.use('/__input_images', async (_request, response) => {
  response.setHeader('Content-Type', 'text/html');
  response.end(await server.transformIndexHtml('/__input_images', `<!doctype html><html><head><title>Input image verification</title></head><body><div id="root"></div><script type="module" src="/@fs/${entry}"></script></body></html>`));
});
server.middlewares.stack.unshift(server.middlewares.stack.pop());
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.imageAborts = 0;
    window.fetch = (input, init) => {
      if (input === '/api/generate-image') init?.signal?.addEventListener('abort', () => { window.imageAborts++; }, { once: true });
      return realFetch(input, init);
    };
  });
  const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: Array.from({ length: 6 }, (_, index) => ({
    slideNumber: index + 1, part: index === 0 ? 'Title Page' : 'Discussion', title: index === 0 ? 'Plants' : `Plant ${index}`,
    contentPoints: [`Observe plant ${index}`], visualDescription: index === 0 ? '' : `Plant ${index} diagram`,
  })) };
  const picture = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  let mode = 'partial';
  const requests = [];
  const generationRequests = [];
  const held = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/session') return route.fulfill({ json: { authenticated: true } });
    if (url.pathname === '/api/generate') {
      generationRequests.push(route.request().postDataJSON());
      return route.fulfill({ json: mode === 'empty' ? { ...presentation, slides: [{ ...presentation.slides[0], title: 'Fresh deck' }] } : presentation });
    }
    assert.equal(url.pathname, '/api/generate-image', 'client must use the individual image route');
    const body = route.request().postDataJSON();
    requests.push(body);
    const outcome = await new Promise(resolve => held.push(resolve));
    try { await route.fulfill({ status: outcome === 'failure' ? 500 : 200, json: outcome === 'failure' ? { error: 'Image unavailable' } : { base64: picture, slideIndex: body.slideIndex } }); }
    catch (error) { if (!/closed|cancel|abort|intercept/i.test(error.message)) throw error; }
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__input_images`);
  await page.waitForLoadState('networkidle');
  async function generate() {
    await page.getByRole('button', { name: /paste/i }).click();
    await page.getByRole('textbox').fill('A lesson about plants.');
    await page.getByRole('radio', { name: 'Session 1', exact: true }).locator('..').click();
    await page.getByRole('button', { name: 'Generate Slides', exact: true }).click();
    await page.getByRole('listbox', { name: 'Slides', exact: true }).waitFor();
  }
  await generate();
  await page.waitForFunction(() => document.querySelector('[aria-label="Pictures"]')?.textContent === 'Adding pictures... 0 of 5');
  assert.equal(requests.length, 3);
  assert.deepEqual(requests.map(({ slideIndex, variation }) => [slideIndex, variation]), [[1, 0], [2, 0], [3, 0]]);
  await page.screenshot({ path: path.join(out, 'loading.png'), fullPage: true });
  held[0]('success'); held[1]('failure'); held[2]('success');
  await page.waitForFunction(() => document.querySelector('[aria-label="Pictures"]')?.textContent === 'Adding pictures... 3 of 5');
  assert.equal(requests.length, 5);
  held[3]('success'); held[4]('success');
  const failure = 'Pictures could not be added for 1 slide. Use Regenerate on a slide.';
  await page.getByRole('status', { name: 'Pictures' }).filter({ hasText: failure }).waitFor();
  assert.equal(await page.getByRole('listbox', { name: 'Slides' }).getByRole('option').count(), 6);
  assert.deepEqual(generationRequests[0], { text: 'A lesson about plants.', session: 'Session 1' });
  await page.getByRole('option', { name: 'Slide 2: Plant 1', exact: true }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Bullet 1', exact: true }).inputValue(), 'Observe plant 1');
  assert((await page.getByRole('complementary', { name: 'Slide settings' }).getByRole('img', { name: 'Plant 1', exact: true }).getAttribute('src')).includes(picture));
  await page.screenshot({ path: path.join(out, 'partial-failure.png'), fullPage: true });
  // Start a second load, reset after its first three requests, then release their late results.
  await page.getByTitle('Reset to New Upload').click();
  mode = 'reset';
  await generate();
  await page.waitForFunction(() => document.querySelector('[aria-label="Pictures"]')?.textContent === 'Adding pictures... 0 of 5');
  assert.equal(requests.length, 8);
  const abortedBefore = await page.evaluate(() => window.imageAborts);
  await page.getByTitle('Reset to New Upload').click();
  await page.getByRole('button', { name: /paste/i }).waitFor();
  assert.equal((await page.evaluate(() => window.imageAborts)) - abortedBefore, 3);
  held.slice(5).forEach(resolve => resolve('success'));
  await page.waitForTimeout(150);
  assert.equal(requests.length, 8, 'reset must stop the remaining queued requests');
  assert.equal(await page.getByRole('listbox', { name: 'Slides' }).count(), 0);
  assert.equal(await page.getByRole('status', { name: 'Pictures' }).count(), 0);
  await page.screenshot({ path: path.join(out, 'after-reset.png'), fullPage: true });
  // A subsequent text-only deck has no image requests/status and cannot receive old pictures.
  mode = 'empty'; await generate();
  await page.waitForTimeout(150);
  assert.equal(requests.length, 8);
  assert.equal(await page.getByRole('status', { name: 'Pictures' }).count(), 0);
  assert.equal(await page.getByRole('region', { name: 'Slide stage' }).getByRole('img').count(), 0);
  assert.equal(await page.getByLabel('Slide Title', { exact: true }).inputValue(), 'Fresh deck');
  await page.getByRole('option', { name: 'Slide 1: Fresh deck', exact: true }).waitFor();
  await page.screenshot({ path: path.join(out, 'fresh-deck.png'), fullPage: true });
  assert.deepEqual(browserErrors, []);
  const report = { evidence: 'Real Chromium with production Home/hooks/workspace source; API responses and Next font/image wrappers stubbed. No live provider or deployment proof.',
    loading: { requested: 3, eligible: 5, maxConcurrency: 3, status: 'Adding pictures... 0 of 5' },
    partialFailure: { requested: 5, done: 4, failed: 1, message: failure }, reset: { abortedInFlight: 3, queuedRequestsAfterReset: 0, lateImages: 0 },
    normalGeneration: { slides: 6, subject: 'Science', contentPreserved: true, submittedLessonPreserved: true },
    noEligiblePictures: { newRequests: 0, statusVisible: false }, requests, generationRequests, browserErrors };
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser?.close(); await server.close(); }
