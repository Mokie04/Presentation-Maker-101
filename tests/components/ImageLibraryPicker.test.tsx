// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImageLibraryPicker } from '@/components/ImageLibraryPicker';

const nasa = { source: 'nasa' as const, nasaId: 'earth', title: 'Earth', selectable: true,
  assetUrl: 'https://images-assets.nasa.gov/image/earth/earth~large.jpg', rendition: 'large', mimeType: 'image/jpeg' };
const commons = { source: 'commons' as const, fileId: 42, title: 'File:Earth.png', selectable: true,
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Earth.png',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Earth.png',
  licenseKind: 'public-domain', licenseName: 'Public domain', rendition: 'thumbnail', mimeType: 'image/png' };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(['nasa', 'commons'] as const)('rejects valid metadata from the wrong library when selecting %s', async (source) => {
  const candidate = source === 'nasa' ? nasa : commons;
  const wrongMetadata = source === 'nasa' ? commons : nasa;
  const onSelect = vi.fn();
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ candidates: [candidate] }))
    .mockResolvedValueOnce(Response.json({ base64: 'aW1hZ2U=', metadata: wrongMetadata }));
  vi.stubGlobal('fetch', fetchFn);
  render(<ImageLibraryPicker title="Earth" onSelect={onSelect} onCancel={vi.fn()} />);
  if (source === 'commons') fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
  fireEvent.click(screen.getByRole('button', { name: source === 'nasa' ? 'Search NASA' : 'Search Commons' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Use this image' }));
  await waitFor(() => expect(screen.getByRole('button', { name: source === 'nasa' ? 'Search NASA' : 'Search Commons' }).hasAttribute('disabled')).toBe(false));
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toBe(`Invalid ${source === 'nasa' ? 'NASA' : 'Commons'} image response.`);
  expect(fetchFn.mock.calls[1][0]).toBe(`/api/${source}-images/select`);
  expect(JSON.parse(String(fetchFn.mock.calls[1][1]?.body))).toEqual(source === 'nasa' ? { nasaId: 'earth' } : { fileId: 42 });
});
