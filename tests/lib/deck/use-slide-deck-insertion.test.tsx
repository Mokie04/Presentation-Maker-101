// @vitest-environment jsdom
import { automaticImageResponse } from '../../helpers/image-responses';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title,
    contentPoints: ['First', 'Second', 'Third'], visualDescription: `${title} diagram`,
  })),
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => { vi.unstubAllGlobals(); });

function loadedDeck() {
  const hook = renderHook(() => useSlideDeck());
  act(() => hook.result.current.loadPresentation(presentation));
  expect(hook.result.current.insertBullet).toEqual(expect.any(Function));
  return hook;
}

describe('useSlideDeck insertBullet', () => {
  it.each([
    { name: 'start', afterIndex: -1, points: ['', 'First', 'Second', 'Third'] },
    { name: 'middle', afterIndex: 0, points: ['First', '', 'Second', 'Third'] },
    { name: 'end', afterIndex: 2, points: ['First', 'Second', 'Third', ''] },
    { name: 'negative index', afterIndex: -99, points: ['', 'First', 'Second', 'Third'] },
    { name: 'oversized index', afterIndex: 99, points: ['First', 'Second', 'Third', ''] },
  ])('inserts an empty bullet at the $name', ({ afterIndex, points }) => {
    const { result } = loadedDeck();
    act(() => result.current.insertBullet(result.current.slideIds[0], afterIndex));
    expect(result.current.presentationData!.slides[0].contentPoints).toEqual(points);
    expect(result.current.presentationData!.slides[1].contentPoints).toEqual(['First', 'Second', 'Third']);
  });

  it('keeps the derived presentation and images for an unknown slide id', () => {
    const { result } = loadedDeck();
    const before = result.current;
    act(() => result.current.insertBullet(999, 0));
    expect(result.current.presentationData).toBe(before.presentationData);
    expect(result.current.slideImages).toBe(before.slideImages);
    expect(result.current.slideIds).toBe(before.slideIds);
  });

  it('updates the inserted and shifted bullets in the same event', () => {
    const { result } = loadedDeck();
    const slideId = result.current.slideIds[0];
    act(() => {
      result.current.insertBullet(slideId, 0);
      result.current.updateBullet(slideId, 1, 'Inserted');
      result.current.updateBullet(slideId, 2, 'Shifted second');
    });
    expect(result.current.presentationData!.slides[0].contentPoints).toEqual(['First', 'Inserted', 'Shifted second', 'Third']);
  });

  it('preserves images and the version of an in-flight regeneration', async () => {
    let resolveSingle!: (response: Response) => void;
    const single = new Promise<Response>((resolve) => { resolveSingle = resolve; });
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/generate-image' && JSON.parse(String(init?.body)).variation === 0) return automaticImageResponse(Promise.resolve(Response.json({ images: { 0: 'roots-image', 1: 'leaves-image' } })), init);
      if (url === '/api/generate-image') return single;
      throw new Error(`Unexpected request: ${url}`);
    }));
    const { result } = loadedDeck();
    await act(async () => {});
    let regeneration!: Promise<void>;
    act(() => { regeneration = result.current.regenerateImage(result.current.slideIds[0], 'Roots diagram'); });
    act(() => result.current.insertBullet(result.current.slideIds[0], 0));
    expect(result.current.slideImages).toEqual({ 0: 'roots-image', 1: 'leaves-image' });
    expect(result.current.generatingImages).toEqual({ 0: true });
    await act(async () => {
      resolveSingle(Response.json({ base64: 'fresh-roots' }));
      await regeneration;
    });
    expect(result.current.slideImages).toEqual({ 0: 'fresh-roots', 1: 'leaves-image' });
    expect(result.current.generatingImages).toEqual({});
  });
});
