import { describe, expect, it } from 'vitest';
import { searchCommonsImages } from '@/lib/providers/commons-provider';
import { COMMONS_CASES, commonsPage } from './commons-cases';

// Captured before specific unavailable reasons existed: [case, selectable, licenseKind]. No license rule may change.
const today: Record<string, [boolean, string | null]> = {
  'public domain': [true, 'public-domain'],
  'public domain mark': [true, 'public-domain'],
  'public domain marked copyrighted': [false, null],
  'CC0': [true, 'cc0'],
  'CC0 with a wrong URL': [false, null],
  'CC BY with a creator': [true, 'cc-by'],
  'CC BY 2.0 URL without a trailing slash': [true, 'cc-by'],
  'CC BY without a creator': [false, null],
  'CC BY with an unknown author': [false, null],
  'CC BY with attribution not required': [false, null],
  'CC BY with restrictions': [false, 'cc-by'],
  'CC BY with a CC BY-SA URL': [false, null],
  'CC BY with a non-CC URL': [false, null],
  'CC BY-SA 4.0': [false, null],
  'CC BY-NC 4.0': [false, null],
  'GFDL': [false, null],
  'no license name': [false, null],
  'an untrusted thumbnail': [false, 'cc-by'],
  'no thumbnail': [false, 'cc-by'],
  'an SVG thumbnail': [false, 'cc-by'],
};

const search = (pages: unknown[]) =>
  searchCommonsImages('x', { fetchFn: async () => Response.json({ batchcomplete: true, query: { pages } }) });

describe.each(COMMONS_CASES)('Commons selectability for %s', (name, fields, info) => {
  it('is unchanged', async () => {
    const [candidate] = await search([commonsPage(100, 1, fields, info)]);
    expect([candidate.selectable, candidate.licenseKind ?? null]).toEqual(today[name]);
  });
});

it('keeps Commons rank order', async () => {
  const candidates = await search([commonsPage(3, 3), commonsPage(1, 1), commonsPage(2, 2)]);
  expect(candidates.map((candidate) => candidate.fileId)).toEqual([1, 2, 3]);
});
