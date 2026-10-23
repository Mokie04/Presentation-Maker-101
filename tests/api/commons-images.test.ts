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

const routeCases = [
  { name: 'search', endpoint: search, body: { query: 'roots' }, field: 'query',
    prepare: () => vi.spyOn(commons, 'searchCommonsImages').mockResolvedValue([candidate]) },
  { name: 'select', endpoint: select, body: { fileId: 42 }, field: 'fileId',
    prepare: () => vi.spyOn(commons, 'fetchCommonsImageBase64').mockResolvedValue(selected) },
];

describe.each(routeCases)('Commons $name response policy', ({ name, endpoint, body, field, prepare }) => {
  it('returns a non-cacheable 401 before reading an invalid body or calling the provider', async () => {
    vi.stubEnv('APPSTORE_AUTH_ENABLED', 'true'); vi.stubEnv('APPSTORE_SHARED_SECRET', 'test-shared-secret');
    const provider = prepare();
    const request = new NextRequest('http://localhost/api/commons-images', { method: 'POST', body: 'not JSON', headers: { 'Content-Length': '9000' } });
    const stream = vi.spyOn(request, 'body', 'get');
    const response = await endpoint(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(stream).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled();
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
    const response = await endpoint(new NextRequest('http://localhost/api/commons-images', { method: 'POST', body: 'not JSON' }));
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
    expect(await response.json()).toEqual({ error: 'Commons request failed.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(log).toHaveBeenCalledWith(`[commons-images/${name}]`, error);
  });

  it.each([120, 60])('preserves the full 429 body and headers with %i seconds cooldown', async (seconds) => {
    prepare().mockRejectedValueOnce(new commons.CommonsProviderError('Slow down', 429, seconds));
    const response = await endpoint(req(body));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Slow down', retryAfterSeconds: seconds });
    expect(response.headers.get('Retry-After')).toBe(String(seconds));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it.each([
    { status: 422, message: 'Commons image unavailable.' },
    { status: 502, message: 'Commons request failed (503).' },
  ])('preserves authored provider errors with status $status', async ({ status, message }) => {
    prepare().mockRejectedValueOnce(new commons.CommonsProviderError(message, status));
    const response = await endpoint(req(body));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
    expect(response.headers.get('Retry-After')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
