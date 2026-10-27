// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useSlideDeck } from '@/lib/deck/use-slide-deck';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('omits blank visual slides from individual requests without shifting indexes or result ownership', async () => {
  const pending: ((response: Response) => void)[] = [];
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { pending.push(resolve); })));
  const { result } = renderHook(() => useSlideDeck());
  await act(async () => { result.current.loadPresentation({ subject: 'Science', topic: 'Water', originalWriters: 'Teacher',
    slides: ['', 'Water diagram', ' \n ', 'Class activity'].map((visualDescription, i) => ({ slideNumber: i + 1, part: 'Discussion', title: 'Water', contentPoints: ['Observe'], visualDescription })),
  }); });
  expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(['/api/generate-image', '/api/generate-image']);
  const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
  expect(bodies).toEqual([
    { slideIndex: 1, prompt: 'Water diagram', variation: 0 },
    { slideIndex: 3, prompt: 'Class activity', variation: 0 },
  ]);
  await act(async () => { pending[1](Response.json({ base64: 'class', slideIndex: 3 })); });
  expect(result.current.slideImages).toEqual({ 3: 'class' });
  await act(async () => { pending[0](Response.json({ base64: 'water', slideIndex: 1 })); });
  expect(result.current.slideImages).toEqual({ 1: 'water', 3: 'class' });
});
