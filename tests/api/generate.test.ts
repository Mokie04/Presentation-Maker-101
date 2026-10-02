import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/generate/route';
import { NextRequest } from 'next/server';
import * as textProvider from '@/lib/providers/text-provider';

describe('POST /api/generate', () => {
  const samplePresentation = {
    subject: 'Science',
    originalWriters: 'DepEd Teachers',
    topic: 'Plant Reproduction',
    slides: [
      {
        slideNumber: 1,
        part: 'Title Page',
        title: 'Plant Reproduction',
        contentPoints: ['Introduction to flowers and seeds'],
        visualDescription: 'Illustration of gumamela flower parts',
      },
    ],
  };

  it('generates presentation successfully with explicit subject', async () => {
    const spy = vi
      .spyOn(textProvider, 'generateSlideContent')
      .mockResolvedValueOnce(samplePresentation);

    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Detailed lesson plan on botany and flower dissection.',
        session: 'Session 1',
        subject: 'Science',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual(samplePresentation);
    expect(spy).toHaveBeenCalledWith(
      'Detailed lesson plan on botany and flower dissection.',
      'Session 1',
      'Science'
    );
  });

  it('auto-detects subject when subject is omitted', async () => {
    const spy = vi
      .spyOn(textProvider, 'generateSlideContent')
      .mockResolvedValueOnce(samplePresentation);

    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: 'We will conduct a science experiment on biodiversity.',
        session: 'Session 2',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(
      'We will conduct a science experiment on biodiversity.',
      'Session 2',
      'Science' // Auto-detected from keyword "science experiment"
    );
  });

  it('returns 400 when text is empty or missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: '   ',
        session: 'Session 1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/text/i);
  });

  it('returns 400 when session is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Valid lesson plan text',
        session: 'Session 99',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/session/i);
  });

  it('returns 500 when generateSlideContent throws an error', async () => {
    vi.spyOn(textProvider, 'generateSlideContent').mockRejectedValueOnce(
      new Error('AI generation timeout')
    );

    const req = new NextRequest('http://localhost:3000/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Valid lesson plan text',
        session: 'Session 1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('AI generation timeout');
  });
});
