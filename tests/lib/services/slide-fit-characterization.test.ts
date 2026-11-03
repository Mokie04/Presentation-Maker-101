import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { samples } from './credit-samples';
import { ONE_PIXEL_PNG } from '../../helpers/images';

it('pins fitting title, wide, visual and credited library slide XML', async () => {
  const common = { slideNumber: 1, part: 'Discussion', title: 'Water', contentPoints: ['Observe water', 'Share evidence'], visualDescription: '' };
  const zip = await JSZip.loadAsync(await buildPresentationPptx({
    subject: 'Science', topic: 'Water', originalWriters: 'Teacher Maria',
    slides: [common, common, { ...common, visualDescription: 'Water molecules' },
      { ...common, visualDescription: 'Water', imageMetadata: samples.commonsFull }],
  }, { 3: ONE_PIXEL_PNG }));
  const slides = await Promise.all([1, 2, 3, 4].map(async index => {
    const xml = await zip.file(`ppt/slides/slide${index}.xml`)!.async('string');
    return { sha256: createHash('sha256').update(xml).digest('hex'), xml: xml.replace(/></g, '>\n<') };
  }));
  expect(slides).toMatchSnapshot();
});
