import { describe, expect, it, vi } from 'vitest';
import { searchCommonsImages, MAX_SELECTABLE, MAX_UNAVAILABLE, SEARCH_FETCH_LIMIT } from '@/lib/providers/commons-provider';
import { COMMONS_CASES, commonsPage } from './commons-cases';

const respond = (pages: unknown[]) => Response.json({ batchcomplete: true, query: { pages } });
const search = (pages: unknown[]) => searchCommonsImages('x', { fetchFn: async () => respond(pages) });
const fieldsOf = (name: string) => COMMONS_CASES.find(([caseName]) => caseName === name)!;
const reasonFor = async (name: string) => {
  const [, fields, info] = fieldsOf(name);
  return (await search([commonsPage(100, 1, fields, info)]))[0].unavailableReason;
};

describe('unavailable reasons', () => {
  it.each([
    ['CC BY-SA 4.0', undefined],
    ['CC BY-NC 4.0', 'License "CC BY-NC 4.0" is not supported in this version.'],
    ['GFDL', 'License "GFDL" is not supported in this version.'],
    ['no license name', 'The license could not be identified.'],
    ['CC BY without a creator', 'The creator is not identified, which this license requires.'],
    ['CC BY with an unknown author', 'The creator is not identified, which this license requires.'],
    ['CC BY with attribution not required', 'The creator is not identified, which this license requires.'],
    ['CC BY with a CC BY-SA URL', 'The license details for "CC BY 4.0" are incomplete or inconsistent.'],
    ['CC BY with a non-CC URL', 'The license details for "CC BY 4.0" are incomplete or inconsistent.'],
    ['CC0 with a wrong URL', 'The license details for "CC0" are incomplete or inconsistent.'],
    ['public domain marked copyrighted', 'The license details for "Public domain" are incomplete or inconsistent.'],
    ['CC BY with restrictions', 'Additional restrictions require review; unavailable in this version.'],
    ['an untrusted thumbnail', 'Untrusted Commons thumbnail URL; unavailable in this version.'],
    ['no thumbnail', 'No suitable JPEG/PNG thumbnail is available.'],
    ['an SVG thumbnail', 'No suitable JPEG/PNG thumbnail is available.'],
  ])('explains %s', async (name, reason) => {
    expect(await reasonFor(name)).toBe(reason);
  });

  it('caps a long license name at 60 characters with an ellipsis', async () => {
    const long = `Creative Commons ${'Very Long '.repeat(10)}License`;
    const [candidate] = await search([commonsPage(100, 1, { LicenseShortName: { value: long }, LicenseUrl: undefined })]);
    const name = candidate.unavailableReason!.match(/^License "(.*)" is not supported in this version\.$/)![1];
    expect(name).toHaveLength(60);
    expect(name.endsWith('…')).toBe(true);
    expect(long.startsWith(name.slice(0, -1))).toBe(true);
  });

  it('shows an HTML license name as plain text', async () => {
    const [candidate] = await search([commonsPage(100, 1, {
      LicenseShortName: { value: '<a href="javascript:evil()">CC BY-NC</a><script>evil()</script> <b>4.0</b>' }, LicenseUrl: undefined,
    })]);
    expect(candidate.unavailableReason).toBe('License "CC BY-NC 4.0" is not supported in this version.');
  });
});

describe('result list', () => {
  it('asks Commons for SEARCH_FETCH_LIMIT results', async () => {
    const fetchFn = vi.fn(async () => respond([commonsPage(1, 1)]));
    await searchCommonsImages('x', { fetchFn: fetchFn as unknown as typeof fetch });
    const call = (fetchFn.mock.calls as unknown as [string][])[0];
    expect(new URL(call[0]).searchParams.get('gsrlimit')).toBe(String(SEARCH_FETCH_LIMIT));
    expect(SEARCH_FETCH_LIMIT).toBe(20);
  });

  it('lists usable results first, then unavailable ones, each in rank order', async () => {
    const [, ncFields] = fieldsOf('CC BY-NC 4.0');
    const pages = [commonsPage(1, 1, ncFields), commonsPage(2, 2), commonsPage(3, 3, ncFields), commonsPage(4, 4)];
    const candidates = await search(pages.reverse());
    expect(candidates.map((candidate) => [candidate.fileId, candidate.selectable])).toEqual([[2, true], [4, true], [1, false], [3, false]]);
  });

  it('returns at most MAX_SELECTABLE usable and MAX_UNAVAILABLE unavailable results', async () => {
    const [, ncFields] = fieldsOf('CC BY-NC 4.0');
    const pages = Array.from({ length: 20 }, (_, i) => commonsPage(i + 1, i + 1, i % 2 ? ncFields : {}));
    const candidates = await search(pages);
    expect([MAX_SELECTABLE, MAX_UNAVAILABLE]).toEqual([8, 4]);
    expect(candidates.filter((candidate) => candidate.selectable).map((candidate) => candidate.fileId)).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    expect(candidates.filter((candidate) => !candidate.selectable).map((candidate) => candidate.fileId)).toEqual([2, 4, 6, 8]);
  });

  it('handles a full page of results with long metadata', async () => {
    const description = { ImageDescription: { value: 'd'.repeat(19_000) } };
    const pages = Array.from({ length: SEARCH_FETCH_LIMIT }, (_, i) => commonsPage(i + 1, i + 1, description));
    expect(JSON.stringify({ query: { pages } }).length).toBeGreaterThan(380_000);
    expect(await search(pages)).toHaveLength(MAX_SELECTABLE);
  });

  it('falls back to a 5-result search when the full page is over the size limit', async () => {
    const huge = { ImageDescription: { value: 'd'.repeat(19_000) }, Credit: { value: 'c'.repeat(19_000) } };
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(respond(Array.from({ length: SEARCH_FETCH_LIMIT }, (_, i) => commonsPage(i + 1, i + 1, huge))))
      .mockResolvedValueOnce(respond([commonsPage(1, 1), commonsPage(2, 2)]));
    const candidates = await searchCommonsImages('x', { fetchFn });
    expect(candidates.map((candidate) => candidate.fileId)).toEqual([1, 2]);
    expect(fetchFn.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('gsrlimit'))).toEqual(['20', '5']);
  });

  it('still fails when even the 5-result search is over the size limit', async () => {
    const huge = { ImageDescription: { value: 'd'.repeat(19_000) }, Credit: { value: 'c'.repeat(19_000) } };
    const oversized = () => respond(Array.from({ length: 20 }, (_, i) => commonsPage(i + 1, i + 1, huge)));
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => oversized());
    await expect(searchCommonsImages('x', { fetchFn })).rejects.toThrow('Commons response exceeds size limit.');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('reports a rate limit from the 5-result retry as a rate limit', async () => {
    const huge = { ImageDescription: { value: 'd'.repeat(19_000) }, Credit: { value: 'c'.repeat(19_000) } };
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(respond(Array.from({ length: 20 }, (_, i) => commonsPage(i + 1, i + 1, huge))))
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '90' } }));
    await expect(searchCommonsImages('x', { fetchFn })).rejects.toMatchObject({ status: 429, retryAfterSeconds: 90 });
  });
});

