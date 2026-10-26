import type { SlideTheme } from './types';
import type { SlideData } from '@/types/presentation';
import { hasVisual, SLIDE_WIDTH, SLIDE_HEIGHT, type SlideBox } from '../slide-theme';
import { themeContrastPairs, wcagContrast } from './contrast';

export type DecorationPoint =
  | { readonly kind: 'moveTo'; readonly x: number; readonly y: number }
  | { readonly kind: 'line'; readonly x: number; readonly y: number }
  | { readonly kind: 'quadratic'; readonly x: number; readonly y: number; readonly cx: number; readonly cy: number }
  | { readonly kind: 'cubic'; readonly x: number; readonly y: number; readonly cx1: number; readonly cy1: number; readonly cx2: number; readonly cy2: number }
  | { readonly kind: 'close' };
interface DecorationBase {
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  readonly fill?: { readonly color: string; readonly transparency?: number };
  readonly line?: { readonly color: string; readonly width: number; readonly dash?: 'solid' | 'dash' };
  readonly rotate?: number;
  readonly shadow?: { readonly type: 'outer'; readonly blur: number; readonly offset: number; readonly angle: number; readonly color: string; readonly opacity: number };
  readonly layer: 'behind' | 'front';
  readonly when: { readonly slide: 'title' | 'content' | 'any'; readonly needsVisual?: boolean };
}
export type Decoration = DecorationBase & (
  | { readonly kind: 'rect' | 'ellipse' | 'line' }
  | { readonly kind: 'roundRect'; readonly radius: number }
  | { readonly kind: 'path'; readonly points: readonly DecorationPoint[] }
);

export function decorationsForSlide(theme: SlideTheme, slide: SlideData, index: number, layer: Decoration['layer']): readonly Decoration[] {
  return (theme.decorations ?? []).filter(d => d.layer === layer
    && (d.when.slide === 'any' || d.when.slide === (index === 0 ? 'title' : 'content'))
    && (!d.when.needsVisual || (index > 0 && hasVisual(slide))));
}

