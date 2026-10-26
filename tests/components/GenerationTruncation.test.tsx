// @vitest-environment jsdom
import React from 'react';
import { chooseSession } from '../helpers/workspace';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('shows the route’s too-long message on the upload screen without loading a deck', async () => {
  const message = 'This lesson is too long to convert in one pass. Choose a shorter session or paste a smaller part of the lesson plan.';
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json({ error: message }, { status: 422 }));
    throw new Error(`Unexpected request: ${url}`);
  }));
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A very long lesson.' } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  expect(await screen.findByText(message)).toBeTruthy(); expect(screen.queryByRole('listbox')).toBeNull();
  expect(vi.mocked(fetch).mock.calls.some(([url]) => url === '/api/generate-images')).toBe(false);
});
