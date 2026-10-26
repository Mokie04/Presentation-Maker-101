import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { POST } from '@/app/api/download-pptx/route';
import { buildPptxExportRequest } from '@/lib/export/build-export-request';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { TEST_THEME } from '../helpers/test-theme';
vi.mock('@/lib/themes', async () => (await import('../helpers/test-theme')).themeModuleWithTestLook());
const presentationData = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [
  { slideNumber: 1, title: 'Water', part: 'Title Page', contentPoints: ['Science'], visualDescription: '' },
  { slideNumber: 2, title: 'Observe water', part: 'Discussion', contentPoints: ['Compare evidence'], visualDescription: 'Water diagram' },
] };
const input = { presentationData, slideImages: {}, session: 'Session 1' };
const request = (extra = {}) => new NextRequest('http://localhost/api/download-pptx', { method: 'POST', body: JSON.stringify({ ...input, ...extra }) });
afterEach(() => vi.useRealTimers());
it('preserves the exact default client request and includes only non-default theme IDs', async () => {
  const options = { compress: async (image: string) => image };
  expect((await buildPptxExportRequest(input, options)).body).toBe(JSON.stringify(input));
  expect((await buildPptxExportRequest({ ...input, themeId: 'sayuna-classic' }, options)).body).toBe(JSON.stringify(input));
  expect(JSON.parse((await buildPptxExportRequest({ ...input, themeId: TEST_THEME.id }, options)).body).themeId).toBe(TEST_THEME.id);
});
it('accepts the registered test look and exports its real palette and face', async () => {
  const response = await POST(request({ themeId: TEST_THEME.id }));
  expect(response.status).toBe(200);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xml = await zip.file('ppt/slides/slide2.xml')!.async('string');
  for (const token of [TEST_THEME.palette.primary, TEST_THEME.palette.background, TEST_THEME.palette.cardBackground]) expect(xml).toContain(token);
  expect(xml).toContain('typeface="Arial"');
});
it.each(['secret-invalid-id', 42, null, {}, ['sayuna-classic']])('returns a sanitized 400 for unsupported/non-string themeId %j', async themeId => {
  const response = await POST(request({ themeId }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Invalid request: themeId: themeId must be a supported look' });
});
it('keeps absent-theme export bytes identical to the existing generator', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T00:00:00Z'));
  const response = await POST(request());
  expect(Buffer.from(await response.arrayBuffer())).toEqual(await buildPresentationPptx(presentationData, {}));
});
