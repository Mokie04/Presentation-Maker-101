// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, screen } from '@testing-library/react';
import { openWorkspace } from '../helpers/workspace';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('announces image progress and keeps a partial failure visible after the other pictures finish', async () => {
  const pending: ((response: Response) => void)[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json({ subject: 'Science', topic: 'Plants', originalWriters: 'Teacher', slides: [0, 1].map(index => ({ slideNumber: index + 1, part: 'Discussion', title: `Plants ${index}`, contentPoints: ['Grow'], visualDescription: 'Plants' })) }));
    return new Promise<Response>(resolve => { pending.push(resolve); });
  }));
  await openWorkspace();
  expect(screen.getByRole('status', { name: 'Pictures' }).textContent).toBe('Adding pictures... 0 of 2');
  await act(async () => { pending[0](Response.json({ base64: 'image' })); pending[1](Response.json({ error: 'unavailable' }, { status: 500 })); });
  expect(screen.getByRole('status', { name: 'Pictures' }).textContent).toBe('Pictures could not be added for 1 slide. Use Regenerate on a slide.');
});
it('removes the picture status after every eligible picture succeeds', async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json({ subject: 'Science', topic: 'Plants', originalWriters: 'Teacher', slides: [{ slideNumber: 1, part: 'Discussion', title: 'Plants', contentPoints: ['Grow'], visualDescription: 'Plants' }] }));
    return new Promise<Response>(done => { resolve = done; });
  }));
  await openWorkspace();
  expect(screen.getByRole('status', { name: 'Pictures' })).toBeTruthy();
  await act(async () => resolve(Response.json({ base64: 'image' })));
  expect(screen.queryByRole('status', { name: 'Pictures' })).toBeNull();
});
