import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as provider from '@/lib/providers/text-provider';

afterEach(() => vi.restoreAllMocks());

it('forwards request cancellation to the text provider', async () => {
  const controller = new AbortController();
  const request = new NextRequest('http://localhost/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'A lesson about roots', session: 'Session 1' }), signal: controller.signal,
  });
  const generate = vi.spyOn(provider, 'generateSlideContent').mockResolvedValue({
    subject: 'Science', originalWriters: 'Teacher', topic: 'Roots', slides: [],
  });
  expect((await POST(request)).status).toBe(200);
  expect(generate).toHaveBeenCalledWith('A lesson about roots', 'Session 1', expect.any(String), { signal: request.signal });
  const upstream = generate.mock.calls[0][3]?.signal;
  controller.abort();
  expect(upstream?.aborted).toBe(true);
});
