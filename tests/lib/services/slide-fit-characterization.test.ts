import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { samples } from './credit-samples';

it('pins fitting title, wide, visual and credited library slide XML', async () => {
  const common = { slideNumber: 1, part: 'Discussion', title: 'Water', contentPoints: ['Observe water', 'Share evidence'], visualDescription: '' };
  const zip = await JSZip.loadAsync(await buildPresentationPptx({
    subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria',
    slides: [common, common, { ...common, visualDescription: 'Water molecules' },
      { ...common, visualDescription: 'Water', imageMetadata: samples.commonsFull }],
  }, { 3: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }));
  const slides = await Promise.all([1, 2, 3, 4].map(async index => {
    const xml = await zip.file(`ppt/slides/slide${index}.xml`)!.async('string');
    return { sha256: createHash('sha256').update(xml).digest('hex'), xml: xml.replace(/></g, '>\n<') };
  }));
  expect(slides).toMatchSnapshot();
});
