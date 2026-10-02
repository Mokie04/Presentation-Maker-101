import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/download-pptx/route';
import { NextRequest } from 'next/server';
import type { PresentationData } from '@/types/presentation';
import * as pptxGenService from '@/lib/services/pptx-generator';

describe('POST /api/download-pptx', () => {
  const validPresentation: PresentationData = {
    subject: 'Science',
    originalWriters: 'DepEd Teachers',
    topic: 'Water Cycle & Weather',
    slides: [
      {
        slideNumber: 1,
        part: 'Review',
        title: 'Three States of Water',
        contentPoints: ['Solid, Liquid, Gas'],
        visualDescription: 'Filipino classroom diagram of ice, water, steam',
      },
    ],
  };

  it('generates and streams PPTX with correct attachment headers and sanitized filename', async () => {
    const fakeBuffer = Buffer.from('fake-pptx-data');
    vi.spyOn(pptxGenService, 'buildPresentationPptx').mockResolvedValueOnce(
      fakeBuffer
    );

    const req = new NextRequest('http://localhost:3000/api/download-pptx', {
      method: 'POST',
      body: JSON.stringify({
        presentationData: validPresentation,
        session: 'Session 1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="water_cycle___weather_session_1_DepEdTambayan.pptx"'
    );

    const arrayBuffer = await res.arrayBuffer();
    const returnedBuffer = Buffer.from(arrayBuffer);
    expect(returnedBuffer.toString()).toBe('fake-pptx-data');
  });

  it('returns 400 when presentationData fails schema validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/download-pptx', {
      method: 'POST',
      body: JSON.stringify({
        presentationData: { invalid: true },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/presentationData/i);
  });

  it('returns 500 when compilation fails', async () => {
    vi.spyOn(pptxGenService, 'buildPresentationPptx').mockRejectedValueOnce(
      new Error('PPTX memory error')
    );

    const req = new NextRequest('http://localhost:3000/api/download-pptx', {
      method: 'POST',
      body: JSON.stringify({
        presentationData: validPresentation,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('PPTX memory error');
  });
});
