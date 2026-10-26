// @vitest-environment jsdom
import React from 'react';
import { chooseSession } from '../helpers/workspace';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Plants', 'H_2O', 'Flowers'].map((title, index) => ({ slideNumber: index + 1,
    part: index === 0 ? 'Title Page' : 'Discussion', title,
    contentPoints: [index === 1 ? 'x^2' : title, 'Observe closely'], visualDescription: `${title} diagram` })),
};
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
    if (url === '/api/generate-images') return new Promise(() => {});
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function open() {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  chooseSession('Session 1');
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox');
}
function stage() { return within(screen.getByRole('region', { name: 'Slide stage' })); }
function select(number: number) { fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[number - 1]); }
function title() { return screen.getByLabelText('Slide Title') as HTMLInputElement; }
function start(label: string) { fireEvent.click(stage().getByRole('button', { name: label })); return stage().getByRole('textbox') as HTMLTextAreaElement; }

describe('On-slide editing in the Normal workspace', () => {
  it('updates the panel title and rail thumbnail live and accepts panel edits in return', async () => {
    await open(); select(2);
    const field = start('Edit slide title');
    expect(field.value).toBe('H_2O');
    fireEvent.change(field, { target: { value: 'Edited title' } });
    expect(title().value).toBe('Edited title');
    const option = within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 2: Edited title' });
    expect(option.textContent).toContain('Edited title');
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.change(title(), { target: { value: 'Panel title' } });
    expect(stage().getByRole('button', { name: 'Edit slide title' }).textContent).toBe('Panel title');
  });

  it('edits and inserts bullets live using Enter and returns through empty Backspace', async () => {
    await open(); select(2);
    const field = start('Edit bullet 1');
    expect(field.value).toBe('x^2');
    fireEvent.change(field, { target: { value: 'Live point' } });
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('Live point');
    fireEvent.keyDown(field, { key: 'Enter' });
    const inserted = stage().getByRole('textbox', { name: 'Edit bullet 2' }) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(inserted);
    expect(inserted.value).toBe('');
    expect((screen.getByLabelText('Bullet 3') as HTMLTextAreaElement).value).toBe('Observe closely');
    fireEvent.keyDown(inserted, { key: 'Backspace' });
    expect((stage().getByRole('textbox', { name: 'Edit bullet 1' }) as HTMLTextAreaElement).value).toBe('Live point');
    expect(screen.queryByLabelText('Bullet 3')).toBeNull();
  });

  it('restores title and bullet values on Escape through the shared deck actions', async () => {
    await open(); select(2);
    const titleField = start('Edit slide title');
    fireEvent.change(titleField, { target: { value: 'Discard title' } });
    fireEvent.keyDown(titleField, { key: 'Escape' });
    expect(title().value).toBe('H_2O');
    const point = start('Edit bullet 1');
    fireEvent.change(point, { target: { value: 'Discard point' } });
    fireEvent.keyDown(point, { key: 'Escape' });
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('x^2');
    expect(stage().queryByRole('textbox')).toBeNull();
  });

  it('leaves text navigation inside fields and retains plain and Alt rail arrows', async () => {
    await open(); select(2);
    const field = start('Edit slide title');
    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) fireEvent.keyDown(field, { key });
    expect(screen.getByRole('status').textContent).toContain('Slide 2 of 3');
    fireEvent.keyDown(field, { key: 'Enter' });
    const rail = screen.getByRole('listbox');
    fireEvent.keyDown(rail, { key: 'ArrowDown' });
    expect(title().value).toBe('Flowers');
    fireEvent.keyDown(rail, { key: 'ArrowUp', altKey: true });
    expect(within(rail).getAllByRole('option').map(el => el.getAttribute('aria-label')))
      .toEqual(['Slide 1: Plants', 'Slide 2: Flowers', 'Slide 3: H_2O']);
    expect(title().value).toBe('Flowers');
  });

  it('resets the editing session when a different stable slide is selected', async () => {
    await open(); select(2); start('Edit bullet 2');
    select(3);
    expect(stage().queryByRole('textbox')).toBeNull();
    expect(stage().getByRole('button', { name: 'Edit slide title' }).textContent).toBe('Flowers');
  });

  it('does not delete a second point when empty blur precedes the panel remove click', async () => {
    await open(); select(2);
    const field = start('Edit bullet 1');
    fireEvent.change(field, { target: { value: '' } });
    const remove = screen.getAllByRole('button', { name: 'Remove Bullet' })[0];
    fireEvent.mouseDown(remove);
    fireEvent.blur(field, { relatedTarget: remove });
    fireEvent.mouseUp(remove);
    fireEvent.click(remove, { detail: 1 });
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('Observe closely');
    expect(screen.queryByLabelText('Bullet 2')).toBeNull();
  });

  it('keeps the intended panel target when empty blur shifts a later remove button', async () => {
    await open(); select(2);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Bullet Point' }));
    const field = start('Edit bullet 1');
    fireEvent.change(field, { target: { value: '' } });
    const remove = screen.getAllByRole('button', { name: 'Remove Bullet' })[1];
    fireEvent.mouseDown(remove);
    fireEvent.blur(field, { relatedTarget: remove });
    fireEvent.mouseUp(remove);
    fireEvent.click(remove, { detail: 1 });
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('New primary discussion point');
  });

  it('opens the intended later point when leaving an empty point with the pointer', async () => {
    await open(); select(2);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Bullet Point' }));
    const field = start('Edit bullet 1');
    fireEvent.change(field, { target: { value: '' } });
    const next = stage().getByRole('button', { name: 'Edit bullet 2' });
    if (fireEvent.mouseDown(next)) fireEvent.blur(field, { relatedTarget: next });
    fireEvent.mouseUp(next);
    fireEvent.click(next, { detail: 1 });
    expect((stage().getByRole('textbox', { name: 'Edit bullet 1' }) as HTMLTextAreaElement).value).toBe('Observe closely');
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('Observe closely');
    fireEvent.change(stage().getByRole('textbox'), { target: { value: 'Discard' } });
    fireEvent.keyDown(stage().getByRole('textbox'), { key: 'Escape' });
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('Observe closely');
  });

  it('keeps rail, sorter thumbnails and fullscreen slideshow passive', async () => {
    await open();
    expect(screen.getByRole('listbox').querySelector('textarea, [aria-label^="Edit "]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Slide sorter' }));
    expect(screen.getByRole('list', { name: 'Slides in sorter' }).querySelector('textarea, [aria-label^="Edit "]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('dialog').querySelector('textarea, [aria-label^="Edit "]')).toBeNull();
  });

  it('disables on-slide editing on phones while panel editing stays live', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    await open();
    expect(stage().queryByRole('button', { name: 'Edit slide title' })).toBeNull();
    fireEvent.change(title(), { target: { value: 'Phone panel edit' } });
    expect(stage().getByRole('heading', { name: 'Phone panel edit' })).toBeTruthy();
  });
});
