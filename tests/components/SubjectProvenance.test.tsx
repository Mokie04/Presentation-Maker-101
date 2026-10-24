// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves'].map((title, index) => ({ slideNumber: index + 1,
    part: 'Discussion', title, contentPoints: [title], visualDescription: '' })),
};
const teacherHistory = [{ subject: 'Science', source: 'teacher-supplied' },
  { subject: 'English/Reading', source: 'model-generated' }];
let generate: ReturnType<typeof vi.fn<typeof fetch>>;
let exported: Record<string, unknown>[];
let requests: Record<string, unknown>[];
beforeEach(() => {
  exported = []; requests = [];
  generate = vi.fn<typeof fetch>().mockResolvedValue(Response.json(presentation));
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') {
      requests.push(JSON.parse(String(init?.body)));
      return generate(url, init);
    }
    if (url === '/api/generate-images') return Response.json({ images: {} });
    if (url === '/api/download-markdown') {
      exported.push(JSON.parse(String(init?.body)).presentationData);
      return new Response('outline');
    }
    throw new Error(`Unexpected request ${url}`);
  }));
  vi.stubGlobal('alert', vi.fn());
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:test'; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function prepare() {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reading about a planet experiment.' } });
  fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 1' } });
}
async function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('button', { name: 'Download Outline' });
  // Grid view and these legacy card checks retire in Phase 6.
  fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
}
async function exportData() {
  fireEvent.click(screen.getByRole('button', { name: 'Download Outline' }));
  await screen.findByRole('button', { name: 'Download Outline' });
  return exported[exported.length - 1];
}

describe('teacher subject selection and presentation history', () => {
  it('defaults to Automatic and retains the original request despite science keywords', async () => {
    await prepare();
    expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('');
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(expect.arrayContaining([
      'Automatic', 'Science', 'Mathematics', 'English/Reading', 'Social Studies/History', 'General Study',
    ]));
    await submit();
    expect(requests).toEqual([{ text: 'Reading about a planet experiment.', session: 'Session 1' }]);
    expect((await exportData()).subjectEvidence).toBeUndefined(); // Legacy presentation remains valid.
  });

  it.each(['Science', 'Mathematics', 'English/Reading'])('submits explicit %s with its provenance marker', async (subject) => {
    await prepare();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: subject } });
    await submit();
    expect(requests[0]).toEqual({ text: 'Reading about a planet experiment.', session: 'Session 1',
      subject, subjectSource: 'teacher-supplied' });
  });

  it('keeps the submitted subject tied to its result despite later control changes', async () => {
    let resolve!: (response: Response) => void;
    generate.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await prepare();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Mathematics' } });
    await act(async () => { resolve(Response.json({ ...presentation, subject: 'English/Reading', subjectEvidence: teacherHistory })); });
    expect(requests[0].subject).toBe('Science');
    expect((await exportData()).subjectEvidence).toEqual(teacherHistory);
  });

  it('preserves history during edits/deletion and clears it on reset and a later Automatic generation', async () => {
    generate.mockResolvedValueOnce(Response.json({ ...presentation, subjectEvidence: teacherHistory }));
    await prepare();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Science' } });
    await submit();
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    fireEvent.change(screen.getAllByDisplayValue('Roots').find(el => el.tagName === 'INPUT')!, { target: { value: 'Edited roots' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[1]);
    const edited = await exportData();
    expect(edited.subjectEvidence).toEqual(teacherHistory);
    expect(edited.slides).toEqual([expect.objectContaining({ title: 'Edited roots' })]);
    fireEvent.click(screen.getByTitle('Reset to New Upload'));
    expect(screen.queryByRole('button', { name: 'Download Outline' })).toBeNull();
    expect((screen.getByLabelText('Subject') as HTMLSelectElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: /paste/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Next lesson' } });
    fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 2' } });
    generate.mockResolvedValueOnce(Response.json({ ...presentation, subjectEvidence: [
      { subject: 'General Study', source: 'keyword-detected' }, { subject: 'Science', source: 'model-generated' },
    ] }));
    await submit();
    expect(requests[1]).toEqual({ text: 'Next lesson', session: 'Session 2' });
    expect((await exportData()).subjectEvidence).toEqual([
      { subject: 'General Study', source: 'keyword-detected' }, { subject: 'Science', source: 'model-generated' },
    ]);
  });
});
