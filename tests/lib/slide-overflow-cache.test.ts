import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fitSlide, getSlideOverflow } from '@/lib/slide-fit';
import { CHALKBOARD } from '@/lib/themes/chalkboard';
import { SAYUNA_CLASSIC } from '@/lib/themes/sayuna-classic';
import type { SlideData } from '@/types/presentation';

// Every glyph-width lookup goes through this function, so counting its calls counts how much text was measured.
const measured = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@/lib/slide-fit-metrics-registry', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/slide-fit-metrics-registry')>();
  return { ...real, getFontMetrics: (id: string) => { measured.calls++; return real.getFontMetrics(id); } };
});

const slide = (over: Partial<SlideData> = {}): SlideData => ({
  slideNumber: 2, part: 'Discussion', title: 'A short title', contentPoints: ['One point', 'Another point'], visualDescription: '', ...over,
});
const dense = () => Array.from({ length: 14 }, (_, i) => `Observation ${i + 1}: compare the water with the ice and record what changes.`);
/** A fresh deck of 30 slides, each with its own bullet array (as the deck selectors produce). */
const deck = (): SlideData[] => Array.from({ length: 30 }, (_, i) => slide({ slideNumber: i + 1, contentPoints: dense() }));
const overflowAll = (slides: SlideData[], theme = SAYUNA_CLASSIC) => slides.map((item, index) => getSlideOverflow(item, index, 'Teacher', theme));

beforeEach(() => { measured.calls = 0; });

describe('slide overflow cache', () => {
  it('returns exactly what an uncached measurement returns', () => {
    const cases: Array<[SlideData, number]> = [
      [slide(), 1], [slide({ contentPoints: dense() }), 1], [slide({ title: 'T'.repeat(200) }), 1],
      [slide({ title: 'Title slide', contentPoints: ['Grade 7 Science'] }), 0], [slide({ visualDescription: 'A picture' }), 3],
    ];
    for (const [item, index] of cases) {
      const fit = fitSlide(item, index, 'Teacher', SAYUNA_CLASSIC);
      const expected = { title: !fit.title.fits, body: !fit.body.fits, any: !fit.title.fits || !fit.body.fits };
      expect(getSlideOverflow(item, index, 'Teacher', SAYUNA_CLASSIC)).toEqual(expected);
      expect(getSlideOverflow(item, index, 'Teacher', SAYUNA_CLASSIC)).toEqual(expected);
    }
  });

  it('does not measure again for slides that have not changed', () => {
    const slides = deck();
    overflowAll(slides);
    const cold = measured.calls;
    expect(cold).toBeGreaterThan(0);
    overflowAll(slides);
    overflowAll(slides);
    expect(measured.calls).toBe(cold);
  });

  it('recomputes only the edited slide when one of thirty changes', () => {
    const slides = deck();
    overflowAll(slides);
    const coldForThirty = measured.calls;
    const perSlide = coldForThirty / 30;
    measured.calls = 0;
    // Editing bullets gives that one slide a new array; the other 29 keep theirs, exactly as the selectors do.
    const edited = slides.map((item, index) => index === 7 ? { ...item, contentPoints: [...dense(), 'One more observation'] } : item);
    overflowAll(edited);
    expect(measured.calls).toBeGreaterThan(0);
    expect(measured.calls).toBeLessThan(perSlide * 2);
  });

  it('does not serve a stale result after the title, position, writers or picture presence change', () => {
    const points = ['One point'];
    const base = slide({ contentPoints: points });
    expect(getSlideOverflow(base, 1, 'Teacher', SAYUNA_CLASSIC).title).toBe(false);
    // Same bullet array, much longer title: the title result must change.
    expect(getSlideOverflow({ ...base, title: 'W'.repeat(400) }, 1, 'Teacher', SAYUNA_CLASSIC).title).toBe(true);
    // Same slide as the title slide (index 0) is a different layout and must be measured separately.
    const before = measured.calls;
    getSlideOverflow(base, 0, 'Teacher', SAYUNA_CLASSIC);
    expect(measured.calls).toBeGreaterThan(before);
    // A different writers line on the title slide is part of the measured text.
    const withLongWriters = getSlideOverflow(base, 0, 'Writer, '.repeat(120), SAYUNA_CLASSIC);
    expect(withLongWriters.body).toBe(true);
    expect(getSlideOverflow(base, 0, 'Teacher', SAYUNA_CLASSIC).body).toBe(false);
  });

  it('keeps results separate per theme', () => {
    const item = slide({ contentPoints: dense() });
    getSlideOverflow(item, 1, 'Teacher', SAYUNA_CLASSIC);
    const afterClassic = measured.calls;
    getSlideOverflow(item, 1, 'Teacher', CHALKBOARD);
    expect(measured.calls).toBeGreaterThan(afterClassic);
    const afterBoth = measured.calls;
    getSlideOverflow(item, 1, 'Teacher', CHALKBOARD);
    getSlideOverflow(item, 1, 'Teacher', SAYUNA_CLASSIC);
    expect(measured.calls).toBe(afterBoth);
  });

  it('stays correct while a title is edited many times on one slide', () => {
    const points = ['One point'];
    for (let length = 1; length <= 60; length++) {
      const item = slide({ contentPoints: points, title: 'W'.repeat(length * 8) });
      const fit = fitSlide(item, 1, undefined, SAYUNA_CLASSIC);
      expect(getSlideOverflow(item, 1, undefined, SAYUNA_CLASSIC).title).toBe(!fit.title.fits);
    }
  });

  it('measures slides without a bullet array instead of failing', () => {
    const odd = { ...slide(), contentPoints: undefined } as unknown as SlideData;
    expect(() => getSlideOverflow(odd, 1, undefined, SAYUNA_CLASSIC)).not.toThrow();
  });
});
