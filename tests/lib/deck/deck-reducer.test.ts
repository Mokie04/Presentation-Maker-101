import { describe, expect, it } from 'vitest';
import {
  deckReducer,
  initialDeckState,
  toGeneratingFlags,
  toPresentationData,
  toSlideImages,
  type DeckAction,
  type DeckState,
  type ImageToken,
} from '@/lib/deck';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title,
    contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};

const nasa: ImageMetadata = {
  source: 'nasa', nasaId: 'roots', title: 'Seedlings', photographer: 'Jane',
  assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.jpg', rendition: 'large', mimeType: 'image/jpeg',
};

function run(state: DeckState, ...actions: DeckAction[]): DeckState {
  return actions.reduce(deckReducer, state);
}

function loaded(): DeckState {
  return run(initialDeckState, { type: 'presentationLoaded', presentation });
}

function ids(state: DeckState): number[] {
  return state.slides.map((slide) => slide.id);
}

function token(state: DeckState, slideId: number): ImageToken {
  const slide = state.slides.find((s) => s.id === slideId)!;
  return { slideId, version: slide.image.version };
}

function batchTokens(state: DeckState): ImageToken[] {
  return state.slides.map((slide) => token(state, slide.id));
}

const batchImages = { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image' };

describe('deck loading', () => {
  it('derives the original presentation and no images after loading', () => {
    const state = loaded();
    expect(toPresentationData(state)).toEqual(presentation);
    expect(toSlideImages(state)).toEqual({});
    expect(toGeneratingFlags(state)).toEqual({});
  });

  it('returns null presentation data before loading and after reset', () => {
    expect(toPresentationData(initialDeckState)).toBeNull();
    expect(toPresentationData(run(loaded(), { type: 'reset' }))).toBeNull();
  });

  it('keeps imageMetadata from loaded slides attached on export', () => {
    const withCredit = { ...presentation, slides: presentation.slides.map((s, i) => i === 1 ? { ...s, imageMetadata: nasa } : s) };
    const state = run(initialDeckState, { type: 'presentationLoaded', presentation: withCredit });
    expect(toPresentationData(state)).toEqual(withCredit);
  });

  it('never reuses slide ids across loads and resets', () => {
    const first = loaded();
    const second = run(first, { type: 'reset' }, { type: 'presentationLoaded', presentation });
    expect(ids(second).some((id) => ids(first).includes(id))).toBe(false);
  });
});

describe('batch images', () => {
  it('attaches batch results by request position', () => {
    const state = loaded();
    const next = run(state, { type: 'batchImagesResolved', tokens: batchTokens(state), images: batchImages });
    expect(toSlideImages(next)).toEqual(batchImages);
  });

  it('keeps the failed sentinel from the batch and skips slides the batch left out', () => {
    const state = loaded();
    const next = run(state, { type: 'batchImagesResolved', tokens: batchTokens(state), images: { 0: 'roots-image', 2: 'failed' } });
    expect(toSlideImages(next)).toEqual({ 0: 'roots-image', 2: 'failed' });
  });

  it('attaches a batch that resolves after a delete to the remaining slides', () => {
    const state = loaded();
    const tokens = batchTokens(state);
    const next = run(state,
      { type: 'slideDeleted', slideId: ids(state)[1] },
      { type: 'batchImagesResolved', tokens, images: batchImages });
    expect(toSlideImages(next)).toEqual({ 0: 'roots-image', 1: 'flowers-image' });
  });

  it('does not overwrite a newer regeneration with a late batch', () => {
    const state = loaded();
    const tokens = batchTokens(state);
    const [roots] = ids(state);
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    const regen = token(next, roots);
    next = run(next,
      { type: 'regenerationResolved', token: regen, base64: 'new-roots' },
      { type: 'batchImagesResolved', tokens, images: batchImages });
    expect(toSlideImages(next)[0]).toBe('new-roots');
  });

  it('does not overwrite a library selection with a late batch', () => {
    const state = loaded();
    const tokens = batchTokens(state);
    const next = run(state,
      { type: 'libraryImageSelected', slideId: ids(state)[0], base64: '/9j/2Q==', metadata: nasa },
      { type: 'batchImagesResolved', tokens, images: { 0: 'late-ai' } });
    expect(toSlideImages(next)[0]).toBe('data:image/jpeg;base64,/9j/2Q==');
    expect(toPresentationData(next)!.slides[0].imageMetadata).toEqual(nasa);
  });

  it('drops a batch that resolves after reset and a new load', () => {
    const state = loaded();
    const tokens = batchTokens(state);
    const next = run(state,
      { type: 'reset' },
      { type: 'presentationLoaded', presentation },
      { type: 'batchImagesResolved', tokens, images: batchImages });
    expect(toSlideImages(next)).toEqual({});
  });
});

describe('single regeneration', () => {
  function withBatch(): DeckState {
    const state = loaded();
    return run(state, { type: 'batchImagesResolved', tokens: batchTokens(state), images: batchImages });
  }

  it('flags the slide as generating until it resolves', () => {
    const state = withBatch();
    const flowers = ids(state)[2];
    const started = run(state, { type: 'regenerationStarted', slideId: flowers });
    expect(toGeneratingFlags(started)).toEqual({ 2: true });
    expect(toSlideImages(started)[2]).toBe('flowers-image');
    const done = run(started, { type: 'regenerationResolved', token: token(started, flowers), base64: 'new-flowers' });
    expect(toGeneratingFlags(done)).toEqual({});
    expect(toSlideImages(done)[2]).toBe('new-flowers');
  });

  it('keeps an in-flight regeneration and its flag on the shifted slide after a delete', () => {
    const state = withBatch();
    const [, leaves, flowers] = ids(state);
    let next = run(state, { type: 'regenerationStarted', slideId: flowers });
    const regen = token(next, flowers);
    next = run(next, { type: 'slideDeleted', slideId: leaves });
    expect(toGeneratingFlags(next)).toEqual({ 1: true });
    next = run(next, { type: 'regenerationResolved', token: regen, base64: 'new-flowers' });
    expect(toSlideImages(next)).toEqual({ 0: 'roots-image', 1: 'new-flowers' });
    expect(toGeneratingFlags(next)).toEqual({});
  });

  it('drops a regeneration for a deleted slide even when a new slide takes its index', () => {
    const state = withBatch();
    const flowers = ids(state)[2];
    let next = run(state, { type: 'regenerationStarted', slideId: flowers });
    const regen = token(next, flowers);
    next = run(next,
      { type: 'slideDeleted', slideId: flowers },
      { type: 'slideAdded' },
      { type: 'regenerationResolved', token: regen, base64: 'deleted-image' });
    expect(toSlideImages(next)).toEqual({ 0: 'roots-image', 1: 'leaves-image' });
    expect(toGeneratingFlags(next)).toEqual({});
  });

  it('lets a newer regeneration supersede an older one on the same slide', () => {
    const state = withBatch();
    const roots = ids(state)[0];
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    const first = token(next, roots);
    next = run(next, { type: 'regenerationStarted', slideId: roots });
    const second = token(next, roots);
    next = run(next, { type: 'regenerationResolved', token: first, base64: 'stale' });
    expect(toSlideImages(next)[0]).toBe('roots-image');
    expect(toGeneratingFlags(next)).toEqual({ 0: true });
    next = run(next, { type: 'regenerationResolved', token: second, base64: 'fresh' });
    expect(toSlideImages(next)[0]).toBe('fresh');
    expect(toGeneratingFlags(next)).toEqual({});
  });

  it('ignores a late AI result after a library selection on the same slide', () => {
    const state = withBatch();
    const roots = ids(state)[0];
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    const regen = token(next, roots);
    next = run(next,
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa },
      { type: 'regenerationResolved', token: regen, base64: 'late-single-ai' });
    expect(toSlideImages(next)[0]).toBe('data:image/jpeg;base64,/9j/2Q==');
    expect(toPresentationData(next)!.slides[0].imageMetadata).toEqual(nasa);
    expect(toGeneratingFlags(next)).toEqual({});
  });

  it('clears the credit when an AI replacement resolves', () => {
    const state = withBatch();
    const roots = ids(state)[0];
    let next = run(state,
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa },
      { type: 'regenerationStarted', slideId: roots });
    expect(toPresentationData(next)!.slides[0].imageMetadata).toEqual(nasa);
    next = run(next, { type: 'regenerationResolved', token: token(next, roots), base64: 'new-ai' });
    expect(toSlideImages(next)[0]).toBe('new-ai');
    expect(toPresentationData(next)!.slides[0].imageMetadata).toBeUndefined();
  });

  it('keeps the previous image and credit when a regeneration fails, with a transient error', () => {
    const state = withBatch();
    const [roots, leaves] = ids(state);
    let next = run(state,
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa },
      { type: 'regenerationStarted', slideId: roots },
      { type: 'regenerationStarted', slideId: leaves });
    next = run(next,
      { type: 'regenerationFailed', token: token(next, roots), error: 'quota' },
      { type: 'regenerationFailed', token: token(next, leaves), error: 'timeout' });
    expect(toSlideImages(next)).toEqual({ 0: 'data:image/jpeg;base64,/9j/2Q==', 1: 'leaves-image', 2: 'flowers-image' });
    expect(toPresentationData(next)!.slides[0].imageMetadata).toEqual(nasa);
    expect(toGeneratingFlags(next)).toEqual({});
    expect(next.slides.map((s) => s.image.status)).toEqual(['ready', 'ready', 'ready']);
    expect(next.slides.map((s) => s.image.error)).toEqual(['quota', 'timeout', undefined]);
  });

  it('marks a slide with no image as failed when its regeneration fails', () => {
    const state = loaded();
    const roots = ids(state)[0];
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    next = run(next, { type: 'regenerationFailed', token: token(next, roots), error: 'quota' });
    expect(toSlideImages(next)).toEqual({ 0: 'failed' });
    expect(next.slides[0].image).toMatchObject({ status: 'failed', error: 'quota' });
  });

  it('clears the transient error when a new intent starts', () => {
    const state = withBatch();
    const roots = ids(state)[0];
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    next = run(next, { type: 'regenerationFailed', token: token(next, roots), error: 'quota' });
    expect(run(next, { type: 'regenerationStarted', slideId: roots }).slides[0].image.error).toBeUndefined();
    expect(run(next, { type: 'libraryImageSelected', slideId: roots, base64: 'x', metadata: nasa }).slides[0].image.error).toBeUndefined();
  });

  it('ignores a superseded failure', () => {
    const state = withBatch();
    const roots = ids(state)[0];
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    const stale = token(next, roots);
    next = run(next,
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa },
      { type: 'regenerationFailed', token: stale, error: 'quota' });
    expect(next.slides[0].image.status).toBe('ready');
    expect(next.slides[0].image.error).toBeUndefined();
  });

  it('drops a regeneration result after reset', () => {
    const state = withBatch();
    const roots = ids(state)[0];
    let next = run(state, { type: 'regenerationStarted', slideId: roots });
    const regen = token(next, roots);
    next = run(next, { type: 'reset' }, { type: 'regenerationResolved', token: regen, base64: 'late' });
    expect(next).toEqual(run(withBatch(), { type: 'reset' }));
  });
});

