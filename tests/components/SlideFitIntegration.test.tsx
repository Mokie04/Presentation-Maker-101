// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { openWorkspace, selectSlide } from '../helpers/workspace';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('removes the rail, stage and panel warnings immediately after panel editing', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json({ subject: 'Science', topic: 'Water', slides: [
      { slideNumber: 1, part: 'Title Page', title: 'Water', contentPoints: ['Science'], visualDescription: '' },
      { slideNumber: 2, part: 'Discussion', title: 'Evidence', contentPoints: ['Evidence '.repeat(1000)], visualDescription: '' },
    ] }));
    if (url === '/api/generate-images') return Promise.resolve(Response.json({ images: {} }));
    throw new Error(`Unexpected request: ${url}`);
  }));
  await openWorkspace(); selectSlide(2);
  expect(screen.getAllByRole('note')).toHaveLength(2);
  expect(screen.getByRole('option', { name: /Slide 2: Evidence/ }).getAttribute('aria-label')).toContain('text does not fit');
  fireEvent.change(screen.getByLabelText('Bullet 1'), { target: { value: 'Observe water' } });
  expect(screen.queryAllByRole('note')).toHaveLength(0);
  expect(screen.getByRole('option', { name: 'Slide 2: Evidence' })).toBeTruthy();
});
