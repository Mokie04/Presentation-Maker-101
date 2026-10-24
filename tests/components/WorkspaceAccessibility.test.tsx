// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import axe from 'axe-core';
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
  fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' })); await screen.findByRole('listbox');
}
it('moves focus to useful content after switching views and opening a sorter slide', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Next slide' })); const sorterSwitch = screen.getByRole('button', { name: 'Slide sorter' }); sorterSwitch.focus(); fireEvent.click(sorterSwitch);
  expect(document.activeElement).toBe(screen.getByRole('listitem', { name: 'Slide 2: Leaves' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Slide stage' }));
  fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Slide stage' }));
});
it('retains stage focus across selection and rail focus with a consistent active descendant', async () => {
  await open(); const stage = screen.getByRole('region', { name: 'Slide stage' }); stage.focus();
  fireEvent.keyDown(stage, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Slide stage' }));
  const rail = screen.getByRole('listbox'); rail.focus(); fireEvent.keyDown(rail, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(rail);
  const selected = screen.getByRole('option', { name: 'Slide 3: Flowers' });
  expect(rail.getAttribute('aria-activedescendant')).toBe(selected.id);
  expect(selected.getAttribute('aria-selected')).toBe('true');
});
it('recovers focus after deleting the focused sorter card or the selected slide in Normal', async () => {
  await open(); fireEvent.click(screen.getByRole('button', { name: 'Slide sorter' }));
  const remove = screen.getByRole('button', { name: 'Delete slide 1' }); remove.focus(); fireEvent.click(remove);
  expect(document.activeElement).toBe(screen.getByRole('listitem', { name: 'Slide 1: Leaves' }));
  fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
  const panelRemove = screen.getByRole('button', { name: 'Delete Slide' }); panelRemove.focus(); fireEvent.click(panelRemove);
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Slide stage' }));
  expect(screen.getByRole('status').textContent).toBe('Slide 1 of 1 · 4. DISCUSSION');
});
it.each(['Enter', 'Escape'])('returns title focus after %s and leaves live slide status unchanged while typing', async key => {
  await open(); const stage = screen.getByRole('region', { name: 'Slide stage' });
  fireEvent.click(within(stage).getByRole('button', { name: 'Edit slide title' }));
  const status = screen.getByRole('status'); const text = status.textContent;
  const records: MutationRecord[] = []; const observer = new MutationObserver(mutations => records.push(...mutations));
  observer.observe(status, { childList: true, characterData: true, subtree: true });
  const field = within(stage).getByRole('textbox'); fireEvent.change(field, { target: { value: 'Edited plants' } });
  await Promise.resolve(); expect(status.textContent).toBe(text); expect(records).toHaveLength(0); observer.disconnect();
  fireEvent.keyDown(field, { key });
  expect(document.activeElement).toBe(within(stage).getByRole('button', { name: 'Edit slide title' }));
});
it('names the panel fields and returns focus when an image picker closes', async () => {
  await open();
  const card = screen.getByRole('complementary', { name: 'Slide settings' });
  expect(within(card).getByRole('textbox', { name: 'Slide Title' })).toBeTruthy();
  expect(within(card).getByRole('textbox', { name: 'Bullet 1' })).toBeTruthy();
  fireEvent.click(within(card).getByRole('button', { name: 'Find image' }));
  expect(document.activeElement).toBe(within(card).getByRole('textbox', { name: 'NASA search terms' }));
  fireEvent.click(within(card).getByRole('button', { name: 'Cancel NASA picker' }));
  expect(document.activeElement).toBe(within(card).getByRole('button', { name: 'Find image' }));
});
it.each(['Normal', 'Slide sorter', 'Slideshow'])('has no axe violations in %s (jsdom color contrast excluded)', async mode => {
  await open();
  if (mode === 'Slideshow') fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  else if (mode !== 'Normal') {
    fireEvent.click(screen.getByRole('button', { name: mode }));
  }
  await waitFor(() => expect(screen.getByRole('button', { name: 'Preview', hidden: true })).toBeTruthy());
  const results = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
});
