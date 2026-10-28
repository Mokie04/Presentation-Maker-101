import { afterEach, expect, it, vi } from 'vitest';
import { generatePresentation } from '@/lib/generate-client';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('preserves the existing timeout and non-JSON error messages', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('FUNCTION_INVOCATION_TIMEOUT', { status: 504 }))
    .mockResolvedValueOnce(new Response('bad gateway', { status: 502 })));
  const request = { text: 'lesson', session: 'Session 1' };
  await expect(generatePresentation(request, new AbortController().signal)).rejects.toThrow('The presentation generation timed out. Generating 25+ comprehensive slides can take longer than the server limit. Please try again with a focused section or retry shortly.');
  await expect(generatePresentation(request, new AbortController().signal)).rejects.toThrow('bad gateway');
});
it('forwards truncation errors unchanged and always clears stage timers', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'This lesson is too long' }, { status: 422 })));
  const stage = vi.fn();
  await expect(generatePresentation({ text: 'lesson', session: 'Session 1' }, new AbortController().signal, stage)).rejects.toThrow('This lesson is too long');
  expect(vi.getTimerCount()).toBe(0);
});
it('aborts before mapping a late 422 response body even if fetch ignores abort', async () => {
  let body!: (text: string) => void;
  const text = new Promise<string>(resolve => { body = resolve; });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, text: () => text }));
  const controller = new AbortController();
  const pending = generatePresentation({ text: 'lesson', session: 'Session 1' }, controller.signal);
  await Promise.resolve();
  controller.abort();
  body(JSON.stringify({ error: 'This lesson is too long' }));
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
it('forwards the route’s busy and formatting messages unchanged', async () => {
  const busy = 'The AI service is busy right now. Please try again in a minute.';
  const unusable = 'The AI could not format this lesson. Please try again, or try a shorter part of the lesson plan.';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ error: busy }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ error: unusable }, { status: 502 })));
  const request = { text: 'lesson', session: 'Session 1' };
  await expect(generatePresentation(request, new AbortController().signal)).rejects.toThrow(busy);
  await expect(generatePresentation(request, new AbortController().signal)).rejects.toThrow(unusable);
});
