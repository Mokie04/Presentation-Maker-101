import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchNasaImages, fetchNasaImageBase64 } from '@/lib/providers/nasa-provider';
import { searchCommonsImages, fetchCommonsImageBase64, CommonsProviderError } from '@/lib/providers/commons-provider';

const providers = [
  { name: 'NASA', search: searchNasaImages, limit: 1024 * 1024 },
  { name: 'Commons', search: searchCommonsImages, limit: 512 * 1024 },
];
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

// These assertions characterize the original providers and remain unchanged through extraction.
describe.each(providers)('$name bounded request contract', ({ name, search, limit }) => {
  it('rejects a declared oversized body before acquiring a reader and cancels it', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), { headers: { 'content-length': String(limit + 1) } });
    const read = vi.spyOn(response.body!, 'getReader');
    await expect(search('earth', { fetchFn: vi.fn<typeof fetch>().mockResolvedValue(response) }))
      .rejects.toThrow(`${name} response exceeds size limit.`);
    expect(read).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('cancels an undeclared stream when cumulative bytes cross the limit', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(limit / 2 + 1)); }, cancel,
    }, { highWaterMark: 0 }));
    await expect(search('earth', { fetchFn: vi.fn<typeof fetch>().mockResolvedValue(response) }))
      .rejects.toThrow(`${name} response exceeds size limit.`);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each(['headers', 'body'])('aborts on the exact 10-second %s timeout', async (stage) => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => stage === 'headers'
      ? new Promise<Response>(() => {}) : new Response(new ReadableStream({ cancel })));
    const assertion = expect(search('earth', { fetchFn })).rejects.toThrow(`${name} request timed out.`);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(fetchFn.mock.calls[0][1]?.signal?.aborted).toBe(true);
    if (stage === 'body') expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([302, 429, 503])('does not follow redirects and preserves HTTP %i errors', async (status) => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), {
      status, headers: { location: 'https://untrusted.example', 'retry-after': '120' },
    });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    const error = await search('earth', { fetchFn }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(name === 'Commons' ? CommonsProviderError : Error);
    expect(error).toMatchObject({ message: `${name} request failed (${status}).` });
    if (name === 'Commons') expect(error).toMatchObject({ status: status === 429 ? 429 : 502, retryAfterSeconds: 120 });
    else expect(error).not.toHaveProperty('status');
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0][1]?.redirect).toBe('error');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it.each(['http', 'declared size', 'streamed size'])('propagates cancellation failure on %s rejection', async (stage) => {
    const failure = new Error('upstream cancellation failed');
    const response = new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(limit + 1)); },
      cancel() { throw failure; },
    }, { highWaterMark: 0 }), {
      status: stage === 'http' ? 429 : 200,
      headers: stage === 'declared size' ? { 'content-length': String(limit + 1) } : {},
    });
    await expect(search('earth', { fetchFn: vi.fn<typeof fetch>().mockResolvedValue(response) })).rejects.toBe(failure);
  });

  it('preserves the server-only error before fetching', async () => {
    vi.stubGlobal('window', {});
    const fetchFn = vi.fn<typeof fetch>();
    await expect(search('earth', { fetchFn })).rejects.toThrow(`${name} provider is server-side only.`);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('preserves the distinction between missing response bodies', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null));
    await expect(search('earth', { fetchFn })).rejects.toThrow(name === 'NASA'
      ? 'Invalid NASA response shape or JSON.' : 'Commons response body is empty.');
  });
});

it.each([
  { header: '999', expected: 300 }, { header: '-5', expected: 1 },
  { header: '0', expected: 60 }, { header: 'invalid', expected: 60 }, { header: null, expected: 60 },
])('preserves Commons Retry-After handling for $header', async ({ header, expected }) => {
  const response = new Response(null, { status: 429, headers: header === null ? {} : { 'retry-after': header } });
  await expect(searchCommonsImages('earth', { fetchFn: vi.fn<typeof fetch>().mockResolvedValue(response) }))
    .rejects.toMatchObject({ message: 'Commons request failed (429).', status: 429, retryAfterSeconds: expected });
});

const nasaManifest = () => Response.json({ collection: { items: [{ href: 'https://images-assets.nasa.gov/image/earth/earth~large.jpg' }] } });
const commonsMetadata = () => Response.json({ query: { pages: [{ pageid: 42, ns: 6, title: 'File:Earth.png', imageinfo: [{
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Earth.png', mime: 'image/png',
  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Earth.png',
  extmetadata: { LicenseShortName: { value: 'Public domain' }, Copyrighted: { value: 'False' } },
}] }] } });

it.each(['NASA', 'Commons'])('%s preserves image MIME validation order', async (name) => {
  const events: string[] = [];
  const response = new Response(new ReadableStream({
    pull(controller) { events.push('read'); controller.enqueue(new Uint8Array([1])); controller.close(); },
    cancel() { events.push('cancel'); },
  }, { highWaterMark: 0 }), { headers: { 'content-type': 'text/html' } });
  const get = response.headers.get.bind(response.headers);
  vi.spyOn(response.headers, 'get').mockImplementation((key) => {
    if (key === 'content-type') events.push('type');
    return get(key);
  });
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(name === 'NASA' ? nasaManifest() : commonsMetadata())
    .mockResolvedValueOnce(response);
  await expect(name === 'NASA' ? fetchNasaImageBase64('earth', { fetchFn }) : fetchCommonsImageBase64(42, { fetchFn }))
    .rejects.toThrow(`Unsupported ${name} image content type.`);
  expect(events).toEqual(name === 'NASA' ? ['type', 'cancel'] : ['read', 'type']);
});

it.each(['NASA', 'Commons'])('%s preserves MIME versus declared-size error precedence', async (name) => {
  const response = new Response('x', { headers: { 'content-type': 'text/html', 'content-length': String(11 * 1024 * 1024) } });
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(name === 'NASA' ? nasaManifest() : commonsMetadata())
    .mockResolvedValueOnce(response);
  await expect(name === 'NASA' ? fetchNasaImageBase64('earth', { fetchFn }) : fetchCommonsImageBase64(42, { fetchFn }))
    .rejects.toThrow(name === 'NASA' ? 'Unsupported NASA image content type.' : 'Commons response exceeds size limit.');
});

it('NASA propagates cancellation failure on an image MIME mismatch', async () => {
  const failure = new Error('upstream cancellation failed');
  const response = new Response(new ReadableStream({ cancel() { throw failure; } }), {
    headers: { 'content-type': 'text/html' },
  });
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(nasaManifest()).mockResolvedValueOnce(response);
  await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toBe(failure);
});
