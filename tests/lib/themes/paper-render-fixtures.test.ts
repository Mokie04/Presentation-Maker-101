import { expect, it } from 'vitest';
import { fitSlide } from '@/lib/slide-fit';
import { PAPER_NOTEBOOK } from '@/lib/themes/paper-notebook';
import { paperRenderDeck, paperRenderImages } from '../../helpers/paper-notebook-render-fixtures';
it('pins the eight render cases, dense 24 pt floor, five assessment bullets and two-line title', () => {
  expect(paperRenderDeck.slides).toHaveLength(8);
  const fits = paperRenderDeck.slides.map((s, i) => fitSlide(s, i, paperRenderDeck.originalWriters, PAPER_NOTEBOOK));
  expect(fits.every(f => f.title.fits && f.body.fits)).toBe(true);
  expect(fits[3].body.fontSize).toBe(24);
  expect(paperRenderDeck.slides[4].contentPoints).toHaveLength(5);
  expect(fits[5].title.lines).toBe(2);
  expect(paperRenderImages).not.toHaveProperty('7');
});
