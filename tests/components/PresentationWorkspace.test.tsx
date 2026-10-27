// @vitest-environment jsdom
import { automaticImageResponse } from '../helpers/image-responses';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { openWorkspace, panel, panelImageSrc, railTitles, selectSlideTitled } from '../helpers/workspace';

const presentation = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title,
    contentPoints: [title], visualDescription: `${title} diagram`,
  })),
};

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve };
}

let batch: ReturnType<typeof deferredResponse>;
let single: ReturnType<typeof deferredResponse>;

beforeEach(() => {
  batch = deferredResponse();
  single = deferredResponse();
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
    if (url === '/api/generate-image' && JSON.parse(String(init?.body)).variation === 0) return automaticImageResponse(batch.promise, init);
    if (url === '/api/generate-image') return single.promise;
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function finishBatch() {
  await act(async () => {
    batch.resolve(Response.json({ images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image' } }));
  });
}

function expectRemainingImages() {
  expect(railTitles()).toEqual(['Slide 1: Roots', 'Slide 2: Flowers']);
  selectSlideTitled('Roots');
  expect(panelImageSrc('Roots')).toContain('roots-image');
  selectSlideTitled('Flowers');
  expect(panelImageSrc('Flowers')).toContain('flowers-image');
}

describe('workspace slide deletion', () => {
  it('keeps completed images attached to their slides after deleting the middle slide', async () => {
    await openWorkspace();
    await finishBatch();
    selectSlideTitled('Leaves');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    expectRemainingImages();
  });

  it('attaches a pending batch to the remaining slides after deletion', async () => {
    await openWorkspace();
    selectSlideTitled('Leaves');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    await finishBatch();
    expectRemainingImages();
  });

  it('keeps an in-flight regeneration and its loading flag on the shifted slide', async () => {
    await openWorkspace();
    await finishBatch();
    selectSlideTitled('Flowers');
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate AI Graphic' }));
    selectSlideTitled('Leaves');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    // Deleting Leaves selects its neighbour, the shifted Flowers slide.
    expect(screen.getByRole('status', { name: '' }).textContent).toBe('Slide 2 of 2 · 4. DISCUSSION');
    expect(screen.getByRole('button', { name: 'Rendering Image...' })).toBeTruthy();
    await act(async () => { single.resolve(Response.json({ base64: 'new-flowers-image', slideIndex: 2 })); });
    expect(panelImageSrc('Flowers')).toContain('new-flowers-image');
    expect(screen.queryByRole('button', { name: 'Rendering Image...' })).toBeNull();
  });

  it.each([
    { title: 'Roots', remaining: [['Leaves', 'leaves-image'], ['Flowers', 'flowers-image']] },
    { title: 'Flowers', remaining: [['Roots', 'roots-image'], ['Leaves', 'leaves-image']] },
  ])('preserves images when deleting the $title slide', async ({ title, remaining }) => {
    await openWorkspace();
    await finishBatch();
    selectSlideTitled(title);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    expect(railTitles()).toEqual(remaining.map(([name], index) => `Slide ${index + 1}: ${name}`));
    for (const [name, image] of remaining) {
      selectSlideTitled(name);
      expect(panelImageSrc(name)).toContain(image);
    }
    // "+ Add Slide" inserts after the selected slide and selects the new slide.
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect((screen.getByLabelText('Slide Title') as HTMLInputElement).value).toBe('New Slide Topic');
    expect(within(panel()).queryByRole('img')).toBeNull();
  });

  it('ignores a deleted slide regeneration when a new slide occupies its old position', async () => {
    await openWorkspace();
    await finishBatch();
    selectSlideTitled('Flowers');
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate AI Graphic' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Slide' }));
    // Leaves is now selected, so the new slide lands at Flowers' old index 2.
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect(railTitles()).toEqual(['Slide 1: Roots', 'Slide 2: Leaves', 'Slide 3: New Slide Topic']);
    await act(async () => { single.resolve(Response.json({ base64: 'deleted-image', slideIndex: 2 })); });
    expect(within(panel()).queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rendering Image...' })).toBeNull();
    selectSlideTitled('Leaves');
    expect(panelImageSrc('Leaves')).toContain('leaves-image');
  });

});

describe('workspace regeneration failure', () => {
  it('keeps the image and shows a fixed message when regeneration fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await openWorkspace();
    await finishBatch();
    selectSlideTitled('Leaves');
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate AI Graphic' }));
    await act(async () => {
      single.resolve(Response.json({ error: 'Invalid size 1024x576 for model', slideIndex: 1 }, { status: 500 }));
    });
    expect(panelImageSrc('Leaves')).toContain('leaves-image');
    expect(screen.getByText('Regeneration failed. Kept the previous image.')).toBeTruthy();
    expect(screen.queryByText(/1024x576/)).toBeNull();
    // Every slide can still regenerate: no loading flag is left behind.
    for (const title of ['Roots', 'Leaves', 'Flowers']) {
      selectSlideTitled(title);
      expect(screen.getByRole('button', { name: 'Regenerate AI Graphic' }).hasAttribute('disabled')).toBe(false);
    }
    consoleError.mockRestore();
  });
});
