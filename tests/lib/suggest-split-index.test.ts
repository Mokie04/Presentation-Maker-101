import { expect, it } from 'vitest';
import { fitSlide } from '@/lib/slide-fit';
import { suggestSplitIndex } from '@/lib/slide-split';
import type { SlideData } from '@/types/presentation';
const base: SlideData = { slideNumber: 2, part: 'Discussion', title: 'Water', contentPoints: [], visualDescription: 'Diagram' };
it('keeps the largest prefix whose body fits, even if the title does not', () => {
  const points: string[] = [];
  while (points.length < 30) {
    points.push('Observe the water and record evidence about the different changes in our classroom.');
    if (!fitSlide({ ...base, contentPoints: points }, 1).body.fits) break;
  }
  expect(points.length).toBeGreaterThan(2);
  const slide = { ...base, title: 'Title '.repeat(100), contentPoints: points };
  expect(suggestSplitIndex(slide, 1)).toBe(points.length - 1);
});
it('returns 1 for an impossible first bullet and null for an unsplittable slide', () => {
  expect(suggestSplitIndex({ ...base, contentPoints: ['Evidence '.repeat(1000), 'Water'] }, 1)).toBe(1);
  expect(suggestSplitIndex(base, 1)).toBeNull();
  expect(suggestSplitIndex({ ...base, contentPoints: ['Only'] }, 1)).toBeNull();
  expect(suggestSplitIndex({ ...base, contentPoints: ['One', 'Two'] }, 0, 'Teacher')).toBeNull();
});
it('always keeps a fitting prefix unless forced to keep a single impossible bullet', () => {
  for (let n = 2; n <= 20; n++) {
    const slide = { ...base, contentPoints: Array.from({ length: n }, () => 'Observe and explain the changes in water.') };
    const p = suggestSplitIndex(slide, 1)!;
    expect(p).toBeGreaterThanOrEqual(1); expect(p).toBeLessThan(n);
    if (p > 1) expect(fitSlide({ ...slide, contentPoints: slide.contentPoints.slice(0, p) }, 1).body.fits).toBe(true);
  }
});
