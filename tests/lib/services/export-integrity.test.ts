import { createRequire } from 'node:module';
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { buildPresentationPptx, createPresentationPptx } from '@/lib/services/pptx-generator';
import { THEMES } from '@/lib/themes';
import { describeImageCredit } from '@/lib/image-credit';
import type { PresentationData } from '@/types/presentation';
import { TEST_DECORATION_THEME } from '../../helpers/test-decorations';
import { pictureFixture } from '../../helpers/picture-cover-fixtures';
import { samples } from './credit-samples';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => { window: { DOMParser: typeof DOMParser } } };
const parser = new (new JSDOM('').window.DOMParser)();
const illegal = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const controls = Array.from({ length: 32 }, (_, i) => String.fromCharCode(i)).join('') + '\uFFFE\uFFFF';
const hostile = `Start${controls}End & < > " ' 😀 العربية`;
const clean = (value: string) => value.replace(illegal, '');
const slide = { slideNumber: 1, part: 'Discussion', title: 'Picture', contentPoints: ['Observe'], visualDescription: 'A transparent diagram' };
const deck: PresentationData = { subject: 'Science', topic: 'Topic', originalWriters: '', slides: [slide, { ...slide, slideNumber: 2 }] };
const image = pictureFixture('wide', 'png');
const texts = (doc: Document, name = 'a:t') => Array.from(doc.getElementsByTagName(name), n => n.textContent);
const parse = (xml: string) => parser.parseFromString(xml, 'application/xml');

