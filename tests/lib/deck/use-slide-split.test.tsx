// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import { reconcileSelection, useSlideSelection } from '@/lib/deck/use-slide-selection';
const presentation = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher', slides: ['Title', 'Water', 'Next'].map((title, index) => ({ slideNumber: index + 1, part: 'Discussion', title, contentPoints: Array.from({ length: 5 }, () => 'Observe the water and record evidence about the changes in our classroom.'), visualDescription: 'Water' })) };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('keeps the original selected without a transient continuation render, then selects a normal duplicate', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const seen: (number | null)[] = [];
  const { result } = renderHook(() => {
    const deck = useSlideDeck(); const selection = useSlideSelection(deck.slideIds, deck.splitSelection);
    seen.push(selection.selectedId); return { deck, selection };
  });
  act(() => result.current.deck.loadPresentation(presentation));
  act(() => result.current.selection.selectSlide(1));
  seen.length = 0;
  act(() => { expect(result.current.deck.splitSlideToFit(1)).toBe(true); });
  expect(result.current.deck.slideIds).toEqual([0, 1, 3, 2]);
  expect(result.current.selection.selectedId).toBe(1);
  expect(seen).not.toContain(3);
  expect(result.current.deck.presentationData!.slides[2].title).toBe('Water (cont.)');
  act(() => result.current.deck.duplicateSlide(1));
  expect(result.current.selection.selectedId).toBe(4);
  expect(reconcileSelection([0, 1, 2], [0, 1, 3, 2], 1, { slideId: 1, insertedId: 3 })).toBe(1);
});
it('dispatches an explicit split and keeps request-time batch and regeneration ownership', async () => {
  let batch!: (response: Response) => void, single!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn((url: string) => new Promise<Response>(resolve => { if (url === '/api/generate-images') batch = resolve; else single = resolve; })));
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(presentation));
  let pending!: Promise<void>;
  act(() => { pending = result.current.regenerateImage(1, 'Water'); });
  act(() => { expect(result.current.splitSlide(1, 2)).toBe(true); });
  expect(result.current.generatingImages).toEqual({ 1: true });
  await act(async () => { batch(Response.json({ images: { 1: 'old-water', 2: 'next' } })); });
  expect(result.current.slideImages).toEqual({ 3: 'next' });
  await act(async () => { single(Response.json({ base64: 'fresh-water' })); await pending; });
  expect(result.current.slideImages).toEqual({ 1: 'fresh-water', 3: 'next' });
  expect(result.current.presentationData!.slides[2].imageMetadata).toBeUndefined();
  act(() => {
    expect(result.current.splitSlide(999, 2)).toBe(false);
    expect(result.current.splitSlide(1, 0)).toBe(false);
    expect(result.current.splitSlideToFit(0)).toBe(false);
    expect(result.current.splitSlideToFit(999)).toBe(false);
  });
});
