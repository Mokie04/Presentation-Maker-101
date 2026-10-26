import { expect, it } from 'vitest';
import { fitSlide } from '@/lib/slide-fit';
import { CHALKBOARD } from '@/lib/themes/chalkboard';
import { chalkboardRenderDeck, chalkboardLongTitle } from '../../helpers/chalkboard-render-fixtures';
it('pins dense-floor, five-bullet assessment and two-line 40 pt rendering cases without changing fit', () => {
  expect(fitSlide(chalkboardRenderDeck.slides[3], 3, chalkboardRenderDeck.originalWriters, CHALKBOARD).body).toMatchObject({ fontSize: 24, fits: true });
  expect(chalkboardRenderDeck.slides[4].contentPoints).toHaveLength(5);
  expect(fitSlide(chalkboardLongTitle, 0, chalkboardRenderDeck.originalWriters, CHALKBOARD).title).toMatchObject({ fontSize: 40, lines: 2, fits: true });
  expect(fitSlide(chalkboardRenderDeck.slides[5], 5, chalkboardRenderDeck.originalWriters, CHALKBOARD).title).toMatchObject({ fontSize: 34, lines: 2, fits: true });
});
