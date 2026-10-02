import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/generate-images/route';
import { NextRequest } from 'next/server';
import * as imageProvider from '@/lib/providers/image-provider';

describe('POST /api/generate-images', () => {
  it('generates images sequentially for eligible parts and skips ineligible parts', async () => {
    const spy = vi
      .spyOn(imageProvider, 'generateSlideImage')
      .mockResolvedValueOnce('img-data-1')
      .mockResolvedValueOnce('img-data-2');

    const slides = [
      {
        slideIndex: 0,
        part: 'Title Page', // Ineligible
        visualDescription: 'Welcome banner',
      },
      {
        slideIndex: 1,
        part: 'Review', // Ineligible
        visualDescription: 'Flashcards',
      },
      {
        slideIndex: 2,
        part: 'Motivation Activity', // Eligible (contains "motivation")
        visualDescription: 'Puppet show',
      },
      {
        slideIndex: 3,
        part: 'Lesson Presentation', // Eligible (contains "presentation")
        visualDescription: 'Diagram of photosynthesis',
      },
      {
        slideIndex: 4,
        part: 'Assessment', // Ineligible
        visualDescription: 'Quiz questions',
      },
    ];

    const req = new NextRequest('http://localhost:3000/api/generate-images', {
      method: 'POST',
      body: JSON.stringify({ slides, delayMs: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      images: {
        2: 'img-data-1',
        3: 'img-data-2',
      },
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'Puppet show');
    expect(spy).toHaveBeenNthCalledWith(2, 'Diagram of photosynthesis');
  });

  it('marks individual failed images as "failed" without aborting the batch', async () => {
    vi.spyOn(imageProvider, 'generateSlideImage')
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockResolvedValueOnce('img-data-discussion');

    const slides = [
      {
        slideIndex: 1,
        part: 'Motivation',
        visualDescription: 'Game board',
      },
      {
        slideIndex: 2,
        part: 'Group Discussion',
        visualDescription: 'Children discussing in circle',
      },
    ];

    const req = new NextRequest('http://localhost:3000/api/generate-images', {
      method: 'POST',
      body: JSON.stringify({ slides, delayMs: 1 }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      images: {
        1: 'failed',
        2: 'img-data-discussion',
      },
    });
  });

  it('returns 400 when slides array is missing or invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate-images', {
      method: 'POST',
      body: JSON.stringify({ slides: 'not-an-array' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/slides/i);
  });
});
