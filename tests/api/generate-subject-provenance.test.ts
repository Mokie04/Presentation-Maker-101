import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate/route';
import * as textProvider from '@/lib/providers/text-provider';
import * as detector from '@/lib/utils/subject-detector';

const modelPresentation = { subject: 'Science', topic: 'Planets', originalWriters: 'Teacher', slides: [] };
function request(fields: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/generate', { method: 'POST',
    body: JSON.stringify({ text: 'English reading about a planet', session: 'Session 1', ...fields }),
  });
}
afterEach(() => vi.restoreAllMocks());

describe('generation subject provenance', () => {
  it('Automatic records only the detector result actually used and model subject', async () => {
    const generate = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(modelPresentation);
    const detect = vi.spyOn(detector, 'detectSubject');
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...modelPresentation, subjectEvidence: [
      { subject: 'Science', source: 'keyword-detected' }, { subject: 'Science', source: 'model-generated' },
    ] });
    expect(generate).toHaveBeenCalledWith('English reading about a planet', 'Session 1', 'Science', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(detect).toHaveBeenCalledTimes(1);
  });

  it.each(['Science', 'Mathematics', 'English/Reading', 'Social Studies/History', 'General Study'])(
    'records explicit teacher %s separately from model output without running the detector', async (subject) => {
      const generate = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(modelPresentation);
      const detect = vi.spyOn(detector, 'detectSubject');
      const response = await POST(request({ subject, subjectSource: 'teacher-supplied' }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ...modelPresentation, subjectEvidence: [
        { subject, source: 'teacher-supplied' }, { subject: 'Science', source: 'model-generated' },
      ] });
      expect(generate).toHaveBeenCalledWith('English reading about a planet', 'Session 1', subject, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(detect).not.toHaveBeenCalled();
    });

  it('preserves a legacy arbitrary subject without manufacturing teacher history', async () => {
    vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(modelPresentation);
    const detect = vi.spyOn(detector, 'detectSubject');
    const response = await POST(request({ subject: '  Local curriculum  ' }));
    expect(response.status).toBe(200);
    expect((await response.json()).subjectEvidence).toEqual([
      { subject: 'Local curriculum', source: 'unknown' }, { subject: 'Science', source: 'model-generated' },
    ]);
    expect(detect).not.toHaveBeenCalled();
  });

  it('legacy blank subjects still use the detector and never imply teacher selection', async () => {
    vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(modelPresentation);
    const response = await POST(request({ subject: ' ' }));
    expect((await response.json()).subjectEvidence).toEqual([
      { subject: 'Science', source: 'keyword-detected' }, { subject: 'Science', source: 'model-generated' },
    ]);
  });

  it('assembles provenance on the server instead of trusting model-supplied history', async () => {
    vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce({ ...modelPresentation,
      subjectEvidence: [{ subject: 'Science', source: 'teacher-supplied' }],
    });
    const response = await POST(request({ subject: 'English/Reading', subjectSource: 'teacher-supplied' }));
    expect((await response.json()).subjectEvidence).toEqual([
      { subject: 'English/Reading', source: 'teacher-supplied' }, { subject: 'Science', source: 'model-generated' },
    ]);
  });

  it.each([
    { subjectSource: null }, { subjectSource: [] }, { subjectSource: 'model-generated', subject: 'Science' },
    { subjectSource: 'teacher-supplied' }, { subjectSource: 'teacher-supplied', subject: null },
    { subjectSource: 'teacher-supplied', subject: 42 }, { subjectSource: 'teacher-supplied', subject: ' ' },
    { subjectSource: 'teacher-supplied', subject: 'Unknown' },
    { subjectSource: 'teacher-supplied', subject: 'science' },
    { subjectEvidence: [{ subject: 'Science', source: 'teacher-supplied' }] }, { subjectEvidence: null },
  ])('rejects malformed provenance input %j before generating content', async (fields) => {
    const generate = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValue(modelPresentation);
    const response = await POST(request(fields));
    expect(response.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
});
