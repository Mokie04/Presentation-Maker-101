import { SAYUNA_CLASSIC } from './sayuna-classic';
import type { SlideTheme } from './types';
import type { DecorationPoint } from './decoration';

// A ~2 pt filled chalk ribbon fits the 0.10-inch content title/body gap.
// A stroked path reserves eight half-widths for joins under ADR 0025.
const chalkSquiggle: readonly DecorationPoint[] = [
  { kind: 'moveTo', x: 0, y: 0.03 },
  { kind: 'quadratic', x: 1.5, y: 0.03, cx: 0.75, cy: 0 },
  { kind: 'quadratic', x: 3, y: 0.03, cx: 2.25, cy: 0.06 },
  { kind: 'quadratic', x: 4.5, y: 0.03, cx: 3.75, cy: 0 },
  { kind: 'line', x: 4.5, y: 0.058 },
  { kind: 'quadratic', x: 3, y: 0.058, cx: 3.75, cy: 0.028 },
  { kind: 'quadratic', x: 1.5, y: 0.058, cx: 2.25, cy: 0.088 },
  { kind: 'quadratic', x: 0, y: 0.058, cx: 0.75, cy: 0.028 },
  { kind: 'close' },
];

export const CHALKBOARD = {
  id: 'chalkboard',
  name: 'Chalkboard',
  palette: {
    background: '22302C',
    primary: 'FFD966',
    secondary: '9EE6C9',
    textDark: 'F4F1E8',
    heading: 'FFFFFF',
    muted: 'C9D3CE',
    subtle: 'A9B9B1',
    cardBackground: '2E403B',
    cardBorder: '6F8F83',
  },
  typography: {
    exportFace: 'Arial',
    previewFont: "var(--font-slide-arimo), Arial, Helvetica, sans-serif",
    metricsId: 'arimo',
  },
  decorations: [
    // Uniform 0.09-inch board: the bottom paint starts at 7.41, below credits.
    { kind: 'rect', x: 0.045, y: 0.045, w: 13.243, h: 7.41, layer: 'behind', when: { slide: 'any' },
      line: { color: '8B5E3C', width: 6.48 } },
    { kind: 'rect', x: 0.01, y: 0.01, w: 13.313, h: 7.48, layer: 'behind', when: { slide: 'any' },
      line: { color: '5E3F27', width: 1.44 } },
    { kind: 'rect', x: 0.055, y: 0.055, w: 13.223, h: 7.39, layer: 'behind', when: { slide: 'any' },
      line: { color: 'A97B52', width: 0.72 } },
    { kind: 'path', x: 0.8, y: 3.23, w: 4.5, h: 0.088, layer: 'behind', when: { slide: 'title' },
      fill: { color: 'F4F1E8' }, points: chalkSquiggle },
    { kind: 'path', x: 0.8, y: 2.006, w: 4.5, h: 0.088, layer: 'behind', when: { slide: 'content' },
      fill: { color: 'F4F1E8' }, points: chalkSquiggle },
    // Encloses the rounded card and the existing unmasked rectangular images.
    { kind: 'roundRect', x: 8.2, y: 2.06, w: 4.54, h: 4.58, radius: 0.16, layer: 'front',
      when: { slide: 'content', needsVisual: true }, line: { color: 'F4F1E8', width: 2.5, dash: 'dash' } },
  ],
  shape: SAYUNA_CLASSIC.shape,
  layout: SAYUNA_CLASSIC.layout,
} as const satisfies SlideTheme;
