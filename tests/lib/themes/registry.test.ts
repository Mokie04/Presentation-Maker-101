import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, DEFAULT_THEME_ID, THEME_IDS, getTheme, isThemeId } from '@/lib/themes';
import * as legacy from '@/lib/slide-theme';
import { getFontMetrics } from '@/lib/slide-fit-metrics-registry';
import { POPPINS_METRICS } from '@/lib/slide-fit-metrics';

describe('theme registry', () => {
  it('resolves the default and validates exact IDs', () => {
    expect(DEFAULT_THEME_ID).toBe('sayuna-classic');
    expect(THEME_IDS).toEqual(['sayuna-classic', 'chalkboard', 'paper-notebook']);
    expect(getTheme()).toBe(DEFAULT_THEME);
    expect(getTheme('sayuna-classic')).toBe(DEFAULT_THEME);
    expect(getTheme('unknown')).toBe(DEFAULT_THEME);
    for (const id of THEME_IDS) expect(isThemeId(id)).toBe(true);
    for (const id of [undefined, null, 1, {}, '', 'unknown', 'SAYUNA-CLASSIC', ' sayuna-classic', 'toString', '__proto__']) expect(isThemeId(id)).toBe(false);
  });

  it('builds Classic from unchanged legacy constants, retaining layout references', () => {
    expect(DEFAULT_THEME.palette).toEqual({
      background: legacy.SHADE_BACKGROUND, primary: legacy.SHADE_PRIMARY,
      secondary: legacy.SHADE_SECONDARY, textDark: legacy.SHADE_TEXT_DARK,
      heading: legacy.TEXT_HEADING, muted: legacy.TEXT_MUTED, subtle: legacy.TEXT_SUBTLE,
      cardBackground: legacy.FALLBACK_BG, cardBorder: legacy.FALLBACK_BORDER,
    });
    expect(DEFAULT_THEME.typography).toEqual({ exportFace: legacy.DEFAULT_FONT_FACE,
      previewFont: 'var(--font-slide-poppins), system-ui, sans-serif', metricsId: 'poppins' });
    expect(DEFAULT_THEME.shape).toEqual({ visualCornerRadius: legacy.CONTENT_LAYOUT.visualCornerRadius,
      visualBorderWidth: legacy.CONTENT_LAYOUT.visualBorderWidth });
    expect(DEFAULT_THEME.layout.title).toBe(legacy.TITLE_LAYOUT);
    expect(DEFAULT_THEME.layout.content).toBe(legacy.CONTENT_LAYOUT);
    expect(DEFAULT_THEME.layout.credit).toBe(legacy.CREDIT_LAYOUT);
    expect(DEFAULT_THEME.layout.counter).toBe(legacy.SLIDE_COUNTER);
  });

  it('looks up the original Poppins metrics by metricsId and rejects unknown faces', () => {
    expect(getFontMetrics(DEFAULT_THEME.typography.metricsId)).toBe(POPPINS_METRICS);
    expect(getFontMetrics('poppins').regular.widths).toEqual(POPPINS_METRICS.regular.widths);
    expect(() => getFontMetrics('unknown')).toThrow('Unknown slide fit metrics: unknown');
    expect(() => getFontMetrics('toString')).toThrow('Unknown slide fit metrics: toString');
  });
});
