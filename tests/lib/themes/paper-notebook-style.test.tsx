// @vitest-environment jsdom
import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { PAPER_NOTEBOOK } from '@/lib/themes/paper-notebook';
import type { SlideTheme } from '@/lib/themes';
import { validateDecorations, decorationsForSlide } from '@/lib/themes/decoration';
import { themeContrastPairs, wcagContrast } from '@/lib/themes/contrast';
import { SlideView } from '@/components/SlideView';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { decorationSlides } from '../../helpers/test-decorations';
import { source, native, svgSummary, xml, htmlDocument, child } from '../../helpers/decoration-parity';
const theme: SlideTheme = PAPER_NOTEBOOK;
it('draws faint rules, margin and three holes with no validation exceptions', () => {
  expect(validateDecorations(theme)).toEqual([]);
  expect(theme.decorations?.filter(d => d.kind === 'line')).toHaveLength(22);
  expect(theme.decorations?.filter(d => d.kind === 'ellipse')).toHaveLength(3);
  for (const d of theme.decorations!.filter(d => d.kind === 'line' && d.w > 0)) {
    expect(d.y + d.line!.width / 144).toBeLessThan(6.85);
    expect(d.line!.color).toBe('E5EDF2');
    for (const pair of themeContrastPairs(theme)) expect(wcagContrast(pair.foreground, d.line!.color), pair.name).toBeGreaterThanOrEqual(pair.requiredRatio);
    expect(validateDecorations({ ...theme, decorations: [d] })).toEqual([]);
  }
  const margin = theme.decorations!.find(d => d.kind === 'line' && d.w === 0)!;
  expect(margin.x + margin.line!.width / 144).toBeLessThan(0.8);
  for (const d of theme.decorations!.filter(d => d.kind === 'ellipse')) expect(d.x + d.w + d.line!.width / 144).toBeLessThan(0.8);
});
it('applies ruled paper to all three slide kinds', () => {
  for (const [index, slide] of Array.from(decorationSlides.entries())) {
    const behind = decorationsForSlide(theme, slide, index, 'behind');
    expect(behind.filter(d => d.kind === 'line')).toHaveLength(22);
    expect(behind.filter(d => d.kind === 'ellipse')).toHaveLength(3);
  }
});
it('matches the real Paper Notebook list in source, SVG and native XML with correct layers', async () => {
  const zip = await JSZip.loadAsync(await buildPresentationPptx({ subject: 'Science', topic: 'Water', originalWriters: '', slides: decorationSlides }, undefined, theme));
  for (const [index, slide] of Array.from(decorationSlides.entries())) {
    const shapes = Array.from(xml(await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string')).getElementsByTagName('p:sp'));
    const text = shapes.flatMap((s, i) => child(s, 'p:txBody') ? [i] : []);
    const root = htmlDocument(renderToStaticMarkup(<SlideView theme={theme} slide={slide} index={index} total={3} />)).querySelector('[role="group"]')!;
    for (const layer of ['behind', 'front'] as const) {
      const expected = decorationsForSlide(theme, slide, index, layer);
      const svg = root.querySelector(`[data-decoration-layer="${layer}"]`);
      const groups = svg?.querySelectorAll('[data-decoration]') ?? [];
      const exported = shapes.filter(s => child(s, 'p:cNvPr').getAttribute('name')!.startsWith(`decoration-${layer}-`));
      expect(groups).toHaveLength(expected.length); expect(exported).toHaveLength(expected.length);
      if (svg) {
        expect(svg.getAttribute('aria-hidden')).toBe('true'); expect((svg as unknown as SVGElement).style.pointerEvents).toBe('none');
        expect(layer === 'behind' ? root.firstElementChild : root.lastElementChild).toBe(svg);
      }
      expected.forEach((d, i) => {
        expect(svgSummary(groups[i], d)).toEqual(source(d)); expect(native(exported[i])).toEqual(source(d));
        expect(layer === 'behind' ? shapes.indexOf(exported[i]) < Math.min(...text) : shapes.indexOf(exported[i]) > Math.max(...text)).toBe(true);
      });
    }
  }
});
