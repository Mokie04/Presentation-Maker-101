// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('omits blank visual slides from the client batch without shifting indexes or result ownership', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(Response.json({ images: { 1: 'water', 3: 'class' } }))));
  const { result } = renderHook(() => useSlideDeck());
  await act(async () => { result.current.loadPresentation({ subject: 'Science', topic: 'Water', originalWriters: 'Teacher',
    slides: ['', 'Water diagram', ' \n ', 'Class activity'].map((visualDescription, i) => ({ slideNumber: i + 1, part: 'Discussion', title: 'Water', contentPoints: ['Observe'], visualDescription })),
  }); });
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(body.slides).toEqual([
    { slideIndex: 1, part: 'Discussion', visualDescription: 'Water diagram' },
    { slideIndex: 3, part: 'Discussion', visualDescription: 'Class activity' },
  ]);
  expect(result.current.slideImages).toEqual({ 1: 'water', 3: 'class' });
});
