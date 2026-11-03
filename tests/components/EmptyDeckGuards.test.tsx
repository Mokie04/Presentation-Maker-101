// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
import type { useSlideDeck } from '@/lib/deck/use-slide-deck';
import type { PresentationData } from '@/types/presentation';
import { chooseSession } from '../helpers/workspace';

// Observe the real hook so a deck update can be delivered while the modal owns focus.
const observed = vi.hoisted(() => ({ deck: null as ReturnType<typeof useSlideDeck> | null }));
vi.mock('@/lib/deck/use-slide-deck', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/deck/use-slide-deck')>();
  return { ...actual, useSlideDeck: () => {
    observed.deck = actual.useSlideDeck();
    return observed.deck;
  } };
});
const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: [],
};

beforeEach(() => {
  observed.deck = null;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') return Response.json(presentation);
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openEmptyDeck() {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByText('No slides yet.');
}

describe('empty deck guards', () => {
  it.each(['Preview', 'Download PowerPoint', 'Download Outline'])('disables %s when generation returns no slides', async (name) => {
    await openEmptyDeck();
    const button = screen.getByRole('button', { name });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(['/api/session', '/api/generate']);
  });

  it.each(['Normal', 'Slide sorter'])('recovers an empty deck from %s and enables its actions', async (view) => {
    await openEmptyDeck();
    fireEvent.click(screen.getByRole('button', { name: view }));
    fireEvent.click(screen.getByRole('button', { name: /add slide/i }));
    for (const name of ['Preview', 'Download PowerPoint', 'Download Outline']) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(false);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('New Slide Topic');
    expect(screen.getByRole('status', { name: '' }).textContent).toBe('Slide 1 of 1 · 4. DISCUSSION');
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('dialog', { name: 'Slideshow: Plants' })).toBeTruthy();
  });

  it('closes slideshow state when the deck empties so adding a slide does not reopen it', async () => {
    await openEmptyDeck();
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    act(() => { observed.deck!.deleteSlide(observed.deck!.slideIds[0]); });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Slide stage' })).toBeTruthy();
  });
});
