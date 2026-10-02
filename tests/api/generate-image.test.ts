import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/generate-image/route';
import { NextRequest } from 'next/server';
import * as imageProvider from '@/lib/providers/image-provider';

describe('POST /api/generate-image', () => {
  it('generates single image successfully', async () => {
    const spy = vi
      .spyOn(imageProvider, 'generateSlideImage')
      .mockResolvedValueOnce('base64-data-image-1');

    const req = new NextRequest('http://localhost:3000/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Teacher pointing at a chalkboard',
        slideIndex: 2,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      base64: 'base64-data-image-1',
      slideIndex: 2,
    });
    expect(spy).toHaveBeenCalledWith('Teacher pointing at a chalkboard');
  });

  it('returns 400 if prompt is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({
        slideIndex: 2,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/prompt/i);
  });

  it('returns 500 with slideIndex if generation fails', async () => {
    vi.spyOn(imageProvider, 'generateSlideImage').mockRejectedValueOnce(
      new Error('Image provider failed')
    );

    const req = new NextRequest('http://localhost:3000/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Chalkboard image',
        slideIndex: 5,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({
      error: 'Image provider failed',
      slideIndex: 5,
    });
  });
});
