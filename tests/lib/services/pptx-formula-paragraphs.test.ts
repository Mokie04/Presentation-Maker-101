import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { THEMES } from '@/lib/themes';
import type { PresentationData } from '@/types/presentation';

// A paragraph's properties (<a:pPr>) are only valid as its first child. pptxgenjs writes another one
// between the runs of a line that contains a formula, which removes the bullet in some viewers.
const deck: PresentationData = {
  subject: 'Science', topic: 'Formulas', originalWriters: 'Teacher Maria',
  slides: [
    { slideNumber: 1, part: 'Title Page', title: 'Forces and H_2O', contentPoints: ['Grade 7'], visualDescription: '' },
    { slideNumber: 2, part: 'Discussion', title: 'Net force F_net and e^-x', visualDescription: '',
      contentPoints: ['Plain bullet', 'Water is H_2O in the lab', 'Net force F_net and e^-x', 'x^2 + y^2 = z^2', 'Last plain bullet'] },
  ],
};

const paragraphs = (xml: string) => Array.from(xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g), match => match[1]);

describe.each(THEMES.map(theme => [theme.id, theme] as const))('formula lines in the %s look', (_, theme) => {
  it('keeps one paragraph-properties element per paragraph, first, and a bullet on every content line', async () => {
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, undefined, theme));
    for (const path of Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))) {
      const xml = await zip.file(path)!.async('string');
      expect(xml, path).not.toMatch(/<\/a:(?:r|br|fld)><a:pPr\b/);
      for (const body of paragraphs(xml)) expect(body.match(/<a:pPr\b/g)?.length ?? 0).toBeLessThanOrEqual(1);
    }
    const content = await zip.file('ppt/slides/slide2.xml')!.async('string');
    const lines = paragraphs(content).filter(body => /Plain bullet|Water is H|Net force F|x<\/a:t>|Last plain/.test(body) || body.includes('buChar'));
    const bulleted = lines.filter(body => body.startsWith('<a:pPr') && body.includes('buChar'));
    // Five content lines, each with its bullet and indent in its single, leading <a:pPr>.
    expect(bulleted).toHaveLength(5);
    for (const body of bulleted) expect(body).toMatch(/^<a:pPr marL="342900" indent="-342900">/);
  });

  it('still writes the subscript and superscript runs', async () => {
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, undefined, theme));
    const content = await zip.file('ppt/slides/slide2.xml')!.async('string');
    expect(content).toContain('baseline="-40000"');
    expect(content).toContain('baseline="30000"');
  });
});
