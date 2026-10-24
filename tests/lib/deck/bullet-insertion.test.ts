import { describe, expect, it } from 'vitest';
import { deckReducer, initialDeckState, toPresentationData, toSlideImages } from '@/lib/deck';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title,
    contentPoints: ['First', 'Second', 'Third'], visualDescription: `${title} diagram`,
  })),
};

function loaded() {
  return deckReducer(initialDeckState, { type: 'presentationLoaded', presentation });
}

describe('bulletInserted', () => {
  it.each([
    { name: 'start', afterIndex: -1, points: ['', 'First', 'Second', 'Third'] },
    { name: 'middle', afterIndex: 0, points: ['First', '', 'Second', 'Third'] },
    { name: 'end', afterIndex: 2, points: ['First', 'Second', 'Third', ''] },
    { name: 'negative index', afterIndex: -99, points: ['', 'First', 'Second', 'Third'] },
    { name: 'oversized index', afterIndex: 99, points: ['First', 'Second', 'Third', ''] },
  ])('inserts an empty bullet at the $name', ({ afterIndex, points }) => {
    const state = loaded();
    const next = deckReducer(state, { type: 'bulletInserted', slideId: state.slides[0].id, afterIndex });
    expect(next).toBeDefined();
    expect(next.slides[0].content.contentPoints).toEqual(points);
    expect(toPresentationData(next)!.slides[0].contentPoints).toEqual(points);
    expect(state.slides[0].content.contentPoints).toEqual(['First', 'Second', 'Third']);
  });

  it('inserts into an empty list', () => {
    const state = deckReducer(initialDeckState, {
      type: 'presentationLoaded',
      presentation: { ...presentation, slides: [{ ...presentation.slides[0], contentPoints: [] }] },
    });
    const next = deckReducer(state, { type: 'bulletInserted', slideId: state.slides[0].id, afterIndex: -1 });
    expect(next).toBeDefined();
    expect(next.slides[0].content.contentPoints).toEqual(['']);
  });

  it('returns the same state for an unknown slide id', () => {
    const state = loaded();
    expect(deckReducer(state, { type: 'bulletInserted', slideId: 999, afterIndex: 0 })).toBe(state);
  });

  it('preserves other slides, images, versions and deck metadata', () => {
    let state = loaded();
    state = deckReducer(state, {
      type: 'batchImagesResolved',
      tokens: state.slides.map((slide) => ({ slideId: slide.id, version: slide.image.version })),
      images: { 0: 'roots-image', 1: 'leaves-image' },
    });
    state = deckReducer(state, { type: 'regenerationStarted', slideId: state.slides[0].id });
    const snapshot = structuredClone(state);
    const next = deckReducer(state, { type: 'bulletInserted', slideId: state.slides[0].id, afterIndex: 0 });
    expect(next).toBeDefined();
    expect(next.slides[1]).toBe(state.slides[1]);
    expect(next.slides[0].image).toBe(state.slides[0].image);
    expect(next.slides.map((slide) => slide.image.version)).toEqual([1, 0]);
    expect(toSlideImages(next)).toEqual({ 0: 'roots-image', 1: 'leaves-image' });
    expect(next.presentation).toBe(state.presentation);
    expect(next.nextSlideId).toBe(state.nextSlideId);
    expect(state).toEqual(snapshot);
  });

  it('updates the inserted and shifted bullets using their current indexes', () => {
    const state = loaded();
    const slideId = state.slides[0].id;
    let next = deckReducer(state, { type: 'bulletInserted', slideId, afterIndex: 0 });
    expect(next).toBeDefined();
    next = deckReducer(next, { type: 'bulletUpdated', slideId, bulletIndex: 1, text: 'Inserted' });
    next = deckReducer(next, { type: 'bulletUpdated', slideId, bulletIndex: 2, text: 'Shifted second' });
    expect(next.slides[0].content.contentPoints).toEqual(['First', 'Inserted', 'Shifted second', 'Third']);
  });
});
