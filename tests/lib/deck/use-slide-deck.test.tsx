// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title,
    contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};

function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

let batch: ReturnType<typeof deferred>;
let single: ReturnType<typeof deferred>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  batch = deferred();
  single = deferred();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/generate-images') return batch.promise;
    if (url === '/api/generate-image') return single.promise;
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function loadedDeck() {
  const hook = renderHook(() => useSlideDeck());
  act(() => { hook.result.current.loadPresentation(presentation); });
  return hook;
}

describe('useSlideDeck', () => {
  it('keeps the existing image and records the error when a regeneration fails', async () => {
    const { result } = await loadedDeck();
    await act(async () => {
      batch.resolve(Response.json({ images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image' } }));
    });
    let regeneration!: Promise<void>;
    act(() => { regeneration = result.current.regenerateImage(result.current.slideIds[0], 'Roots diagram'); });
    expect(result.current.generatingImages).toEqual({ 0: true });
    await act(async () => {
      single.resolve(Response.json({ error: 'Image quota exceeded', slideIndex: 0 }, { status: 500 }));
      await regeneration;
    });
    expect(result.current.slideImages[0]).toBe('roots-image');
    expect(result.current.generatingImages).toEqual({});
    expect(result.current.imageErrors).toEqual({ 0: 'Image quota exceeded' });
    expect(consoleError).toHaveBeenCalledWith('Image regeneration failed:', expect.any(Error));
  });

  it('leaves the deck untouched when the batch request fails', async () => {
    const { result } = await loadedDeck();
    const before = result.current.presentationData;
    await act(async () => { batch.resolve(new Response('upstream exploded', { status: 500 })); });
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Batch image generation error:', expect.any(Error)));
    expect(result.current.slideImages).toEqual({});
    expect(result.current.presentationData).toBe(before);
  });

  it('drops a late regeneration for a slide deleted and replaced while in flight', async () => {
    const { result } = await loadedDeck();
    const flowers = result.current.slideIds[2];
    let regeneration!: Promise<void>;
    act(() => { regeneration = result.current.regenerateImage(flowers, 'Flowers diagram'); });
    act(() => {
      result.current.deleteSlide(flowers);
      result.current.addSlide();
    });
    await act(async () => {
      single.resolve(Response.json({ base64: 'deleted-image', slideIndex: 2 }));
      await regeneration;
    });
    expect(result.current.presentationData!.slides[2].title).toBe('New Slide Topic');
    expect(result.current.slideImages).toEqual({});
    expect(result.current.generatingImages).toEqual({});
  });

  it('targets slides by id and sends the current index with a regeneration', async () => {
    const { result } = await loadedDeck();
    const [roots, leaves, flowers] = result.current.slideIds;
    act(() => {
      result.current.deleteSlide(roots);
      result.current.updateTitle(flowers, 'Blossoms');
      result.current.updatePart(leaves, 'Assessment');
      result.current.addBullet(flowers);
      result.current.updateBullet(flowers, 1, 'Petals');
      result.current.deleteBullet(flowers, 0);
    });
    expect(result.current.presentationData!.slides.map((s) => [s.part, s.title, s.contentPoints])).toEqual([
      ['Assessment', 'Leaves', ['Leaves']],
      ['Discussion', 'Blossoms', ['Petals']],
    ]);
    act(() => { void result.current.regenerateImage(flowers, 'Blossoms diagram'); });
    const call = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/generate-image');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ prompt: 'Blossoms diagram', slideIndex: 1 });
    expect(result.current.generatingImages).toEqual({ 1: true });
  });
});
