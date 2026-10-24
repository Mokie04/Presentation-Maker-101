// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { samples } from '../lib/services/credit-samples';

// DOM tests do not decode images/canvas; preserve their distinct bytes through the real export builder.
vi.mock('@/lib/export/compress-image', () => ({ compressImageForExport: async (image: string) => image }));
const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Plants', 'Leaves', 'Flowers'].map((title, index) => ({ title, slideNumber: index + 1,
    part: index === 0 ? 'Title Page' : 'Discussion', contentPoints: [title], visualDescription: `${title} diagram` })),
};
let batchResolve: (response: Response) => void;
beforeEach(() => {
  const batch = new Promise<Response>(resolve => { batchResolve = resolve; });
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:test'; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
    if (url === '/api/generate-images') return batch;
    if (url === '/api/commons-images/search') return Promise.resolve(Response.json({ candidates: [{ ...samples.commonsFull, selectable: true }] }));
    if (url === '/api/commons-images/select') return Promise.resolve(Response.json({ base64: 'selected-leaves', metadata: samples.commonsFull }));
    if (url === '/api/download-pptx') return Promise.resolve(new Response('pptx'));
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function open() {
  render(<Home />); fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox');
}
function sorter() { fireEvent.click(screen.getByRole('button', { name: 'Slide sorter' })); }
function normal() { fireEvent.click(screen.getByRole('button', { name: 'Normal' })); }
function railTitles() { return within(screen.getByRole('listbox')).getAllByRole('option').map(el => el.getAttribute('aria-label')); }
function stage() { return screen.getByRole('region', { name: 'Slide stage' }); }
async function chooseLeavesImage() {
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 2: Leaves' }));
  fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
  fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
  await screen.findByRole('button', { name: 'Find image' });
}

describe('Slide sorter workspace', () => {
  it('reorders in the sorter and preserves selection and the new order in Normal', async () => {
    await open(); sorter();
    fireEvent.click(screen.getByRole('listitem', { name: 'Slide 2: Leaves' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 earlier' }));
    normal();
    expect(railTitles()).toEqual(['Slide 1: Leaves', 'Slide 2: Plants', 'Slide 3: Flowers']);
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Leaves');
    expect(within(stage()).getByRole('heading', { name: 'Leaves' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Slide 1 of 3 · 4. DISCUSSION');
  });

  it('duplicates independently, selects the copy, and opens it in Normal', async () => {
    await open(); sorter();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate slide 2' }));
    const cards = screen.getAllByRole('listitem');
    expect(cards[2].getAttribute('aria-current')).toBe('true');
    fireEvent.doubleClick(cards[2]);
    fireEvent.change(screen.getByLabelText('Slide Title'), { target: { value: 'Independent copy' } });
    fireEvent.change(screen.getByLabelText('Bullet 1'), { target: { value: 'Copy point' } });
    expect(railTitles()).toEqual(['Slide 1: Plants', 'Slide 2: Leaves', 'Slide 3: Independent copy', 'Slide 4: Flowers']);
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 2: Leaves' }));
    expect((screen.getByLabelText('Bullet 1') as HTMLTextAreaElement).value).toBe('Leaves');
  });

  it('inserts after the selected slide while Grid continues to append', async () => {
    await open();
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 1: Plants' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect(railTitles()).toEqual(['Slide 1: Plants', 'Slide 2: New Slide Topic', 'Slide 3: Leaves', 'Slide 4: Flowers']);
    expect(screen.getByRole('status').textContent).toBe('Slide 2 of 4 · 4. DISCUSSION');
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    normal();
    expect(railTitles()[4]).toBe('Slide 5: New Slide Topic');
    expect(screen.getByRole('status').textContent).toBe('Slide 5 of 5 · 4. DISCUSSION');
  });

  it('moves the selected rail slide with Alt arrows and with the panel buttons', async () => {
    await open();
    const rail = screen.getByRole('listbox');
    fireEvent.keyDown(rail, { key: 'ArrowDown', altKey: true });
    expect(railTitles()).toEqual(['Slide 1: Leaves', 'Slide 2: Plants', 'Slide 3: Flowers']);
    fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 later' }));
    expect(screen.getByRole('status').textContent).toBe('Slide 3 of 3 · TITLE PAGE');
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate slide' }));
    expect(screen.getByRole('status').textContent).toBe('Slide 4 of 4 · TITLE PAGE');
  });

  it('deletes a sorter card, selects its neighbour, and disables the final delete', async () => {
    await open(); sorter();
    fireEvent.click(screen.getByRole('listitem', { name: 'Slide 2: Leaves' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete slide 2' }));
    expect(screen.getByRole('listitem', { name: 'Slide 2: Flowers' }).getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Delete slide 1' }));
    expect(screen.getByRole('button', { name: 'Delete slide 1' }).hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(screen.getByRole('listitem'), { key: 'Enter' });
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Flowers');
  });

  it('exports the new slide order, remapped image indexes and credits through the real workspace download flow', async () => {
    await open();
    await act(async () => { batchResolve(Response.json({ images: { 0: 'plants-image', 1: 'leaves-image', 2: 'flowers-image' } })); });
    await chooseLeavesImage(); sorter();
    fireEvent.click(screen.getByRole('button', { name: 'Move slide 3 earlier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move slide 2 earlier' }));
    normal();
    expect(railTitles()).toEqual(['Slide 1: Flowers', 'Slide 2: Plants', 'Slide 3: Leaves']);
    expect(within(stage()).getByRole('img').getAttribute('src')).toContain('selected-leaves');
    expect(screen.getByRole('link', { name: 'Commons source' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 2: Plants' }));
    expect(within(stage()).getByRole('img').getAttribute('src')).toContain('plants-image');
    fireEvent.click(screen.getByRole('button', { name: 'Download PowerPoint' }));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => url === '/api/download-pptx')).toBe(true));
    const call = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/download-pptx')!;
    const body = JSON.parse(String(call[1]?.body));
    expect(body.presentationData.slides.map((slide: { title: string; slideNumber: number }) => [slide.title, slide.slideNumber]))
      .toEqual([['Flowers',1],['Plants',2],['Leaves',3]]);
    expect(body.slideImages).toEqual({ 0:'flowers-image', 1:'plants-image', 2:'data:image/png;base64,selected-leaves' });
    expect(body.presentationData.slides.map((slide: { imageMetadata?: unknown }) => slide.imageMetadata))
      .toEqual([undefined, undefined, samples.commonsFull]);
    expect(body.presentationData.slides.every((slide: object) => !('id' in slide))).toBe(true);
  });
});
