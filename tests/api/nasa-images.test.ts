import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as search } from '@/app/api/nasa-images/search/route';
import { POST as select } from '@/app/api/nasa-images/select/route';
import * as nasa from '@/lib/providers/nasa-provider';
import { createSessionToken, getAppStoreAuthConfig } from '@/lib/sessionAuth';
const candidate = { nasaId: 'root', title: '<b>Roots</b>', photographer: 'Teacher',
  secondaryCreator: 'Different credit', description: 'Courtesy of another institution',
  sourceUrl: 'https://images-assets.nasa.gov/image/root/collection.json' };
const asset = { nasaId: 'root', sourceUrl: 'https://images-assets.nasa.gov/image/root/root~large.jpg',
  base64: '/9j/2Q==', mimeType: 'image/jpeg', rendition: 'large' as const };
function req(body: unknown, cookie?: string) { return new NextRequest('http://localhost/api/nasa-images', {
  method: 'POST', body: JSON.stringify(body), headers: cookie ? { cookie } : {},
}); }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('manual NASA endpoints', () => {
  it('protects both endpoints before downstream work and allows a valid session', async () => {
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true'); vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const searchSpy = vi.spyOn(nasa, 'searchNasaImages').mockResolvedValue([candidate]);
    const metadata = vi.spyOn(nasa, 'getNasaImageCandidate').mockResolvedValue(candidate);
    const download = vi.spyOn(nasa, 'fetchNasaImageBase64').mockResolvedValue(asset);
    expect((await search(req({ query: 'roots' }))).status).toBe(401);
    expect((await select(req({ nasaId: 'root' }))).status).toBe(401);
    expect(searchSpy).not.toHaveBeenCalled(); expect(metadata).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
    const token = createSessionToken({ sub: 'teacher' }, getAppStoreAuthConfig());
    const cookie = `presentation_maker_pro_session=${token}`;
    expect((await search(req({ query: 'roots' }, cookie))).status).toBe(200);
    expect((await select(req({ nasaId: 'root' }, cookie))).status).toBe(200);
  });
  it('returns search candidates and keeps empty results separate from failure', async () => {
    const spy = vi.spyOn(nasa, 'searchNasaImages').mockResolvedValueOnce([candidate]).mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('NASA failed'));
    expect(await (await search(req({ query: ' roots ' }))).json()).toEqual({ candidates: [candidate] });
    expect(spy).toHaveBeenCalledWith('roots');
    expect(await (await search(req({ query: 'missing' }))).json()).toEqual({ candidates: [] });
    expect((await search(req({ query: 'error' }))).status).toBe(502);
  });
  it('reloads selected asset metadata and ignores forged client URLs and attribution', async () => {
    const metadata = vi.spyOn(nasa, 'getNasaImageCandidate').mockResolvedValue(candidate);
    const download = vi.spyOn(nasa, 'fetchNasaImageBase64').mockResolvedValue(asset);
    const response = await select(req({ nasaId: 'root', sourceUrl: 'https://evil.example', photographer: 'Fake' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ base64: '/9j/2Q==', metadata: {
      ...candidate, source: 'nasa', assetUrl: asset.sourceUrl, mimeType: 'image/jpeg', rendition: 'large',
    } });
    expect(metadata).toHaveBeenCalledWith('root'); expect(download).toHaveBeenCalledWith('root');
  });
  it('does not download if exact ID revalidation fails', async () => {
    vi.spyOn(nasa, 'getNasaImageCandidate').mockRejectedValue(new Error('No matching NASA image'));
    const download = vi.spyOn(nasa, 'fetchNasaImageBase64').mockResolvedValue(asset);
    expect((await select(req({ nasaId: 'missing' }))).status).toBe(502);
    expect(download).not.toHaveBeenCalled();
  });
  it.each([{}, { query: '' }, { query: [] }, { query: 'x'.repeat(501) }])('validates search input %j', async (body) => {
    expect((await search(req(body))).status).toBe(400);
  });
  it.each([{}, { nasaId: '' }, { nasaId: [] }, { nasaId: '../root' }, { nasaId: 'https://evil.example' }])(
    'validates selected ID %j', async (body) => { expect((await select(req(body))).status).toBe(400); });
});
