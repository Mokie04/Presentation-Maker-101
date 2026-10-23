// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ImageLibraryPicker } from '@/components/ImageLibraryPicker';

const usable = (fileId: number) => ({ source: 'commons', fileId, title: `File:Usable ${fileId}.png`, selectable: true,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:Usable_${fileId}.png`, licenseName: 'Public domain', licenseKind: 'public-domain' });
const unavailable = (fileId: number) => ({ source: 'commons', fileId, title: `File:Blocked ${fileId}.png`, selectable: false,
  sourceUrl: `https://commons.wikimedia.org/wiki/File:Blocked_${fileId}.png`, licenseName: 'CC BY-SA 4.0',
  unavailableReason: `License "CC BY-SA 4.0" is not supported in this version. (${fileId})` });

let fetchMock: ReturnType<typeof vi.fn>;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function openCommons(...responses: unknown[][]) {
  fetchMock = vi.fn();
  responses.forEach((candidates) => fetchMock.mockResolvedValueOnce(Response.json({ candidates })));
  vi.stubGlobal('fetch', fetchMock);
  render(<ImageLibraryPicker title="Meteor" onSelect={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
}
const search = () => fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
const titles = () => screen.queryAllByText(/^File:/).map((node) => node.textContent);

describe('unavailable Commons results', () => {
  it('shows usable results and hides unavailable ones behind a toggle', async () => {
    openCommons([usable(1), usable(2), unavailable(3), unavailable(4), unavailable(5)]);
    search();
    const toggle = await screen.findByRole('button', { name: 'Show 3 unavailable results' });
    expect(titles()).toEqual(['File:Usable 1.png', 'File:Usable 2.png']);
    expect(screen.queryByText(/is not supported/)).toBeNull();

    fireEvent.click(toggle);
    expect(titles()).toEqual(['File:Usable 1.png', 'File:Usable 2.png', 'File:Blocked 3.png', 'File:Blocked 4.png', 'File:Blocked 5.png']);
    expect(screen.getByText('License "CC BY-SA 4.0" is not supported in this version. (3)')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Use this image' }).map((button) => button.hasAttribute('disabled')))
      .toEqual([false, false, true, true, true]);

    fireEvent.click(screen.getByRole('button', { name: 'Hide unavailable results' }));
    expect(titles()).toEqual(['File:Usable 1.png', 'File:Usable 2.png']);
  });

  it('counts a single unavailable result in the singular', async () => {
    openCommons([usable(1), unavailable(2)]);
    search();
    expect(await screen.findByRole('button', { name: 'Show 1 unavailable result' })).toBeTruthy();
  });

  it('shows no toggle when every result is usable', async () => {
    openCommons([usable(1), usable(2)]);
    search();
    await screen.findByText('File:Usable 2.png');
    expect(screen.queryByRole('button', { name: /unavailable result/ })).toBeNull();
  });

  it('explains a search with no usable result and shows why', async () => {
    openCommons([unavailable(1), unavailable(2)]);
    search();
    expect(await screen.findByText('No usable images found. 2 results are unavailable because of their licenses.')).toBeTruthy();
    expect(titles()).toEqual(['File:Blocked 1.png', 'File:Blocked 2.png']);
    fireEvent.click(screen.getByRole('button', { name: 'Hide unavailable results' }));
    expect(titles()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Show 2 unavailable results' })).toBeTruthy();
  });

  it('words a single unavailable result in the singular', async () => {
    openCommons([unavailable(1)]);
    search();
    expect(await screen.findByText('No usable images found. 1 result is unavailable because of its license.')).toBeTruthy();
  });

  it('shows all eight usable results', async () => {
    openCommons([...[1, 2, 3, 4, 5, 6, 7, 8].map(usable), ...[9, 10, 11, 12].map(unavailable)]);
    search();
    await screen.findByRole('button', { name: 'Show 4 unavailable results' });
    expect(titles()).toHaveLength(8);
  });

  it('closes the toggle when a new search starts', async () => {
    openCommons([usable(1), unavailable(2)], [usable(3), unavailable(4), unavailable(5)]);
    search();
    fireEvent.click(await screen.findByRole('button', { name: 'Show 1 unavailable result' }));
    expect(screen.getByRole('button', { name: 'Hide unavailable results' })).toBeTruthy();
    search();
    expect(await screen.findByRole('button', { name: 'Show 2 unavailable results' })).toBeTruthy();
    expect(titles()).toEqual(['File:Usable 3.png']);
  });

  it('closes the toggle when the source changes', async () => {
    openCommons([usable(1), unavailable(2)], [usable(3), unavailable(4)]);
    search();
    fireEvent.click(await screen.findByRole('button', { name: 'Show 1 unavailable result' }));
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'nasa' } });
    fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
    search();
    expect(await screen.findByRole('button', { name: 'Show 1 unavailable result' })).toBeTruthy();
    expect(titles()).toEqual(['File:Usable 3.png']);
  });
});
