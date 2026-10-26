// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';
const presentation: PresentationData = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves'].map((title, index) => ({ slideNumber: index + 1, title, part: 'Discussion', contentPoints: [title], visualDescription: `${title} diagram` })) };
function deferred() {
  let resolve!: (response: Response) => void;
  return { promise: new Promise<Response>(done => { resolve = done; }), resolve: (response: Response) => resolve(response) };
}
let batches: ReturnType<typeof deferred>[];
let singles: ReturnType<typeof deferred>[];
beforeEach(() => {
  batches = []; singles = [];
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const response = deferred();
    if (url === '/api/generate-images') batches.push(response);
    else if (url === '/api/generate-image') singles.push(response);
    else throw new Error(`Unexpected request ${url}`);
    return response.promise;
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });
it('routes real batch and regeneration requests to Session 1 while Session 2 is active', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => { result.current.loadPresentation(presentation, 'Session 1'); });
  const leaves = result.current.slideIds[1];
  let pending!: Promise<void>;
  act(() => { pending = result.current.regenerateImage(leaves, 'Leaves diagram'); });
  act(() => { result.current.loadPresentation(presentation, 'Session 2'); });
  await act(async () => {
    batches[0].resolve(Response.json({ images: { 0: 'roots-image', 1: 'outdated-leaves' } }));
    singles[0].resolve(Response.json({ base64: 'new-leaves' }));
    await pending;
  });
  expect(result.current.slideImages).toEqual({});
  act(() => { result.current.switchSession('Session 1'); });
  expect(result.current.slideImages).toEqual({ 0: 'roots-image', 1: 'new-leaves' });
  act(() => { result.current.switchSession('Session 2'); });
  expect(result.current.slideImages).toEqual({});
});
it('drops old batch and regeneration results after replacing a session, then accepts its new batch', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => { result.current.loadPresentation(presentation, 'Session 1'); });
  let pending!: Promise<void>;
  act(() => { pending = result.current.regenerateImage(result.current.slideIds[0], 'Roots diagram'); });
  act(() => { result.current.loadPresentation(presentation, 'Session 2'); });
  act(() => { result.current.loadPresentation(presentation, 'Session 1'); });
  expect(result.current.slideIds).toEqual([4, 5]);
  await act(async () => {
    batches[0].resolve(Response.json({ images: { 0: 'late-batch' } }));
    singles[0].resolve(Response.json({ base64: 'late-regeneration' }));
    await pending;
  });
  expect(result.current.slideImages).toEqual({});
  await act(async () => { batches[2].resolve(Response.json({ images: { 0: 'new-batch' } })); });
  expect(result.current.slideImages).toEqual({ 0: 'new-batch' });
});
it('keeps the newest regeneration version when requests finish in reverse order across a switch', async () => {
  const { result } = renderHook(() => useSlideDeck());
  act(() => { result.current.loadPresentation(presentation, 'Session 1'); });
  const roots = result.current.slideIds[0];
  let older!: Promise<void>; let newer!: Promise<void>;
  act(() => { older = result.current.regenerateImage(roots, 'old'); newer = result.current.regenerateImage(roots, 'new'); });
  act(() => { result.current.loadPresentation(presentation, 'Session 2'); });
  await act(async () => { singles[1].resolve(Response.json({ base64: 'new' })); await newer; });
  await act(async () => { singles[0].resolve(Response.json({ base64: 'old' })); await older; });
  act(() => { result.current.switchSession('Session 1'); });
  expect(result.current.slideImages).toEqual({ 0: 'new' });
  expect(result.current.generatingImages).toEqual({});
});
