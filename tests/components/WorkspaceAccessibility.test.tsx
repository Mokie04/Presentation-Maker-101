// @vitest-environment jsdom
import { automaticImageResponse } from '../helpers/image-responses';
import React from 'react';
import { chooseSession } from '../helpers/workspace';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import Home from '@/app/page';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: ['Plants', 'Leaves', 'Flowers'].map((title, i) => ({ slideNumber: i + 1,
  part: i === 0 ? 'Title Page' : 'Discussion', title, contentPoints: [title], visualDescription: `${title} diagram` })) };
beforeEach(() => { vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
  if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
  if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
  if (url === '/api/generate-image' && JSON.parse(String(init?.body)).variation === 0) return automaticImageResponse(new Promise(() => {}), init);
  throw new Error(`Unexpected request: ${url}`);
})); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function open() {
  render(<Home />); fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  chooseSession('Session 1');
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
  expect(screen.getByRole('status', { name: '' }).textContent).toBe('Slide 1 of 1 · 4. DISCUSSION');
});
it.each(['Enter', 'Escape'])('returns title focus after %s and leaves live slide status unchanged while typing', async key => {
  await open(); const stage = screen.getByRole('region', { name: 'Slide stage' });
  fireEvent.click(within(stage).getByRole('button', { name: 'Edit slide title' }));
  const status = screen.getByRole('status', { name: '' }); const text = status.textContent;
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

it('does not arm content focus when clicking active Normal before editing a panel field', async () => {
  await open();
  const normal = screen.getByRole('button', { name: 'Normal' }); normal.focus(); fireEvent.click(normal);
  const title = screen.getByRole('textbox', { name: 'Slide Title' }); title.focus();
  fireEvent.change(title, { target: { value: 'Edited plants' } });
  expect(document.activeElement).toBe(title);
  fireEvent.change(title, { target: { value: 'Edited plants again' } });
  expect(document.activeElement).toBe(title);
});
it('does not arm content focus when clicking active sorter before duplicating a slide', async () => {
  await open();
  const sorter = screen.getByRole('button', { name: 'Slide sorter' }); fireEvent.click(sorter);
  sorter.focus(); fireEvent.click(sorter);
  const duplicate = screen.getByRole('button', { name: 'Duplicate slide 1' }); duplicate.focus(); fireEvent.click(duplicate);
  expect(document.activeElement).toBe(duplicate);
  expect(screen.getAllByRole('listitem', { name: /^Slide/ })).toHaveLength(4);
});
// jsdom keeps focus on a button that becomes disabled; browsers drop it to the page a frame
// later, where the slide keys no longer reach the workspace. Move it to the stage first.
it.each(['Next slide', 'Previous slide'])('moves focus to the stage when %s reaches its disabled boundary', async name => {
  await open();
  if (name === 'Previous slide') {
    fireEvent.keyDown(screen.getByRole('region', { name: 'Slide stage' }), { key: 'End' });
  }
  const button = screen.getByRole('button', { name }); button.focus();
  fireEvent.click(button); expect(document.activeElement).toBe(button);
  fireEvent.click(button);
  expect(button.hasAttribute('disabled')).toBe(true);
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Slide stage' }));
});
it.each([
  { name: 'Download PowerPoint', busy: 'Compiling PPTX...', path: '/api/download-pptx' },
  { name: 'Download Outline', busy: 'Exporting...', path: '/api/download-markdown' },
])('retains $name focus while pending and guards duplicate download requests', async ({ name, busy, path }) => {
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>(done => { resolve = done; });
  const originalFetch = fetch;
  const exportRequest = vi.fn(() => pending);
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => url === path ? exportRequest() : originalFetch(url, init)));
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  await open();
  const button = screen.getByRole('button', { name }); button.focus(); fireEvent.click(button);
  await waitFor(() => expect(exportRequest).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: busy })).toBe(button);
  expect(button.hasAttribute('disabled')).toBe(false);
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(document.activeElement).toBe(button);
  fireEvent.click(button); fireEvent.click(button);
  expect(exportRequest).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(Response.json({ error: 'Controlled export failure' }, { status: 500 })); });
  expect(screen.getByRole('button', { name })).toBe(button);
  expect(button.getAttribute('aria-disabled')).not.toBe('true');
  expect(document.activeElement).toBe(button);
  alert.mockRestore();
});
it('leaves PageDown on a focused download button to the button', async () => {
  await open();
  const button = screen.getByRole('button', { name: 'Download PowerPoint' }); button.focus();
  expect(fireEvent.keyDown(button, { key: 'PageDown' })).toBe(true);
  expect(screen.getByRole('option', { name: 'Slide 1: Plants' }).getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(button);
});

it('uses the presentation topic as the workspace only level-one heading', async () => {
  await open();
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings).toHaveLength(1);
  expect(headings[0].textContent).toBe('Plants');
});
// jsdom has no layout. At 1024-1100px the action buttons left the zero-basis title column
// about 10px wide (one letter per line); a minimum width makes the buttons wrap instead.
it('keeps a minimum width for the topic column when it shares a row with the actions', async () => {
  await open();
  const column = screen.getByRole('heading', { level: 1 }).parentElement!;
  expect(column.className.split(/\s+/)).toEqual(expect.arrayContaining(['lg:basis-0', 'lg:flex-1', 'lg:min-w-64']));
});
it('allows an unbroken writer name to wrap without shrinking its icon', async () => {
  const originalFetch = fetch;
  const writers = 'W'.repeat(300);
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => url === '/api/generate'
    ? Promise.resolve(Response.json({ ...presentation, originalWriters: writers })) : originalFetch(url, init)));
  await open();
  const text = screen.getByText(`Writers: ${writers}`);
  expect.soft(text.classList.contains('[overflow-wrap:anywhere]')).toBe(true);
  expect.soft(text.classList.contains('min-w-0')).toBe(true);
  expect.soft(text.parentElement!.querySelector('svg')!.classList.contains('shrink-0')).toBe(true);
});