describe('library selection', () => {
  it('stores the image as a data URL with its credit on the stable slide after a delete', () => {
    const state = loaded();
    const [, leaves, flowers] = ids(state);
    const next = run(state,
      { type: 'slideDeleted', slideId: leaves },
      { type: 'libraryImageSelected', slideId: flowers, base64: '/9j/2Q==', metadata: nasa });
    expect(toSlideImages(next)).toEqual({ 1: 'data:image/jpeg;base64,/9j/2Q==' });
    const exported = toPresentationData(next)!;
    expect(exported.slides[0].imageMetadata).toBeUndefined();
    expect(exported.slides[1].imageMetadata).toEqual(nasa);
  });

  it('ignores a selection for a deleted slide even when a new slide takes its index', () => {
    const state = loaded();
    const flowers = ids(state)[2];
    const next = run(state,
      { type: 'slideDeleted', slideId: flowers },
      { type: 'slideAdded' },
      { type: 'libraryImageSelected', slideId: flowers, base64: '/9j/2Q==', metadata: nasa });
    expect(toSlideImages(next)).toEqual({});
    expect(toPresentationData(next)!.slides.every((s) => !s.imageMetadata)).toBe(true);
  });

  it('ignores a selection after reset and a new load', () => {
    const state = loaded();
    const roots = ids(state)[0];
    const next = run(state,
      { type: 'reset' },
      { type: 'presentationLoaded', presentation },
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa });
    expect(toSlideImages(next)).toEqual({});
  });
});

