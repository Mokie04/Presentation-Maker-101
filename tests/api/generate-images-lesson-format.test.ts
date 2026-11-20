import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-images/route';
import * as imageProvider from '@/lib/providers/image-provider';

afterEach(() => vi.restoreAllMocks());

const slides = ['Activity', 'Analysis', 'Abstraction', 'Application'].map((part, slideIndex) => ({ slideIndex, part, visualDescription: `${part} picture` }));
async function imagedParts(body: Record<string, unknown>) {
  const spy = vi.spyOn(imageProvider, 'generateSlideImage').mockResolvedValue('img');
  const res = await POST(new NextRequest('http://localhost:3000/api/generate-images', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slides, delayMs: 0, ...body }),
  }));
  expect(res.status).toBe(200);
  return spy.mock.calls.map(call => call[0]);
}

it("images a 4A's deck's Activity and Abstraction slides when the format is sent", async () => {
  expect(await imagedParts({ lessonFormat: "4A's" })).toEqual(['Activity picture', 'Abstraction picture']);
});

it('keeps Standard rules when no format is sent', async () => {
  expect(await imagedParts({})).toEqual([]);
});
