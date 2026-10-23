import { afterEach, describe, expect, it, vi } from 'vitest';
import observedWaterCycle from '../../fixtures/commons-water-cycle.json';
import { commonsAssetUrlSchema } from '@/lib/image-metadata';
import { searchCommonsImages, fetchCommonsImageBase64 } from '@/lib/providers/commons-provider';
const thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Roots.svg/1200px-Roots.svg.png';
const pageUrl = 'https://commons.wikimedia.org/wiki/File:Roots.svg';
const metadata = {
  Artist: { value: '<a href="javascript:evil()">Jane &amp; Team</a><script>evil()</script>' },
  Credit: { value: '<div>Original <b>institution</b></div>' },
  Attribution: { value: 'Jane / Original institution' }, UsageTerms: { value: '<b>Creative Commons Attribution 4.0</b>' },
  AttributionRequired: { value: 'true' }, LicenseShortName: { value: 'CC BY 4.0' },
  LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/' },
};
function body(overrides: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return { batchcomplete: true, query: { pages: [{ pageid: 42, ns: 6, title: 'File:Roots.svg', index: 1,
    imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Roots.svg',
      descriptionurl: pageUrl, mime: 'image/svg+xml', thumburl: thumbnail, thumbmime: 'image/png',
      extmetadata: { ...metadata, ...overrides }, ...extra }],
  }] } };
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAE0lEQVR4nGNQaPhPEmIY1UALDQB5Ss+BakG97wAAAABJRU5ErkJggg==', 'base64');
afterEach(() => vi.useRealTimers());
describe('Commons provider with mocked HTTP', () => {
  it('accepts the observed HTTPS Commons thumbnail host in search and selection without rewriting URLs', async () => {
    const thumbnail = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/USGS_WaterCycle_English_ONLINE_20221013.png/1280px-USGS_WaterCycle_English_ONLINE_20221013.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail';
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(observedWaterCycle))
      .mockResolvedValueOnce(Response.json(observedWaterCycle))
      .mockResolvedValueOnce(new Response(png, { headers: { 'content-type': 'image/png' } }));
    const [candidate] = await searchCommonsImages('water cycle USGS', { fetchFn });
    expect(candidate).toMatchObject({ fileId: 128001773, selectable: true, previewUrl: thumbnail,
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:USGS_WaterCycle_English_ONLINE_20221013.png', licenseName: 'Public domain' });
    const selected = await fetchCommonsImageBase64(128001773, { fetchFn });
    expect(selected.metadata.assetUrl).toBe(thumbnail);
    expect(selected.metadata.creator).toContain('Hayley Corson-Dosch');
    expect(selected.metadata.licenseUrl).toBeUndefined();
    expect(fetchFn.mock.calls[2]).toEqual([thumbnail, expect.objectContaining({ redirect: 'error' })]);
  });
  it.each([
    'http://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Diagram.png/1280px-Diagram.png',
    'https://thumb.wikimedia.org.evil.example/wikipedia/commons/thumb/a.png',
    'https://evilthumb.wikimedia.org/wikipedia/commons/thumb/a.png',
    'https://user:password@thumb.wikimedia.org/wikipedia/commons/thumb/a.png',
    'https://thumb.wikimedia.org:8443/wikipedia/commons/thumb/a.png',
    'https://thumb.wikimedia.org/wikipedia/en/thumb/a.png',
    'https://thumb.wikimedia.org/wikipedia/commons/a.png',
    '/wikipedia/commons/thumb/a.png', 'file:///wikipedia/commons/thumb/a.png',
  ])('rejects unsafe variants of the newly supported host: %s', (url) => {
    expect(commonsAssetUrlSchema.safeParse(url).success).toBe(false);
  });
  it('searches files only, requests sized imageinfo/extmetadata, and removes unsafe HTML', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body()));
    const [candidate] = await searchCommonsImages('root diagram', { fetchFn });
    expect(candidate).toMatchObject({ source: 'commons', fileId: 42, title: 'File:Roots.svg',
      creator: 'Jane & Team', credit: 'Original institution', attribution: 'Jane / Original institution', usageTerms: 'Creative Commons Attribution 4.0',
      licenseName: 'CC BY 4.0', licenseKind: 'cc-by', licenseUrl: metadata.LicenseUrl.value,
      sourceUrl: pageUrl, previewUrl: thumbnail, selectable: true });
    expect(candidate.creator).not.toContain('<'); expect(candidate.creator).not.toContain('evil');
    const [url, init] = fetchFn.mock.calls[0]; const params = new URL(String(url)).searchParams;
    expect(params.get('generator')).toBe('search'); expect(params.get('gsrnamespace')).toBe('6');
    expect(params.get('gsrlimit')).toBe('20'); expect(params.get('iiurlwidth')).toBe('1200');
    expect(params.get('iiprop')).toContain('extmetadata');
    expect(init).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal), headers: {
      'User-Agent': expect.stringContaining('SayunaPresentationMaker/'),
    } });
  });
  it('does not expose an SVG or HTML thumbnail as a browser preview', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body({}, { thumbmime: 'image/svg+xml' })));
    const [candidate] = await searchCommonsImages('diagram', { fetchFn });
    expect(candidate.previewUrl).toBeUndefined(); expect(candidate.selectable).toBe(false);
  });
  it('keeps an unsafe thumbnail unavailable without poisoning other search results', async () => {
    const data = body();
    data.query.pages.push({ ...data.query.pages[0], pageid: 43, imageinfo: [{ ...data.query.pages[0].imageinfo[0], thumburl: 'https://evil.example/icon.png' }] });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(data));
    const candidates = await searchCommonsImages('diagram', { fetchFn });
    expect(candidates[0].selectable).toBe(true);
    expect(candidates[1]).toMatchObject({ fileId: 43, selectable: false });
    expect(candidates[1].previewUrl).toBeUndefined();
  });
  it('reloads by numeric file ID and downloads only the raster thumbnail, not SVG/original', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(body()))
      .mockResolvedValueOnce(new Response(png, { headers: { 'content-type': 'image/png' } }));
    const result = await fetchCommonsImageBase64(42, { fetchFn });
    expect(result.metadata).toMatchObject({ source: 'commons', fileId: 42, creator: 'Jane & Team',
      assetUrl: thumbnail, mimeType: 'image/png', rendition: 'thumbnail', licenseKind: 'cc-by' });
    expect(result.base64).toBe(png.toString('base64'));
    expect(new URL(String(fetchFn.mock.calls[0][0])).searchParams.get('pageids')).toBe('42');
    expect(fetchFn.mock.calls[1][0]).toBe(thumbnail);
  });
  it.each([
    [{ LicenseShortName: { value: 'Public domain' }, LicenseUrl: { value: '' }, Copyrighted: { value: 'False' }, AttributionRequired: { value: 'false' } }, 'public-domain'],
    [{ LicenseShortName: { value: 'CC0' }, LicenseUrl: { value: 'http://creativecommons.org/publicdomain/zero/1.0/' }, AttributionRequired: { value: 'false' } }, 'cc0'],
  ])('supports clearly identified public domain or CC0: %j', async (fields, licenseKind) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body(fields)));
    expect((await searchCommonsImages('roots', { fetchFn }))[0]).toMatchObject({ selectable: true, licenseKind });
  });
  it.each(['', '/'])('accepts the observed CC BY 3.0 license with trailing slash %j in search and selection', async (suffix) => {
    const fields = { Artist: { value: 'Navicore' }, LicenseShortName: { value: 'CC BY 3.0' },
      LicenseUrl: { value: `https://creativecommons.org/licenses/by/3.0${suffix}` } };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(body(fields)))
      .mockResolvedValueOnce(Response.json(body(fields)))
      .mockResolvedValueOnce(new Response(png, { headers: { 'content-type': 'image/png' } }));
    expect((await searchCommonsImages('meteor', { fetchFn }))[0]).toMatchObject({ selectable: true,
      creator: 'Navicore', licenseKind: 'cc-by', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' });
    const selected = await fetchCommonsImageBase64(42, { fetchFn });
    expect(selected.metadata).toMatchObject({ creator: 'Navicore', licenseKind: 'cc-by',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0/' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
  it.each([
    { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } },
    { LicenseShortName: { value: 'Unknown' } }, { LicenseUrl: { value: '' } },
    { LicenseUrl: { value: 'https://creativecommons.org.evil.example/licenses/by/4.0/' } },
    { LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } },
    { LicenseUrl: { value: 'https://creativecommons.org/licenses/by/3.0' } },
    { LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0//' } },
    { LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0?other=license' } },
    { LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0#other' } },
    { LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/deed.en' } },
    { Artist: { value: '' } }, { AttributionRequired: { value: 'false' } },
    { Restrictions: { value: 'Additional restrictions' } },
    { LicenseShortName: { value: 'Public domain' }, Copyrighted: { value: 'True' } },
  ])('disables unsupported/unclear licenses and cannot select them: %j', async (fields) => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(body(fields)));
    const candidate = (await searchCommonsImages('roots', { fetchFn }))[0];
    expect(candidate.selectable).toBe(false); expect(candidate.unavailableReason).toBeTruthy();
    await expect(fetchCommonsImageBase64(42, { fetchFn })).rejects.toThrow(/unavailable|license|creator|restriction/i);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
  it('keeps missing creator missing and never uses the uploader for PD images', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body({ Artist: { value: '' },
      LicenseShortName: { value: 'Public domain' }, LicenseUrl: { value: '' }, Copyrighted: { value: 'False' },
      AttributionRequired: { value: 'false' } }, { user: 'Uploader' })));
    expect((await searchCommonsImages('roots', { fetchFn }))[0].creator).toBeUndefined();
  });
  it('distinguishes no results from malformed responses and upstream failures', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ batchcomplete: true }))
      .mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(new Response(null, { status: 500 }));
    expect(await searchCommonsImages('none', { fetchFn })).toEqual([]);
    await expect(searchCommonsImages('broken', { fetchFn })).rejects.toThrow(/response/i);
    await expect(searchCommonsImages('error', { fetchFn })).rejects.toThrow('500');
  });
  it.each(['https://evil.example/a.png', 'https://upload.wikimedia.org.evil.example/a.png',
    'http://upload.wikimedia.org/wikipedia/commons/a.png', 'https://u:p@upload.wikimedia.org/wikipedia/commons/a.png',
    'https://upload.wikimedia.org:8443/wikipedia/commons/a.png', '/relative.png', 'file:///a.png'])('rejects unsafe asset URL %s', async (thumburl) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body({}, { thumburl })));
    await expect(fetchCommonsImageBase64(42, { fetchFn })).rejects.toThrow(/untrusted/i);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it('rejects a mismatched file ID from the upstream response', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body()));
    await expect(fetchCommonsImageBase64(99, { fetchFn })).rejects.toThrow(/matching/i);
  });
  it.each([new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }),
    new Response('<html/>', { headers: { 'content-type': 'image/png' } }),
    new Response(null, { status: 302, headers: { location: 'https://evil.example' } }),
    new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } }),
  ])('rejects unsupported, malformed, redirected, or oversized downloads', async (response) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(body())).mockResolvedValueOnce(response);
    await expect(fetchCommonsImageBase64(42, { fetchFn })).rejects.toThrow();
  });
  it('bounds JSON bytes even without content length', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(' '.repeat(512 * 1024 + 1)));
    await expect(searchCommonsImages('roots', { fetchFn })).rejects.toThrow(/size/i);
  });
  it.each([new Response(null, { status: 429, headers: { 'retry-after': '120' } }),
    Response.json({ error: { code: 'ratelimited', info: 'Slow down' } }),
    Response.json({ error: { code: 'maxlag', info: 'Busy' } }),
  ])('surfaces rate limits without retry', async (response) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(searchCommonsImages('roots', { fetchFn })).rejects.toMatchObject({ status: 429, retryAfterSeconds: expect.any(Number) });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it.each(['headers', 'body'])('times out during %s consumption', async (stage) => {
    vi.useFakeTimers(); let signal: AbortSignal | null | undefined;
    const fetchFn = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
      signal = init?.signal;
      return stage === 'headers' ? new Promise(() => {}) : Promise.resolve(new Response(new ReadableStream({ start() {} })));
    });
    const pending = expect(searchCommonsImages('roots', { fetchFn })).rejects.toThrow(/timed out/i);
    await Promise.all([pending, vi.advanceTimersByTimeAsync(10_000)]); expect(signal?.aborted).toBe(true);
  });
});
