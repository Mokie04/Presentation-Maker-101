import { describe, expect, it } from 'vitest';
import { deckReducer, initialDeckState } from '@/lib/deck';
import { reconcileSelection } from '@/lib/deck/slide-selection';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title, contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};

describe('selection after deck operations', () => {
  it('keeps the existing load, reload and delete rules after reordering', () => {
    let state = initialDeckState;
    let previousIds: number[] = [];
    state = deckReducer(state, { type: 'presentationLoaded', presentation });
    expect(reconcileSelection(previousIds, [0, 1, 2], null)).toBe(0);
    state = deckReducer(state, { type: 'slideMoved', slideId: 2, toIndex: 0 });
    previousIds = state.slides.map((slide) => slide.id);
    state = deckReducer(state, { type: 'slideDeleted', slideId: 0 });
    expect(reconcileSelection(previousIds, state.slides.map((slide) => slide.id), 0)).toBe(1);
    previousIds = state.slides.map((slide) => slide.id);
    state = deckReducer(state, { type: 'slideDeleted', slideId: 1 });
    expect(reconcileSelection(previousIds, state.slides.map((slide) => slide.id), 1)).toBe(2);
    previousIds = state.slides.map((slide) => slide.id);
    state = deckReducer(state, { type: 'presentationLoaded', presentation: { ...presentation, slides: [presentation.slides[0]] } });
    expect(reconcileSelection(previousIds, state.slides.map((slide) => slide.id), 2)).toBe(3);
    previousIds = state.slides.map((slide) => slide.id);
    state = deckReducer(state, { type: 'slideDeleted', slideId: 3 });
    expect(reconcileSelection(previousIds, state.slides.map((slide) => slide.id), 3)).toBeNull();
  });
});
