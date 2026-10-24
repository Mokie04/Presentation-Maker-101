import { describe, expect, it } from 'vitest';
import { deckReducer, initialDeckState, toGeneratingFlags, toPresentationData, toSlideImages } from '@/lib/deck';
import type { DeckState, ImageToken } from '@/lib/deck';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers', 'Seeds'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title,
    contentPoints: [title, `${title} function`], visualDescription: `${title} diagram`,
  })),
};

const credit: ImageMetadata = {
  source: 'nasa', nasaId: 'plants', title: 'Seedlings', photographer: 'Jane',
  assetUrl: 'https://images-assets.nasa.gov/image/plants/plants~large.jpg', rendition: 'large', mimeType: 'image/jpeg',
};

function loaded() {
  return deckReducer(initialDeckState, { type: 'presentationLoaded', presentation });
}

function token(state: DeckState, slideId: number): ImageToken {
  return { slideId, version: state.slides.find((slide) => slide.id === slideId)!.image.version };
}

function withImages() {
  const state = loaded();
  return deckReducer(state, {
    type: 'batchImagesResolved', tokens: state.slides.map((slide) => token(state, slide.id)),
    images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image', 3: 'seeds-image' },
  });
}

function expectOrder(state: DeckState, titles: string[]) {
  const exported = toPresentationData(state)!;
  expect(state.slides.map((slide) => slide.content.title)).toEqual(titles);
  expect(state.slides.map((slide) => slide.content.slideNumber)).toEqual(titles.map((_, index) => index + 1));
  expect(exported.slides.map((slide) => slide.title)).toEqual(titles);
  expect(exported.slides.map((slide) => slide.slideNumber)).toEqual(titles.map((_, index) => index + 1));
}

describe('slideMoved', () => {
  it.each([
    { name: 'first to last', from: 0, to: 3, titles: ['Leaves', 'Flowers', 'Seeds', 'Roots'], images: { 0: 'leaves-image', 1: 'flowers-image', 2: 'seeds-image', 3: 'roots-image' } },
    { name: 'last to first', from: 3, to: 0, titles: ['Seeds', 'Roots', 'Leaves', 'Flowers'], images: { 0: 'seeds-image', 1: 'roots-image', 2: 'leaves-image', 3: 'flowers-image' } },
    { name: 'middle to middle', from: 1, to: 2, titles: ['Roots', 'Flowers', 'Leaves', 'Seeds'], images: { 0: 'roots-image', 1: 'flowers-image', 2: 'leaves-image', 3: 'seeds-image' } },
    { name: 'negative index', from: 2, to: -99, titles: ['Flowers', 'Roots', 'Leaves', 'Seeds'], images: { 0: 'flowers-image', 1: 'roots-image', 2: 'leaves-image', 3: 'seeds-image' } },
    { name: 'oversized index', from: 1, to: 99, titles: ['Roots', 'Flowers', 'Seeds', 'Leaves'], images: { 0: 'roots-image', 1: 'flowers-image', 2: 'seeds-image', 3: 'leaves-image' } },
  ])('moves $name and updates export indexes', ({ from, to, titles, images }) => {
    const state = withImages();
    const snapshot = structuredClone(state);
    const next = deckReducer(state, { type: 'slideMoved', slideId: state.slides[from].id, toIndex: to });
    expectOrder(next, titles);
    expect(toSlideImages(next)).toEqual(images);
    expect(next.nextSlideId).toBe(state.nextSlideId);
    expect(state).toEqual(snapshot);
  });

  it.each([
    { name: 'same position', slideId: 1, toIndex: 1 },
    { name: 'clamped first position', slideId: 0, toIndex: -1 },
    { name: 'clamped last position', slideId: 3, toIndex: 20 },
    { name: 'unknown id', slideId: 999, toIndex: 0 },
  ])('returns the same state for $name', ({ slideId, toIndex }) => {
    const state = loaded();
    expect(deckReducer(state, { type: 'slideMoved', slideId, toIndex })).toBe(state);
  });

  it('keeps image objects, versions, credits, pending flags and errors on their stable ids', () => {
    let state = withImages();
    state = deckReducer(state, { type: 'libraryImageSelected', slideId: 1, base64: 'library', metadata: credit });
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 1 });
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 2 });
    state = deckReducer(state, { type: 'regenerationFailed', token: token(state, 2), error: 'quota' });
    const next = deckReducer(state, { type: 'slideMoved', slideId: 1, toIndex: 3 });
    for (const slide of state.slides) {
      expect(next.slides.find((candidate) => candidate.id === slide.id)!.image).toBe(slide.image);
    }
    expect(toGeneratingFlags(next)).toEqual({ 3: true });
    expect(toPresentationData(next)!.slides[3].imageMetadata).toEqual(credit);
    expect(toSlideImages(next)).toEqual({ 0: 'roots-image', 1: 'flowers-image', 2: 'seeds-image', 3: 'data:image/jpeg;base64,library' });
    expect(next.slides[1].image.error).toBe('quota');
  });

  it('resolves a regeneration started before a move at the new position', () => {
    let state = withImages();
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 0 });
    const request = token(state, 0);
    state = deckReducer(state, { type: 'slideMoved', slideId: 0, toIndex: 3 });
    state = deckReducer(state, { type: 'regenerationResolved', token: request, base64: 'new-roots' });
    expectOrder(state, ['Leaves', 'Flowers', 'Seeds', 'Roots']);
    expect(toSlideImages(state)).toEqual({ 0: 'leaves-image', 1: 'flowers-image', 2: 'seeds-image', 3: 'new-roots' });
    expect(toGeneratingFlags(state)).toEqual({});
  });

  it('resolves a batch captured before a move by request-time ids', () => {
    let state = loaded();
    const tokens = state.slides.map((slide) => token(state, slide.id));
    state = deckReducer(state, { type: 'slideMoved', slideId: 3, toIndex: 0 });
    state = deckReducer(state, { type: 'batchImagesResolved', tokens, images: { 0: 'roots', 1: 'leaves', 2: 'flowers', 3: 'seeds' } });
    expect(toSlideImages(state)).toEqual({ 0: 'seeds', 1: 'roots', 2: 'leaves', 3: 'flowers' });
  });
});

