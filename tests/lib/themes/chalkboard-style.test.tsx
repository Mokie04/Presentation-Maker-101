// @vitest-environment jsdom
import React from 'react';
import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHALKBOARD } from '@/lib/themes/chalkboard';
import { THEMES, getTheme, type SlideTheme } from '@/lib/themes';
import { decorationsForSlide, validateDecorations } from '@/lib/themes/decoration';
import { SlideView } from '@/components/SlideView';
import JSZip from 'jszip';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { child, xml, htmlDocument, native, source, svgSummary } from '../../helpers/decoration-parity';
import { decorationSlides } from '../../helpers/test-decorations';
const chalkboard: SlideTheme = CHALKBOARD;
it('defines only the three approved treatments with safe paint and no validation exceptions', () => {
  expect(chalkboard.decorations?.map(d => d.kind)).toEqual(['rect', 'rect', 'rect', 'path', 'path', 'roundRect']);
  expect(validateDecorations(chalkboard)).toEqual([]);
  for (const d of chalkboard.decorations!.filter(d => d.layer === 'behind')) expect(validateDecorations({ ...chalkboard, decorations: [d] })).toEqual([]);
  expect(chalkboard.decorations!.filter(d => d.layer === 'front')).toEqual([expect.objectContaining({ kind: 'roundRect', radius: 0.16, when: { slide: 'content', needsVisual: true }, line: { color: 'F4F1E8', width: 2.5, dash: 'dash' } })]);
  for (const theme of THEMES) expect(validateDecorations(theme)).toEqual([]);
});
it('filters the frame and appropriate squiggle for title, picture and no-picture content', () => {
  const title = decorationsForSlide(chalkboard, decorationSlides[0], 0, 'behind');
  const content = decorationsForSlide(chalkboard, decorationSlides[1], 1, 'behind');
  expect(title).toHaveLength(4); expect(content).toHaveLength(4);
  expect(title[title.length - 1]).toMatchObject({ kind: 'path', x: 0.8, y: 3.23, w: 4.5 });
  expect(content[content.length - 1]).toMatchObject({ kind: 'path', x: 0.8, y: 2.006, w: 4.5 });
  expect(decorationsForSlide(chalkboard, decorationSlides[0], 0, 'front')).toEqual([]);
  expect(decorationsForSlide(chalkboard, decorationSlides[1], 1, 'front')).toHaveLength(1);
  expect(decorationsForSlide(chalkboard, decorationSlides[2], 2, 'front')).toEqual([]);
  expect(decorationsForSlide(chalkboard, { ...decorationSlides[2], visualDescription: '  ' }, 2, 'front')).toEqual([]);
});
it('keeps uniform board paint inside the slide, below the credit band, and ribbons inside text gaps', () => {
  for (const d of chalkboard.decorations!.filter(d => d.kind === 'rect')) {
    const half = d.line!.width / 144;
    expect(d.x - half).toBeGreaterThanOrEqual(-1e-9); expect(d.y - half).toBeGreaterThanOrEqual(-1e-9);
    expect(d.x + d.w + half).toBeLessThanOrEqual(13.333 + 1e-9);
    expect(d.y + d.h + half).toBeLessThanOrEqual(7.5 + 1e-9);
    expect(d.y + d.h - half).toBeGreaterThan(7.4);
    expect(d.x).toBe(d.y);
  }
  for (const d of chalkboard.decorations!.filter(d => d.kind === 'path')) {
    expect(d.fill?.color).toBe('F4F1E8'); expect(d.line).toBeUndefined();
    const gap = d.when.slide === 'title' ? [3.15, 3.4] : [2, 2.1];
    expect(d.y).toBeGreaterThan(gap[0]); expect(d.y + d.h).toBeLessThan(gap[1]);
  }
});
it('brackets Chalkboard text with passive SVG layers while other looks have exact undecorated markup', () => {
  const markup = (theme: SlideTheme) => renderToStaticMarkup(<SlideView slide={decorationSlides[1]} index={1} total={3} theme={theme} />);
  const document = new DOMParser().parseFromString(markup(chalkboard), 'text/html');
  const root = document.querySelector('[role="group"]')!;
  expect(root.firstElementChild?.getAttribute('data-decoration-layer')).toBe('behind');
  expect(root.lastElementChild?.getAttribute('data-decoration-layer')).toBe('front');
  for (const svg of Array.from(root.querySelectorAll<SVGElement>('svg'))) { expect(svg.getAttribute('aria-hidden')).toBe('true'); expect(svg.style.pointerEvents).toBe('none'); }
  for (const id of ['sayuna-classic', 'paper-notebook']) {
    const theme = getTheme(id); expect(markup(theme)).not.toContain('<svg');
    expect(markup(theme)).toBe(markup({ ...theme, decorations: [] }));
  }
});

it('matches the real Chalkboard source list in SVG and native XML on all three slide kinds', async () => {
  const deck = { subject: 'Science', topic: 'Water', originalWriters: '', slides: decorationSlides };
  const zip = await JSZip.loadAsync(await buildPresentationPptx(deck, undefined, chalkboard));
  for (const [index, slide] of Array.from(deck.slides.entries())) {
    const nativeDoc = xml(await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string'));
    const shapes = Array.from(nativeDoc.getElementsByTagName('p:sp'));
    const textIndices = shapes.flatMap((s, i) => child(s, 'p:txBody') ? [i] : []);
    const root = htmlDocument(renderToStaticMarkup(<SlideView slide={slide} index={index} total={3} theme={chalkboard} />));
    for (const layer of ['behind', 'front'] as const) {
      const expected = decorationsForSlide(chalkboard, slide, index, layer);
      const groups = root.querySelectorAll(`[data-decoration-layer="${layer}"] [data-decoration]`);
      const nativeShapes = shapes.filter(s => child(s, 'p:cNvPr').getAttribute('name')!.startsWith(`decoration-${layer}-`));
      expect(groups).toHaveLength(expected.length); expect(nativeShapes).toHaveLength(expected.length);
      expected.forEach((d, i) => {
        expect(svgSummary(groups[i], d)).toEqual(source(d)); expect(native(nativeShapes[i])).toEqual(source(d));
        expect(layer === 'behind' ? shapes.indexOf(nativeShapes[i]) < Math.min(...textIndices) : shapes.indexOf(nativeShapes[i]) > Math.max(...textIndices)).toBe(true);
        if (d.kind === 'path') {
          const path = child(nativeShapes[i], 'a:path');
          expect(Array.from(path.children).map(p => p.tagName)).toEqual(['a:moveTo', 'a:quadBezTo', 'a:quadBezTo', 'a:quadBezTo', 'a:lnTo', 'a:quadBezTo', 'a:quadBezTo', 'a:quadBezTo', 'a:close']);
          const nativePoints = Array.from(path.getElementsByTagName('a:pt')).map(p => [Number(p.getAttribute('x')) / 914400, Number(p.getAttribute('y')) / 914400]);
          const sourcePoints = d.points.flatMap(p => p.kind === 'close' ? [] : p.kind === 'quadratic' ? [[p.cx, p.cy], [p.x, p.y]] : 'x' in p ? [[p.x, p.y]] : []);
          expect(nativePoints.map(p => p.map(n => Math.round(n * 10000) / 10000))).toEqual(sourcePoints);
        }
      });
    }
  }
});
