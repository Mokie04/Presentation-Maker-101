// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import Home from '@/app/page';
import { chooseSession, selectSlideTitled } from '../helpers/workspace';

const lesson = 'A lesson about plants with several sessions.';
const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  subjectEvidence: [{ subject: 'Science', source: 'teacher-supplied' }],
  slides: ['Roots', 'Leaves'].map((title, index) => ({ slideNumber: index + 1, title, part: 'Discussion', contentPoints: [title], visualDescription: '' })) };
let generate: ReturnType<typeof vi.fn<typeof fetch>>;
let upload: ReturnType<typeof vi.fn<typeof fetch>>;
let requests: Record<string, unknown>[];
let exports: Record<string, unknown>[];
let filenames: string[];
let batchCount: number;
function deferred() {
  let resolve!: (response: Response) => void;
  return { promise: new Promise<Response>(done => { resolve = done; }), resolve: (response: Response) => resolve(response) };
}
beforeEach(() => {
  requests = []; exports = []; filenames = []; batchCount = 0;
  upload = vi.fn<typeof fetch>();
  generate = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(presentation));
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') { requests.push(JSON.parse(String(init?.body))); return generate(url, init); }
    if (url === '/api/upload') return upload(url, init);
    if (url === '/api/generate-image') { batchCount++; return Response.json({ base64: 'image' }); }
    if (url === '/api/download-pptx' || url === '/api/download-markdown') {
      exports.push(JSON.parse(String(init?.body)));
      return { ok: true, blob: async () => new Blob(['pptx']), text: async (): Promise<string> => 'outline', headers: new Headers() };
    }
    throw new Error(`Unexpected request ${url}`);
  }));
  vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:test'; } static revokeObjectURL() {} });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function(this: HTMLAnchorElement) { filenames.push(this.download); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function open(subject = 'Science') {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: lesson } });
  chooseSession('Session 1');
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: subject } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox', { name: 'Slides' });
}
function dialog() { return screen.getByRole('dialog', { name: 'Another session' }); }
function another(session = 'Session 2') {
  const opener = screen.getByRole('button', { name: 'Another session' }); opener.focus(); fireEvent.click(opener);
  fireEvent.change(within(dialog()).getByLabelText('Select Session'), { target: { value: session } });
}
async function addSecond() {
  another(); fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  await screen.findByRole('tab', { name: 'Session 2' });
}
it.each(['Science', ''])('reuses lesson and original %s subject provenance, and marks ready/current sessions', async subject => {
  await open(subject);
  another();
  expect(within(dialog()).getByText(`${lesson.length} characters`, { exact: false })).toBeTruthy();
  expect(within(dialog()).getByText(subject || 'Automatic')).toBeTruthy();
  expect(within(dialog()).getByRole('option', { name: 'Session 1 (ready) (current)' })).toBeTruthy();
  expect(within(dialog()).getByRole('option', { name: 'Session 2' })).toBeTruthy();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  await screen.findByRole('tab', { name: 'Session 2' });
  expect(requests).toEqual([{ text: lesson, session: 'Session 1', ...(subject ? { subject, subjectSource: 'teacher-supplied' } : {}) },
    { text: lesson, session: 'Session 2', ...(subject ? { subject, subjectSource: 'teacher-supplied' } : {}) }]);
  expect(batchCount).toBe(0);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Another session' }));
});
it('captures submitted subject despite changing upload controls during generation', async () => {
  const pending = deferred(); generate.mockImplementationOnce(() => pending.promise);
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: lesson } });
  chooseSession('Session 1');
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Science' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Mathematics' } });
  chooseSession('Session 5');
  await act(async () => { pending.resolve(Response.json(presentation)); });
  another(); fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  await screen.findByRole('tab', { name: 'Session 2' });
  expect(requests[1]).toEqual({ text: lesson, session: 'Session 2', subject: 'Science', subjectSource: 'teacher-supplied' });
  expect(screen.getByRole('tab', { name: 'Session 1' })).toBeTruthy();
});
it('restores each selection, edit and view, and replaces only the chosen deck in Normal view', async () => {
  await open(); selectSlideTitled('Leaves');
  fireEvent.change(screen.getByLabelText('Slide Title'), { target: { value: 'Edited leaves' } });
  fireEvent.click(screen.getByRole('button', { name: 'Slide sorter' }));
  await addSecond();
  expect(screen.getByRole('option', { name: 'Slide 1: Roots' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.click(screen.getByRole('tab', { name: 'Session 1' }));
  expect(screen.getByRole('button', { name: 'Slide sorter' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('listitem', { name: 'Slide 2: Edited leaves' }).getAttribute('aria-current')).toBe('true');
  another('Session 2');
  expect(within(dialog()).getByText('Session 2 already has slides. They will be replaced.')).toBeTruthy();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  await screen.findByRole('listbox', { name: 'Slides' });
  expect(screen.getByRole('tab', { name: 'Session 2' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.click(screen.getByRole('tab', { name: 'Session 1' }));
  expect(screen.getByRole('listitem', { name: 'Slide 2: Edited leaves' })).toBeTruthy();
});
it('keeps all decks and the dialog on failure, including the exact 422 error', async () => {
  await open(); await addSecond(); another('Session 1');
  const message = 'This lesson is too long to convert in one pass. Choose a shorter session or paste a smaller part of the lesson plan.';
  generate.mockResolvedValueOnce(Response.json({ error: message }, { status: 422 }));
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  expect((await screen.findByRole('alert')).textContent).toBe(message);
  expect(dialog()).toBeTruthy();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  expect(screen.getByRole('tab', { name: 'Session 2' }).getAttribute('aria-selected')).toBe('true');
  expect(batchCount).toBe(0);
});
it('cancel before generation and Escape return focus and store no deck', async () => {
  await open(); another();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
  expect(requests).toHaveLength(1);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Another session' }));
  another(); fireEvent.keyDown(dialog(), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getAllByRole('tab')).toHaveLength(1);
});
it.each([200, 422])('aborts during generation and ignores a late %s response after a new dialog opens', async status => {
  await open(); another(); const pending = deferred(); generate.mockImplementationOnce(() => pending.promise);
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  const signal = generate.mock.calls[1][1]!.signal!;
  expect(within(dialog()).getByRole('button', { name: 'Generate' }).hasAttribute('disabled')).toBe(true);
  expect(within(dialog()).getByText('Analyzing curriculum & instructional structure...')).toBeTruthy();
  fireEvent.keyDown(dialog(), { key: 'Escape' }); expect(dialog()).toBeTruthy();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
  expect(signal.aborted).toBe(true);
  another('Session 3');
  await act(async () => { pending.resolve(Response.json(status === 200 ? presentation : { error: 'This lesson is too long' }, { status })); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(dialog()).toBeTruthy();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  expect(batchCount).toBe(0);
});
it('exports and previews the active session', async () => {
  await open(); await addSecond();
  for (const session of ['Session 2', 'Session 1']) {
    fireEvent.click(screen.getByRole('tab', { name: session }));
    fireEvent.click(screen.getByRole('button', { name: 'Download PowerPoint' }));
    await screen.findByRole('button', { name: 'Download PowerPoint' });
    expect(exports[exports.length - 1].session).toBe(session);
    expect(filenames[filenames.length - 1]).toContain(session.toLowerCase().replace(' ', '_'));
    fireEvent.click(screen.getByRole('button', { name: 'Download Outline' }));
    await screen.findByRole('button', { name: 'Download Outline' });
    expect(exports[exports.length - 1].session).toBe(session);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const slideshow = screen.getByRole('dialog');
    expect(within(slideshow).getByText(session, { exact: false })).toBeTruthy();
    fireEvent.keyDown(slideshow, { key: 'Escape' });
  }
});
it('resets one session immediately and confirms before clearing two', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Start over with a new lesson' }));
  expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByLabelText('Select Session')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: lesson } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' })); await screen.findByRole('listbox');
  await addSecond(); fireEvent.click(screen.getByRole('button', { name: 'Start over with a new lesson' }));
  let confirm = screen.getByRole('dialog', { name: 'Start over?' });
  expect(within(confirm).getByText('All 2 session decks will be cleared. Download them first if you need them.')).toBeTruthy();
  expect(within(confirm).getByText(/nothing is saved.*refreshed/i)).toBeTruthy();
  fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' })); expect(screen.getAllByRole('tab')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Start over with a new lesson' }));
  confirm = screen.getByRole('dialog', { name: 'Start over?' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Start over' }));
  expect(screen.queryByRole('tablist')).toBeNull(); expect(screen.getByLabelText('Subject')).toBeTruthy();
});
it('supports roving tabs with arrows/Home/End without moving the slide selection', async () => {
  await open(); selectSlideTitled('Leaves'); await addSecond();
  const tab = screen.getByRole('tab', { name: 'Session 2' }); tab.focus();
  fireEvent.keyDown(tab, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Session 1' }));
  expect(screen.getByRole('option', { name: 'Slide 2: Leaves' }).getAttribute('aria-selected')).toBe('true');
  fireEvent.keyDown(document.activeElement!, { key: 'End' }); expect(document.activeElement).toBe(tab);
  fireEvent.keyDown(tab, { key: 'Home' }); expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Session 1' }));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' }); expect(document.activeElement).toBe(tab);
});
it.each(['another', 'reset'])('traps dialog focus, returns it on close, and has no axe violations: %s', async mode => {
  await open(); await addSecond();
  const name = mode === 'another' ? 'Another session' : 'Start over with a new lesson';
  const opener = screen.getByRole('button', { name }); opener.focus(); fireEvent.click(opener);
  const modal = screen.getByRole('dialog'); expect(document.activeElement).toBe(modal);
  fireEvent.keyDown(modal, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(within(modal).getByRole('button', { name: 'Cancel' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(modal.contains(document.activeElement)).toBe(true);
  const results = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map(({ id }) => id)).toEqual([]);
  fireEvent.keyDown(modal, { key: 'Escape' }); expect(document.activeElement).toBe(opener);
});

it.each(['before', 'after'])('pins the lesson when a concurrent upload completes %s generation', async order => {
  const pending = deferred(); const incoming = deferred();
  generate.mockImplementationOnce(() => pending.promise);
  upload.mockImplementationOnce(() => incoming.promise);
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: lesson } });
  chooseSession('Session 1');
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Science' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hide Manual Paste' }));
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['different lesson'], 'B.txt', { type: 'text/plain' })] } });
  const completeUpload = async () => { await act(async () => { incoming.resolve(Response.json({ text: 'A different lesson', fileName: 'B.txt' })); }); };
  if (order === 'before') await completeUpload();
  await act(async () => { pending.resolve(Response.json(presentation)); });
  if (order === 'after') await completeUpload();
  another();
  expect(within(dialog()).getByText('Pasted Lesson Plan')).toBeTruthy();
  expect(within(dialog()).queryByText('B.txt')).toBeNull();
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Generate' }));
  await screen.findByRole('tab', { name: 'Session 2' });
  expect(requests[1]).toEqual({ text: lesson, session: 'Session 2', subject: 'Science', subjectSource: 'teacher-supplied' });
});
