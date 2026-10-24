// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { deckReducer, initialDeckState } from '@/lib/deck';
import { reconcileSelection, useSlideSelection } from '@/lib/deck/use-slide-selection';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title, contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};

describe('selection after deck operations', () => {
  it('keeps selection on the moved id and selects the duplicate and inserted ids', () => {
    let state = deckReducer(initialDeckState, { type: 'presentationLoaded', presentation });
    const { result, rerender } = renderHook(({ ids }) => useSlideSelection(ids), { initialProps: { ids: [0, 1, 2] } });
    act(() => result.current.selectSlide(1));
    state = deckReducer(state, { type: 'slideMoved', slideId: 1, toIndex: 0 });
    rerender({ ids: state.slides.map((slide) => slide.id) });
    expect(result.current.selectedId).toBe(1);
    expect(reconcileSelection([0, 1, 2], [1, 0, 2], 1)).toBe(1);
    state = deckReducer(state, { type: 'slideDuplicated', slideId: 1 });
    rerender({ ids: state.slides.map((slide) => slide.id) });
    expect(result.current.selectedId).toBe(3);
    state = deckReducer(state, { type: 'slideAdded', afterSlideId: 0 });
    rerender({ ids: state.slides.map((slide) => slide.id) });
    expect(result.current.selectedId).toBe(4);
  });

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
