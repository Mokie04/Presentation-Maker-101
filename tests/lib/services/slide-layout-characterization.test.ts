import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildPresentationPptx, createPresentationPptx } from '@/lib/services/pptx-generator';
import type { PresentationData } from '@/types/presentation';
import { slideLayoutCases as cases } from './slide-layout-cases';

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
