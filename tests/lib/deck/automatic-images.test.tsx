// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';

const deck = (count = 5): PresentationData => ({ subject: 'Science', topic: 'Plants', originalWriters: 'Teacher',
  slides: Array.from({ length: count }, (_, index) => ({ slideNumber: index + 1, part: 'Discussion', title: `Plant ${index}`,
    contentPoints: ['Grow'], visualDescription: `Plant ${index} diagram` })) });
let pending: { init: RequestInit; resolve: (response: Response) => void }[];
beforeEach(() => {
  pending = [];
  vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>(resolve => { pending.push({ init, resolve }); })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('loads eligible pictures individually with at most three requests in flight and exposes progress', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck()));
  expect(pending).toHaveLength(3);
  expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(Array(3).fill('/api/generate-image'));
  expect(result.current.imageProgress).toEqual({ loading: 5, done: 0, failed: 0 });
  expect(JSON.parse(String(pending[0].init.body))).toEqual({ prompt: 'Plant 0 diagram', slideIndex: 0, variation: 0 });
  await act(async () => { pending[1].resolve(Response.json({ base64: 'second' })); });
  expect(pending).toHaveLength(4);
  expect(result.current.slideImages).toEqual({ 1: 'second' });
  expect(result.current.imageProgress).toEqual({ loading: 4, done: 1, failed: 0 });
  await act(async () => { pending[0].resolve(Response.json({ error: 'unavailable' }, { status: 500 })); });
  expect(pending).toHaveLength(5);
  expect(result.current.imageProgress).toEqual({ loading: 3, done: 1, failed: 1 });
  await act(async () => { for (const request of pending.slice(2)) request.resolve(Response.json({ base64: 'image' })); });
  expect(result.current.imageProgress).toEqual({ loading: 0, done: 4, failed: 1 });
});
it('requests only automatic-picture parts with nonblank descriptions and skips an empty eligible set', () => {
  const { result } = renderHook(() => useSlideDeck());
  const presentation = deck(3);
  presentation.slides[0].part = 'Assessment'; presentation.slides[1].visualDescription = '  ';
  act(() => result.current.loadPresentation(presentation));
  expect(pending).toHaveLength(1);
  expect(JSON.parse(String(pending[0].init.body)).slideIndex).toBe(2);
  act(() => result.current.loadPresentation({ ...presentation, slides: presentation.slides.slice(0, 2) }));
  expect(pending).toHaveLength(1);
  expect(result.current.imageProgress).toEqual({ loading: 0, done: 0, failed: 0 });
});
it.each(['reset', 'unmount', 'replace'] as const)('aborts on %s, starts no queued requests and ignores late results', async action => {
  const hook = renderHook(() => useSlideDeck());
  act(() => hook.result.current.loadPresentation(deck()));
  const first = [...pending];
  act(() => {
    if (action === 'reset') hook.result.current.reset();
    else if (action === 'unmount') hook.unmount();
    else hook.result.current.loadPresentation(deck(1));
  });
  expect(first.every(request => request.init.signal?.aborted)).toBe(true);
  await act(async () => { first.forEach(request => request.resolve(Response.json({ base64: 'late' }))); });
  expect(pending).toHaveLength(action === 'replace' ? 4 : 3);
  if (action !== 'unmount') expect(hook.result.current.slideImages).toEqual({});
});
it('lets another loaded session finish in the background and counts surviving eligible slides only', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck(2), 'Session 1'));
  const deleted = result.current.slideIds[1];
  act(() => result.current.deleteSlide(deleted));
  act(() => result.current.loadPresentation(deck(1), 'Session 2'));
  expect(pending[0].init.signal?.aborted).toBe(false);
  await act(async () => { pending[0].resolve(Response.json({ base64: 'session-one' })); pending[1].resolve(Response.json({ base64: 'deleted' })); });
  expect(result.current.slideImages).toEqual({});
  act(() => result.current.switchSession('Session 1'));
  expect(result.current.slideImages).toEqual({ 0: 'session-one' });
  expect(result.current.imageProgress).toEqual({ loading: 0, done: 1, failed: 0 });
});
it('cancels a manual regeneration owned by the same load on reset', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck(1)));
  await act(async () => { pending[0].resolve(Response.json({ base64: 'first' })); });
  let regeneration!: Promise<void>;
  act(() => { regeneration = result.current.regenerateImage(result.current.slideIds[0], 'Plant'); });
  act(() => result.current.reset());
  expect(pending[1].init.signal?.aborted).toBe(true);
  await act(async () => { pending[1].resolve(Response.json({ base64: 'late' })); await regeneration; });
  expect(result.current.slideImages).toEqual({});
});
it('does not start queued work for a deleted slide, a replaced image intent or an ineligible part', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck(6)));
  const ids = result.current.slideIds;
  act(() => {
    result.current.deleteSlide(ids[3]);
    result.current.updatePart(ids[4], 'Assessment');
    result.current.selectLibraryImage(ids[5], 'manual', { source: 'nasa', nasaId: 'plant', assetUrl: 'https://images-assets.nasa.gov/plant.jpg', rendition: 'large', mimeType: 'image/jpeg' });
  });
  await act(async () => { pending[0].resolve(Response.json({ base64: 'first' })); });
  expect(pending).toHaveLength(3);
});
it('shares the three-request cap across overlapping session loads while preserving both decks', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck(3), 'Session 1'));
  const first = [...pending];
  act(() => result.current.loadPresentation(deck(2), 'Session 2'));
  expect(pending).toHaveLength(3);
  expect(first.every(request => request.init.signal?.aborted === false)).toBe(true);
  await act(async () => { first.forEach(request => request.resolve(Response.json({ base64: 'session-one' }))); });
  expect(pending).toHaveLength(5);
  expect(result.current.slideImages).toEqual({});
  await act(async () => { pending[3].resolve(Response.json({ base64: 'session-two' })); });
  expect(result.current.slideImages).toEqual({ 0: 'session-two' });
  act(() => result.current.switchSession('Session 1'));
  expect(result.current.slideImages).toEqual({ 0: 'session-one', 1: 'session-one', 2: 'session-one' });
});
it('keeps occupied slots until aborted requests settle even if fetch ignores abort', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => result.current.loadPresentation(deck(5)));
  const aborted = [...pending];
  act(() => { result.current.reset(); result.current.loadPresentation(deck(2)); });
  expect(pending).toHaveLength(3);
  await act(async () => { aborted[0].resolve(Response.json({ base64: 'late' })); });
  expect(pending).toHaveLength(4);
  expect(result.current.slideImages).toEqual({});
  await act(async () => { aborted.slice(1).forEach(request => request.resolve(Response.json({ base64: 'late' }))); });
  expect(pending).toHaveLength(5);
  expect(result.current.slideImages).toEqual({});
});