describe.each([...THEMES, TEST_DECORATION_THEME])('export integrity: $id', theme => {
  it('strictly parses every hostile XML/relationship part and preserves all cleaned visible text', async () => {
    const metadata = { ...samples.commonsFull, title: hostile, creator: hostile, description: hostile,
      credit: hostile, attribution: hostile, sourceUrl: `https://example.com/${hostile}` };
    const nasa = { ...samples.nasaFull, nasaId: hostile, title: hostile, photographer: hostile, description: hostile };
    const hostileDeck: PresentationData = { subject: hostile, topic: hostile, originalWriters: hostile, slides: [
      { ...slide, part: hostile, title: hostile + 'Z'.repeat(500), contentPoints: [hostile, '', 'H2O and x^2'], imageMetadata: metadata },
      { ...slide, slideNumber: 2, part: hostile, title: hostile, contentPoints: [hostile, ''], visualDescription: hostile },
      { ...slide, slideNumber: 3, part: hostile, title: '', contentPoints: [hostile], imageMetadata: nasa },
      { ...slide, slideNumber: 4, part: '', title: hostile, contentPoints: [''], visualDescription: hostile },
    ] };
    // Independent expected input: remove only XML 1.0 illegal characters, leaving tab/LF/CR.
    const expectedDeck = JSON.parse(JSON.stringify(hostileDeck), (_key, value) => typeof value === 'string' ? clean(value) : value) as PresentationData;
    const zip = await JSZip.loadAsync(await buildPresentationPptx(hostileDeck, { 0: image, 1: image, 2: image }, theme));
    const expectedZip = await JSZip.loadAsync(await buildPresentationPptx(expectedDeck, { 0: image, 1: image, 2: image }, theme));
    for (const part of Object.values(zip.files).filter(f => /\.(xml|rels)$/.test(f.name))) {
      const xml = await part.async('string');
      expect(xml.match(illegal), part.name).toBeNull();
      const doc = parse(xml);
      expect(doc.getElementsByTagName('parsererror'), part.name).toHaveLength(0);
      const expected = parse(await expectedZip.file(part.name)!.async('string'));
      expect(texts(doc), part.name).toEqual(texts(expected));
    }
    const first = parse(await zip.file('ppt/slides/slide1.xml')!.async('string'));
    expect(texts(first).join('')).toContain(clean(hostile).replace(/\r/g, '') + 'Z'.repeat(500));
    const placeholder = parse(await zip.file('ppt/slides/slide4.xml')!.async('string'));
    expect(texts(placeholder).join('')).toContain(clean(hostile).replace(/\r/g, ''));
    const notes = parse(await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string'));
    expect(texts(notes).join('\n')).toContain('End & < > \" \' 😀 العربية');
  });

  it('gives ordinary and library pictures useful alt text, including title fallbacks', async () => {
    const data = { ...deck, slides: [
      { ...slide, imageMetadata: { ...samples.commonsFull, title: 'Library title' } },
      { ...slide, slideNumber: 2 },
      { ...slide, slideNumber: 3, visualDescription: '\u0000' },
      { ...slide, slideNumber: 4, imageMetadata: { ...samples.nasaMinimal } },
    ] };
    const zip = await JSZip.loadAsync(await buildPresentationPptx(data, { 0: image, 1: image, 2: image, 3: image }, theme));
    for (const [index, expected] of Array.from(['Library title', slide.visualDescription, slide.title, slide.title].entries())) {
      const doc = parse(await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string'));
      const pic = doc.getElementsByTagName('p:pic')[0];
      expect(pic.getElementsByTagName('p:cNvPr')[0].getAttribute('descr')).toBe(expected);
      for (const shape of Array.from(doc.getElementsByTagName('p:sp'))) {
        const props = shape.getElementsByTagName('p:cNvPr')[0];
        if (props.getAttribute('name')?.startsWith('decoration-')) expect(props.hasAttribute('descr')).toBe(false);
      }
    }
  });

  it('limits only the visible credit to 160 code points and keeps full notes and link', async () => {
    const metadata = { ...samples.commonsFull, creator: 'Artist 😀 '.repeat(40) };
    const full = describeImageCredit(metadata);
    const data = { ...deck, slides: [{ ...slide, imageMetadata: metadata }] };
    const zip = await JSZip.loadAsync(await buildPresentationPptx(data, { 0: image }, theme));
    const doc = parse(await zip.file('ppt/slides/slide1.xml')!.async('string'));
    const credit = texts(doc).find(t => t?.startsWith('Commons — '))!;
    expect(Array.from(credit)).toHaveLength(160);
    expect(credit).toBe(Array.from(`${full.heading} — ${full.creditLine}`).slice(0, 159).join('') + '…');
    const notes = parse(await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string'));
    expect(texts(notes).join('\n')).toContain(metadata.creator);
    const rels = parse(await zip.file('ppt/slides/_rels/slide1.xml.rels')!.async('string'));
    expect(Array.from(rels.getElementsByTagName('Relationship')).some(r => r.getAttribute('Target') === full.sourceLink)).toBe(true);
  });
});

it.each(THEMES)('compresses 200 text slides below 1.5MB preserving every uncompressed byte and ZIP order: $id', async theme => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-26T00:00:00Z'));
  try {
    const data = { ...deck, slides: Array.from({ length: 200 }, (_, i) => ({ ...slide, slideNumber: i + 1,
      title: `Lesson ${i + 1}: water and energy`, visualDescription: '', contentPoints: ['Observe the water', 'Explain the evidence'] })) };
    const output = await createPresentationPptx(data, undefined, theme).write({ outputType: 'nodebuffer', compression: false });
    const uncompressed = output as Buffer;
    const compressed = await buildPresentationPptx(data, undefined, theme);
    expect(compressed.length).toBeLessThan(1_500_000);
    expect(compressed.length).toBeLessThan(uncompressed.byteLength / 2);
    const before = await JSZip.loadAsync(uncompressed);
    // Non-default look theme normalization is independent of archive compression.
    for (const path of Object.keys(before.files).filter(p => /^ppt\/theme\/theme\d+\.xml$/.test(p))) {
      if (theme.id !== 'sayuna-classic') before.file(path, (await before.file(path)!.async('string')).replace(/<a:(hlink|folHlink)>[\s\S]*?<\/a:\1>/g,
        (_, tag: string) => `<a:${tag}><a:srgbClr val="${theme.palette.muted}"/></a:${tag}>`));
    }
    const after = await JSZip.loadAsync(compressed);
    expect(Object.keys(after.files)).toEqual(Object.keys(before.files));
    for (const [path, entry] of Object.entries(before.files)) {
      expect((await after.file(path)?.async('nodebuffer'))?.equals(await entry.async('nodebuffer')), path).toBe(entry.dir ? undefined : true);
    }
    expect(await after.file('[Content_Types].xml')!.async('string')).toBe(await before.file('[Content_Types].xml')!.async('string'));
  } finally { vi.useRealTimers(); }
}, 30000);
