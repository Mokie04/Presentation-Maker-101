import { describe, expect, it } from 'vitest';
import { searchCommonsImages } from '@/lib/providers/commons-provider';
import { commonsPage } from './commons-cases';

const bySa = (version: string, url = `https://creativecommons.org/licenses/by-sa/${version}/`) => ({
  LicenseShortName: { value: `CC BY-SA ${version}` }, LicenseUrl: url === '' ? undefined : { value: url },
});
const first = async (fields: Record<string, { value: string } | undefined>) => (await searchCommonsImages('x', {
  fetchFn: async () => Response.json({ batchcomplete: true, query: { pages: [commonsPage(100, 1, fields)] } }),
}))[0];

describe('CC BY-SA acceptance', () => {
  it.each(['1.0', '2.0', '2.5', '3.0', '4.0'])('accepts CC BY-SA %s with its canonical URL', async (version) => {
    const candidate = await first(bySa(version));
    expect(candidate).toMatchObject({ selectable: true, licenseKind: 'cc-by-sa', licenseName: `CC BY-SA ${version}`,
      licenseUrl: `https://creativecommons.org/licenses/by-sa/${version}/` });
    expect(candidate.unavailableReason).toBeUndefined();
  });

  it('normalizes a canonical URL without the trailing slash', async () => {
    const candidate = await first(bySa('4.0', 'https://creativecommons.org/licenses/by-sa/4.0'));
    expect(candidate).toMatchObject({ selectable: true, licenseKind: 'cc-by-sa', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' });
  });

  it('accepts a lower-case license name', async () => {
    expect((await first({ ...bySa('3.0'), LicenseShortName: { value: 'cc by-sa 3.0' } })).licenseKind).toBe('cc-by-sa');
  });

  const inconsistent = 'The license details for "CC BY-SA 4.0" are incomplete or inconsistent.';
  const creator = 'The creator is not identified, which this license requires.';
  it.each([
    ['a URL for another version', bySa('4.0', 'https://creativecommons.org/licenses/by-sa/3.0/'), inconsistent],
    ['a CC BY URL', bySa('4.0', 'https://creativecommons.org/licenses/by/4.0/'), inconsistent],
    ['no URL', bySa('4.0', ''), inconsistent],
    ['a URL with an extra path', bySa('4.0', 'https://creativecommons.org/licenses/by-sa/4.0/legalcode'), inconsistent],
    ['no creator', { ...bySa('4.0'), Artist: undefined }, creator],
    ['an unknown author', { ...bySa('4.0'), Artist: { value: 'Unknown author' } }, creator],
    ['an unknown creator', { ...bySa('4.0'), Artist: { value: 'unknown' } }, creator],
    ['attribution declared unnecessary', { ...bySa('4.0'), AttributionRequired: { value: 'false' } }, creator],
    ['additional restrictions', { ...bySa('4.0'), Restrictions: { value: 'personality' } }, 'Additional restrictions require review; unavailable in this version.'],
  ])('keeps CC BY-SA with %s unavailable', async (_, fields, reason) => {
    const candidate = await first(fields);
    expect(candidate.selectable).toBe(false);
    expect(candidate.unavailableReason).toBe(reason);
  });

  it.each(['CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 4.0', 'CC BY-NC-ND 3.0', 'GFDL', 'CC BY-SA 1.5'])('keeps %s not supported', async (name) => {
    const candidate = await first({ LicenseShortName: { value: name }, LicenseUrl: undefined });
    expect(candidate.selectable).toBe(false);
    expect(candidate.unavailableReason).toBe(`License "${name}" is not supported in this version.`);
  });
});
