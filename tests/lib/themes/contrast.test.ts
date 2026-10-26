import { describe, expect, it } from 'vitest';
import { THEME_IDS, getTheme } from '@/lib/themes';
import { themeContrastPairs, wcagContrast } from '@/lib/themes/contrast';

// Product decision: preserve Classic's existing appearance/export bytes in Phase 1.
// Exact pairs only; fixing one must remove its exception, and new failures cannot hide.
const KNOWN_EXCEPTIONS = [
  { theme: 'sayuna-classic', name: 'part label', foreground: '06B6D4', background: 'F0F9FF', requiredRatio: 4.5 },
  { theme: 'sayuna-classic', name: 'slide counter', foreground: '94A3B8', background: 'F0F9FF', requiredRatio: 4.5 },
  { theme: 'sayuna-classic', name: 'visual placeholder text', foreground: '0284C7', background: 'E0F2FE', requiredRatio: 4.5 },
];

function failingPairs() {
  return THEME_IDS.flatMap(id => themeContrastPairs(getTheme(id))
    .filter(pair => wcagContrast(pair.foreground, pair.background) < pair.requiredRatio)
    .map(pair => ({ theme: id, ...pair })));
}

describe('WCAG theme contrast', () => {
  it('computes sRGB luminance including the low-intensity branch', () => {
    expect(wcagContrast('000000', 'FFFFFF')).toBe(21);
    expect(wcagContrast('123456', '123456')).toBe(1);
    expect(wcagContrast('FFFFFF', '000000')).toBe(21);
    expect(wcagContrast('0A0A0A', '000000')).toBeCloseTo(1.0607, 4);
    expect(wcagContrast('06B6D4', 'F0F9FF')).toBeCloseTo(2.28, 2);
    expect(wcagContrast('94A3B8', 'F0F9FF')).toBeCloseTo(2.41, 2);
    expect(wcagContrast('0284C7', 'E0F2FE')).toBeCloseTo(3.57, 2);
  });

  it('reports all eight text uses, with only the title treated as large text', () => {
    expect(themeContrastPairs(getTheme()).map(p => [p.name, p.requiredRatio])).toEqual([
      ['title', 3], ['part label', 4.5], ['body', 4.5], ['heading', 4.5],
      ['muted', 4.5], ['slide counter', 4.5], ['credit line', 4.5], ['visual placeholder text', 4.5],
    ]);
  });

  it('allows exactly the pinned failures: no new failures and no stale passing exceptions', () => {
    expect(failingPairs()).toEqual(KNOWN_EXCEPTIONS);
  });
});
