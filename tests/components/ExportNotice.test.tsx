// @vitest-environment jsdom
import { automaticImageResponse } from '../helpers/image-responses';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { openWorkspace } from '../helpers/workspace';

vi.mock('@/lib/export/compress-image', () => ({ compressImageForExport: vi.fn(async () => '') }));
vi.mock('@/lib/export/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/export/client')>()),
  downloadBlob: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') return Response.json({
      subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
      slides: ['Roots', 'Leaves'].map((title, index) => ({
        slideNumber: index + 1, part: 'Discussion', title, contentPoints: [title], visualDescription: `${title} diagram`,
      })),
    });
    if (url === '/api/generate-image' && JSON.parse(String(init?.body)).variation === 0) return automaticImageResponse(Response.json({ images: { 0: '/9j/roots', 1: '/9j/leaves' } }), init);
    if (url === '/api/download-pptx') return new Response('pptx');
    throw new Error(`Unexpected request: ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows a plain text omitted-picture status near the downloads and lets the teacher dismiss it', async () => {
  await openWorkspace();
  fireEvent.click(screen.getByRole('button', { name: 'Download PowerPoint' }));
  const message = await screen.findByText('2 pictures were left out of the PowerPoint (slides 1 and 2).');
  const status = message.closest('[role="status"]');
  expect(status).not.toBeNull();
  expect(status!.querySelector('a')).toBeNull();
  expect(status!.parentElement!.contains(screen.getByRole('button', { name: 'Download PowerPoint' }))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss export notice' }));
  expect(screen.queryByText(/pictures were left out/)).toBeNull();
});
