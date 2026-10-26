import { SAYUNA_CLASSIC } from './sayuna-classic';
import type { SlideTheme } from './types';

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
  shape: SAYUNA_CLASSIC.shape,
  layout: SAYUNA_CLASSIC.layout,
} as const satisfies SlideTheme;
