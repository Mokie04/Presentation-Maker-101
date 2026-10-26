import type { SlideData } from '@/types/presentation';
import { getFontMetrics } from './slide-fit-metrics-registry';
import { DEFAULT_THEME, type SlideTheme } from './themes';
import {
  SLIDE_WIDTH, hasVisual, slideLayoutFor,
  CONTENT_BULLET_FLOOR_PT, CONTENT_TITLE_FLOOR_PT, TITLE_SLIDE_TITLE_FLOOR_PT,
  TITLE_SLIDE_POINT_FLOOR_PT, TEXT_FIT_WIDTH_MARGIN, TEXT_FIT_HEIGHT_MARGIN,
  type SlideCoordinate,
} from './slide-theme';
import { parseFormulaToSegments } from './utils/formula-parser';

export interface FitResult {
  fontSize: number;
  fits: boolean;
  lines: number;
  lineHeightPt: number;
}
export interface FitTextOptions {
  paragraphs: string[];
  widthIn: number;
  heightIn: number;
  baseSizePt: number;
  floorPt: number;
  bold?: boolean;
  bulletIndentIn?: number;
  lineHeight: number | ((size: number) => number);
}

// pre-wrap preserves spaces and newlines. Move whole words when possible, then
// break words wider than a complete line, matching overflow-wrap: anywhere.
function wrappedLines(text: string, width: number, size: number, bold: boolean, theme: SlideTheme): number {
  const face = getFontMetrics(theme.typography.metricsId)[bold ? 'bold' : 'regular'];
  const advance = (char: string) => (face.widths[char] ?? face.fallback) * size / 1000;
  return text.split(/\r\n|\r|\n/).reduce((sum, paragraph) => {
    let lines = 1, used = 0;
    for (const token of paragraph.match(/[^\S\n]+|\S+/g) ?? []) {
      const tokenWidth = Array.from(token).reduce((n, c) => n + advance(c), 0);
      if (!/^\s+$/.test(token) && used > 0 && used + tokenWidth > width) { lines++; used = 0; }
      for (const char of token) {
        const w = advance(char);
        if (used > 0 && used + w > width) { lines++; used = 0; }
        used += w;
      }
    }
    return sum + lines;
  }, 0);
}

type ParagraphStyle = (index: number, size: number) => { size: number; bold: boolean };
function search(options: FitTextOptions, style?: ParagraphStyle, indentAtSize?: (size: number) => number, theme: SlideTheme = DEFAULT_THEME): FitResult {
  const { paragraphs, widthIn, heightIn, baseSizePt, floorPt, bold = false, bulletIndentIn = 0, lineHeight } = options;
  for (let size = baseSizePt; ; size = Math.max(floorPt, size - 1)) {
    const indent = indentAtSize?.(size) ?? bulletIndentIn;
    const width = Math.max(0, (widthIn - indent) * 72 * (1 - TEXT_FIT_WIDTH_MARGIN));
    const lineHeightPt = typeof lineHeight === 'function' ? lineHeight(size) : size * lineHeight;
    let lines = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const face = style?.(i, size) ?? { size, bold };
      lines += wrappedLines(paragraphs[i], width, face.size, face.bold, theme);
    }
    const fits = lines * lineHeightPt <= heightIn * 72 * (1 - TEXT_FIT_HEIGHT_MARGIN);
    if (fits || size <= floorPt) return { fontSize: size, fits, lines, lineHeightPt };
  }
}

export function fitText(options: FitTextOptions, theme: SlideTheme = DEFAULT_THEME): FitResult {
  return search(options, undefined, undefined, theme);
}

export function titleSlidePoints(slide: SlideData, originalWriters?: string): string[] {
  const points = [...(slide.contentPoints || [])];
  if (originalWriters && !points.some(point => /writer|author/i.test(point) || point.toLowerCase().includes(originalWriters.toLowerCase()))) {
    points.push(`Original Lesson Plan Writers: ${originalWriters}`);
  }
  return points;
}

