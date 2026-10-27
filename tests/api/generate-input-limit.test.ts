import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as textProvider from '@/lib/providers/text-provider';
import { LESSON_TOO_LONG_MESSAGE, MAX_LESSON_TEXT_LENGTH } from '@/lib/lesson-limits';

afterEach(() => vi.restoreAllMocks());

function request(text: string) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, session: 'Session 1' }),
  });
}

it('rejects lesson text above the shared upload limit before calling the provider', async () => {
  const provider = vi.spyOn(textProvider, 'generateSlideContent');
  const response = await POST(request('x'.repeat(MAX_LESSON_TEXT_LENGTH + 1)));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain(LESSON_TOO_LONG_MESSAGE);
  expect(provider).not.toHaveBeenCalled();
});

it('accepts a legitimate lesson at the shared product limit without truncation', async () => {
  const text = 'Lesson about plants. '.repeat(12_000).slice(0, MAX_LESSON_TEXT_LENGTH);
  expect(text.length).toBe(MAX_LESSON_TEXT_LENGTH);
  const provider = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValue({
    subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: [],
  });
  const response = await POST(request(text));
  expect(response.status).toBe(200);
  expect(provider.mock.calls[0][0]).toBe(text);
});