describe('slideDuplicated', () => {
  it('allocates a fresh id after the original with independently copied content', () => {
    const state = loaded();
    const copy = deckReducer(state, { type: 'slideDuplicated', slideId: 1 });
    expect(copy.slides.map((slide) => slide.id)).toEqual([0, 1, 4, 2, 3]);
    expect(copy.nextSlideId).toBe(5);
    expectOrder(copy, ['Roots', 'Leaves', 'Leaves', 'Flowers', 'Seeds']);
    expect(copy.slides[2].content).not.toBe(copy.slides[1].content);
    expect(copy.slides[2].content.contentPoints).not.toBe(copy.slides[1].content.contentPoints);
    const edited = deckReducer(copy, { type: 'bulletUpdated', slideId: 4, bulletIndex: 0, text: 'Stomata' });
    expect(edited.slides[1].content.contentPoints).toEqual(['Leaves', 'Leaves function']);
    expect(edited.slides[2].content.contentPoints).toEqual(['Stomata', 'Leaves function']);
    expect(state).toEqual(loaded());
  });

  it('copies ready image bytes and credit, resets version and clears errors', () => {
    let state = loaded();
    state = deckReducer(state, { type: 'libraryImageSelected', slideId: 1, base64: 'library', metadata: credit });
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 1 });
    state = deckReducer(state, { type: 'regenerationFailed', token: token(state, 1), error: 'quota' });
    const next = deckReducer(state, { type: 'slideDuplicated', slideId: 1 });
    expect(next.slides[2].image).toEqual({ status: 'ready', data: 'data:image/jpeg;base64,library', metadata: credit, version: 0 });
    expect(next.slides[2].image).not.toBe(next.slides[1].image);
    expect(next.slides[1].image).toBe(state.slides[1].image);
    expect(toSlideImages(next)).toEqual({ 1: 'data:image/jpeg;base64,library', 2: 'data:image/jpeg;base64,library' });
    expect(toPresentationData(next)!.slides.map((slide) => slide.imageMetadata)).toEqual([undefined, credit, credit, undefined, undefined]);
    expectOrder(next, ['Roots', 'Leaves', 'Leaves', 'Flowers', 'Seeds']);
  });

  it.each([false, true])('never copies pending state when existing image is %s', (hasImage) => {
    let state = hasImage ? withImages() : loaded();
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 1 });
    const next = deckReducer(state, { type: 'slideDuplicated', slideId: 1 });
    expect(next.slides[2].image).toEqual(hasImage
      ? { status: 'ready', data: 'leaves-image', version: 0 }
      : { status: 'none', version: 0 });
    expect(toGeneratingFlags(next)).toEqual({ 1: true });
  });

  it('copies metadata without an image but drops failed state and error', () => {
    let state = deckReducer(initialDeckState, {
      type: 'presentationLoaded', presentation: { ...presentation, slides: [{ ...presentation.slides[0], imageMetadata: credit }] },
    });
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 0 });
    state = deckReducer(state, { type: 'regenerationFailed', token: token(state, 0), error: 'quota' });
    const next = deckReducer(state, { type: 'slideDuplicated', slideId: 0 });
    expect(next.slides[1].image).toEqual({ status: 'none', metadata: credit, version: 0 });
    expect(toSlideImages(next)).toEqual({ 0: 'failed' });
    expect(toPresentationData(next)!.slides[1].imageMetadata).toEqual(credit);
  });

  it('isolates original and copy regeneration tokens even when their versions match', () => {
    let state = loaded();
    const batchTokens = state.slides.map((slide) => token(state, slide.id));
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 1 });
    const originalToken = token(state, 1);
    state = deckReducer(state, { type: 'slideDuplicated', slideId: 1 });
    state = deckReducer(state, { type: 'regenerationStarted', slideId: 4 });
    const copyToken = token(state, 4);
    state = deckReducer(state, { type: 'regenerationResolved', token: originalToken, base64: 'original-only' });
    expect(state.slides[2].image).toMatchObject({ status: 'pending', version: 1 });
    expect(toSlideImages(state)).toEqual({ 1: 'original-only' });
    state = deckReducer(state, { type: 'regenerationResolved', token: copyToken, base64: 'copy-only' });
    expect(toSlideImages(state)).toEqual({ 1: 'original-only', 2: 'copy-only' });
    state = deckReducer(state, { type: 'batchImagesResolved', tokens: batchTokens, images: { 0: 'roots', 1: 'stale-leaves', 2: 'flowers', 3: 'seeds' } });
    expect(toSlideImages(state)).toEqual({ 0: 'roots', 1: 'original-only', 2: 'copy-only', 3: 'flowers', 4: 'seeds' });
  });

  it('does not copy a late batch image onto a duplicate with the same zero version', () => {
    let state = loaded();
    const tokens = state.slides.map((slide) => token(state, slide.id));
    state = deckReducer(state, { type: 'slideDuplicated', slideId: 1 });
    state = deckReducer(state, { type: 'batchImagesResolved', tokens, images: { 1: 'original-only' } });
    expect(toSlideImages(state)).toEqual({ 1: 'original-only' });
    state = deckReducer(state, { type: 'batchImagesResolved', tokens: [{ slideId: 4, version: 0 }], images: { 0: 'copy-only' } });
    expect(toSlideImages(state)).toEqual({ 1: 'original-only', 2: 'copy-only' });
  });

  it('returns the same state for an unknown id', () => {
    const state = loaded();
    expect(deckReducer(state, { type: 'slideDuplicated', slideId: 999 })).toBe(state);
  });
});

