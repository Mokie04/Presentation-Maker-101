// @vitest-environment jsdom
import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import { SlideView } from '@/components/SlideView';
import { THEMES, type SlideTheme } from '@/lib/themes';
import { decorationsForSlide, type Decoration } from '@/lib/themes/decoration';
import { addDecorations } from '@/lib/services/decoration-pptx';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { TEST_DECORATION_THEME, decorationSlides, TEST_DECORATIONS } from '../../helpers/test-decorations';
import { samples } from '../services/credit-samples';

import { htmlDocument, xml, child, num, round, source, native, svgSummary } from '../../helpers/decoration-parity';

const deck = { subject: 'Science', topic: 'Water', originalWriters: '', slides: decorationSlides.map(s => ({ ...s, imageMetadata: samples.commonsFull })) };
it('matches source, SVG and native geometry/styles; filters and inserts both layers around all text including credits', async () => {
  const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, undefined, TEST_DECORATION_THEME));
  for (const [index, slide] of Array.from(deck.slides.entries())) {
    const nativeDoc = xml(await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string'));
    const shapes = Array.from(nativeDoc.getElementsByTagName('p:sp'));
    const html = htmlDocument(renderToStaticMarkup(<SlideView slide={slide} index={index} total={3} theme={TEST_DECORATION_THEME} />));
    const root = html.querySelector('[role="group"]')!;
    const textIndices = shapes.flatMap((s, i) => child(s, 'p:txBody') ? [i] : []);
    for (const layer of ['behind', 'front'] as const) {
      const expected = decorationsForSlide(TEST_DECORATION_THEME, slide, index, layer);
      const svg = root.querySelector(`[data-decoration-layer="${layer}"]`);
      const nativeShapes = shapes.filter(s => child(s, 'p:cNvPr').getAttribute('name')!.startsWith(`decoration-${layer}-`));
      expect(nativeShapes).toHaveLength(expected.length);
      expect(svg?.querySelectorAll('[data-decoration]').length ?? 0).toBe(expected.length);
      if (!expected.length) { expect(svg).toBeNull(); continue; }
      expect(svg!.getAttribute('viewBox')).toBe('0 0 13.333 7.5');
      expect(svg!.getAttribute('preserveAspectRatio')).toBe('none');
      expect((svg as unknown as SVGElement).style.pointerEvents).toBe('none');
      expect(svg!.getAttribute('aria-hidden')).toBe('true');
      expect(layer === 'behind' ? root.firstElementChild : root.lastElementChild).toBe(svg);
      expected.forEach((d, i) => {
        expect(native(nativeShapes[i])).toEqual(source(d));
        expect(svgSummary(svg!.querySelectorAll('[data-decoration]')[i], d)).toEqual(source(d));
        const at = shapes.indexOf(nativeShapes[i]);
        expect(layer === 'behind' ? at < Math.min(...textIndices) : at > Math.max(...textIndices)).toBe(true);
        if (d.kind === 'path') {
          expect(svg!.querySelectorAll('[data-decoration]')[i].querySelector('path')!.getAttribute('d')).toBe('M0 0.12 L0.1 0.12 Q0.3 0 0.7 0.1 C1 0.24 1.5 0 2 0.12 Z');
          const path = child(nativeShapes[i], 'a:path');
          expect(Array.from(path.children).map(p => p.tagName)).toEqual(['a:moveTo', 'a:lnTo', 'a:quadBezTo', 'a:cubicBezTo', 'a:close']);
          const points = Array.from(path.getElementsByTagName('a:pt')).map(p => [round(num(p, 'x') / 914400), round(num(p, 'y') / 914400)]);
          expect(points).toEqual([[0, 0.12], [0.1, 0.12], [0.3, 0], [0.7, 0.1], [1, 0.24], [1.5, 0], [2, 0.12]]);
        }
      });
    }
  }
});
it('preserves every signed line direction and fractional rotation', async () => {
  const pptx = new PptxGenJS(); const slide = pptx.addSlide();
  const lines: Decoration[] = [1, -1].flatMap(w => [1, -1, 0].map(h => ({ kind: 'line', x: 5, y: 4, w, h, rotate: -12.5,
    layer: 'behind', when: { slide: 'any' }, line: { color: 'FFFFFF', width: 2, dash: 'dash' } } as Decoration)));
  addDecorations(slide, lines);
  const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }) as Buffer);
  const doc = xml(await zip.file('ppt/slides/slide1.xml')!.async('string'));
  Array.from(doc.getElementsByTagName('p:sp')).forEach((s, i) => expect(native(s)).toEqual(source(lines[i])));
});
it('parses every XML and relationship part strictly for every registered look and the fixture', async () => {
  for (const theme of [...THEMES, TEST_DECORATION_THEME]) {
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, undefined, theme));
    const parts = Object.values(zip.files).filter(f => /\.(xml|rels)$/.test(f.name));
    expect(parts.length).toBeGreaterThan(25);
    for (const part of parts) {
      const content = await part.async('string');
      expect(() => xml(content), `${theme.id}: ${part.name}`).not.toThrow();
      expect(content).not.toContain('innerShdw');
    }
  }
  expect(() => xml('<a:innerShdw xmlns:a="urn:test"></a:outerShdw>')).toThrow('Malformed XML');
});
it('guards an inner shadow in both the export boundary and the mapper', async () => {
  const invalid = { ...TEST_DECORATIONS[0], shadow: { ...TEST_DECORATIONS[0].shadow, type: 'inner' } } as unknown as Decoration;
  await expect(buildPresentationPptx(deck, undefined, { ...TEST_DECORATION_THEME, decorations: [invalid] })).rejects.toThrow('outer shadow');
  const pptx = new PptxGenJS(); expect(() => addDecorations(pptx.addSlide(), [invalid])).toThrow('Only outer');
});
it('keeps filter IDs unique across simultaneous slide instances and empty arrays invisible', () => {
  const markup = renderToStaticMarkup(<>{[1, 1].map((index, i) => <SlideView key={i} slide={decorationSlides[index]} index={index} total={3} theme={TEST_DECORATION_THEME} />)}</>);
  const doc = htmlDocument(markup);
  const filters = Array.from(doc.querySelectorAll('filter')).map(f => { expect(f.getAttribute('filterUnits')).toBe('userSpaceOnUse'); return f.id; });
  expect(filters.length).toBeGreaterThan(0); expect(new Set(filters).size).toBe(filters.length);
  for (const e of Array.from(doc.querySelectorAll('[filter]'))) expect(filters).toContain(e.getAttribute('filter')!.slice(5, -1));
  const empty: SlideTheme = { ...TEST_DECORATION_THEME, decorations: [] };
  expect(renderToStaticMarkup(<SlideView slide={decorationSlides[0]} index={0} total={3} theme={empty} />)).not.toContain('<svg');
});