type Box = { x: number; y: number; w: number; h: number };
type Paint = { box: Box; color: string; opacity: number };
const intersects = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const expanded = (b: Box, r: number): Box => ({ x: b.x - r, y: b.y - r, w: b.w + 2 * r, h: b.h + 2 * r });
function bounds(points: readonly { x: number; y: number }[]): Box {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}
function rotated(b: Box, d: Decoration): Box {
  const angle = (d.rotate ?? 0) * Math.PI / 180, cx = d.x + d.w / 2, cy = d.y + d.h / 2;
  return bounds([[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) => ({
    x: cx + (x - cx) * Math.cos(angle) - (y - cy) * Math.sin(angle),
    y: cy + (x - cx) * Math.sin(angle) + (y - cy) * Math.cos(angle),
  })));
}
/** Conservative painted bounds, not the empty interior of an outlined frame. Curves use control hulls. */
function paints(d: Decoration): Paint[] {
  const box = bounds([{ x: d.x, y: d.y }, { x: d.x + d.w, y: d.y + d.h }]);
  const strokes: Box[] = [];
  let fillBox = box;
  if (d.kind === 'line') strokes.push(box);
  else if (d.kind === 'path') {
    let last = { x: 0, y: 0 }, first = last;
    const all = [];
    for (const p of d.points) {
      if (p.kind === 'close') { strokes.push(bounds([last, first])); last = first; continue; }
      const end = { x: d.x + p.x, y: d.y + p.y };
      const controls = p.kind === 'quadratic' ? [{ x: d.x + p.cx, y: d.y + p.cy }]
        : p.kind === 'cubic' ? [{ x: d.x + p.cx1, y: d.y + p.cy1 }, { x: d.x + p.cx2, y: d.y + p.cy2 }] : [];
      if (p.kind === 'moveTo') first = end;
      else strokes.push(bounds([last, ...controls, end]));
      all.push(end, ...controls); last = end;
    }
    fillBox = bounds(all);
  } else if (d.kind === 'rect' || (d.kind === 'roundRect' && d.radius === 0)) {
    strokes.push({ ...box, h: 0 }, { ...box, y: box.y + box.h, h: 0 }, { ...box, w: 0 }, { ...box, x: box.x + box.w, w: 0 });
  } else {
    // Segment the curved perimeter; each chord hull is padded by its maximum sagitta.
    const count = 64;
    const radius = d.kind === 'roundRect' ? d.radius : 0;
    const perimeter = (i: number) => {
      const a = i * 2 * Math.PI / count;
      const rx = d.kind === 'ellipse' ? box.w / 2 : radius;
      const ry = d.kind === 'ellipse' ? box.h / 2 : radius;
      return { x: box.x + box.w / 2 + (box.w / 2 - rx) * Math.sign(Math.cos(a)) + rx * Math.cos(a),
        y: box.y + box.h / 2 + (box.h / 2 - ry) * Math.sign(Math.sin(a)) + ry * Math.sin(a) };
    };
    for (let i = 0; i < count; i++) strokes.push(expanded(bounds([perimeter(i), perimeter(i + 1)]), Math.max(box.w, box.h) * (1 - Math.cos(Math.PI / count)) / 2));
  }
  const result: Paint[] = [];
  if (d.fill && d.kind !== 'line') result.push({ box: rotated(fillBox, d), color: d.fill.color, opacity: 1 - (d.fill.transparency ?? 0) / 100 });
  if (d.line) for (const b of strokes) result.push({ box: rotated(expanded(b, d.line.width / 144 * (d.kind === 'path' ? 8 : 1)), d), color: d.line.color, opacity: 1 });
  if (d.shadow && d.shadow.opacity > 0) {
    const { shadow } = d, angle = shadow.angle * Math.PI / 180;
    for (const p of [...result]) result.push({ box: expanded({ ...p.box,
      x: p.box.x + shadow.offset / 72 * Math.cos(angle), y: p.box.y + shadow.offset / 72 * Math.sin(angle),
    }, shadow.blur * 2 / 72), color: shadow.color, opacity: p.opacity * shadow.opacity });
  }
  return result;
}
function inches(b: SlideBox): Box {
  const n = (v: number | string, size: number) => typeof v === 'number' ? v : parseFloat(v) / 100 * size;
  return { x: n(b.x, SLIDE_WIDTH), y: n(b.y, SLIDE_HEIGHT), w: n(b.w, SLIDE_WIDTH), h: n(b.h, SLIDE_HEIGHT) };
}
function composite(color: string, background: string, opacity: number): string {
  return [0, 2, 4].map(i => Math.round(parseInt(color.slice(i, i + 2), 16) * opacity
    + parseInt(background.slice(i, i + 2), 16) * (1 - opacity)).toString(16).padStart(2, '0')).join('');
}
/** Each decoration is checked independently against the background, never against a stacked composite. */
export function validateDecorations(theme: SlideTheme): string[] {
  const problems: string[] = [];
  const color = (v: unknown) => typeof v === 'string' && /^[\da-f]{6}$/i.test(v);
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const range = (v: unknown, min: number, max = Infinity) => finite(v) && v >= min && v <= max;
  for (const [index, d] of Array.from((theme.decorations ?? []).entries())) {
    const fail = (message: string) => problems.push(`Decoration ${index}: ${message}`);
    if (!['rect', 'roundRect', 'ellipse', 'line', 'path'].includes(d.kind)
      || ![d.x, d.y, d.w, d.h, d.rotate ?? 0].every(finite)
      || (d.kind !== 'line' && (d.w <= 0 || d.h <= 0))
      || !['behind', 'front'].includes(d.layer) || !d.when || !['title', 'content', 'any'].includes(d.when.slide)
      || (d.when.needsVisual !== undefined && typeof d.when.needsVisual !== 'boolean')
      || (d.fill && (!color(d.fill.color) || !range(d.fill.transparency ?? 0, 0, 100)))
      || (d.line && (!color(d.line.color) || !range(d.line.width, Number.EPSILON) || !['solid', 'dash'].includes(d.line.dash ?? 'solid')))
      || (d.shadow && (d.shadow.type !== 'outer' || !color(d.shadow.color) || !range(d.shadow.opacity, 0, 1)
        || !range(d.shadow.blur, 0) || !range(d.shadow.offset, 0) || !finite(d.shadow.angle)))
      || (d.kind === 'roundRect' && !range(d.radius, 0, Math.min(d.w, d.h) / 2))) {
      fail('invalid geometry, style, condition or outer shadow'); continue;
    }
    if (d.kind === 'path' && (!Array.isArray(d.points) || d.points[0]?.kind !== 'moveTo' || d.points.length < 2 || d.points.some(p => {
      const fields = p.kind === 'close' ? [] : p.kind === 'quadratic' ? [p.x, p.y, p.cx, p.cy]
        : p.kind === 'cubic' ? [p.x, p.y, p.cx1, p.cy1, p.cx2, p.cy2] : [p.x, p.y];
      return !['moveTo', 'line', 'quadratic', 'cubic', 'close'].includes(p.kind) || !fields.every(finite);
    }))) { fail('invalid path commands'); continue; }
    const paint = paints(d).filter(p => p.opacity > 0);
    for (const name of ['credit', 'counter'] as const) {
      if (paint.some(p => intersects(p.box, inches(theme.layout[name])))) fail(`overlaps ${name} box`);
    }
    const pairs = themeContrastPairs(theme);
    for (const title of [true, false]) {
      if (d.when.slide !== 'any' && (d.when.slide === 'title') !== title) continue;
      if (title && d.when.needsVisual) continue;
      const layout = title ? theme.layout.title : theme.layout.content;
      const regions = [
        { box: inches(layout.part), names: ['part label'] }, { box: inches(layout.title), names: ['title'] },
        title ? { box: inches(theme.layout.title.points), names: ['heading', 'muted'] }
          : { box: inches({ ...theme.layout.content.bullets, ...(d.when.needsVisual && { w: theme.layout.content.bulletsWithVisualWidth }) }), names: ['body'] },
      ];
      // Front treatments may decorate pictures. Behind paint must also preserve
      // the placeholder's text colour when a visual has not loaded.
      if (!title && d.layer === 'behind') regions.push({ box: inches(theme.layout.content.placeholder), names: ['visual placeholder text'] });
      for (const region of regions) for (const p of paint) {
        if (!intersects(region.box, p.box)) continue;
        if (d.layer === 'front') { fail('front paint overlaps text box'); break; }
        const bg = composite(p.color, theme.palette.background, p.opacity);
        if (pairs.some(pair => region.names.includes(pair.name) && wcagContrast(pair.foreground, bg) < pair.requiredRatio)) {
          fail('behind paint reduces text contrast'); break;
        }
      }
    }
  }
  return problems;
}
export function assertValidDecorations(theme: SlideTheme): void {
  const problems = validateDecorations(theme);
  if (problems.length) throw new Error(problems.join('; '));
}
