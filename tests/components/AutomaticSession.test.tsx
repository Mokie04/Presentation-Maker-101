// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
import { chooseSession } from '../helpers/workspace';

const ONE_SESSION = 'CLASSROOM OBSERVATION LESSON PLAN\nEngage (10 minutes)\nExplore (20 minutes)';
const MULTI_DAY = 'DAILY LESSON LOG\nSession 1: Review\nSession 2: Activities';
const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Motion',
  slides: [{ slideNumber: 1, title: 'Motion', part: 'Title Page', contentPoints: ['Grade 7'], visualDescription: '' }] };
let upload: ReturnType<typeof vi.fn<typeof fetch>>;
let requests: Record<string, unknown>[];

beforeEach(() => {
  requests = [];
  upload = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/upload') return upload(url, init);
    if (url === '/api/generate') { requests.push(JSON.parse(String(init?.body))); return Response.json(presentation); }
    if (url === '/api/generate-image') return Response.json({ base64: 'image' });
    throw new Error(`Unexpected request ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function renderHome() {
  const view = render(<Home />);
  await screen.findByRole('button', { name: /paste/i });
  return view;
}
async function chooseFile(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => { fireEvent.change(input, { target: { files: [new File(['lesson'], 'plan.docx')] } }); });
}
function paste(text: string) {
  fireEvent.click(screen.getByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
}
async function generate() {
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox', { name: 'Slides' });
}

it('builds the whole lesson for an uploaded one-session plan without showing sessions', async () => {
  upload.mockResolvedValue(Response.json({ text: ONE_SESSION, fileName: 'co.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  expect(screen.queryByRole('radiogroup', { name: 'Select Session' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Whole lesson' })).toBeTruthy();
  expect(screen.getByText("All set! I'll build the whole lesson.")).toBeTruthy();
  await generate();
  expect(requests[0].session).toBe('Whole lesson');
});

it('asks for a session only when the plan has sessions', async () => {
  upload.mockResolvedValue(Response.json({ text: MULTI_DAY, fileName: 'dll.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  const radios = within(screen.getByRole('radiogroup', { name: 'Select Session' })).getAllByRole('radio');
  expect(radios.map(radio => radio.getAttribute('aria-label'))).toEqual(['Whole lesson', 'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5']);
  expect((screen.getByRole('button', { name: 'Generate Slides' }) as HTMLButtonElement).disabled).toBe(true);
  chooseSession('Session 2');
  await generate();
  expect(requests[0].session).toBe('Session 2');
});

it('switches between the two when a different plan replaces the lesson', async () => {
  upload.mockResolvedValueOnce(Response.json({ text: ONE_SESSION, fileName: 'co.docx' }))
    .mockResolvedValueOnce(Response.json({ text: MULTI_DAY, fileName: 'dll.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  expect(screen.getByRole('heading', { name: 'Whole lesson' })).toBeTruthy();
  await chooseFile(container);
  expect(screen.getByRole('radiogroup', { name: 'Select Session' })).toBeTruthy();
  expect(screen.getAllByRole('radio').filter(radio => (radio as HTMLInputElement).checked)).toEqual([]);
});

it('treats pasted text the same way', async () => {
  await renderHome();
  paste(ONE_SESSION);
  expect(screen.queryByRole('radiogroup', { name: 'Select Session' })).toBeNull();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: MULTI_DAY } });
  expect(screen.getByRole('radiogroup', { name: 'Select Session' })).toBeTruthy();
});

it('shows no session tabs or Another session for a whole-lesson deck', async () => {
  await renderHome();
  paste(ONE_SESSION);
  await generate();
  expect(screen.queryByRole('tablist', { name: 'Lesson sessions' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Another session' })).toBeNull();
});

it('offers the numbered sessions after a session deck', async () => {
  await renderHome();
  paste(MULTI_DAY);
  chooseSession('Session 1');
  await generate();
  fireEvent.click(screen.getByRole('button', { name: 'Another session' }));
  const select = within(screen.getByRole('dialog')).getByLabelText('Select Session');
  expect(within(select).getAllByRole('option').map(option => option.textContent).slice(1))
    .toEqual(['Session 1 (ready) (current)', 'Session 2', 'Session 3', 'Session 4', 'Session 5']);
});

it("does not carry a session pick over to a newly uploaded plan, but keeps it while the text is edited", async () => {
  upload.mockResolvedValueOnce(Response.json({ text: MULTI_DAY, fileName: 'week1.docx' }))
    .mockResolvedValueOnce(Response.json({ text: MULTI_DAY, fileName: 'week2.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  chooseSession('Session 3');
  await chooseFile(container);
  expect(screen.getAllByRole('radio').filter(radio => (radio as HTMLInputElement).checked)).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: /paste/i }));
  chooseSession('Session 2');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: `${MULTI_DAY}\nSession 3: Assessment` } });
  expect((screen.getByRole('radio', { name: 'Session 2' }) as HTMLInputElement).checked).toBe(true);
});

it('treats a one-session plan that mentions Day 1 in its activities as one session', async () => {
  await renderHome();
  paste(`${ONE_SESSION}\nMeasure the plant on Day 1 and Day 3.`);
  expect(screen.queryByRole('radiogroup', { name: 'Select Session' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Whole lesson' })).toBeTruthy();
});

it('lets the teacher build the whole lesson when a plan only seems to have sessions', async () => {
  await renderHome();
  paste(`${ONE_SESSION}\nDay 1\nDay 3\nDay 5`);
  chooseSession('Whole lesson');
  await generate();
  expect(requests[0].session).toBe('Whole lesson');
  expect(screen.queryByRole('tablist', { name: 'Lesson sessions' })).toBeNull();
});

it('keeps the session pick when a later upload fails and the plan is restored', async () => {
  upload.mockResolvedValueOnce(Response.json({ text: MULTI_DAY, fileName: 'dll.docx' }))
    .mockResolvedValueOnce(Response.json({ error: 'Could not read this file.' }, { status: 400 }));
  const { container } = await renderHome();
  await chooseFile(container);
  chooseSession('Session 4');
  await chooseFile(container);
  expect(screen.getByRole('alert').textContent).toContain('Could not read this file.');
  expect((screen.getByRole('radio', { name: 'Session 4' }) as HTMLInputElement).checked).toBe(true);
});

it('clears the session pick when a paste replaces the whole plan', async () => {
  await renderHome();
  paste(MULTI_DAY);
  chooseSession('Session 3');
  const box = screen.getByRole('textbox') as HTMLTextAreaElement;
  box.setSelectionRange(0, box.value.length);
  fireEvent.paste(box);
  fireEvent.change(box, { target: { value: 'WEEK 2 PLAN\nSession 1: Review\nSession 2: Practice' } });
  expect(screen.getAllByRole('radio').filter(radio => (radio as HTMLInputElement).checked)).toEqual([]);
});

it('keeps the session pick after a paste that changes nothing and a later typo fix', async () => {
  await renderHome();
  paste(MULTI_DAY);
  chooseSession('Session 3');
  const box = screen.getByRole('textbox') as HTMLTextAreaElement;
  box.setSelectionRange(0, box.value.length);
  fireEvent.paste(box);
  fireEvent.change(box, { target: { value: MULTI_DAY.replace('Activities', 'Activites') } });
  expect((screen.getByRole('radio', { name: 'Session 3' }) as HTMLInputElement).checked).toBe(true);
});

it('clears the session pick when the whole plan is retyped or dropped in without pasting', async () => {
  await renderHome();
  paste(MULTI_DAY);
  chooseSession('Session 3');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'WEEKLY PLAN\nDay 1: Motion\nDay 2: Forces' } });
  expect(screen.getAllByRole('radio').filter(radio => (radio as HTMLInputElement).checked)).toEqual([]);
});
