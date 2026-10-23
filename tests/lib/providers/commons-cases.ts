/** Commons search pages for license and thumbnail cases; each overrides a selectable CC BY 4.0 page. */
const thumbnail = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Roots.svg/1200px-Roots.svg.png';
const ccBy = {
  Artist: { value: 'Jane Doe' }, AttributionRequired: { value: 'true' },
  LicenseShortName: { value: 'CC BY 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/' },
};
type Fields = Record<string, { value: string } | undefined>;

export const COMMONS_CASES: [name: string, fields: Fields, info?: Record<string, unknown>][] = [
  ['public domain', { Artist: undefined, AttributionRequired: undefined, LicenseShortName: { value: 'Public domain' }, LicenseUrl: undefined, Copyrighted: { value: 'False' } }],
  ['public domain mark', { LicenseShortName: { value: 'Public domain' }, LicenseUrl: { value: 'https://creativecommons.org/publicdomain/mark/1.0/' }, Copyrighted: { value: 'false' } }],
  ['public domain marked copyrighted', { LicenseShortName: { value: 'Public domain' }, LicenseUrl: undefined, Copyrighted: { value: 'true' } }],
  ['CC0', { Artist: undefined, LicenseShortName: { value: 'CC0' }, LicenseUrl: { value: 'https://creativecommons.org/publicdomain/zero/1.0/' } }],
  ['CC0 with a wrong URL', { LicenseShortName: { value: 'CC0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by/4.0/' } }],
  ['CC BY with a creator', {}],
  ['CC BY 2.0 URL without a trailing slash', { LicenseShortName: { value: 'CC BY 2.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by/2.0' } }],
  ['CC BY without a creator', { Artist: undefined }],
  ['CC BY with an unknown author', { Artist: { value: 'Unknown author' } }],
  ['CC BY with attribution not required', { AttributionRequired: { value: 'false' } }],
  ['CC BY with restrictions', { Restrictions: { value: 'trademarked' } }],
  ['CC BY with a CC BY-SA URL', { LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' } }],
  ['CC BY with a non-CC URL', { LicenseUrl: { value: 'https://example.com/licenses/by/4.0/' } }],
  ['CC BY-SA 4.0', { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' } }],
  ['CC BY-NC 4.0', { LicenseShortName: { value: 'CC BY-NC 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-nc/4.0/' } }],
  ['GFDL', { LicenseShortName: { value: 'GFDL' }, LicenseUrl: { value: 'https://www.gnu.org/copyleft/fdl.html' } }],
  ['no license name', { LicenseShortName: undefined, LicenseUrl: undefined }],
  ['an untrusted thumbnail', {}, { thumburl: 'https://evil.example/icon.png' }],
  ['no thumbnail', {}, { thumburl: undefined }],
  ['an SVG thumbnail', {}, { thumbmime: 'image/svg+xml' }],
];

export function commonsPage(pageid: number, index: number, fields: Fields = {}, info: Record<string, unknown> = {}) {
  const extmetadata = Object.fromEntries(Object.entries({ ...ccBy, ...fields }).filter(([, value]) => value !== undefined));
  return { pageid, ns: 6, title: `File:Case ${pageid}.svg`, index, imageinfo: [{
    descriptionurl: `https://commons.wikimedia.org/wiki/File:Case_${pageid}.svg`, mime: 'image/svg+xml',
    thumburl: thumbnail, thumbmime: 'image/png', extmetadata, ...info,
  }] };
}
export { thumbnail as COMMONS_THUMBNAIL };
