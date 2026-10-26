// @vitest-environment jsdom
import React from 'react';
import { chooseSession } from '../helpers/workspace';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import Home from '@/app/page';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: ['Plants', 'Leaves', 'Flowers'].map((title, i) => ({ slideNumber: i + 1,
  part: i === 0 ? 'Title Page' : 'Discussion', title, contentPoints: [title], visualDescription: `${title} diagram` })) };
beforeEach(() => { vi.stubGlobal('fetch', vi.fn((url: string) => {
  if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
  if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
  if (url === '/api/generate-images') return new Promise(() => {});
  throw new Error(`Unexpected request: ${url}`);
})); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function open() {
  render(<Home />); fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' })); await screen.findByRole('listbox');
}
function swipe(element: HTMLElement, x: number, y: number) {
  fireEvent.touchStart(element, { touches: [{ clientX: 150, clientY: 150 }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: 150 + x, clientY: 150 + y }] });
}
it('offers bounded status-bar Previous and Next controls', async () => {
  await open();
  const previous = screen.getByRole('button', { name: 'Previous slide' }) as HTMLButtonElement;
  const next = screen.getByRole('button', { name: 'Next slide' }) as HTMLButtonElement;
  expect(previous.disabled).toBe(true);
  fireEvent.click(next); expect(screen.getByRole('status').textContent).toBe('Slide 2 of 3 · 4. DISCUSSION');
  fireEvent.click(next); expect(next.disabled).toBe(true);
  fireEvent.click(previous); expect(screen.getByRole('status').textContent).toContain('Slide 2 of 3');
});
it('swipes the stage horizontally, preserves vertical scrolling, and ignores panel gestures', async () => {
  await open(); const stage = screen.getByRole('region', { name: 'Slide stage' });
  swipe(stage, -100, 5); expect(screen.getByRole('status').textContent).toContain('Slide 2 of 3');
  swipe(screen.getByRole('region', { name: 'Slide stage' }), -90, 130);
  swipe(screen.getByRole('complementary', { name: 'Slide settings' }), -150, 0);
  expect(screen.getByRole('status').textContent).toContain('Slide 2 of 3');
  swipe(screen.getByRole('region', { name: 'Slide stage' }), 100, 5);
  expect(screen.getByRole('status').textContent).toContain('Slide 1 of 3');
});
it('does not swipe away while an inline field is being edited', async () => {
  await open(); const stage = screen.getByRole('region', { name: 'Slide stage' });
  fireEvent.click(within(stage).getByRole('button', { name: 'Edit slide title' }));
  expect(document.activeElement).toBe(within(stage).getByRole('textbox'));
  swipe(stage, -150, 0); expect(screen.getByRole('status').textContent).toContain('Slide 1 of 3');
});
it.each([true, false])('uses breakpoint-appropriate disclosure defaults (md=%s)', async matches => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  await open(); const panel = screen.getByRole('complementary', { name: 'Slide settings' });
  expect(within(panel).getByText('Slide details').closest('details')?.open).toBe(true);
  await waitFor(() => expect(within(panel).getByText('Image', { exact: true }).closest('details')?.open).toBe(matches));
  expect(within(panel).getByRole('button', { name: 'Duplicate slide' })).toBeTruthy();
  expect(within(panel).getByRole('button', { name: '+ Add Slide' })).toBeTruthy();
});
