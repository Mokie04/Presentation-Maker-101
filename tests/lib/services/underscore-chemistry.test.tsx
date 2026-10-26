// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { expect, it } from 'vitest';
import { FormattedFormula } from '@/components/FormattedFormula';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';
import { underscoreChemistryCases } from '../../helpers/underscore-chemistry-cases';

it('keeps chemical subscripts and literal identifiers consistent in preview, PPTX and Markdown', async () => {
  const deck = { subject: 'Science', topic: 'Underscore chemistry', originalWriters: '',
    slides: underscoreChemistryCases.map(({ input }, index) => ({ slideNumber: index + 1,
      part: 'Discussion', title: input, contentPoints: [], visualDescription: '' })) };
  const zip = await JSZip.loadAsync(await buildPresentationPptx(deck));
  const markdown = buildPresentationMarkdown(deck).split('\n').filter(line => line.startsWith('### '));
  for (const [index, { input, subscripts, markdown: expectedMarkdown }] of Array.from(underscoreChemistryCases.entries())) {
    const preview = new DOMParser().parseFromString(renderToStaticMarkup(<FormattedFormula text={input} />), 'text/html');
    expect(Array.from(preview.querySelectorAll('sub'), node => node.textContent), input).toEqual(subscripts);
    const expectedText = subscripts.length ? input.replace(/[_{}]/g, '') : input;
    expect(preview.body.textContent, input).toBe(expectedText);

    const slide = new DOMParser().parseFromString(await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string'), 'application/xml');
    expect(slide.getElementsByTagName('parsererror'), input).toHaveLength(0);
    const title = slide.getElementsByTagName('p:sp')[1];
    const runs = Array.from(title.getElementsByTagName('a:r'));
    expect(runs.filter(run => run.getElementsByTagName('a:rPr')[0].getAttribute('baseline') === '-40000')
      .map(run => run.getElementsByTagName('a:t')[0].textContent), input).toEqual(subscripts);
    expect(Array.from(title.getElementsByTagName('a:t'), node => node.textContent).join(''), input).toBe(expectedText);
    expect(markdown[index], input).toBe(`### ${expectedMarkdown}`);
  }
});