describe('add and delete slides', () => {
  it('renumbers slideNumber and keeps images, credits and pending flags on their slides', () => {
    const state = loaded();
    const [roots, leaves, flowers] = ids(state);
    let next = run(state,
      { type: 'batchImagesResolved', tokens: batchTokens(state), images: batchImages },
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa },
      { type: 'regenerationStarted', slideId: flowers });
    next = run(next, { type: 'slideDeleted', slideId: leaves });
    const exported = toPresentationData(next)!;
    expect(exported.slides.map((s) => [s.slideNumber, s.title])).toEqual([[1, 'Roots'], [2, 'Flowers']]);
    expect(exported.slides[0].imageMetadata).toEqual(nasa);
    expect(toSlideImages(next)).toEqual({ 0: 'data:image/jpeg;base64,/9j/2Q==', 1: 'flowers-image' });
    expect(toGeneratingFlags(next)).toEqual({ 1: true });
  });

  it.each([0, 2])('preserves the other images when deleting slide %i', (index) => {
    const state = loaded();
    const next = run(state,
      { type: 'batchImagesResolved', tokens: batchTokens(state), images: batchImages },
      { type: 'slideDeleted', slideId: ids(state)[index] });
    const remaining = Object.values(batchImages).filter((_, i) => i !== index);
    expect(toSlideImages(next)).toEqual({ 0: remaining[0], 1: remaining[1] });
  });

  it('appends a default slide with no image and the next slideNumber', () => {
    const state = loaded();
    const next = run(state,
      { type: 'batchImagesResolved', tokens: batchTokens(state), images: batchImages },
      { type: 'slideAdded' });
    expect(toPresentationData(next)!.slides[3]).toEqual({
      slideNumber: 4,
      part: 'Discussion',
      title: 'New Slide Topic',
      contentPoints: ['Key takeaway for learners', 'Guided classroom discussion question'],
      visualDescription: 'Philippine classroom illustration showing interactive group discussion',
    });
    expect(toSlideImages(next)[3]).toBeUndefined();
    expect(new Set(ids(next)).size).toBe(4);
  });

  it('ignores deck edits before a presentation is loaded', () => {
    expect(run(initialDeckState, { type: 'slideAdded' })).toEqual(initialDeckState);
  });
});

