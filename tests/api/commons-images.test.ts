import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as search } from '@/app/api/commons-images/search/route';
import { POST as select } from '@/app/api/commons-images/select/route';
import * as commons from '@/lib/providers/commons-provider';
import { createSessionToken, getAppStoreAuthConfig } from '@/lib/sessionAuth';
const metadata = { source: 'commons' as const, fileId: 42, title: 'File:Roots.png', creator: 'Original creator',
  licenseKind: 'cc-by' as const, licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Roots.png',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Roots.png/1200px-Roots.png',
  rendition: 'thumbnail' as const, mimeType: 'image/png' as const };
const candidate = { ...metadata, selectable: true, previewUrl: metadata.assetUrl };
const selected = { base64: 'image', metadata };
const req = (body: unknown, cookie?: string) => new NextRequest('http://localhost/api/commons', { method: 'POST',
  body: JSON.stringify(body), headers: cookie ? { cookie } : {} });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('protected manual Commons endpoints', () => {
  it('requires session before any provider calls and accepts a valid session', async () => {
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true'); vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const s = vi.spyOn(commons, 'searchCommonsImages').mockResolvedValue([candidate]);
    const pick = vi.spyOn(commons, 'fetchCommonsImageBase64').mockResolvedValue(selected);
    expect((await search(req({ query: 'roots' }))).status).toBe(401);
    expect((await select(req({ fileId: 42 }))).status).toBe(401);
    expect(s).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
    const token = createSessionToken({ sub: 'teacher' }, getAppStoreAuthConfig());
    const cookie = `presentation_maker_pro_session=${token}`;
    expect((await search(req({ query: 'roots' }, cookie))).status).toBe(200);
    expect((await select(req({ fileId: 42 }, cookie))).status).toBe(200);
  });
  it.each([search, select])('rejects oversized bodies before parsing, without relying on Content-Length', async (endpoint) => {
    const s = vi.spyOn(commons, 'searchCommonsImages').mockRejectedValue(new Error('Unexpected provider call')); const pick = vi.spyOn(commons, 'fetchCommonsImageBase64').mockRejectedValue(new Error('Unexpected provider call'));
    const response = await endpoint(req({ query: 'roots', fileId: 42, ignored: 'x'.repeat(9000) }));
    expect(response.status).toBe(413); expect(s).not.toHaveBeenCalled(); expect(pick).not.toHaveBeenCalled();
  });
  it('passes only the selected file ID to server-side revalidation', async () => {
    const pick = vi.spyOn(commons, 'fetchCommonsImageBase64').mockResolvedValue(selected);
    const response = await select(req({ fileId: 42, assetUrl: 'https://evil.example', creator: 'Fake', licenseName: 'Public domain' }));
    expect(response.status).toBe(200); expect(await response.json()).toEqual(selected);
    expect(pick).toHaveBeenCalledWith(42);
  });
  it('returns an empty search independently from upstream failure', async () => {
    vi.spyOn(commons, 'searchCommonsImages').mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Failed'));
    expect(await (await search(req({ query: 'none' }))).json()).toEqual({ candidates: [] });
    expect((await search(req({ query: 'failure' }))).status).toBe(502);
  });
  it('preserves rate-limit cooldown information', async () => {
    vi.spyOn(commons, 'searchCommonsImages').mockRejectedValue(new commons.CommonsProviderError('Slow down', 429, 120));
    const response = await search(req({ query: 'roots' }));
    expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('120');
    expect((await response.json()).retryAfterSeconds).toBe(120);
  });
  it.each([{}, { fileId: -1 }, { fileId: '42' }, { fileId: 1.5 }, { fileId: 'File:Roots.svg' }])('rejects invalid selection %j', async (body) => {
    expect((await select(req(body))).status).toBe(400);
  });
});
