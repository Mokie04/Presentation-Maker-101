import { expect } from 'vitest';
import type { Decoration } from '@/lib/themes/decoration';

const parser = new DOMParser();
export const htmlDocument = (markup: string) => parser.parseFromString(markup, 'text/html');
export function xml(text: string): Document {
  const document = parser.parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('Malformed XML');
  return document;
}
export const child = (root: Element | Document, name: string) => root.getElementsByTagName(name)[0];
export const num = (root: Element, name: string) => Number(root.getAttribute(name));
export const round = (n: number) => Math.round(n * 100) / 100;
const angle = (n: number) => round(((n % 360) + 360) % 360);
export function source(d: Decoration) {
  return { kind: d.kind, x: round(d.x), y: round(d.y), w: round(d.w), h: round(d.h), rotate: angle(d.rotate ?? 0),
    fill: d.kind !== 'line' && d.fill ? { color: d.fill.color, transparency: d.fill.transparency ?? 0 } : undefined,
    line: d.line ? { color: d.line.color, width: d.line.width, dash: d.line.dash ?? 'solid' } : undefined,
    shadow: d.shadow ? { ...d.shadow, angle: angle(d.shadow.angle) } : undefined,
    ...(d.kind === 'roundRect' && { radius: d.radius }),
  };
}
export function native(shape: Element) {
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
export function svgSummary(group: Element, d: Decoration) {
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
