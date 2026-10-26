import { SAYUNA_CLASSIC } from './sayuna-classic';
import type { SlideTheme } from './types';

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
  shape: SAYUNA_CLASSIC.shape,
  layout: SAYUNA_CLASSIC.layout,
} as const satisfies SlideTheme;
