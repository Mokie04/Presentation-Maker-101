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

const parser = new DOMParser();
const htmlDocument = (markup: string) => parser.parseFromString(markup, 'text/html');
function xml(text: string): Document {
  const document = parser.parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('Malformed XML');
  return document;
}
const child = (root: Element | Document, name: string) => root.getElementsByTagName(name)[0];
const num = (root: Element, name: string) => Number(root.getAttribute(name));
const round = (n: number) => Math.round(n * 100) / 100;
const angle = (n: number) => round(((n % 360) + 360) % 360);
const deck = { subject: 'Science', topic: 'Water', originalWriters: '', slides: decorationSlides.map(s => ({ ...s, imageMetadata: samples.commonsFull })) };
function source(d: Decoration) {
  return { kind: d.kind, x: round(d.x), y: round(d.y), w: round(d.w), h: round(d.h), rotate: angle(d.rotate ?? 0),
    fill: d.kind !== 'line' && d.fill ? { color: d.fill.color, transparency: d.fill.transparency ?? 0 } : undefined,
    line: d.line ? { color: d.line.color, width: d.line.width, dash: d.line.dash ?? 'solid' } : undefined,
    shadow: d.shadow ? { ...d.shadow, angle: angle(d.shadow.angle) } : undefined,
    ...(d.kind === 'roundRect' && { radius: d.radius }),
  };
}
function native(shape: Element) {
  const props = child(shape, 'p:spPr'), xfrm = child(props, 'a:xfrm');
  const off = child(xfrm, 'a:off'), ext = child(xfrm, 'a:ext');
  const preset = child(props, 'a:prstGeom');
  const kind = preset?.getAttribute('prst') ?? 'path';
  let x = num(off, 'x') / 914400, y = num(off, 'y') / 914400;
  let w = num(ext, 'cx') / 914400, h = num(ext, 'cy') / 914400;
  if (kind === 'line') {
    if (xfrm.getAttribute('flipH') === '1') { x += w; w = -w; }
    if (xfrm.getAttribute('flipV') === '1') { y += h; h = -h; }
  }
  const fillNode = Array.from(props.children).find(e => e.tagName === 'a:solidFill');
  const fillColor = fillNode && child(fillNode, 'a:srgbClr');
  const alpha = fillNode && child(fillNode, 'a:alpha');
  const line = child(props, 'a:ln'), lineColor = line && child(line, 'a:srgbClr');
  const shadow = child(props, 'a:outerShdw');
  return { kind, x: round(x), y: round(y), w: round(w), h: round(h), rotate: angle(num(xfrm, 'rot') / 60000),
    fill: fillColor ? { color: fillColor.getAttribute('val'), transparency: alpha ? round(100 - num(alpha, 'val') / 1000) : 0 } : undefined,
    line: lineColor ? { color: lineColor.getAttribute('val'), width: round(num(line, 'w') / 12700), dash: child(line, 'a:prstDash')?.getAttribute('val') ?? 'solid' } : undefined,
    shadow: shadow ? { type: 'outer', blur: round(num(shadow, 'blurRad') / 12700), offset: round(num(shadow, 'dist') / 12700),
      angle: angle(num(shadow, 'dir') / 60000), color: child(shadow, 'a:srgbClr').getAttribute('val'), opacity: num(child(shadow, 'a:alpha'), 'val') / 100000 } : undefined,
    ...(kind === 'roundRect' && { radius: round(Number(child(preset, 'a:gd').getAttribute('fmla')!.split(' ')[1]) / 100000 * Math.min(w, h)) }),
  };
}
function svgSummary(group: Element, d: Decoration) {
  const shape = group.querySelector('rect,ellipse,line,path')!;
  const attr = (key: string) => Number(shape.getAttribute(key));
  let x: number, y: number, w: number, h: number;
  if (shape.tagName === 'line') { x = attr('x1'); y = attr('y1'); w = attr('x2') - x; h = attr('y2') - y; }
  else if (shape.tagName === 'ellipse') { w = 2 * attr('rx'); h = 2 * attr('ry'); x = attr('cx') - w / 2; y = attr('cy') - h / 2; }
  else if (shape.tagName === 'path') {
    [x, y] = shape.getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number);
    // Path extent comes from its actual command endpoints/control hull, not fixture metadata.
    const values = shape.getAttribute('d')!.match(/-?[\d.]+/g)!.map(Number);
    const xs = values.filter((_, i) => i % 2 === 0), ys = values.filter((_, i) => i % 2 === 1);
    w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
  } else { x = attr('x'); y = attr('y'); w = attr('width'); h = attr('height'); }
  const shadow = Array.from(group.getElementsByTagName('*')).find(e => e.localName.toLowerCase() === 'fedropshadow');
  const fill = shape.getAttribute('fill'), stroke = shape.getAttribute('stroke');
  const rotation = shape.parentElement!.getAttribute('transform')!;
  const dash = shape.getAttribute('stroke-dasharray');
  if (dash) expect(dash.split(' ').map(Number)).toEqual([4 * attr('stroke-width'), 3 * attr('stroke-width')]);
  if (shape.tagName === 'path') expect(shape.getAttribute('d')).toBe('M0 0.12 L0.1 0.12 Q0.3 0 0.7 0.1 C1 0.24 1.5 0 2 0.12 Z');
  const dx = Number(shadow?.getAttribute('dx')), dy = Number(shadow?.getAttribute('dy'));
  return { kind: shape.tagName === 'rect' ? shape.hasAttribute('rx') ? 'roundRect' : 'rect' : shape.tagName,
    x: round(x), y: round(y), w: round(w), h: round(h), rotate: angle(Number(rotation.match(/-?[\d.]+/)![0])),
    fill: fill !== 'none' ? { color: fill!.slice(1), transparency: round(100 * (1 - attr('fill-opacity'))) } : undefined,
    line: stroke !== 'none' ? { color: stroke!.slice(1), width: round(attr('stroke-width') * 72), dash: dash ? 'dash' : 'solid' } : undefined,
    shadow: shadow ? { type: 'outer', color: shadow.getAttribute('flood-color')!.slice(1), opacity: Number(shadow.getAttribute('flood-opacity')),
      blur: round(Number(shadow.getAttribute('stdDeviation')) * 144), offset: round(Math.hypot(dx, dy) * 72), angle: angle(Math.atan2(dy, dx) * 180 / Math.PI) } : undefined,
    ...(d.kind === 'roundRect' && { radius: attr('rx') }),
  };
}
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
