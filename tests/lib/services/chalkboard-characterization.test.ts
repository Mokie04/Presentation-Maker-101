import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { getTheme } from '@/lib/themes';
import { buildPresentationPptx, createPresentationPptx } from '@/lib/services/pptx-generator';
import { slideLayoutCases } from './slide-layout-cases';
import { lookFixtureDeck, lookFixtureImages } from '../../helpers/look-render-fixtures';
it('pins all six Chalkboard slide XML bytes', async () => {
  const zip = await JSZip.loadAsync(await buildPresentationPptx(lookFixtureDeck, lookFixtureImages, getTheme('chalkboard')));
  for (let index = 1; index <= lookFixtureDeck.slides.length; index++) {
    const xml = await zip.file(`ppt/slides/slide${index}.xml`)!.async('string');
    expect({ sha256: createHash('sha256').update(xml).digest('hex'), xml: xml.replace(/></g, '>\n<') }).toMatchSnapshot(`slide ${index}`);
  }
});

describe.each(slideLayoutCases)('Chalkboard legacy characterization: $name', ({ slides, images }) => {
  it('preserves the same six legacy cases through both export entry points', async () => {
    const deck = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria', slides };
    const theme = getTheme('chalkboard');
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, images, theme));
    const direct = await JSZip.loadAsync(await createPresentationPptx(deck, images, theme).write({ outputType: 'nodebuffer' }));
    for (let index = 1; index <= slides.length; index++) {
      const xml = await zip.file(`ppt/slides/slide${index}.xml`)!.async('string');
      expect(await direct.file(`ppt/slides/slide${index}.xml`)!.async('string')).toBe(xml);
      expect({ sha256: createHash('sha256').update(xml).digest('hex'), xml: xml.replace(/></g, '>\n<') }).toMatchSnapshot(`slide ${index}`);
    }
  });
});
