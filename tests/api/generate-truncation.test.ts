import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as provider from '@/lib/providers/text-provider';
const message = 'This lesson is too long to convert in one pass. Choose a shorter session or paste a smaller part of the lesson plan.';
afterEach(() => vi.restoreAllMocks());
function request() { return new NextRequest('http://localhost/api/generate', { method: 'POST', body: JSON.stringify({ text: 'Science lesson', session: 'Session 1' }) }); }
it('returns the exact safe 422 message for typed truncation without exposing provider details', async () => {
  const error = new provider.TextOutputTruncatedError(); error.message = 'SECRET partial model response';
  vi.spyOn(provider, 'generateSlideContent').mockRejectedValueOnce(error);
  const response = await POST(request()); expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ error: message });
});
it('keeps unexpected failures on the existing fixed 500 policy', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(provider, 'generateSlideContent').mockRejectedValueOnce(new Error('SECRET upstream failure'));
  const response = await POST(request()); expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'Failed to generate the presentation. Please try again.' });
});
