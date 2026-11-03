import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { expect, it } from 'vitest';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import type { PresentationData } from '@/types/presentation';

const formula = 'Water H_2O and x^2';
const deck: PresentationData = {
  subject: 'Science', topic: 'Formulas', originalWriters: 'Teacher Maria',
  slides: [
    { slideNumber: 1, part: 'Title Page', title: 'Formulas',
      contentPoints: [formula, 'Plain subtitle'], visualDescription: '' },
    { slideNumber: 2, part: 'Discussion', title: 'Practice',
      contentPoints: [formula], visualDescription: '' },
  ],
};

it('characterizes title and content formula runs in the exported slide XML', async () => {
  const zip = await JSZip.loadAsync(await buildPresentationPptx(deck));
  const title = await zip.file('ppt/slides/slide1.xml')!.async('string');
  const content = await zip.file('ppt/slides/slide2.xml')!.async('string');
  const runAttributes = (xml: string, text: string) => Array.from(xml.matchAll(
    /<a:r><a:rPr([^>]*)>[\s\S]*?<\/a:rPr><a:t>([\s\S]*?)<\/a:t><\/a:r>/g
  )).filter(([, , value]) => value === text).map(([, attributes]) => attributes);

  expect(title).not.toContain(formula);
  expect(runAttributes(title, '2')).toEqual(expect.arrayContaining([
    expect.stringContaining('baseline="-40000"'),
    expect.stringContaining('baseline="30000"'),
  ]));
  expect(title).toContain('<a:t>O and x</a:t>');
  expect(title).toContain('Water H');
  expect(title).toContain('Plain subtitle\r\n');
  expect(title).toContain('Original Lesson Plan Writers: Teacher Maria');
  expect(runAttributes(content, '2')).toEqual(expect.arrayContaining([
    expect.stringContaining('baseline="-40000"'),
    expect.stringContaining('baseline="30000"'),
  ]));
  expect(content).toContain('<a:t>O and x</a:t>');
  // Bounded subscripts leave O on the baseline in H_2O.
  expect(createHash('sha256').update(content).digest('hex')).toBe('a9dbe25c970133df72f64c1fdb1ed5688bc7ca0eb7638b742e6f179dc1673e70');
});

it('characterizes a plain-text title slide including its writer attribution', async () => {
  const plainDeck: PresentationData = { ...deck, slides: [{ ...deck.slides[0], contentPoints: ['Plain first', 'Plain subtitle'] }] };
  const zip = await JSZip.loadAsync(await buildPresentationPptx(plainDeck));
  const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
  expect(xml).toContain('Plain first');
  expect(xml).toContain('Original Lesson Plan Writers: Teacher Maria');
  expect(createHash('sha256').update(xml).digest('hex')).toBe('b13408c52c211ca1991de4f122cead211f985d0aae1c21bb8027eca8137c87a1');
});
