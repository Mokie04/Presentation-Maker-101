import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildPresentationPptx, createPresentationPptx } from '@/lib/services/pptx-generator';
import type { PresentationData, SlideData } from '@/types/presentation';
import { samples } from './credit-samples';

const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const title: SlideData = {
  slideNumber: 1, part: 'Title Page', title: 'Water and energy',
  contentPoints: ['Grade 7 Science', 'Observe the world', 'Discuss your findings'], visualDescription: '',
};
const cases: { name: string; slides: SlideData[]; images?: Record<number, string> }[] = [
  { name: 'title with writers and library image', slides: [{ ...title, imageMetadata: samples.commonsFull }], images: { 0: image } },
  { name: 'long content title with formulas and AI image', slides: [title, {
    slideNumber: 2, part: 'Discussion', title: 'Investigating H_2O and x^2 in the classroom',
    contentPoints: ['Water is H_2O', 'Compare x^2 with x_1'], visualDescription: 'Water molecules and a graph',
  }], images: { 1: `data:image/png;base64,${image}` } },
  { name: 'wide bullets and credit without image', slides: [title, {
    slideNumber: 2, part: 'Assessment', title: 'Reflect',
    contentPoints: ['Explain your observations', 'Share evidence'], visualDescription: '   ',
  }, {
    slideNumber: 3, part: 'Discussion', title: 'Image unavailable', contentPoints: ['Use the source notes'],
    visualDescription: 'A labelled diagram', imageMetadata: samples.commonsMinimal,
  }] },
];

describe.each(cases)('PPTX layout: $name', ({ slides, images }) => {
  it('preserves every slide XML byte through both export entry points', async () => {
    const deck: PresentationData = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria', slides };
    const direct = await createPresentationPptx(deck, images).write({ outputType: 'nodebuffer' });
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, images));
    const directZip = await JSZip.loadAsync(direct);
    for (let index = 1; index <= slides.length; index++) {
      const path = `ppt/slides/slide${index}.xml`;
      const xml = await zip.file(path)!.async('string');
      expect(await directZip.file(path)!.async('string')).toBe(xml);
      // Hash pins raw bytes; expanded XML makes a deliberate future change reviewable.
      expect({ sha256: createHash('sha256').update(xml).digest('hex'), xml: xml.replace(/></g, '>\n<') })
        .toMatchSnapshot(`slide ${index}`);
    }
  });
});
