// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
import { chooseSession } from '../helpers/workspace';

const BUSY = 'The AI service is busy right now. Please try again in a minute.';
const UNUSABLE = 'The AI could not format this lesson. Please try again, or try a shorter part of the lesson plan.';
const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: [{ slideNumber: 1, title: 'Roots', part: 'Discussion', contentPoints: ['Roots'], visualDescription: '' }] };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function stubGenerate(generate: () => Response) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') return generate();
    if (url === '/api/generate-image') return Response.json({ base64: 'image' });
    throw new Error(`Unexpected request: ${url}`);
  }));
}

async function submitFromHome() {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
}

it.each([[503, BUSY], [502, UNUSABLE]])('shows the route’s %i message in the home screen error area', async (status, message) => {
  stubGenerate(() => Response.json({ error: message }, { status }));
  await submitFromHome();
  expect(await screen.findByText(message)).toBeTruthy();
  expect(screen.queryByRole('listbox')).toBeNull();
});

it('shows the busy message in the Another session dialog and keeps the current deck', async () => {
  let fail = false;
  stubGenerate(() => (fail ? Response.json({ error: BUSY }, { status: 503 }) : Response.json(presentation)));
  await submitFromHome();
  await screen.findByRole('listbox', { name: 'Slides' });
  fail = true;
  fireEvent.click(screen.getByRole('button', { name: 'Another session' }));
  const dialog = screen.getByRole('dialog', { name: 'Another session' });
  fireEvent.change(within(dialog).getByLabelText('Select Session'), { target: { value: 'Session 2' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Generate' }));
  expect((await within(dialog).findByRole('alert')).textContent).toBe(BUSY);
  expect(screen.getAllByRole('tab')).toHaveLength(1);
});
