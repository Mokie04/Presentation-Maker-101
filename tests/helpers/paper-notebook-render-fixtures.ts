import { chalkboardRenderDeck, chalkboardRenderImages } from './chalkboard-render-fixtures';
import type { PresentationData } from '@/types/presentation';

export const paperRenderDeck: PresentationData = {
  ...chalkboardRenderDeck,
  slides: [...chalkboardRenderDeck.slides.slice(0, 5),
    { ...chalkboardRenderDeck.slides[5], title: 'Growing plants and gathering evidence\nSunlight, water and evidence' },
    chalkboardRenderDeck.slides[6],
    { ...chalkboardRenderDeck.slides[1], slideNumber: 8, title: 'Missing picture placeholder', visualDescription: 'Water changes between ice, liquid and vapour. Compare the evidence.' },
  ],
};
export const paperRenderImages = { ...chalkboardRenderImages };
