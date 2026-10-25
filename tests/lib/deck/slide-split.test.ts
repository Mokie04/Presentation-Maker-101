import { describe, expect, it } from 'vitest';
import { deckReducer, initialDeckState, toPresentationData, toSlideImages } from '@/lib/deck';
import { continuationTitle } from '@/lib/deck/slide-split';
import { samples } from '../services/credit-samples';
const points = ['Observe', 'Compare', 'Explain', 'Record'];
function loaded() {
  return deckReducer(initialDeckState, { type: 'presentationLoaded', presentation: {
    subject: 'Science', topic: 'Water', originalWriters: 'Teacher',
    slides: ['Title', 'Water', 'Next'].map((title, i) => ({ slideNumber: i + 1, part: 'Discussion', title,
      contentPoints: [...points], visualDescription: 'Water', ...(i === 1 && { imageMetadata: samples.commonsFull }) })),
  } });
}
describe('slideSplit', () => {
  it.each([1, 2, 3])('splits at %i, preserving image ownership and renumbering selectors', atBulletIndex => {
    let state = loaded();
    state = deckReducer(state, { type: 'batchImagesResolved', tokens: [{ slideId: 1, version: 0 }, { slideId: 2, version: 0 }], images: { 0: 'original', 1: 'next' } });
    const snapshot = structuredClone(state);
    const next = deckReducer(state, { type: 'slideSplit', slideId: 1, atBulletIndex });
    expect(next.slides.map(s => s.id)).toEqual([0, 1, 3, 2]);
    expect(next.nextSlideId).toBe(4);
    expect(next.slides[1].content.contentPoints).toEqual(points.slice(0, atBulletIndex));
    expect(next.slides[1].image).toBe(state.slides[1].image);
    expect(next.slides[2]).toEqual({ id: 3, content: { slideNumber: 3, part: 'Discussion', title: 'Water (cont.)', contentPoints: points.slice(atBulletIndex), visualDescription: '' }, image: { status: 'none', version: 0 } });
    expect(toPresentationData(next)!.slides.map(s => s.slideNumber)).toEqual([1, 2, 3, 4]);
    expect(toPresentationData(next)!.slides[1].imageMetadata).toEqual(samples.commonsFull);
    expect(toPresentationData(next)!.slides[2].imageMetadata).toBeUndefined();
    expect(toSlideImages(next)).toEqual({ 1: 'original', 3: 'next' });
    expect(state).toEqual(snapshot);
  });
  it.each(['pending', 'failed'] as const)('retains the complete original %s image object', status => {
    const state = loaded();
    state.slides[1].image = { ...state.slides[1].image, status, version: 8, data: 'retained', error: 'quota' };
    const next = deckReducer(state, { type: 'slideSplit', slideId: 1, atBulletIndex: 2 });
    expect(next.slides[1].image).toBe(state.slides[1].image);
    expect(next.slides[2].image).toEqual({ status: 'none', version: 0 });
  });
  it('keeps pre-split regeneration and batch results on the original id', () => {
    let state = loaded();
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 1 });
    state = deckReducer(state, { type: 'slideSplit', slideId: 1, atBulletIndex: 2 });
    state = deckReducer(state, { type: 'regenerationResolved', token: { slideId: 1, version: 1 }, base64: 'fresh' });
    expect(toSlideImages(state)).toEqual({ 1: 'fresh' });
    expect(state.slides[2].image).toEqual({ status: 'none', version: 0 });
    state = deckReducer(state, { type: 'batchImagesResolved', tokens: [{ slideId: 1, version: 1 }, { slideId: 2, version: 0 }], images: { 0: 'batch-original', 1: 'batch-next' } });
    expect(toSlideImages(state)).toEqual({ 1: 'batch-original', 3: 'batch-next' });
    expect(state.slides[2].image).toEqual({ status: 'none', version: 0 });
  });
  it.each([0, 4, -1, 99, 1.5, NaN])('returns the same state for invalid boundary %s', atBulletIndex => {
    const state = loaded();
    expect(deckReducer(state, { type: 'slideSplit', slideId: 1, atBulletIndex })).toBe(state);
  });
  it.each([{ contentPoints: [] }, { contentPoints: ['Only'] }])('does not split fewer than two bullets: $contentPoints', ({ contentPoints }) => {
    const state = loaded(); state.slides[1].content.contentPoints = contentPoints;
    expect(deckReducer(state, { type: 'slideSplit', slideId: 1, atBulletIndex: 1 })).toBe(state);
  });
  it('ignores an unknown id', () => {
    const state = loaded();
    expect(deckReducer(state, { type: 'slideSplit', slideId: 999, atBulletIndex: 1 })).toBe(state);
  });
});
it.each([
  ['Title', 'Title (cont.)'], ['Title (cont.)', 'Title (cont. 2)'], ['Title (cont. 2)', 'Title (cont. 3)'],
  ['Title (cont. 9)', 'Title (cont. 10)'], ['  Title   (cont. 2)  ', 'Title (cont. 3)'], ['  Title  ', 'Title (cont.)'], ['', ''], ['   ', ''], ['(cont. 9)', '(cont. 10)'],
])('continuationTitle(%j) -> %j', (title, expected) => expect(continuationTitle(title)).toBe(expected));
