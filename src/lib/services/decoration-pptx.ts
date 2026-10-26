import PptxGenJS from 'pptxgenjs';
import type { Decoration } from '@/lib/themes/decoration';

const angle = (degrees: number) => ((degrees % 360) + 360) % 360;
/** Fresh options per shape: PptxGenJS mutates shadow units while serializing. */
export function addDecorations(slide: PptxGenJS.Slide, decorations: readonly Decoration[]): void {
  for (const [index, d] of Array.from(decorations.entries())) {
    // Defence at this public mapper boundary too: never allow the SDK's malformed innerShdw.
    if (d.shadow && d.shadow.type !== 'outer') throw new Error('Only outer decoration shadows are supported');
    const options: PptxGenJS.ShapeProps = {
      x: d.kind === 'line' ? Math.min(d.x, d.x + d.w) : d.x,
      y: d.kind === 'line' ? Math.min(d.y, d.y + d.h) : d.y,
      w: Math.abs(d.w), h: Math.abs(d.h), rotate: angle(d.rotate ?? 0),
      objectName: `decoration-${d.layer}-${index}`,
      fill: d.kind !== 'line' && d.fill ? { ...d.fill } : { type: 'none' },
      line: d.line ? { color: d.line.color, width: d.line.width, dashType: d.line.dash ?? 'solid' } : { type: 'none' },
    };
    if (d.kind === 'line') { options.flipH = d.w < 0; options.flipV = d.h < 0; }
    // SDK 4.0.1 computes adj = radius / min(width,height) * 100000 from inches.
    // A tiny nonzero value bypasses its truthiness default and rounds to native adj=0.
    if (d.kind === 'roundRect') options.rectRadius = d.radius || Number.EPSILON;
    if (d.shadow) options.shadow = { ...d.shadow, angle: angle(d.shadow.angle) || Number.EPSILON,
      blur: d.shadow.blur || Number.EPSILON, offset: d.shadow.offset || Number.EPSILON, opacity: d.shadow.opacity || Number.EPSILON };
    if (d.kind === 'path') options.points = d.points.map(p => p.kind === 'close' ? { close: true }
      : p.kind === 'moveTo' ? { x: p.x, y: p.y, moveTo: true }
        : p.kind === 'line' ? { x: p.x, y: p.y }
          : p.kind === 'quadratic' ? { x: p.x, y: p.y, curve: { type: 'quadratic', x1: p.cx, y1: p.cy } }
            : { x: p.x, y: p.y, curve: { type: 'cubic', x1: p.cx1, y1: p.cy1, x2: p.cx2, y2: p.cy2 } });
    // SDK 4.0.1 implements custGeom but omits it from its public type union.
    const shape = d.kind === 'path' ? 'custGeom' as PptxGenJS.SHAPE_NAME : d.kind;
    slide.addShape(shape, options);
  }
}
