import type { PresentationData } from '@/types/presentation';
import { lookFixtureDeck, lookFixtureImage } from './look-render-fixtures';

export const chalkboardRenderDeck: PresentationData = {
  ...lookFixtureDeck,
  slides: [
    lookFixtureDeck.slides[0],
    lookFixtureDeck.slides[1],
    lookFixtureDeck.slides[2],
    { ...lookFixtureDeck.slides[2], slideNumber: 4, title: 'Dense observations at 24 pt', contentPoints: Array.from({ length: 10 }, (_, i) => `Observation ${i + 1}: Compare water with ice.`) },
    { ...lookFixtureDeck.slides[2], slideNumber: 5, title: 'Assessment: explain the evidence', part: 'Assessment', contentPoints: ['What changes when ice warms?', 'How can we observe a fair test?', 'Which evidence supports your answer?', 'Explain where the water goes.', 'Describe the next investigation.'] },
    { ...lookFixtureDeck.slides[2], slideNumber: 6, title: 'Investigating how growing plants use energy\nSunlight, water and evidence', contentPoints: ['Look for growing leaves', 'Explain your evidence'] },
    { ...lookFixtureDeck.slides[5], slideNumber: 7 },
  ],
};
export const chalkboardRenderImages = { 1: lookFixtureImage, 6: lookFixtureImage };
// This actual title-slide layout can fit two lines at 40 pt. The content layout
// cannot: its 1.15-inch title box correctly fits two lines at 34 pt instead.
export const chalkboardLongTitle = {
  ...lookFixtureDeck.slides[0], title: 'Growing plants and gathering evidence\nSunlight, water and evidence',
};
