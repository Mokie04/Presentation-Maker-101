import { SAYUNA_CLASSIC } from './sayuna-classic';
import type { SlideTheme } from './types';
import type { Decoration } from './decoration';

const ruledPaper: readonly Decoration[] = [
  ...Array.from({ length: 21 }, (_, index): Decoration => ({
    kind: 'line', x: 0.72, y: 1.05 + index * 0.28, w: 12, h: 0,
    layer: 'behind', when: { slide: 'any' }, line: { color: 'E5EDF2', width: 0.75 },
  })),
  { kind: 'line', x: 0.62, y: 0.25, w: 0, h: 6.45, layer: 'behind', when: { slide: 'any' },
    line: { color: 'D9826B', width: 1.5 } },
  ...[1.4, 3.65, 5.9].map((y): Decoration => ({
    kind: 'ellipse', x: 0.18, y, w: 0.24, h: 0.24, layer: 'behind', when: { slide: 'any' },
    fill: { color: 'E4DCC4' }, line: { color: 'CDB57A', width: 0.75 },
  })),
];

export const PAPER_NOTEBOOK = {
  id: 'paper-notebook',
  name: 'Paper Notebook',
  palette: {
    background: 'FBF6E9',
    primary: '23408F',
    secondary: 'A8431F',
    textDark: '2B2A33',
    heading: '23408F',
    muted: '5B5864',
    subtle: '6B6874',
    cardBackground: 'F3E7C8',
    cardBorder: 'CDB57A',
  },
  typography: {
    exportFace: 'Georgia',
    previewFont: "var(--font-slide-gelasio), Georgia, 'Times New Roman', serif",
    metricsId: 'gelasio',
  },
  decorations: ruledPaper,
  shape: SAYUNA_CLASSIC.shape,
  layout: SAYUNA_CLASSIC.layout,
} as const satisfies SlideTheme;
