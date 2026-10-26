import type { SlideTheme } from './types';

function luminance(hex: string): number {
  const channels = [0, 2, 4].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

/** WCAG relative-luminance contrast for six-digit sRGB hex values without #. */
export function wcagContrast(hexA: string, hexB: string): number {
  const a = luminance(hexA), b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export interface ThemeContrastPair {
  name: string;
  foreground: string;
  background: string;
  requiredRatio: number;
}

export function themeContrastPairs(theme: SlideTheme): ThemeContrastPair[] {
  const p = theme.palette;
  return [
    { name: 'title', foreground: p.primary, background: p.background, requiredRatio: 3 },
    { name: 'part label', foreground: p.secondary, background: p.background, requiredRatio: 4.5 },
    { name: 'body', foreground: p.textDark, background: p.background, requiredRatio: 4.5 },
    { name: 'heading', foreground: p.heading, background: p.background, requiredRatio: 4.5 },
    { name: 'muted', foreground: p.muted, background: p.background, requiredRatio: 4.5 },
    { name: 'slide counter', foreground: p.subtle, background: p.background, requiredRatio: 4.5 },
    { name: 'credit line', foreground: p.muted, background: p.background, requiredRatio: 4.5 },
    { name: 'visual placeholder text', foreground: p.primary, background: p.cardBackground, requiredRatio: 4.5 },
  ];
}
