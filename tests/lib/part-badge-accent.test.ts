import { expect, it } from 'vitest';
import { getPartAccentClass } from '@/components/part-badge';
it('keeps trust accents in the canonical part palette', () => {
  expect(getPartAccentClass('Review')).toBe('bg-amber-700');
  expect(getPartAccentClass('Lesson Presentation')).toBe('bg-sky-700');
  expect(getPartAccentClass('Activities')).toBe('bg-purple-600');
});