describe('slideAdded after a slide', () => {
  it.each([
    { name: 'middle slide', afterSlideId: 1, index: 2, titles: ['Roots', 'Leaves', 'New Slide Topic', 'Flowers', 'Seeds'], images: { 0: 'roots-image', 1: 'leaves-image', 3: 'flowers-image', 4: 'seeds-image' } },
    { name: 'last slide', afterSlideId: 3, index: 4, titles: ['Roots', 'Leaves', 'Flowers', 'Seeds', 'New Slide Topic'], images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image', 3: 'seeds-image' } },
    { name: 'unknown slide', afterSlideId: 999, index: 4, titles: ['Roots', 'Leaves', 'Flowers', 'Seeds', 'New Slide Topic'], images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image', 3: 'seeds-image' } },
    { name: 'omitted slide', afterSlideId: undefined, index: 4, titles: ['Roots', 'Leaves', 'Flowers', 'Seeds', 'New Slide Topic'], images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image', 3: 'seeds-image' } },
  ])('inserts after $name and keeps export images aligned', ({ afterSlideId, index, titles, images }) => {
    const state = withImages();
    const next = deckReducer(state, { type: 'slideAdded', afterSlideId });
    expectOrder(next, titles);
    expect(next.slides[index]).toEqual({
      id: 4,
      content: {
        slideNumber: index + 1, part: 'Discussion', title: 'New Slide Topic',
        contentPoints: ['Key takeaway for learners', 'Guided classroom discussion question'],
        visualDescription: 'Philippine classroom illustration showing interactive group discussion',
      },
      image: { status: 'none', version: 0 },
    });
    expect(next.nextSlideId).toBe(5);
    expect(toSlideImages(next)).toEqual(images);
  });

  it('does not insert before a presentation is loaded', () => {
    expect(deckReducer(initialDeckState, { type: 'slideAdded', afterSlideId: 0 })).toBe(initialDeckState);
  });
});
