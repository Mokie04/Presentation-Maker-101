import { describe, it, expect } from 'vitest';
import {
  buildPresentationPptx,
  SHADE_PRIMARY,
  SHADE_SECONDARY,
  SHADE_BACKGROUND,
  SHADE_TEXT_DARK,
  FALLBACK_BG,
  FALLBACK_BORDER,
} from '@/lib/services/pptx-generator';
import type { PresentationData } from '@/types/presentation';

describe('pptx-generator', () => {
  const samplePresentation: PresentationData = {
    subject: 'Science',
    originalWriters: 'Teacher Maria',
    topic: 'Solar System',
    slides: [
      {
        slideNumber: 1,
        part: 'Review',
        title: 'Planets of the Solar System',
        contentPoints: ['Mercury is closest to the Sun', 'Venus is the hottest planet'],
        visualDescription: 'Cartoon drawing of solar system with 8 planets',
      },
      {
        slideNumber: 2,
        part: 'Discussion',
        title: 'Earth and Mars Comparison',
        contentPoints: ['Earth has liquid water', 'Mars has ice caps and thin atmosphere'],
        visualDescription: 'Side by side comparison of Earth and Mars',
      },
      {
        slideNumber: 3,
        part: 'Assessment',
        title: 'Quiz Question 1',
        contentPoints: ['Which planet is known as the Red Planet?'],
        visualDescription: '', // No visual description
      },
    ],
  };

  const sampleBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  it('exports required color palette constants', () => {
    expect(SHADE_PRIMARY).toBe('0284C7');
    expect(SHADE_SECONDARY).toBe('06B6D4');
    expect(SHADE_BACKGROUND).toBe('F0F9FF');
    expect(SHADE_TEXT_DARK).toBe('0F172A');
    expect(FALLBACK_BG).toBe('E0F2FE');
    expect(FALLBACK_BORDER).toBe('7DD3FC');
  });

  it('generates a valid non-empty Buffer for presentation data', async () => {
    const buffer = await buildPresentationPptx(samplePresentation);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    // PPTX files start with PK zip signature
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it('embeds base64 image when provided and handles data URI prefix stripping', async () => {
    const slideImages: Record<number, string> = {
      0: `data:image/png;base64,${sampleBase64}`,
      1: sampleBase64,
    };

    const buffer = await buildPresentationPptx(samplePresentation, slideImages);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('uses fallback shape when image is marked as "failed"', async () => {
    const slideImages: Record<number, string> = {
      0: 'failed',
    };

    const buffer = await buildPresentationPptx(samplePresentation, slideImages);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
