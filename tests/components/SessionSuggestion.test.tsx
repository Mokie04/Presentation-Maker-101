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

beforeEach(() => {
  upload = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/upload') return upload(url, init);
    if (url === '/api/generate') return Response.json(presentation);
    if (url === '/api/generate-image') return Response.json({ base64: 'image' });
    throw new Error(`Unexpected request ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement;
const checked = () => screen.getAllByRole('radio').filter(r => (r as HTMLInputElement).checked).map(r => r.getAttribute('aria-label'));
async function chooseFile(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => { fireEvent.change(input, { target: { files: [new File(['lesson'], 'plan.docx')] } }); });
}
async function renderHome() {
  const view = render(<Home />);
  await screen.findByRole('button', { name: /paste/i });
  return view;
}

it('picks Whole lesson for an uploaded plan with no sessions or days', async () => {
  upload.mockResolvedValue(Response.json({ text: ONE_SESSION, fileName: 'co.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  expect(checked()).toEqual(['Whole lesson']);
});

it('leaves the choice open for an uploaded plan with sessions', async () => {
  upload.mockResolvedValue(Response.json({ text: MULTI_DAY, fileName: 'dll.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  expect(checked()).toEqual([]);
});

it('keeps a session the teacher picks while the upload is still running', async () => {
  let finish!: (response: Response) => void;
  upload.mockImplementation(() => new Promise<Response>(done => { finish = done; }));
  const { container } = await renderHome();
  await chooseFile(container);
  chooseSession('Session 2');
  await act(async () => { finish(Response.json({ text: ONE_SESSION, fileName: 'co.docx' })); });
  expect(checked()).toEqual(['Session 2']);
});

it('drops its own Whole lesson pick when a multi-day plan replaces the lesson', async () => {
  upload.mockResolvedValueOnce(Response.json({ text: ONE_SESSION, fileName: 'co.docx' }))
    .mockResolvedValueOnce(Response.json({ text: MULTI_DAY, fileName: 'dll.docx' }));
  const { container } = await renderHome();
  await chooseFile(container);
  expect(checked()).toEqual(['Whole lesson']);
  await chooseFile(container);
  expect(checked()).toEqual([]);
});

it('suggests for pasted text too, without overriding the teacher', async () => {
  await renderHome();
  fireEvent.click(screen.getByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ONE_SESSION } });
  expect(radio('Whole lesson').checked).toBe(true);
  chooseSession('Session 1');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: `${ONE_SESSION}\nEvaluate` } });
  expect(checked()).toEqual(['Session 1']);
});

it.each([
  ['Whole lesson', ['Whole lesson (ready) (current)']],
  ['Session 1', ['Session 1 (ready) (current)', 'Session 2', 'Session 3', 'Session 4', 'Session 5']],
])('offers only the same kind of deck after %s', async (session, options) => {
  await renderHome();
  fireEvent.click(screen.getByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ONE_SESSION } });
  chooseSession(session);
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox', { name: 'Slides' });
  fireEvent.click(screen.getByRole('button', { name: 'Another session' }));
  const select = within(screen.getByRole('dialog')).getByLabelText('Select Session');
  expect(within(select).getAllByRole('option').map(o => o.textContent).slice(1)).toEqual(options);
});
