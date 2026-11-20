import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/generate/route';
import { NextRequest } from 'next/server';
import * as textProvider from '@/lib/providers/text-provider';

const presentation = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Distance and Displacement',
  slides: [{ slideNumber: 1, part: 'Title Page', title: 'Distance', contentPoints: ['Grade 7'], visualDescription: '' }],
};
const request = (session: string) => new NextRequest('http://localhost:3000/api/generate', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Classroom observation lesson plan', session, subject: 'Science' }),
});

afterEach(() => vi.restoreAllMocks());

describe('POST /api/generate with the whole lesson', () => {
  it('accepts Whole lesson and passes it to the text provider', async () => {
    const spy = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(presentation);
    const res = await POST(request('Whole lesson'));
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith('Classroom observation lesson plan', 'Whole lesson', 'Science', expect.anything());
  });

  it('still rejects a session label outside the list', async () => {
    const spy = vi.spyOn(textProvider, 'generateSlideContent');
    const res = await POST(request('Session 6'));
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });
});
