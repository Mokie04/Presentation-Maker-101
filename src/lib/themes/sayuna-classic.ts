import {
  SHADE_BACKGROUND, SHADE_PRIMARY, SHADE_SECONDARY, SHADE_TEXT_DARK,
  TEXT_HEADING, TEXT_MUTED, TEXT_SUBTLE, FALLBACK_BG, FALLBACK_BORDER,
  DEFAULT_FONT_FACE, TITLE_LAYOUT, CONTENT_LAYOUT, CREDIT_LAYOUT, SLIDE_COUNTER,
} from '../slide-theme';
import type { SlideTheme } from './types';

export const SAYUNA_CLASSIC = {
  id: 'sayuna-classic',
  name: 'Sayuna Classic',
  palette: {
    background: SHADE_BACKGROUND, primary: SHADE_PRIMARY, secondary: SHADE_SECONDARY,
    textDark: SHADE_TEXT_DARK, heading: TEXT_HEADING, muted: TEXT_MUTED,
    subtle: TEXT_SUBTLE, cardBackground: FALLBACK_BG, cardBorder: FALLBACK_BORDER,
  },
  typography: {
    exportFace: DEFAULT_FONT_FACE,
    previewFont: 'var(--font-slide-poppins), system-ui, sans-serif',
    metricsId: 'poppins',
  },
  shape: {
    visualCornerRadius: CONTENT_LAYOUT.visualCornerRadius,
    visualBorderWidth: CONTENT_LAYOUT.visualBorderWidth,
  },
  layout: { title: TITLE_LAYOUT, content: CONTENT_LAYOUT, credit: CREDIT_LAYOUT, counter: SLIDE_COUNTER },
} as const satisfies SlideTheme;
