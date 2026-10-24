import type { SlideData } from '@/types/presentation';

export const SHADE_PRIMARY = '0284C7';
export const SHADE_SECONDARY = '06B6D4';
export const SHADE_BACKGROUND = 'F0F9FF';
export const SHADE_TEXT_DARK = '0F172A';
export const FALLBACK_BG = 'E0F2FE';
export const FALLBACK_BORDER = '7DD3FC';
export const TEXT_HEADING = '1E293B';
export const TEXT_MUTED = '475569';
export const TEXT_SUBTLE = '94A3B8';
export const DEFAULT_FONT_FACE = 'Poppins';

// Keep percentage coordinates as percentages: PptxGenJS resolves them against LAYOUT_WIDE.
export const SLIDE_WIDTH = 13.333;
export const SLIDE_HEIGHT = 7.5;
export const SLIDE_WIDTH_PT = 960;
export type SlideCoordinate = number | `${number}%`;
export interface SlideBox {
  x: SlideCoordinate;
  y: SlideCoordinate;
  w: SlideCoordinate;
  h: SlideCoordinate;
}

export const CREDIT_LAYOUT = { x: 0.8, y: 7.15, w: 11.7, h: 0.25, fontSize: 8 } as const;
export const SLIDE_COUNTER = { x: '80%', y: 6.85, w: '16%', h: 0.35, fontSize: 11 } as const;

export const TITLE_LAYOUT = {
  part: { x: 0.8, y: 1.0, w: '85%', h: 0.45, fontSize: 16 },
  title: { x: 0.8, y: 1.55, w: '85%', h: 1.6, fontSize: 45 },
  points: { x: 0.8, y: 3.4, w: '85%', h: 2.6, lineSpacing: 34 },
  pointsWithImageWidth: '58%',
  firstPointFontSize: 28,
  pointFontSize: 22,
  image: { x: 9, y: 3.4, w: 3.5, h: 2.6 },
} as const;

export const CONTENT_LAYOUT = {
  part: { x: 0.8, y: 0.45, w: '85%', h: 0.35, fontSize: 14 },
  title: { x: 0.8, y: 0.85, w: '88%', h: 1.15, fontSize: 45 },
  longTitleFontSize: 40,
  longTitleThreshold: 35,
  bullets: { x: 0.8, y: 2.1, w: '88%', h: 4.6, lineSpacing: 46, fontSize: 35 },
  bulletsWithVisualWidth: '55%',
  visualCard: { x: '62%', y: 2.1, w: '33%', h: 4.5 },
  visualBorderWidth: 1.5,
  // Approximate DrawingML roundRect's default corner in the browser.
  visualCornerRadius: '16.6667%',
  image: { x: '62.5%', y: 2.15, w: '32%', h: 4.4 },
  // Preserve the generator's exact inch box and its legacy AI-image sizing options.
  libraryImage: { x: (40 / 3) * 0.625, y: 2.15, w: 4.2, h: 4.4 },
  imageSizing: { w: 4.2, h: 4.4 },
  placeholder: { x: '63%', y: 2.3, w: '31%', h: 4.1, fontSize: 13 },
} as const;

export function slideLayoutFor(index: number): 'title' | 'content' {
  return index === 0 ? 'title' : 'content';
}

export function hasVisual(slide: Pick<SlideData, 'visualDescription'>): boolean {
  return Boolean(slide.visualDescription && slide.visualDescription.trim().length > 0);
}
