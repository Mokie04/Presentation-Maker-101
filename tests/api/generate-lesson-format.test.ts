import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as textProvider from '@/lib/providers/text-provider';

const presentation = { subject: 'Mathematics', originalWriters: 'Teacher', topic: 'Reports',
  slides: [{ slideNumber: 1, part: 'Title Page', title: 'Reports', contentPoints: ['Grade 10'], visualDescription: '' }] };
const request = (body: Record<string, unknown>) => new NextRequest('http://localhost:3000/api/generate', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: 'Whole lesson', ...body }),
});
afterEach(() => vi.restoreAllMocks());

describe('POST /api/generate lesson format', () => {
  it("detects 4A's from the lesson and records it on the deck", async () => {
    const spy = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(presentation);
    const res = await POST(request({ text: 'ACTIVITY ... ANALYSIS ... ABSTRACTION ... APPLICATION ...' }));
    expect(res.status).toBe(200);
    expect((await res.json()).lessonFormat).toBe("4A's");
    expect(spy.mock.calls[0][3]?.lessonFormat).toBe("4A's");
  });

  it('ignores a format sent by the client and reads it from the plan', async () => {
    const spy = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(presentation);
    const res = await POST(request({ text: '[Pedagogy: 4As Approach]', lessonFormat: '5E' }));
    expect(res.status).toBe(200);
    expect((await res.json()).lessonFormat).toBe("4A's");
    expect(spy.mock.calls[0][3]?.lessonFormat).toBe("4A's");
  });
});
