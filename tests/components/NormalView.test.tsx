// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { openWorkspace, selectSlide, stage } from '../helpers/workspace';
import { samples } from '../lib/services/credit-samples';

const presentation = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Plants', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: index === 0 ? 'Title Page' : 'Discussion', title,
    contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};
function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>(done => { resolve = done; });
  return { promise, resolve };
}
let batch: ReturnType<typeof deferredResponse>;
let single: ReturnType<typeof deferredResponse>;

beforeEach(() => {
  batch = deferredResponse(); single = deferredResponse();
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
    if (url === '/api/generate-images') return batch.promise;
    if (url === '/api/generate-image') return single.promise;
    if (url === '/api/commons-images/search') return Promise.resolve(Response.json({ candidates: [{ ...samples.commonsFull, selectable: true }] }));
    if (url === '/api/commons-images/select') return Promise.resolve(Response.json({ base64: 'selected-library-image', metadata: samples.commonsFull }));
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });


describe('Normal workspace', () => {
  it('defaults to Normal with rail, stage and always-editable panel and preserves header actions', async () => {
    await openWorkspace();
    expect(screen.getByRole('button', { name: 'Normal' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('complementary', { name: 'Slide settings' })).toBeTruthy();
    expect(within(stage()).getByRole('heading', { name: 'Plants' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Slide 1 of 3 · TITLE PAGE');
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('button', { name: 'Edit Slides' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Download PowerPoint' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download Outline' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeTruthy();
    expect(screen.getByTitle('Reset to New Upload')).toBeTruthy();
  });

  it('updates stage, panel and status when a thumbnail is selected', async () => {
    await openWorkspace(); selectSlide(2);
    expect(within(stage()).getByRole('heading', { name: 'Leaves' })).toBeTruthy();
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Leaves');
    expect(screen.getByRole('status').textContent).toBe('Slide 2 of 3 · 4. DISCUSSION');
  });

  it('updates the stage and thumbnail when the selected title is edited', async () => {
    await openWorkspace(); selectSlide(2);
    fireEvent.change(screen.getByLabelText('Slide Title'), { target: { value: 'Edited leaves' } });
    expect(within(stage()).getByRole('heading', { name: 'Edited leaves' })).toBeTruthy();
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 2: Edited leaves' })).toBeTruthy();
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Slide 1: Plants' })).toBeTruthy();
  });

  it('selects the neighbour after deletion and selects a newly added slide', async () => {
    await openWorkspace(); selectSlide(2);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Flowers');
    expect(screen.getByRole('status').textContent).toBe('Slide 2 of 2 · 4. DISCUSSION');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('New Slide Topic');
    expect(screen.getByRole('status').textContent).toBe('Slide 3 of 3 · 4. DISCUSSION');
  });

  it('recovers from deleting all slides by selecting the next added slide', async () => {
    await openWorkspace();
    for (let index = 0; index < 3; index++) fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    expect(screen.queryByRole('region', { name: 'Slide stage' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect(screen.getByRole('status').textContent).toBe('Slide 1 of 1 · 4. DISCUSSION');
  });

  it('shows regeneration state and the resolved selected image on stage', async () => {
    await openWorkspace(); selectSlide(2);
    fireEvent.click(screen.getByRole('button', { name: 'Render Visual Concept Image' }));
    expect(screen.getByRole('button', { name: 'Rendering Image...' }).hasAttribute('disabled')).toBe(true);
    await act(async () => { single.resolve(Response.json({ base64: 'new-leaves-image' })); });
    expect(within(stage()).getByRole('img').getAttribute('src')).toContain('new-leaves-image');
    expect(screen.queryByText('Rendering Image...')).toBeNull();
  });

  it('keeps the panel library choice when an older batch completes', async () => {
    await openWorkspace(); selectSlide(2);
    fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
    await screen.findByRole('button', { name: 'Find image' });
    await act(async () => { batch.resolve(Response.json({ images: { 1: 'stale-batch-image', 2: 'flowers-image' } })); });
    expect(within(stage()).getByRole('img').getAttribute('src')).toContain('selected-library-image');
    expect(within(stage()).getByRole('img').className).toContain('object-contain');
    expect(screen.getByRole('link', { name: 'Commons source' })).toBeTruthy();
    selectSlide(3);
    expect(within(stage()).getByRole('img').getAttribute('src')).toContain('flowers-image');
  });

  it('aborts an old panel picker when selection changes', async () => {
    let resolve!: (response: Response) => void;
    const pending = new Promise<Response>(done => { resolve = done; });
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation((...args) => args[0] === '/api/commons-images/select' ? pending : original(...args));
    await openWorkspace(); selectSlide(2);
    fireEvent.click(screen.getByRole('button', { name: 'Find image' }));
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
    selectSlide(3);
    await act(async () => { resolve(Response.json({ base64: 'late-selection', metadata: samples.commonsFull })); });
    expect(within(stage()).queryByRole('img')).toBeNull();
    selectSlide(2);
    expect(within(stage()).queryByRole('img')).toBeNull();
  });

  it('switches to the slide sorter and back while retaining selection and edits', async () => {
    await openWorkspace(); selectSlide(2);
    fireEvent.change(screen.getByLabelText('Slide Title'), { target: { value: 'Edited leaves' } });
    expect(within(screen.getByRole('group', { name: 'Workspace view' })).getAllByRole('button').map(button => button.textContent))
      .toEqual(['Normal', 'Slide sorter']);
    fireEvent.click(screen.getByRole('button', { name: 'Slide sorter' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('listitem', { name: 'Slide 2: Edited leaves' }).getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Edited leaves');
  });

  it('handles stage keys through the workspace but leaves text editing keys alone', async () => {
    await openWorkspace();
    fireEvent.keyDown(stage(), { key: 'End' });
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('Flowers');
    fireEvent.keyDown(screen.getByLabelText('Slide Title'), { key: 'Home' });
    fireEvent.keyDown(screen.getByLabelText('Pedagogical Part'), { key: 'Home' });
    fireEvent.keyDown(screen.getByLabelText('Bullet 1'), { key: 'Home' });
    expect(screen.getByRole('status').textContent).toBe('Slide 3 of 3 · 4. DISCUSSION');
    fireEvent.keyDown(stage(), { key: 'PageUp' });
    expect(screen.getByRole('status').textContent).toBe('Slide 2 of 3 · 4. DISCUSSION');
  });

  it('opens the slideshow on the selected slide and keeps the selection after closing', async () => {
    await openWorkspace(); selectSlide(3);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('group', { name: 'Slide 3 of 3' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Previous/i }));
    expect(within(dialog).getByRole('group', { name: 'Slide 2 of 3' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Slide 3 of 3 · 4. DISCUSSION');
  });

  it('keeps normal selection independent of fullscreen slideshow navigation', async () => {
    await openWorkspace(); selectSlide(2);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('Slide 2 of 3').length).toBeGreaterThan(0);
    fireEvent.click(within(dialog).getByRole('button', { name: /exit slideshow/i }));
    expect(screen.getByRole('status').textContent).toBe('Slide 2 of 3 · 4. DISCUSSION');
  });
});
