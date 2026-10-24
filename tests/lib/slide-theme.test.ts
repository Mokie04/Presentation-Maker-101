import { describe, expect, it } from 'vitest';
import {
  slideLayoutFor, hasVisual, DEFAULT_FONT_FACE, SHADE_PRIMARY, SHADE_SECONDARY,
  SHADE_BACKGROUND, SHADE_TEXT_DARK, FALLBACK_BG, FALLBACK_BORDER,
} from '@/lib/slide-theme';

describe('slide theme', () => {
  it('uses the title layout only for the first slide', () => {
    expect(slideLayoutFor(0)).toBe('title');
    expect(slideLayoutFor(1)).toBe('content');
    expect(slideLayoutFor(27)).toBe('content');
  });

  it('requires a nonblank visual description, independent of image metadata', () => {
    expect(hasVisual({ visualDescription: '' })).toBe(false);
    expect(hasVisual({ visualDescription: '  \n ' })).toBe(false);
    expect(hasVisual({ visualDescription: 'Molecules' })).toBe(true);
  });

  it('preserves the public PPTX palette and font', () => {
    expect({ DEFAULT_FONT_FACE, SHADE_PRIMARY, SHADE_SECONDARY, SHADE_BACKGROUND,
      SHADE_TEXT_DARK, FALLBACK_BG, FALLBACK_BORDER }).toEqual({
      DEFAULT_FONT_FACE: 'Poppins', SHADE_PRIMARY: '0284C7', SHADE_SECONDARY: '06B6D4',
      SHADE_BACKGROUND: 'F0F9FF', SHADE_TEXT_DARK: '0F172A', FALLBACK_BG: 'E0F2FE', FALLBACK_BORDER: '7DD3FC',
    });
  });
});
