import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicError } from '@/lib/api';
import { imageMetadataSchema } from '@/lib/image-metadata';
import { nasaLibrary } from '@/lib/image-library/nasa';
import { commonsLibrary } from '@/lib/image-library/commons';
import type { ImageLibrary } from '@/lib/image-library/library';
import { candidateId, IMAGE_LIBRARIES, selectRequestBody } from '@/lib/image-library/types';
import * as nasa from '@/lib/providers/nasa-provider';
import * as commons from '@/lib/providers/commons-provider';

const nasaCandidate = { nasaId: 'earth', title: 'Earth', photographer: 'Original photographer',
  sourceUrl: 'https://images-assets.nasa.gov/image/earth/collection.json' };
const nasaImage = { nasaId: 'earth', sourceUrl: 'https://images-assets.nasa.gov/image/earth/earth~large.jpg',
  base64: '/9j/2Q==', rendition: 'large' as const, mimeType: 'image/jpeg' };
const commonsMetadata = { source: 'commons' as const, fileId: 42, title: 'File:Earth.png',
  creator: 'Original artist', licenseKind: 'public-domain' as const, licenseName: 'Public domain',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Earth.png',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Earth.png',
  rendition: 'thumbnail' as const, mimeType: 'image/png' as const };
const commonsCandidate = { ...commonsMetadata, selectable: true, previewUrl: commonsMetadata.assetUrl };

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'));
  vi.spyOn(nasa, 'searchNasaImages').mockResolvedValue([nasaCandidate]);
  vi.spyOn(nasa, 'getNasaImageCandidate').mockResolvedValue(nasaCandidate);
  vi.spyOn(nasa, 'fetchNasaImageBase64').mockResolvedValue(nasaImage);
  vi.spyOn(commons, 'searchCommonsImages').mockResolvedValue([commonsCandidate]);
  vi.spyOn(commons, 'fetchCommonsImageBase64').mockResolvedValue({ base64: 'aW1hZ2U=', metadata: commonsMetadata });
});
afterEach(() => vi.restoreAllMocks());

const cases: { library: ImageLibrary; id: string | number; body: object; invalid: unknown[];
  providerError: (message: string, status: number) => Error }[] = [
  { library: nasaLibrary, id: 'earth', body: { nasaId: 'earth' }, invalid: [{}, { nasaId: '' }, { nasaId: '../earth' },
    { nasaId: 'x'.repeat(201) }, { nasaId: 42 }, { fileId: 42 }], providerError: (message, status) => new nasa.NasaProviderError(message, status) },
  { library: commonsLibrary, id: 42, body: { fileId: 42 }, invalid: [{}, { fileId: 0 }, { fileId: -1 },
    { fileId: 1.5 }, { fileId: '42' }, { fileId: Number.MAX_SAFE_INTEGER + 1 }, { nasaId: 'earth' }],
    providerError: (message, status) => new commons.CommonsProviderError(message, status, 120) },
];

describe.each(cases)('$library.label ImageLibrary contract', ({ library, id, body, invalid, providerError }) => {
  it('searches explicit terms and returns discriminated candidates with schema-valid selection bodies', async () => {
    const candidates = await library.search('earth');
    expect(candidates).toHaveLength(1);
    for (const candidate of candidates) {
      expect(candidate.source).toBe(library.source);
      expect(typeof candidate.selectable).toBe('boolean');
      expect(candidateId(candidate)).toBe(id);
      expect(selectRequestBody(candidate)).toEqual(body);
      expect(library.selectInputSchema.parse(selectRequestBody(candidate))).toEqual(body);
    }
    expect(library.source === 'nasa' ? nasa.searchNasaImages : commons.searchCommonsImages).toHaveBeenCalledWith('earth');
  });

  it('selects a non-empty image with valid same-source server metadata', async () => {
    const selected = await library.select(library.selectInputSchema.parse(body));
    expect(typeof selected.base64).toBe('string'); expect(selected.base64.length).toBeGreaterThan(0);
    expect(imageMetadataSchema.parse(selected.metadata).source).toBe(library.source);
    if (library.source === 'nasa') {
      expect(selected.metadata).toEqual({ ...nasaCandidate, source: 'nasa', assetUrl: nasaImage.sourceUrl,
        rendition: nasaImage.rendition, mimeType: nasaImage.mimeType });
      expect(nasa.getNasaImageCandidate).toHaveBeenCalledWith(id);
      expect(nasa.fetchNasaImageBase64).toHaveBeenCalledWith(id);
    } else {
      expect(selected.metadata).toEqual(commonsMetadata);
      expect(commons.fetchCommonsImageBase64).toHaveBeenCalledWith(id);
    }
  });

  it('rejects invalid selection inputs and strips forged client metadata', () => {
    for (const input of invalid) expect(library.selectInputSchema.safeParse(input).success).toBe(false);
    expect(library.selectInputSchema.parse({ ...body, assetUrl: 'https://evil.example', creator: 'Fake' })).toEqual(body);
  });

  it.each([422, 429, 502])('maps a typed provider error to PublicError with status %i', (status) => {
    const mapped = (() => { try { library.mapError(providerError('Provider message', status)); } catch (error) { return error; } })();
    expect(mapped).toBeInstanceOf(PublicError);
    expect(mapped).toMatchObject({ status, message: 'Provider message' });
    if (library.source === 'commons' && status === 429) {
      expect(mapped).toMatchObject({ extra: { retryAfterSeconds: 120 }, headers: { 'Retry-After': '120' } });
    } else {
      expect(mapped).toMatchObject({ extra: undefined, headers: undefined });
    }
  });

  it.each([new Error('Unknown provider error'), 'unknown rejection'])('rethrows unknown errors unchanged: %s', (failure) => {
    try { library.mapError(failure); } catch (error) { expect(error).toBe(failure); return; }
    throw new Error('Expected mapError to throw');
  });

  it('exposes the existing source label and base path', () => {
    expect(IMAGE_LIBRARIES[library.source]).toEqual({ label: library.label, basePath: `/api/${library.source}-images` });
  });
});

it('preserves an unavailable Commons candidate instead of enabling it', async () => {
  vi.mocked(commons.searchCommonsImages).mockResolvedValue([{ ...commonsCandidate, selectable: false, unavailableReason: 'License is unsupported.' }]);
  expect(await commonsLibrary.search('earth')).toEqual([{ ...commonsCandidate, selectable: false, unavailableReason: 'License is unsupported.' }]);
});
