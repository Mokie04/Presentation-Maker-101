'use client';

import { useId } from 'react';
import type { Decoration, DecorationPoint } from '@/lib/themes/decoration';

function pathData(points: readonly DecorationPoint[]): string {
  return points.map(p => p.kind === 'close' ? 'Z' : p.kind === 'moveTo' ? `M${p.x} ${p.y}`
    : p.kind === 'line' ? `L${p.x} ${p.y}` : p.kind === 'quadratic' ? `Q${p.cx} ${p.cy} ${p.x} ${p.y}`
      : `C${p.cx1} ${p.cy1} ${p.cx2} ${p.cy2} ${p.x} ${p.y}`).join(' ');
}
/** Mounted only for a nonempty filtered list, so empty themes retain their exact markup. */
export function DecorationLayer({ decorations, layer }: { decorations: readonly Decoration[]; layer: Decoration['layer'] }) {
  const id = useId().replace(/:/g, '_');
  return <svg data-decoration-layer={layer} viewBox="0 0 13.333 7.5" preserveAspectRatio="none" aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    {decorations.map((d, index) => {
      const filter = `${id}-shadow-${index}`;
      const margin = 1 + (d.shadow ? d.shadow.offset + 2 * d.shadow.blur : 0) / 72;
      const strokeWidth = (d.line?.width ?? 0) / 72;
      const style = { fill: d.kind === 'line' ? 'none' : d.fill ? `#${d.fill.color}` : 'none',
        fillOpacity: 1 - (d.fill?.transparency ?? 0) / 100, stroke: d.line ? `#${d.line.color}` : 'none',
        strokeWidth, strokeLinejoin: 'miter' as const, strokeMiterlimit: 8, strokeDasharray: d.line?.dash === 'dash' ? `${4 * strokeWidth} ${3 * strokeWidth}` : undefined };
      const transform = `rotate(${d.rotate ?? 0} ${d.x + d.w / 2} ${d.y + d.h / 2})`;
      const shape = d.kind === 'line' ? <line x1={d.x} y1={d.y} x2={d.x + d.w} y2={d.y + d.h} {...style} />
        : d.kind === 'ellipse' ? <ellipse cx={d.x + d.w / 2} cy={d.y + d.h / 2} rx={d.w / 2} ry={d.h / 2} {...style} />
          : d.kind === 'path' ? <path d={pathData(d.points)} transform={`translate(${d.x} ${d.y})`} {...style} />
            : <rect x={d.x} y={d.y} width={d.w} height={d.h} rx={d.kind === 'roundRect' ? d.radius : undefined} {...style} />;
      return <g key={index} data-decoration={index}>
        {d.shadow && <defs><filter id={filter} x={-margin} y={-margin} width={13.333 + 2 * margin} height={7.5 + 2 * margin} filterUnits="userSpaceOnUse">
          <feDropShadow dx={d.shadow.offset / 72 * Math.cos(d.shadow.angle * Math.PI / 180)}
            dy={d.shadow.offset / 72 * Math.sin(d.shadow.angle * Math.PI / 180)} stdDeviation={d.shadow.blur / 144}
            floodColor={`#${d.shadow.color}`} floodOpacity={d.shadow.opacity} />
        </filter></defs>}
        <g filter={d.shadow ? `url(#${filter})` : undefined}><g transform={transform}>{shape}</g></g>
      </g>;
    })}
  </svg>;
}