/** Preserve the title card's mixed sizes; every point has the same 16pt floor. */
export function titlePointSize(index: number, fittedSize: number, theme: SlideTheme = DEFAULT_THEME): number {
  const TITLE_LAYOUT = theme.layout.title;
  return index === 0 ? fittedSize : Math.max(TITLE_SLIDE_POINT_FLOOR_PT, TITLE_LAYOUT.pointFontSize * fittedSize / TITLE_LAYOUT.firstPointFontSize);
}
const inches = (value: SlideCoordinate) => typeof value === 'number' ? value : parseFloat(value) * SLIDE_WIDTH / 100;
// Measure displayed formula text, conservatively using full-size glyphs for scripts.
const displayed = (text: string) => parseFormulaToSegments(text).map(segment => segment.text).join('');

export function fitSlide(slide: SlideData, index: number, originalWriters?: string, theme: SlideTheme = DEFAULT_THEME): { title: FitResult; body: FitResult } {
  const { title: TITLE_LAYOUT, content: CONTENT_LAYOUT } = theme.layout;
  const hero = slideLayoutFor(index) === 'title';
  const layout = hero ? TITLE_LAYOUT : CONTENT_LAYOUT;
  const titleBase = !hero && slide.title.length > CONTENT_LAYOUT.longTitleThreshold ? CONTENT_LAYOUT.longTitleFontSize : layout.title.fontSize;
  const title = fitText({ paragraphs: [displayed(slide.title || (hero ? 'Lesson Presentation' : ''))],
    widthIn: inches(layout.title.w), heightIn: layout.title.h, baseSizePt: titleBase,
    floorPt: hero ? TITLE_SLIDE_TITLE_FLOOR_PT : CONTENT_TITLE_FLOOR_PT, bold: true,
    lineHeight: getFontMetrics(theme.typography.metricsId).bold.lineHeight }, theme);
  if (hero) {
    const points = titleSlidePoints(slide, originalWriters);
    const body = search({ paragraphs: points.map(displayed),
      widthIn: inches(slide.imageMetadata ? TITLE_LAYOUT.pointsWithImageWidth : TITLE_LAYOUT.points.w),
      heightIn: TITLE_LAYOUT.points.h, baseSizePt: TITLE_LAYOUT.firstPointFontSize, floorPt: TITLE_SLIDE_POINT_FLOOR_PT,
      lineHeight: TITLE_LAYOUT.points.lineSpacing / TITLE_LAYOUT.firstPointFontSize,
    }, (i, size) => ({ size: titlePointSize(i, size, theme), bold: i === 0 || /writer|author/i.test(points[i]) }), undefined, theme);
    return { title, body };
  }
  return { title, body: search({ paragraphs: (slide.contentPoints || []).map(displayed),
    widthIn: inches(hasVisual(slide) ? CONTENT_LAYOUT.bulletsWithVisualWidth : CONTENT_LAYOUT.bullets.w),
    heightIn: CONTENT_LAYOUT.bullets.h, baseSizePt: CONTENT_LAYOUT.bullets.fontSize, floorPt: CONTENT_BULLET_FLOOR_PT,
    lineHeight: CONTENT_LAYOUT.bullets.lineSpacing / CONTENT_LAYOUT.bullets.fontSize,
    // EditableSlideView reserves 2em beside each bullet, even before editing.
  }, undefined, size => 2 * size / 72, theme) };
}

/** Shared overflow state for notices and both thumbnail lists. */
export function getSlideOverflow(slide: SlideData, index: number, originalWriters?: string, theme: SlideTheme = DEFAULT_THEME): { title: boolean; body: boolean; any: boolean } {
  const fit = fitSlide(slide, index, originalWriters, theme);
  const title = !fit.title.fits, body = !fit.body.fits;
  return { title, body, any: title || body };
}
