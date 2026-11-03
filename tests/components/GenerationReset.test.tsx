// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
import type { useSlideDeck } from '@/lib/deck/use-slide-deck';
import { chooseSession } from '../helpers/workspace';

const observed = vi.hoisted(() => ({ deck: null as ReturnType<typeof useSlideDeck> | null, loadingStage: '' }));
vi.mock('@/lib/deck/use-slide-deck', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/deck/use-slide-deck')>();
  return { ...actual, useSlideDeck: () => (observed.deck = actual.useSlideDeck()) };
});
vi.mock('@/components/UploadSection', async importOriginal => {
  const actual = await importOriginal<typeof import('@/components/UploadSection')>();
  return { ...actual, UploadSection: (props: React.ComponentProps<typeof actual.UploadSection>) => {
    observed.loadingStage = props.loadingStage;
    return <actual.UploadSection {...props} />;
  } };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('clears loading and its stage on reset and ignores the aborted late generation', async () => {
  let finish!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  const data = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: [] };
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>(resolve => { finish = resolve; });
    }
    throw new Error(`Unexpected request: ${url}`);
  }));
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A plants lesson' } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  expect(screen.getByRole('button', { name: 'Processing...' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByText('Analyzing curriculum & instructional structure...')).toBeTruthy();
  // Defensive state test: the current UI has no reset control during initial generation.
  // Deliver a real hook deck to expose the real workspace reset while that request is pending.
  act(() => { observed.deck!.loadPresentation(data); });
  fireEvent.click(screen.getByRole('button', { name: 'Start over with a new lesson' }));
  expect(signal?.aborted).toBe(true);
  expect(screen.queryByRole('button', { name: 'Processing...' })).toBeNull();
  expect(screen.queryByText('Analyzing curriculum & instructional structure...')).toBeNull();
  expect(observed.loadingStage).toBe('');
  fireEvent.click(screen.getByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New lesson' } });
  chooseSession('Session 1');
  expect(screen.getByRole('button', { name: 'Generate Slides' }).hasAttribute('disabled')).toBe(false);
  await act(async () => { finish(Response.json(data)); });
  expect(screen.queryByText('No slides yet.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Generate Slides' }).hasAttribute('disabled')).toBe(false);
});
