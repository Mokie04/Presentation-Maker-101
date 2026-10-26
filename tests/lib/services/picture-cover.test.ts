import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { getTheme, THEMES } from '@/lib/themes';
import { pictureAspects, pictureFixture } from '../../helpers/picture-cover-fixtures';
import { samples } from './credit-samples';
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => { window: { DOMParser: typeof DOMParser } } };
const parser = new (new JSDOM('').window.DOMParser)();
const title = { slideNumber: 1, title: 'Picture proportions', part: 'Title Page', contentPoints: ['Science'], visualDescription: '' };
const content = { ...title, slideNumber: 2, title: 'Observe the picture', part: 'Discussion', visualDescription: 'A landscape scene' };
const deck = { subject: 'Science', topic: 'Proportions', originalWriters: '', slides: [title, content] };
const node = (root: Element | Document, name: string) => root.getElementsByTagName(name)[0];
const attr = (root: Element, name: string) => Number(root.getAttribute(name));
async function slideXml(image: string, themeId: string, metadata?: typeof samples.commonsFull | typeof samples.nasaFull) {
  const data = metadata ? { ...deck, slides: [title, { ...content, imageMetadata: metadata }] } : deck;
  const zip = await JSZip.loadAsync(await buildPresentationPptx(data, { 1: image }, getTheme(themeId)));
  return parser.parseFromString(await zip.file('ppt/slides/slide2.xml')!.async('string'), 'application/xml');
}
it.each(['sayuna-classic', 'chalkboard'])('%s uses real aspect and centred cover for wide, tall, square and box-aspect JPEG/PNG', async id => {
  for (const format of ['png', 'jpg'] as const) for (const input of pictureAspects) {
    const doc = await slideXml(pictureFixture(input.name, format), id);
    const picture = node(doc, 'p:pic'), xfrm = node(picture, 'a:xfrm'), ext = node(xfrm, 'a:ext'), off = node(xfrm, 'a:off');
    // Independent browser object-cover maths: scale by the larger axis, crop each side equally.
    const box = { x: (40 / 3) * 0.625, y: 2.15, w: (40 / 3) * 0.32, h: 4.4 };
    const scale = Math.max(box.w / input.width, box.h / input.height);
    const cx = (1 - box.w / (input.width * scale)) / 2;
    const cy = (1 - box.h / (input.height * scale)) / 2;
    const crop = node(picture, 'a:srcRect');
    expect(attr(off, 'x') / 914400).toBeCloseTo(box.x, 5); expect(attr(off, 'y') / 914400).toBe(box.y);
    expect(attr(ext, 'cx') / 914400).toBeCloseTo(box.w, 5); expect(attr(ext, 'cy') / 914400).toBe(box.h);
    expect(attr(crop, 'l') / 100000).toBeCloseTo(cx, 4); expect(attr(crop, 'r') / 100000).toBeCloseTo(cx, 4);
    expect(attr(crop, 't') / 100000).toBeCloseTo(cy, 4); expect(attr(crop, 'b') / 100000).toBeCloseTo(cy, 4);
    expect(xfrm.hasAttribute('rot')).toBe(false);
  }
});
it('retains aspect-fit dimensions for Commons and NASA pictures', async () => {
  for (const theme of THEMES) for (const metadata of [samples.commonsFull, samples.nasaFull]) {
    const doc = await slideXml(pictureFixture('wide', 'png'), theme.id, metadata);
    const ext = node(node(doc, 'p:pic'), 'a:ext');
    expect(attr(ext, 'cx') / attr(ext, 'cy')).toBeCloseTo(3 / 2, 5);
  }
});
it('falls back to legacy sizing when an ordinary image cannot be decoded, without throwing', async () => {
  const malformed = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
  for (const theme of THEMES) {
    const doc = await slideXml(malformed, theme.id);
    const picture = node(doc, 'p:pic'), ext = node(picture, 'a:ext'), crop = node(picture, 'a:srcRect');
    expect(attr(ext, 'cx') / 914400).toBeCloseTo(theme.layout.content.imageSizing.w, 5);
    expect(attr(ext, 'cy') / 914400).toBeCloseTo(theme.layout.content.imageSizing.h, 5);
    const sourceBox = theme.layout.content.image;
    const sourceW = parseFloat(sourceBox.w) * (40 / 3) / 100;
    const sourceH = sourceBox.h;
    const legacyBox = theme.layout.content.imageSizing;
    const scale = Math.min(legacyBox.w / sourceW, legacyBox.h / sourceH);
    const expectedX = (1 - legacyBox.w / (sourceW * scale)) / 2;
    const expectedY = (1 - legacyBox.h / (sourceH * scale)) / 2;
    expect(attr(crop, 'l') / 100000).toBeCloseTo(expectedX, 4); expect(attr(crop, 'r') / 100000).toBeCloseTo(expectedX, 4);
    expect(attr(crop, 't') / 100000).toBeCloseTo(expectedY, 4); expect(attr(crop, 'b') / 100000).toBeCloseTo(expectedY, 4);
  }
});
it('strictly parses every XML and relationship part in ordinary-image exports for all looks', async () => {
  for (const theme of THEMES) {
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, { 1: pictureFixture('wide', 'jpg') }, theme));
    for (const part of Object.values(zip.files).filter(f => /\.(xml|rels)$/.test(f.name))) {
      expect(parser.parseFromString(await part.async('string'), 'application/xml').getElementsByTagName('parsererror'), part.name).toHaveLength(0);
    }
  }
});
it('keeps library decode failures as errors rather than taking the ordinary-image fallback', async () => {
  const malformed = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
  for (const metadata of [samples.commonsFull, samples.nasaFull]) await expect(slideXml(malformed, 'sayuna-classic', metadata)).rejects.toThrow();
});
