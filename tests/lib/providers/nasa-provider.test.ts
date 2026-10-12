import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchNasaImages, fetchNasaImageBase64, getNasaImageCandidate } from '@/lib/providers/nasa-provider';

const root = 'https://images-assets.nasa.gov/image/earth';
const preview = `${root}/earth~thumb.jpg`;
const source = `${root}/collection.json`;
const item = {
  href: source,
  data: [{ nasa_id: 'earth', media_type: 'image', title: 'Earth', description: 'Our planet',
    center: 'JSC', photographer: 'Jane', secondary_creator: 'Team' }],
  links: [{ href: preview, rel: 'preview', render: 'image' }],
};
const collection = (items: unknown[]) => Response.json({ collection: { items } });
const manifest = (...urls: string[]) => collection(urls.map((href) => ({ href })));
const imageResponse = () => new Response(new Uint8Array([255, 216, 255, 217]), {
  headers: { 'content-type': 'image/jpeg' },
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('NASA provider (HTTP mocked)', () => {
  it('revalidates selected metadata using an exact NASA ID image filter', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([item]));
    expect(await getNasaImageCandidate('earth', { fetchFn })).toMatchObject({ nasaId: 'earth', photographer: 'Jane' });
    const url = new URL(String(fetchFn.mock.calls[0][0]));
    expect(url.searchParams.get('nasa_id')).toBe('earth');
    expect(url.searchParams.get('media_type')).toBe('image');
    expect(url.searchParams.has('q')).toBe(false);
  });
  it('rejects metadata for another ID instead of selecting it', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([item]));
    await expect(getNasaImageCandidate('different', { fetchFn })).rejects.toThrow(/matching/i);
  });

  it('searches explicit terms, images only, without credentials, and preserves metadata', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([item]));
    expect(await searchNasaImages('Earth & Moon', { fetchFn })).toEqual([{
      nasaId: 'earth', title: 'Earth', description: 'Our planet', previewUrl: preview,
      sourceUrl: source, center: 'JSC', photographer: 'Jane', secondaryCreator: 'Team',
    }]);
    const [url, init] = fetchFn.mock.calls[0];
    const params = new URL(String(url)).searchParams;
    expect(params.get('q')).toBe('Earth & Moon');
    expect(params.get('media_type')).toBe('image');
    expect(params.get('page_size')).toBe('5');
    expect(init).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal) });
    expect(init?.headers).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('caps candidates even if upstream ignores page size; never downloads a search result', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection(Array(8).fill(item)));
    expect(await searchNasaImages('Earth', { fetchFn })).toHaveLength(5);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list without broadening caller terms', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([]));
    expect(await searchNasaImages('specific lunar terrain', { fetchFn })).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('keeps absent optional metadata absent, without invented credits or permissions', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([
      { data: [{ nasa_id: 'earth', media_type: 'image' }] },
    ]));
    const [candidate] = await searchNasaImages('Earth', { fetchFn });
    expect(JSON.parse(JSON.stringify(candidate))).toEqual({ nasaId: 'earth' });
  });

  it.each([{}, { collection: {} }, { collection: { items: null } },
    { collection: { items: [{ data: [] }] } },
    { collection: { items: [{ data: [{ nasa_id: 42, media_type: 'image' }] }] } },
    { collection: { items: [{ data: [{ nasa_id: 'x', media_type: 'video' }] }] } },
    { collection: { items: [{ ...item, data: [{ ...item.data[0], photographer: 42 }] }] } },
  ])('rejects malformed search data: %j', async (body) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow(/response/i);
  });

  it.each([400, 404, 429, 500, 503])('surfaces upstream HTTP %i rather than empty results', async (status) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow(String(status));
  });

  it('surfaces network and invalid JSON errors', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(new Response('not json'));
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow('network unavailable');
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow();
  });

  it.each(['', '   '])('rejects blank input without a request', async (query) => {
    const fetchFn = vi.fn<typeof fetch>();
    await expect(searchNasaImages(query, { fetchFn })).rejects.toThrow();
    await expect(fetchNasaImageBase64(query, { fetchFn })).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('retrieves only the caller-selected ID and prefers large over original and thumbnail', async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(manifest(`${root}/earth~orig.tif`, preview, `${root}/earth~large.jpg`))
      .mockResolvedValueOnce(imageResponse());
    expect(await fetchNasaImageBase64('earth', { fetchFn })).toEqual({
      nasaId: 'earth', sourceUrl: `${root}/earth~large.jpg`, rendition: 'large',
      mimeType: 'image/jpeg', base64: '/9j/2Q==',
    });
    expect(fetchFn.mock.calls.map(([url]) => String(url))).toEqual([
      'https://images-api.nasa.gov/asset/earth', `${root}/earth~large.jpg`,
    ]);
    expect(fetchFn.mock.calls[1][1]).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal) });
  });

  it('upgrades real-shaped HTTP manifest assets before making an HTTPS-only download', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ collection: {
      version: '1.1', href: 'http://images-api.nasa.gov/asset/iss035e014335',
      items: [
        { href: 'http://images-assets.nasa.gov/image/iss035e014335/iss035e014335~orig.jpg' },
        { href: 'http://images-assets.nasa.gov/image/iss035e014335/iss035e014335~large.jpg?download=1&name=a%20b' },
        { href: 'http://images-assets.nasa.gov/image/iss035e014335/iss035e014335~medium.jpg' },
        { href: 'http://images-assets.nasa.gov/image/iss035e014335/metadata.json' },
      ],
    } })).mockResolvedValueOnce(imageResponse());
    const result = await fetchNasaImageBase64('iss035e014335', { fetchFn });
    expect(result).toMatchObject({
      sourceUrl: 'https://images-assets.nasa.gov/image/iss035e014335/iss035e014335~large.jpg?download=1&name=a%20b',
      rendition: 'large', base64: '/9j/2Q==',
    });
    expect(fetchFn.mock.calls.map(([url]) => String(url))).toEqual([
      'https://images-api.nasa.gov/asset/iss035e014335',
      'https://images-assets.nasa.gov/image/iss035e014335/iss035e014335~large.jpg?download=1&name=a%20b',
    ]);
    for (const [, init] of fetchFn.mock.calls) expect(init?.redirect).toBe('error');
  });

  it.each(['http://images-assets.nasa.gov', 'http://images-assets.nasa.gov:80',
    'https://images-assets.nasa.gov', 'https://images-assets.nasa.gov:443'])(
    'canonicalizes search URLs from %s without changing path or query', async (origin) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([{ ...item,
        href: `${origin}/image/earth/collection.json?q=a%2Fb&x=1`,
        links: [{ rel: 'preview', render: 'image', href: `${origin}/image/earth/earth~thumb.jpg?q=a%20b` }],
      }]));
      expect(await searchNasaImages('Earth', { fetchFn })).toMatchObject([{
        sourceUrl: 'https://images-assets.nasa.gov/image/earth/collection.json?q=a%2Fb&x=1',
        previewUrl: 'https://images-assets.nasa.gov/image/earth/earth~thumb.jpg?q=a%20b',
      }]);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

  it('rejects redirects even for upgraded HTTP manifest assets', async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(manifest('http://images-assets.nasa.gov/image/earth/earth~large.jpg'))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://evil.example/image.jpg' } }));
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow('302');
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]).toEqual([
      'https://images-assets.nasa.gov/image/earth/earth~large.jpg',
      expect.objectContaining({ redirect: 'error' }),
    ]);
  });

  it.each(['medium', 'orig'])('uses supported %s rendition when larger display renditions are absent', async (rendition) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(manifest(preview, `${root}/earth~${rendition}.jpg`))
      .mockResolvedValueOnce(imageResponse());
    expect(await fetchNasaImageBase64('earth', { fetchFn })).toMatchObject({ rendition });
  });

  it.each([{ items: [] }, { items: [{ href: preview }] }, { items: [{ href: `${root}/earth~orig.tif` }] }])(
    'rejects a manifest with no supported presentation rendition: %j', async ({ items }) => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection(items));
      await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(/rendition/i);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

  it.each([{}, { collection: { items: [{ href: 42 }] } }])('rejects malformed manifests: %j', async (body) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(/response/i);
  });

  it.each([
    'https://evil.example/earth~large.jpg',
    'https://images-assets.nasa.gov.evil.example/earth~large.jpg',
    'http://evil.example/earth~large.jpg',
    'http://images-assets.nasa.gov.evil.example/earth~large.jpg',
    'http://user:pass@images-assets.nasa.gov/earth~large.jpg',
    'http://images-assets.nasa.gov:8080/earth~large.jpg',
    'http://images-assets.nasa.gov:443/earth~large.jpg',
    'https://images-assets.nasa.gov:80/earth~large.jpg',
    'ftp://images-assets.nasa.gov/earth~large.jpg',
    '/image/earth~large.jpg',
    'https://user:pass@images-assets.nasa.gov/earth~large.jpg',
    'https://images-assets.nasa.gov:8443/earth~large.jpg',
    'file:///earth~large.jpg', '//images-assets.nasa.gov/earth~large.jpg',
  ])('rejects untrusted URLs before downloading: %s', async (url) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(manifest(url));
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(/untrusted/i);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each(['href', 'preview'])('rejects unsafe search %s URLs', async (field) => {
    const bad = field === 'href' ? { ...item, href: 'https://evil.example/collection.json' }
      : { ...item, links: [{ rel: 'preview', render: 'image', href: 'https://evil.example/a.jpg' }] };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(collection([bad]));
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow(/untrusted/i);
  });

  it.each([302, 404, 503])('rejects download HTTP %i including redirects', async (status) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(manifest(`${root}/earth~large.jpg`))
      .mockResolvedValueOnce(new Response(null, { status, headers: { location: 'https://evil.example/a.jpg' } }));
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(String(status));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects non-image and empty downloads', async () => {
    for (const response of [new Response('<html/>', { headers: { 'content-type': 'text/html' } }),
      new Response(null, { headers: { 'content-type': 'image/jpeg' } })]) {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(manifest(`${root}/earth~large.jpg`))
        .mockResolvedValueOnce(response);
      await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow();
    }
  });

  it('bounds downloaded bytes even without Content-Length', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(manifest(`${root}/earth~large.jpg`))
      .mockResolvedValueOnce(new Response(new Uint8Array(10 * 1024 * 1024 + 1), {
        headers: { 'content-type': 'image/jpeg' },
      }));
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(/size/i);
  });

  it('rejects oversized JSON before parsing', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(' '.repeat(1024 * 1024 + 1)));
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow(/size/i);
  });

  it('rejects oversized downloads declared by Content-Length', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(manifest(`${root}/earth~large.jpg`))
      .mockResolvedValueOnce(new Response(null, { headers: {
        'content-type': 'image/jpeg', 'content-length': '10485761',
      } }));
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(/size/i);
  });

  it('rejects browser execution before making a request', async () => {
    vi.stubGlobal('window', {});
    const fetchFn = vi.fn<typeof fetch>();
    await expect(searchNasaImages('Earth', { fetchFn })).rejects.toThrow(/server-side/i);
    await expect(fetchNasaImageBase64('earth', { fetchFn })).rejects.toThrow(/server-side/i);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('encodes the selected NASA ID as one path segment', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(manifest());
    await expect(fetchNasaImageBase64('Earth/Moon & Sun?', { fetchFn })).rejects.toThrow(/rendition/i);
    expect(fetchFn.mock.calls[0][0]).toBe('https://images-api.nasa.gov/asset/Earth%2FMoon%20%26%20Sun%3F');
  });

  it.each(['search', 'manifest', 'download', 'body', 'image body'])('times out during %s and aborts the request', async (stage) => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      signal = init?.signal;
      return stage === 'body' || stage === 'image body'
        ? new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'image/jpeg' } })
        : new Promise(() => {});
    });
    if (stage === 'download' || stage === 'image body') fetchFn.mockResolvedValueOnce(manifest(`${root}/earth~large.jpg`));
    const pending = stage === 'search' || stage === 'body'
      ? searchNasaImages('Earth', { fetchFn }) : fetchNasaImageBase64('earth', { fetchFn });
    const assertion = expect(pending).rejects.toThrow(/timed out/i);
    await Promise.all([assertion, vi.advanceTimersByTimeAsync(10_000)]);
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
