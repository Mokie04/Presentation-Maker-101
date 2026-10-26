// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useDeckExport } from '@/lib/export/use-deck-export';
import { TEST_THEME } from '../../helpers/test-theme';
vi.mock('@/lib/export/client', async original => ({ ...(await original<typeof import('@/lib/export/client')>()), downloadBlob: vi.fn() }));
const presentationData = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [
  { slideNumber: 1, title: 'Water', part: 'Discussion', contentPoints: ['Observe'], visualDescription: '' },
] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('sends the active look only to PPTX, and updates the next download after a look change', async () => {
  const sent: { url: string; body: string }[] = [];
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    sent.push({ url, body: String(init?.body) });
    return Promise.resolve(url === '/api/download-pptx'
      ? { ok: true, blob: async () => new Blob(['pptx']) } : new Response('# Water'));
  });
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(({ themeId }) => useDeckExport({ presentationData, slideImages: {}, session: 'Session 1', themeId, onError: error => { throw new Error(error); } }), { initialProps: { themeId: String(TEST_THEME.id) } });
  await act(async () => { await result.current.downloadPptx(); await result.current.downloadMarkdown(); });
  expect(JSON.parse(sent[0].body).themeId).toBe(TEST_THEME.id);
  expect(JSON.parse(sent[1].body)).toEqual({ presentationData, session: 'Session 1' });
  rerender({ themeId: 'sayuna-classic' });
  await act(async () => { await result.current.downloadPptx(); });
  expect(JSON.parse(sent[2].body)).not.toHaveProperty('themeId');
});
