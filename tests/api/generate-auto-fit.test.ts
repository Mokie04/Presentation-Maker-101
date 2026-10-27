import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as provider from '@/lib/providers/text-provider';
import { fitSlide } from '@/lib/slide-fit';
import type { PresentationData } from '@/types/presentation';
afterEach(() => vi.restoreAllMocks());
const base: PresentationData = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [
  { slideNumber: 1, part: 'Title Page', title: 'Water', contentPoints: ['Science'], visualDescription: '' },
  { slideNumber: 2, part: 'Discussion', title: 'Evidence', contentPoints: ['Observe'], visualDescription: 'Water' },
] };
function request() { return new NextRequest('http://localhost/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Science lesson', session: 'Session 1', subject: 'Science', subjectSource: 'teacher-supplied' }) }); }
it('fits a mocked dense model response before returning server-recorded provenance', async () => {
  const dense = { ...base, subjectEvidence: [{ subject: 'Forged', source: 'unknown' as const }], slides: [base.slides[0], { ...base.slides[1], contentPoints: Array.from({ length: 12 }, () => 'Observe the small bodies in the Solar System and describe their motion using evidence from the diagram.') }] };
  vi.spyOn(provider, 'generateSlideContent').mockResolvedValueOnce(dense);
  const response = await POST(request()); expect(response.status).toBe(200);
  const body: PresentationData = await response.json(); expect(body.slides.length).toBeGreaterThan(2);
  expect(body.slides.flatMap(s => s.contentPoints)).toEqual(dense.slides.flatMap(s => s.contentPoints));
  body.slides.slice(1).forEach((s, i) => expect(fitSlide(s, i + 1).body.fits).toBe(true));
  expect(body.subjectEvidence).toEqual([{ subject: 'Science', source: 'teacher-supplied' }, { subject: 'Science', source: 'model-generated' }]);
});
it('passes an already fitting model deck through without content changes', async () => {
  vi.spyOn(provider, 'generateSlideContent').mockResolvedValueOnce(base);
  const response = await POST(request()); const { subjectEvidence, ...body } = await response.json();
  expect(response.status).toBe(200); expect(body).toEqual(base); expect(subjectEvidence).toHaveLength(2);
});
