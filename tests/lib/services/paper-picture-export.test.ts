import { expect, it } from 'vitest';
import JSZip from 'jszip';
import { createRequire } from 'node:module';
import { PAPER_NOTEBOOK } from '@/lib/themes/paper-notebook';
import { getTheme } from '@/lib/themes';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { decorationSlides } from '../../helpers/test-decorations';
import { lookFixtureImage } from '../../helpers/look-render-fixtures';
import { samples } from './credit-samples';

// Backend image decoding runs in Node; the jsdom UI suite has different typed-array realms.
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => { window: { DOMParser: typeof DOMParser } } };
const parser = new (new JSDOM('').window.DOMParser)();
const child = (root: Document | Element, name: string) => root.getElementsByTagName(name)[0];
const deck = { subject: 'Science', topic: 'Water', originalWriters: '', slides: [decorationSlides[0], decorationSlides[1], { ...decorationSlides[1], imageMetadata: samples.commonsFull }, decorationSlides[1]] };
it('rotates native images, card and fallback text and strictly parses every rotated package part', async () => {
  const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, { 1: lookFixtureImage, 2: lookFixtureImage }, PAPER_NOTEBOOK));
  for (const part of Object.values(zip.files).filter(f => /\.(xml|rels)$/.test(f.name))) {
    expect(parser.parseFromString(await part.async('string'), 'application/xml').getElementsByTagName('parsererror'), part.name).toHaveLength(0);
  }
  for (const index of [1, 2, 3]) {
    const doc = parser.parseFromString(await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string'), 'application/xml');
    const pictures = Array.from(doc.getElementsByTagName('p:pic'));
    expect(pictures).toHaveLength(index === 3 ? 0 : 1);
    for (const picture of pictures) expect(child(picture, 'a:xfrm').getAttribute('rot')).toBe('120000');
    const card = Array.from(doc.getElementsByTagName('p:sp')).find(s => !child(s, 'p:txBody') && !child(s, 'p:cNvPr').getAttribute('name')!.startsWith('decoration-'))!;
    expect(child(card, 'a:xfrm').getAttribute('rot')).toBe('120000');
    if (index === 3) {
      const placeholder = Array.from(doc.getElementsByTagName('p:sp')).find(s => s.textContent?.includes('[PHILIPPINES CLASSROOM VISUAL DESIGN]'))!;
      expect(child(placeholder, 'a:xfrm').getAttribute('rot')).toBe('120000');
    }
  }
});
it('leaves title images and absent/zero rotation native output unchanged for Classic/Chalkboard', async () => {
  const slide = { ...deck.slides[0], imageMetadata: samples.commonsFull };
  const zip = await JSZip.loadAsync(await buildPresentationPptx({ ...deck, slides: [slide] }, { 0: lookFixtureImage }, PAPER_NOTEBOOK));
  const doc = parser.parseFromString(await zip.file('ppt/slides/slide1.xml')!.async('string'), 'application/xml');
  expect(child(child(doc, 'p:pic'), 'a:xfrm').hasAttribute('rot')).toBe(false);
  for (const id of ['sayuna-classic', 'chalkboard']) {
    const theme = getTheme(id), zero = { ...theme, shape: { ...theme.shape, pictureRotation: 0 } };
    const outputs = await Promise.all([theme, zero].map(t => buildPresentationPptx(deck, { 1: lookFixtureImage }, t)));
    const zips = await Promise.all(outputs.map(b => JSZip.loadAsync(b)));
    expect(await zips[0].file('ppt/slides/slide2.xml')!.async('string')).toBe(await zips[1].file('ppt/slides/slide2.xml')!.async('string'));
  }
});

it('crops a wide rotated picture from its real aspect ratio rather than stretching it', async () => {
  const wide = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAD0lEQVQImWNQ6zmh1nMCAAkZAvWXu4WBAAAAAElFTkSuQmCC";
  const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, { 1: wide }, PAPER_NOTEBOOK));
  const doc = parser.parseFromString(await zip.file('ppt/slides/slide2.xml')!.async('string'), 'application/xml');
  const pic = child(doc, 'p:pic');
  const crop = child(pic, 'a:srcRect');
  const expectedCrop = (1 - (13.333333 * 0.29) / (3.7 * 2)) / 2;
  expect(Number(crop.getAttribute('l')) / 100000).toBeCloseTo(expectedCrop, 4);
  expect(crop.getAttribute('l')).toBe(crop.getAttribute('r'));
  expect(crop.getAttribute('t')).toBe('0'); expect(crop.getAttribute('b')).toBe('0');
  expect(Number(child(pic, 'a:ext').getAttribute('cx')) / 914400).toBeCloseTo(13.333333 * 0.29, 4);
  expect(Number(child(pic, 'a:ext').getAttribute('cy')) / 914400).toBeCloseTo(3.7, 4);
});
