// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { generateDeck, openWorkspace, panel, panelImageSrc, selectSlide, selectSlideTitled } from '../helpers/workspace';
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
    if (url === '/api/nasa-images/search' || url === '/api/commons-images/search') return search();
    if (url === '/api/nasa-images/select' || url === '/api/commons-images/select') return selected.promise;
    if (url === '/api/generate-image') return ai ? ai.promise : Response.json({ base64: 'new-ai' });
    if (url === '/api/download-markdown') return new Response('outline');
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function open() { await openWorkspace('Reading about roots'); }
/** Selects slide `index` in the rail and opens its panel picker. */
function findImage(index = 0) {
  selectSlide(index + 1);
  fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
}
async function pick(index = 0) {
  findImage(index);
  expect(screen.getByLabelText('NASA search terms').getAttribute('value')).toBe(presentation.slides[index].title);
  fireEvent.change(screen.getByLabelText('NASA search terms'), { target: { value: 'seedling roots' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search NASA' }));
  await screen.findByRole('button', { name: 'Use this image' });
}
function rootsImage() { selectSlideTitled('Roots'); return panelImageSrc('Roots'); }
async function exportedSlides() {
  fireEvent.click(screen.getByRole('button', { name: 'Download Outline' }));
  await act(async () => {});
  const exportCall = vi.mocked(fetch).mock.calls.filter(([url]) => url === '/api/download-markdown').at(-1);
  return JSON.parse(String(exportCall?.[1]?.body)).presentationData.slides as { title: string; imageMetadata?: unknown }[];
}
async function finish() { await act(async () => { selected.resolve(Response.json({ base64: '/9j/2Q==', metadata })); }); }
describe('manual NASA picker with mocked responses', () => {
  it('keeps Commons selection and export credits on the stable slide, then clears them on AI replacement', async () => {
    const commons = { source: 'commons', fileId: 42, title: 'File:Roots.png', creator: 'Original artist', selectable: true,
      licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Roots.png',
      assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Roots.png/1200px-Roots.png', mimeType: 'image/png', rendition: 'thumbnail' };
    await open(); findImage(2);
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    search.mockResolvedValueOnce(Response.json({ candidates: [commons] }));
    fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
    // Selecting Roots to delete it would close this picker, so the selection completes first.
    await act(async () => { selected.resolve(Response.json({ base64: 'commons-image', metadata: commons })); });
    selectSlideTitled('Roots');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    selectSlideTitled('Flowers');
    expect(panelImageSrc('Flowers')).toContain('commons-image');
    expect(within(panel()).getByRole('img', { name: 'Flowers' }).className).toContain('object-contain');
    selectSlideTitled('Leaves');
    expect(panelImageSrc('Leaves')).toContain('old-leaves');
    const selectCall = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/commons-images/select');
    expect(JSON.parse(String(selectCall?.[1]?.body))).toEqual({ fileId: 42 });
    fireEvent.click(screen.getByRole('button', { name: 'Download Outline' }));
    await act(async () => {});
    const exportCall = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/download-markdown');
    expect(JSON.parse(String(exportCall?.[1]?.body)).presentationData.slides[1].imageMetadata.creator).toBe('Original artist');
    selectSlideTitled('Flowers');
    fireEvent.click(within(panel()).getByRole('button', { name: 'Regenerate AI Graphic' })); await act(async () => {});
    expect(panelImageSrc('Flowers')).toContain('new-ai');
    expect(screen.queryByText('Creator: Original artist; License: CC BY 4.0')).toBeNull();
  });
  it('ignores a late search after switching sources', async () => {
    const pending = deferred(); search.mockReturnValueOnce(pending.promise);
    await open(); findImage(0);
    fireEvent.click(screen.getByRole('button', { name: 'Search NASA' }));
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    await act(async () => { pending.resolve(Response.json({ candidates: [candidate] })); });
    expect(screen.queryByText('<b>Seedlings</b>')).toBeNull();
    expect(rootsImage()).toContain('old-roots');
  });
  it('switches source, aborts a pending NASA selection and clears stale results', async () => {
    await open(); await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    expect(screen.queryByText('<b>Seedlings</b>')).toBeNull();
    expect((screen.getByLabelText('Commons search terms') as HTMLInputElement).value).toBe('seedling roots');
    await finish(); expect(rootsImage()).toContain('old-roots');
    expect(screen.getByRole('button', { name: 'Search Commons' }).hasAttribute('disabled')).toBe(false);
  });
  it.each(['none', 'rate limited', 'unsupported'])('preserves the existing image for Commons %s', async (mode) => {
    await open(); findImage(0);
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    search.mockResolvedValueOnce(mode === 'none' ? Response.json({ candidates: [] })
      : mode === 'rate limited' ? Response.json({ error: 'Slow down', retryAfterSeconds: 120 }, { status: 429 })
      : Response.json({ candidates: [{ source: 'commons', fileId: 42, title: 'Unsupported file', selectable: false,
          licenseName: 'CC BY-SA 4.0', unavailableReason: 'License is not supported.' }] }));
    fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
    await screen.findByText(mode === 'none' ? 'No Commons images found.' : mode === 'rate limited' ? 'Slow down' : 'License is not supported.');
    expect(rootsImage()).toContain('old-roots');
    if (mode === 'unsupported') expect(screen.getByRole('button', { name: 'Use this image' }).hasAttribute('disabled')).toBe(true);
    if (mode === 'rate limited') expect(screen.getByRole('button', { name: 'Search Commons' }).hasAttribute('disabled')).toBe(true);
  });
  it.each(['delete', 'reset', 'switch'])('ignores late Commons selection after %s', async (mode) => {
    const commons = { source: 'commons', fileId: 42, title: 'File:Roots.png', creator: 'Original artist', selectable: true,
      licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Roots.png',
      assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Roots.png/1200px-Roots.png', mimeType: 'image/png', rendition: 'thumbnail' };
    await open(); findImage(0);
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    search.mockResolvedValueOnce(Response.json({ candidates: [commons] }));
    fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
    if (mode === 'delete') fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    if (mode === 'reset') fireEvent.click(screen.getByTitle('Reset to New Upload'));
    if (mode === 'switch') fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'nasa' } });
    await act(async () => { selected.resolve(Response.json({ base64: 'commons-image', metadata: commons })); });
    expect(screen.queryByText('Creator: Original artist; License: CC BY 4.0')).toBeNull();
    if (mode === 'switch') expect(rootsImage()).toContain('old-roots');
    // Only the selected slide is on screen, so check that no slide received the credit.
    if (mode === 'delete') expect((await exportedSlides()).map(slide => slide.imageMetadata)).toEqual([undefined, undefined]);
  });

  it('searches editable terms, renders plain metadata, and explicitly replaces only the selected slide', async () => {
    await open(); await pick();
    expect(screen.getByText('<b>Seedlings</b>')).toBeTruthy();
    expect(screen.getByText(/Jane/)).toBeTruthy(); expect(screen.getByText(/Another credit/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'NASA source' }).getAttribute('href')).toBe(candidate.sourceUrl);
    expect(rootsImage()).toContain('old-roots');
    fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    expect(rootsImage()).toContain('/9j/2Q==');
    selectSlideTitled('Leaves');
    expect(panelImageSrc('Leaves')).toContain('old-leaves');
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
      findImage(0);
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
  it('keeps a selection on its stable slide after another slide is deleted', async () => {
    // The Normal panel closes its picker when the selection changes, so the selection completes before the deletion.
    await open(); await pick(2); fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    selectSlideTitled('Leaves');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    selectSlideTitled('Flowers');
    expect(panelImageSrc('Flowers')).toContain('/9j/2Q==');
    expect(rootsImage()).toContain('old-roots');
    const exported = await exportedSlides();
    expect(exported[0].imageMetadata).toBeUndefined();
    expect(exported[1].imageMetadata).toEqual(metadata);
  });
  it('ignores selection after target deletion, even if a new slide takes its index', async () => {
    await open(); await pick(2); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    // Leaves is selected after the deletion, so the new slide takes Flowers' old index 2.
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' })); await finish();
    expect(within(panel()).queryByRole('img')).toBeNull();
    expect((await exportedSlides()).map(slide => slide.imageMetadata)).toEqual([undefined, undefined, undefined]);
  });
  it('ignores pending selection after reset and subsequent generation', async () => {
    await open(); await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' }));
    fireEvent.click(screen.getByTitle('Reset to New Upload'));
    await generateDeck('new lesson'); await finish();
    expect(rootsImage()).toContain('old-roots');
  });
  it('ignores an already-running single AI response after a manual NASA selection', async () => {
    ai = deferred(); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate AI Graphic' }));
    await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    await act(async () => { ai!.resolve(Response.json({ base64: 'late-single-ai' })); });
    expect(rootsImage()).toContain('/9j/2Q==');
    expect(screen.getByText('Photographer: Jane; Secondary creator: Another credit')).toBeTruthy();
  });
  it('does not let a late automatic batch overwrite a manual selection; AI replacement clears credit', async () => {
    batch = deferred(); await open(); await pick(); fireEvent.click(screen.getByRole('button', { name: 'Use this image' })); await finish();
    await act(async () => { batch!.resolve(Response.json({ images: { 0: 'late-ai' } })); });
    expect(rootsImage()).toContain('/9j/2Q==');
    expect(within(panel()).getByText(/Jane/)).toBeTruthy();
    fireEvent.click(within(panel()).getByRole('button', { name: 'Regenerate AI Graphic' }));
    await act(async () => {});
    expect(rootsImage()).toContain('new-ai');
    expect(within(panel()).queryByText(/Jane/)).toBeNull();
  });
});
