// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ImageLibraryPicker } from '@/components/ImageLibraryPicker';

const hint = 'ShareAlike: the copy in your deck is an adapted copy and stays under the same license.';
const candidate = (fileId: number, licenseKind: string, licenseName: string) => ({ source: 'commons', fileId, title: `File:${licenseName}.jpg`,
  selectable: true, sourceUrl: `https://commons.wikimedia.org/wiki/File:${fileId}.jpg`, creator: 'Jane', licenseKind, licenseName });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows the ShareAlike hint only on CC BY-SA candidates, above their button', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ candidates: [
    candidate(1, 'cc-by-sa', 'CC BY-SA 4.0'), candidate(2, 'cc-by', 'CC BY 4.0'), candidate(3, 'cc0', 'CC0'), candidate(4, 'public-domain', 'Public domain'),
  ] })));
  render(<ImageLibraryPicker title="Meteor" onSelect={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Image source'), { target: { value: 'commons' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search Commons' }));
  const hints = await screen.findAllByText(hint);
  expect(hints).toHaveLength(1);
  const card = hints[0].closest('article')!;
  expect(card.textContent).toContain('File:CC BY-SA 4.0.jpg');
  expect(hints[0].nextElementSibling?.textContent).toBe('Use this image');
});