describe('content edits', () => {
  it('updates part, title and bullets on the targeted slide only', () => {
    const state = loaded();
    const leaves = ids(state)[1];
    const next = run(state,
      { type: 'partUpdated', slideId: leaves, part: 'Assessment' },
      { type: 'titleUpdated', slideId: leaves, title: 'Leaf anatomy' },
      { type: 'bulletUpdated', slideId: leaves, bulletIndex: 0, text: 'Stomata' },
      { type: 'bulletAdded', slideId: leaves },
      { type: 'bulletAdded', slideId: leaves },
      { type: 'bulletDeleted', slideId: leaves, bulletIndex: 1 });
    const slides = toPresentationData(next)!.slides;
    expect(slides[1]).toMatchObject({
      part: 'Assessment', title: 'Leaf anatomy',
      contentPoints: ['Stomata', 'New primary discussion point'],
    });
    expect(slides[0]).toEqual(presentation.slides[0]);
    expect(slides[2]).toEqual(presentation.slides[2]);
  });

  it('keeps the image and credit when content is edited', () => {
    const state = loaded();
    const roots = ids(state)[0];
    const next = run(state,
      { type: 'libraryImageSelected', slideId: roots, base64: '/9j/2Q==', metadata: nasa },
      { type: 'titleUpdated', slideId: roots, title: 'Root hairs' });
    expect(toSlideImages(next)[0]).toBe('data:image/jpeg;base64,/9j/2Q==');
    expect(toPresentationData(next)!.slides[0]).toMatchObject({ title: 'Root hairs', imageMetadata: nasa });
  });

  it('does not mutate the previous state', () => {
    const state = loaded();
    const snapshot = structuredClone(state);
    run(state,
      { type: 'titleUpdated', slideId: ids(state)[0], title: 'Changed' },
      { type: 'bulletAdded', slideId: ids(state)[0] },
      { type: 'slideDeleted', slideId: ids(state)[1] });
    expect(state).toEqual(snapshot);
  });
});
