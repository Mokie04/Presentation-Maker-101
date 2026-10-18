// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';

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
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json(presentation));
    if (url === '/api/generate-images') return batch.promise;
    if (url === '/api/generate-image') return single.promise;
    throw new Error(`Unexpected request: ${url}`);
  }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openWorkspace() {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plant parts.' } });
  fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: 'Session 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('button', { name: /Edit/i });
  fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
}

async function finishBatch() {
  await act(async () => {
    batch.resolve(Response.json({ images: { 0: 'roots-image', 1: 'leaves-image', 2: 'flowers-image' } }));
  });
}

function expectRemainingImages() {
  expect(screen.getByRole('img', { name: 'Roots' }).getAttribute('src')).toContain('roots-image');
  expect(screen.getByRole('img', { name: 'Flowers' }).getAttribute('src')).toContain('flowers-image');
  expect(screen.queryByRole('img', { name: 'Leaves' })).toBeNull();
}

describe('workspace slide deletion', () => {
  it('keeps completed images attached to their slides after deleting the middle slide', async () => {
    await openWorkspace();
    await finishBatch();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[1]);
    expectRemainingImages();
  });

  it('attaches a pending batch to the remaining slides after deletion', async () => {
    await openWorkspace();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[1]);
    await finishBatch();
    expectRemainingImages();
  });

  it('keeps an in-flight regeneration and its loading flag on the shifted slide', async () => {
    await openWorkspace();
    await finishBatch();
    fireEvent.click(screen.getAllByRole('button', { name: 'Regenerate AI Graphic' })[2]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[1]);
    expect(screen.getByRole('button', { name: 'Rendering Image...' })).toBeTruthy();
    await act(async () => { single.resolve(Response.json({ base64: 'new-flowers-image', slideIndex: 2 })); });
    expect(screen.getByRole('img', { name: 'Flowers' }).getAttribute('src')).toContain('new-flowers-image');
    expect(screen.queryByRole('button', { name: 'Rendering Image...' })).toBeNull();
  });

  it.each([
    { index: 0, remaining: [['Leaves', 'leaves-image'], ['Flowers', 'flowers-image']] },
    { index: 2, remaining: [['Roots', 'roots-image'], ['Leaves', 'leaves-image']] },
  ])('preserves images when deleting slide at index $index', async ({ index, remaining }) => {
    await openWorkspace();
    await finishBatch();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[index]);
    for (const [title, image] of remaining) {
      expect(screen.getByRole('img', { name: title }).getAttribute('src')).toContain(image);
    }
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    expect(screen.queryByRole('img', { name: 'New Slide Topic' })).toBeNull();
  });

  it('ignores a deleted slide regeneration when a new slide occupies its old position', async () => {
    await openWorkspace();
    await finishBatch();
    fireEvent.click(screen.getAllByRole('button', { name: 'Regenerate AI Graphic' })[2]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Slide' })[2]);
    fireEvent.click(screen.getByRole('button', { name: '+ Add Slide' }));
    await act(async () => { single.resolve(Response.json({ base64: 'deleted-image', slideIndex: 2 })); });
    expect(screen.queryByRole('img', { name: 'New Slide Topic' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rendering Image...' })).toBeNull();
    expect(screen.getByRole('img', { name: 'Leaves' }).getAttribute('src')).toContain('leaves-image');
  });

});

describe('workspace regeneration failure', () => {
  it('keeps the image and shows a fixed message when regeneration fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await openWorkspace();
    await finishBatch();
    fireEvent.click(screen.getAllByRole('button', { name: 'Regenerate AI Graphic' })[1]);
    await act(async () => {
      single.resolve(Response.json({ error: 'Invalid size 1024x576 for model', slideIndex: 1 }, { status: 500 }));
    });
    expect(screen.getByRole('img', { name: 'Leaves' }).getAttribute('src')).toContain('leaves-image');
    expect(screen.getByText('Regeneration failed. Kept the previous image.')).toBeTruthy();
    expect(screen.queryByText(/1024x576/)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Regenerate AI Graphic' })).toHaveLength(3);
    consoleError.mockRestore();
  });
});
