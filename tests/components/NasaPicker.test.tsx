// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
const candidate = { nasaId: 'roots', title: '<b>Seedlings</b>', photographer: 'Jane', secondaryCreator: 'Another credit',
  description: '<script>not HTML</script> Courtesy: Original team', sourceUrl: 'https://images-assets.nasa.gov/image/roots/collection.json' };
const metadata = { ...candidate, source: 'nasa', assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.jpg',
  rendition: 'large', mimeType: 'image/jpeg' };
const presentation = { subject: 'English/Reading', originalWriters: 'Teacher', topic: 'Reading',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, i) => ({ title, slideNumber: i + 1, part: 'Discussion',
    contentPoints: [title], visualDescription: title + ' visual' })) };
function deferred() { let resolve!: (r: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { promise, resolve }; }
let selected: ReturnType<typeof deferred>;
let search: ReturnType<typeof vi.fn<() => Promise<Response>>>;
let batch: ReturnType<typeof deferred> | undefined;
let ai: ReturnType<typeof deferred> | undefined;
beforeEach(() => {
  selected = deferred(); batch = undefined; ai = undefined;
  search = vi.fn().mockResolvedValue(Response.json({ candidates: [candidate] }));
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:test'; }
    static revokeObjectURL() {}
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') return Response.json(presentation);
    if (url === '/api/generate-images') return batch ? batch.promise : Response.json({ images: { 0: 'old-roots', 1: 'old-leaves', 2: 'old-flowers' } });
    if (url === '/api/nasa-images/search') return search();
    if (url === '/api/nasa-images/select') return selected.promise;
    if (url === '/api/generate-image') return ai ? ai.promise : Response.json({ base64: 'new-ai' });
    if (url === '/api/download-markdown') return new Response('outline');
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function open() {
  render(<Home />); fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Reading about roots' } });
  fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('button', { name: 'Download Outline' });
}
async function pick(index = 0) {
  fireEvent.click(screen.getAllByRole('button', { name: 'Find NASA image' })[index]);
  expect(screen.getByLabelText('NASA search terms').getAttribute('value')).toBe(presentation.slides[index].title);
  fireEvent.change(screen.getByLabelText('NASA search terms'), { target: { value: 'seedling roots' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search NASA' }));
  await screen.findByRole('button', { name: 'Use this image' });
}
function rootsImage() { return screen.getByRole('img', { name: 'Roots' }).getAttribute('src'); }
async function finish() { await act(async () => { selected.resolve(Response.json({ base64: '/9j/2Q==', metadata })); }); }
describe('manual NASA picker with mocked responses', () => {
  it('searches editable terms, renders plain metadata, and explicitly replaces only the selected slide', async () => {
    await open(); await pick();
    expect(screen.getByText('<b>Seedlings</b>')).toBeTruthy();
    expect(screen.getByText(/Jane/)).toBeTruthy(); expect(screen.getByText(/Another credit/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'NASA source' }).getAttribute('href')).toBe(candidate.sourceUrl);
    expect(rootsImage()).toContain('old-roots');
    fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    expect(rootsImage()).toContain('/9j/2Q==');
    expect(screen.getByRole('img', { name: 'Leaves' }).getAttribute('src')).toContain('old-leaves');
    const calls = vi.mocked(fetch).mock.calls;
    expect(JSON.parse(String(calls.find(([u]) => u === '/api/nasa-images/search')?.[1]?.body))).toEqual({ query: 'seedling roots' });
    expect(JSON.parse(String(calls.find(([u]) => u === '/api/nasa-images/select')?.[1]?.body))).toEqual({ nasaId: 'roots' });
  });
  it.each(['cancel', 'empty', 'search failure', 'selection failure'])('preserves current image on %s', async (mode) => {
    await open();
    if (mode === 'empty') search.mockResolvedValueOnce(Response.json({ candidates: [] }));
    if (mode === 'search failure') search.mockResolvedValueOnce(Response.json({ error: 'upstream failed' }, { status: 502 }));
    if (mode === 'cancel' || mode === 'selection failure') {
      await pick();
      if (mode === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel NASA picker' }));
      else {
        fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
        await act(async () => { selected.resolve(Response.json({ error: 'download failed' }, { status: 502 })); });
        expect(screen.getByRole('alert')).toBeTruthy();
      }
    } else {
      fireEvent.click(screen.getAllByRole('button', { name: 'Find NASA image' })[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Search NASA' }));
      await screen.findByText(mode === 'empty' ? 'No NASA images found.' : 'upstream failed');
    }
    expect(rootsImage()).toContain('old-roots');
  });
  it('ignores a pending selection after cancellation', async () => {
    await open(); await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel NASA picker' })); await finish();
    expect(rootsImage()).toContain('old-roots');
  });
  it('keeps a pending selection on its stable slide after another slide is deleted', async () => {
    await open(); await pick(2); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[1]); await finish();
    expect(screen.getByRole('img', { name: 'Flowers' }).getAttribute('src')).toContain('/9j/2Q==');
    expect(rootsImage()).toContain('old-roots');
    fireEvent.click(screen.getByRole('button', { name: 'Download Outline' }));
    await screen.findByRole('button', { name: 'Download Outline' });
    const exportCall = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/download-markdown');
    const exported = JSON.parse(String(exportCall?.[1]?.body)).presentationData;
    expect(exported.slides[0].imageMetadata).toBeUndefined();
    expect(exported.slides[1].imageMetadata).toEqual(metadata);
  });
  it('ignores selection after target deletion, even if a new slide takes its index', async () => {
    await open(); await pick(2); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[2]);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' })); await finish();
    expect(screen.queryByRole('img', { name: 'New Slide Topic' })).toBeNull();
  });
  it('ignores pending selection after reset and subsequent generation', async () => {
    await open(); await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.click(screen.getByTitle('Reset to New Upload'));
    fireEvent.click(screen.getByRole('button', { name: /paste/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new lesson' } });
    fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
    await screen.findByRole('button', { name: 'Download Outline' }); await finish();
    expect(rootsImage()).toContain('old-roots');
  });
  it('ignores an already-running single AI response after a manual NASA selection', async () => {
    ai = deferred(); await open();
    fireEvent.click(screen.getAllByRole('button', { name: 'Regenerate AI Graphic' })[0]);
    await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    await act(async () => { ai!.resolve(Response.json({ base64: 'late-single-ai' })); });
    expect(rootsImage()).toContain('/9j/2Q==');
    expect(screen.getByText('Photographer: Jane; Secondary creator: Another credit')).toBeTruthy();
  });
  it('does not let a late automatic batch overwrite a manual selection; AI replacement clears credit', async () => {
    batch = deferred(); await open(); await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    await act(async () => { batch!.resolve(Response.json({ images: { 0: 'late-ai' } })); });
    expect(rootsImage()).toContain('/9j/2Q==');
    const card = screen.getByRole('img', { name: 'Roots' }).closest('.rounded-2xl')! as HTMLElement;
    expect(within(card).getByText(/Jane/)).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Regenerate AI Graphic' }));
    await screen.findByRole('img', { name: 'Roots' });
    await act(async () => {});
    expect(rootsImage()).toContain('new-ai');
    expect(within(card).queryByText(/Jane/)).toBeNull();
  });
});
