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

const routeCases = [
  { name: 'search', endpoint: search, body: { query: 'roots' }, field: 'query', failure: 'NASA search failed.',
    prepare: () => vi.spyOn(nasa, 'searchNasaImages').mockResolvedValue([candidate]) },
  { name: 'select', endpoint: select, body: { nasaId: 'root' }, field: 'nasaId', failure: 'NASA image retrieval failed.',
    prepare: () => {
      vi.spyOn(nasa, 'fetchNasaImageBase64').mockResolvedValue(asset);
      return vi.spyOn(nasa, 'getNasaImageCandidate').mockResolvedValue(candidate);
    } },
];

describe.each(routeCases)('NASA $name response policy', ({ name, endpoint, body, field, failure, prepare }) => {
  it('returns a non-cacheable 401 before reading an invalid body or calling the provider', async () => {
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true'); vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const provider = prepare();
    const request = new NextRequest('http://localhost/api/nasa-images', { method: 'POST', body: 'not JSON', headers: { 'Content-Length': '9000' } });
    const stream = vi.spyOn(request, 'body', 'get');
    const json = vi.spyOn(request, 'json');
    const response = await endpoint(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(stream).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
  });

  it('keeps successful responses non-cacheable', async () => {
    prepare();
    const response = await endpoint(req(body));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it.each(['declared', 'streamed'])('caps %s bodies at 8192 bytes', async (mode) => {
    const provider = prepare();
    const request = req({ ...body, ignored: 'x'.repeat(8192) });
    if (mode === 'declared') request.headers.set('Content-Length', '8193');
    const response = await endpoint(request);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Request body exceeds the size limit.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(provider).not.toHaveBeenCalled();
  });

  it('accepts exactly 8192 body bytes', async () => {
    const provider = prepare();
    const shell = JSON.stringify({ ...body, ignored: '' });
    const response = await endpoint(req({ ...body, ignored: 'x'.repeat(8192 - Buffer.byteLength(shell)) }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('normalizes invalid JSON errors', async () => {
    const provider = prepare();
    const response = await endpoint(new NextRequest('http://localhost/api/nasa-images', { method: 'POST', body: 'not JSON' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON request body.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(provider).not.toHaveBeenCalled();
  });

  it('reports schema errors by field without echoing the input', async () => {
    const provider = prepare();
    const response = await endpoint(req({ [field]: ['LEAK'] }));
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toMatch(new RegExp(`^Invalid request: ${field}:`));
    expect(result.error).not.toContain('LEAK');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(provider).not.toHaveBeenCalled();
  });

  it('logs unexpected provider errors and returns only the fixed 502 message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('LEAK TEXT_PROVIDER_API_KEY schema dump');
    prepare().mockRejectedValueOnce(error);
    const response = await endpoint(req(body));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: failure });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(log).toHaveBeenCalledWith(`[nasa-images/${name}]`, error);
  });
});

describe('NASA user-facing provider failures', () => {
  it('marks an unmatched ID as a public provider error and preserves its route message', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ collection: { items: [] } }));
    await expect(nasa.getNasaImageCandidate('missing')).rejects.toMatchObject({
      name: 'NasaProviderError', status: 502, message: 'No matching NASA image found.',
    });
    const response = await select(req({ nasaId: 'missing' }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'No matching NASA image found.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('marks an unsupported rendition as a public provider error and preserves its route message', async () => {
    vi.spyOn(nasa, 'getNasaImageCandidate').mockResolvedValue(candidate);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ collection: { items: [] } }));
    await expect(nasa.fetchNasaImageBase64('root')).rejects.toMatchObject({
      name: 'NasaProviderError', status: 502, message: 'No supported NASA presentation rendition available.',
    });
    const response = await select(req({ nasaId: 'root' }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'No supported NASA presentation rendition available.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('sanitizes a plain download error after metadata revalidation', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(nasa, 'getNasaImageCandidate').mockResolvedValue(candidate);
    const error = new Error('LEAK TEXT_PROVIDER_API_KEY schema dump');
    vi.spyOn(nasa, 'fetchNasaImageBase64').mockRejectedValue(error);
    const response = await select(req({ nasaId: 'root' }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'NASA image retrieval failed.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(log).toHaveBeenCalledWith('[nasa-images/select]', error);
  });
});
