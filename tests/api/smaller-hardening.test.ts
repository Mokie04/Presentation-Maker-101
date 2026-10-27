import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generate } from '@/app/api/generate/route';
import { POST as image } from '@/app/api/generate-image/route';
import { POST as images } from '@/app/api/generate-images/route';
import { POST as markdown } from '@/app/api/download-markdown/route';
import { POST as pptx } from '@/app/api/download-pptx/route';
import { POST as upload } from '@/app/api/upload/route';
import { GET as health } from '@/app/api/health/route';
import * as textProvider from '@/lib/providers/text-provider';

const presentation = { subject: 'Science', topic: 'Water', originalWriters: 'Teacher', slides: [] };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function request(subject: string) {
  return new NextRequest('https://app.example/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'A Science lesson', session: 'Session 1', subject }),
  });
}

describe('legacy subject input', () => {
  it('strips controls, quotes and line breaks and caps the subject passed to the prompt', async () => {
    const call = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValue(presentation);
    const response = await generate(request(`\u0000"Local'\nsubject\r\t\u0085\u2028\u2029\`${'x'.repeat(200)}`));
    const expected = `Localsubject${'x'.repeat(200)}`.slice(0, 100);
    expect(response.status).toBe(200);
    expect(call.mock.calls[0]?.[2]).toBe(expected);
    expect((await response.json()).subjectEvidence[0]).toEqual({ subject: expected, source: 'unknown' });
  });

  it('uses detection if sanitizing leaves no legacy subject', async () => {
    const call = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValue(presentation);
    const response = await generate(request('"\n\r\t\''));
    expect(call.mock.calls[0]?.[2]).toBe('Science');
    expect((await response.json()).subjectEvidence[0]).toEqual({ subject: 'Science', source: 'keyword-detected' });
  });
});

describe('authenticated response caching', () => {
  it.each([
    ['generate', generate], ['generate-image', image], ['generate-images', images],
    ['download-markdown', markdown], ['download-pptx', pptx], ['upload', upload], ['health', health],
  ] as const)('%s applies no-store even on authentication failures', async (name, route) => {
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true');
    vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const response = await route(new NextRequest(`https://app.example/api/${name}`, {
      method: name === 'health' ? 'GET' : 'POST',
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
