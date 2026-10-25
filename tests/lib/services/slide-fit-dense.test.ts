import { expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { fitSlide } from '@/lib/slide-fit';
import type { SlideData } from '@/types/presentation';

it('exports explicit fitted sizes and proportional spacing for dense title and content slides', async () => {
  const common: SlideData = { slideNumber: 1, part: 'Discussion', title: 'Exploring evidence across the Solar System and beyond',
    contentPoints: Array.from({ length: 4 }, () => 'Observe the different kinds of small bodies in the Solar System and compare their motion.'), visualDescription: 'Solar System' };
  const slides = [common, common];
  const zip = await JSZip.loadAsync(await buildPresentationPptx({ subject: 'Science', topic: 'Space', originalWriters: '', slides }));
  for (let index = 0; index < slides.length; index++) {
    const fit = fitSlide(slides[index], index);
    const xml = await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string');
    expect(fit.body.fontSize).toBeLessThan(index === 0 ? 28 : 35);
    expect(xml).toContain(`sz="${Math.round(fit.body.fontSize * 100)}"`);
    expect(xml).toContain(`<a:spcPts val="${Math.round(fit.body.lineHeightPt * 100)}"/>`);
    expect(xml.replace(/></g, '>\n<')).toMatchSnapshot(`dense slide ${index + 1}`);
  }
});
