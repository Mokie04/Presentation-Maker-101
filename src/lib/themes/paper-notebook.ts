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
  decorations: [
    ...ruledPaper,
    { kind: 'rect', x: 8.44, y: 2.2, w: 4.18, h: 4.28, rotate: 2, layer: 'behind',
      when: { slide: 'content', needsVisual: true }, fill: { color: 'FFFFFF' },
      line: { color: 'E8E0CC', width: 0.75 },
      shadow: { type: 'outer', blur: 6, offset: 2, angle: 60, color: '5B4A20', opacity: 0.18 } },
    { kind: 'rect', x: 9.85, y: 2.17, w: 1.3, h: 0.32, rotate: -4, layer: 'front',
      when: { slide: 'content', needsVisual: true }, fill: { color: 'F5D76E', transparency: 35 } },
  ],
  shape: { ...SAYUNA_CLASSIC.shape, visualCornerRadius: '0%', pictureRotation: 2 },
  layout: {
    ...SAYUNA_CLASSIC.layout,
    content: {
      ...SAYUNA_CLASSIC.layout.content,
      image: { x: '64.5%', y: 2.35, w: '29%', h: 3.7 },
      libraryImage: { x: 13.333 * 0.645, y: 2.35, w: 13.333 * 0.29, h: 3.7 },
      imageSizing: { w: 13.333 * 0.29, h: 3.7 },
      visualCard: { x: '64.5%', y: 2.35, w: '29%', h: 3.7 },
      placeholder: { x: '65.25%', y: 2.55, w: '27.5%', h: 3.3, fontSize: 13 },
    },
  },
} as const satisfies SlideTheme;
