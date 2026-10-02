import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/download-markdown/route';
import { NextRequest } from 'next/server';
import type { PresentationData } from '@/types/presentation';
import * as mdService from '@/lib/services/markdown-generator';

describe('POST /api/download-markdown', () => {
  const validPresentation: PresentationData = {
    subject: 'English/Reading',
    originalWriters: 'DepEd Teachers',
    topic: 'Nouns & Verbs in Context',
    slides: [
      {
        slideNumber: 1,
        part: 'Review',
        title: 'Review: Common and Proper Nouns',
        contentPoints: ['Proper nouns begin with capital letters'],
        visualDescription: 'Chalkboard examples of common and proper nouns',
      },
    ],
  };

  it('generates and streams Markdown with correct attachment headers and sanitized filename', async () => {
    const req = new NextRequest('http://localhost:3000/api/download-markdown', {
      method: 'POST',
      body: JSON.stringify({
        presentationData: validPresentation,
        session: 'Session 2',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="nouns___verbs_in_context_session_2_Outline.md"'
    );

    const text = await res.text();
    expect(text).toContain('# Nouns & Verbs in Context - Session 2');
    expect(text).toContain('## Slide 1 - Review');
  });

  it('returns 400 when presentationData fails schema validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/download-markdown', {
      method: 'POST',
      body: JSON.stringify({
        presentationData: { topic: '' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/presentationData/i);
  });

  it('returns 500 when generation throws an error', async () => {
    vi.spyOn(mdService, 'buildPresentationMarkdown').mockImplementationOnce(() => {
      throw new Error('Markdown compilation failure');
    });

    const req = new NextRequest('http://localhost:3000/api/download-markdown', {
      method: 'POST',
      body: JSON.stringify({
        presentationData: validPresentation,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Markdown compilation failure');
  });
});
