// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title, contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};

function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

let batch: ReturnType<typeof deferred>;
let single: ReturnType<typeof deferred>;

beforeEach(() => {
  batch = deferred();
  single = deferred();
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/generate-images') return batch.promise;
    if (url === '/api/generate-image') return single.promise;
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => { vi.unstubAllGlobals(); });

function loadedDeck() {
  const hook = renderHook(() => useSlideDeck());
  act(() => hook.result.current.loadPresentation(presentation));
  return hook;
}

describe('useSlideDeck operations', () => {
  it('dispatches move, duplicate and add-after with independent copy bullet edits', () => {
    const { result } = loadedDeck();
    const [roots, leaves, flowers] = result.current.slideIds;
    act(() => result.current.moveSlide(flowers, 0));
    expect(result.current.slideIds).toEqual([flowers, roots, leaves]);
    act(() => result.current.duplicateSlide(roots));
    const copy = result.current.slideIds[2];
    expect(copy).not.toBe(roots);
    act(() => result.current.updateBullet(copy, 0, 'Independent copy'));
    expect(result.current.presentationData!.slides.map((slide) => slide.contentPoints)).toEqual([
      ['Flowers'], ['Roots'], ['Independent copy'], ['Leaves'],
    ]);
    act(() => result.current.addSlide(roots));
    expect(result.current.presentationData!.slides.map((slide) => slide.title)).toEqual([
      'Flowers', 'Roots', 'New Slide Topic', 'Roots', 'Leaves',
    ]);
    expect(result.current.presentationData!.slides.map((slide) => slide.slideNumber)).toEqual([1, 2, 3, 4, 5]);
    act(() => result.current.addSlide());
    expect(result.current.presentationData!.slides[5].title).toBe('New Slide Topic');
    act(() => result.current.addSlide(999));
    expect(result.current.presentationData!.slides[6].title).toBe('New Slide Topic');
  });

  it('retains request-time batch ownership after moving and duplicating', async () => {
    const { result } = loadedDeck();
    const [roots] = result.current.slideIds;
    act(() => {
      result.current.moveSlide(roots, 2);
      result.current.duplicateSlide(roots);
    });
    await act(async () => batch.resolve(Response.json({ images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image' } })));
    expect(result.current.slideImages).toEqual({ 0: 'leaves-image', 1: 'flowers-image', 2: 'roots-image' });
    expect(result.current.presentationData!.slides.map((slide) => slide.title)).toEqual(['Leaves', 'Flowers', 'Roots', 'Roots']);
  });

  it('resolves an original pending regeneration after moving without changing its duplicate', async () => {
    const { result } = loadedDeck();
    const [roots] = result.current.slideIds;
    let regeneration!: Promise<void>;
    act(() => { regeneration = result.current.regenerateImage(roots, 'Roots diagram'); });
    act(() => {
      result.current.duplicateSlide(roots);
      result.current.moveSlide(roots, 3);
    });
    expect(result.current.generatingImages).toEqual({ 3: true });
    await act(async () => {
      single.resolve(Response.json({ base64: 'fresh-roots', slideIndex: 0 }));
      await regeneration;
    });
    expect(result.current.slideImages).toEqual({ 3: 'fresh-roots' });
    expect(result.current.generatingImages).toEqual({});
    expect(result.current.presentationData!.slides.map((slide) => slide.title)).toEqual(['Roots', 'Leaves', 'Flowers', 'Roots']);
  });
});
