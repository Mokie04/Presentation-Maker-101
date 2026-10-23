import { z } from 'zod';
import { nasaAssetUrlSchema } from '@/lib/image-metadata';
import { boundedFetch } from './bounded-fetch';

export class NasaProviderError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'NasaProviderError';
  }
}

export interface NasaFetchOptions {
  fetchFn?: typeof fetch;
}

export interface NasaImageCandidate {
  nasaId: string;
  title?: string;
  description?: string;
  previewUrl?: string;
  /** NASA's asset collection URL, when provided by search. */
  sourceUrl?: string;
  /** Publishing center is provenance, not an inferred credit or permission. */
  center?: string;
  photographer?: string;
  secondaryCreator?: string;
}

export interface NasaImageDownload {
  nasaId: string;
  sourceUrl: string;
  rendition: 'large' | 'medium' | 'orig';
  mimeType: string;
  base64: string;
}

const API_ROOT = 'https://images-api.nasa.gov';
const CANDIDATE_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const JSON_LIMIT_BYTES = 1024 * 1024;
const IMAGE_LIMIT_BYTES = 10 * 1024 * 1024;

const searchSchema = z.object({
  collection: z.object({
    items: z.array(z.object({
      href: z.string().optional(),
      data: z.array(z.object({
        nasa_id: z.string().trim().min(1),
        media_type: z.literal('image'),
        title: z.string().optional(),
        description: z.string().optional(),
        center: z.string().optional(),
        photographer: z.string().optional(),
        secondary_creator: z.string().optional(),
      })).min(1),
      links: z.array(z.object({
        href: z.string(),
        rel: z.string(),
        render: z.string().optional(),
      })).optional(),
    })),
  }),
});

const manifestSchema = z.object({
  collection: z.object({ items: z.array(z.object({ href: z.string() })) }),
});

function trustedAssetUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Untrusted NASA asset URL.');
  }
  // Only upgrade HTTP's default port; e.g. HTTP :443 must remain rejected.
  if (url.protocol === 'http:' && !url.port) url.protocol = 'https:';
  const parsed = nasaAssetUrlSchema.safeParse(url.href);
  if (!parsed.success) throw new Error('Untrusted NASA asset URL.');
  return parsed.data;
}

function fetchOptions(limitBytes: number, options?: NasaFetchOptions) {
  return {
    limitBytes, timeoutMs: REQUEST_TIMEOUT_MS, fetchFn: options?.fetchFn,
    errors: {
      timeout: () => new Error('NASA request timed out.'),
      tooLarge: () => new Error('NASA response exceeds size limit.'),
      http: (response: Response) => new Error(`NASA request failed (${response.status}).`),
      serverSideOnly: () => new Error('NASA provider is server-side only.'),
    },
  };
}

async function requestJson<T>(url: string, schema: z.ZodType<T>, options?: NasaFetchOptions): Promise<T> {
  return boundedFetch(url, fetchOptions(JSON_LIMIT_BYTES, options), async (_response, read) => {
    const body = await read();
    try {
      return schema.parse(JSON.parse(body.toString('utf8')));
    } catch {
      throw new Error('Invalid NASA response shape or JSON.');
    }
  });
}

/** Caller owns search terms, subject/topic eligibility, and candidate selection. No API key needed. */
export async function searchNasaImages(
  query: string,
  options?: NasaFetchOptions
): Promise<NasaImageCandidate[]> {
  if (!query.trim()) throw new Error('NASA search terms must not be empty.');
  const params = new URLSearchParams({ q: query, media_type: 'image', page_size: String(CANDIDATE_LIMIT) });
  const data = await requestJson(`${API_ROOT}/search?${params}`, searchSchema, options);
  return imageCandidates(data.collection.items);
}

function imageCandidates(items: z.infer<typeof searchSchema>['collection']['items']): NasaImageCandidate[] {
  return items.slice(0, CANDIDATE_LIMIT).map((item) => {
    const metadata = item.data[0];
    const preview = item.links?.find((link) => link.rel === 'preview' && link.render === 'image');
    return {
      nasaId: metadata.nasa_id,
      title: metadata.title,
      description: metadata.description,
      previewUrl: preview ? trustedAssetUrl(preview.href) : undefined,
      sourceUrl: item.href ? trustedAssetUrl(item.href) : undefined,
      center: metadata.center,
      photographer: metadata.photographer,
      secondaryCreator: metadata.secondary_creator,
    };
  });
}
/** Revalidate metadata for one selected image, using NASA's exact-ID filter. */
export async function getNasaImageCandidate(nasaId: string, options?: NasaFetchOptions): Promise<NasaImageCandidate> {
  if (!nasaId.trim()) throw new Error('NASA asset ID must not be empty.');
  const params = new URLSearchParams({ nasa_id: nasaId, media_type: 'image', page_size: String(CANDIDATE_LIMIT) });
  const data = await requestJson(`${API_ROOT}/search?${params}`, searchSchema, options);
  const candidate = imageCandidates(data.collection.items).find((item) => item.nasaId === nasaId);
  if (!candidate) throw new NasaProviderError('No matching NASA image found.', 502);
  return candidate;
}

/** Retrieve a caller-selected ID; never search or choose a candidate implicitly. */
export async function fetchNasaImageBase64(
  nasaId: string,
  options?: NasaFetchOptions
): Promise<NasaImageDownload> {
  if (!nasaId.trim()) throw new Error('NASA asset ID must not be empty.');
  const manifest = await requestJson(`${API_ROOT}/asset/${encodeURIComponent(nasaId)}`, manifestSchema, options);
  const urls = manifest.collection.items.map((item) => trustedAssetUrl(item.href));
  // Prefer display renditions; originals can be huge or in unsupported formats such as TIFF.
  for (const rendition of ['large', 'medium', 'orig'] as const) {
    const sourceUrl = urls.find((url) =>
      new RegExp(`~${rendition}\\.(jpe?g|png)$`, 'i').test(new URL(url).pathname));
    if (!sourceUrl) continue;
    return boundedFetch(sourceUrl, fetchOptions(IMAGE_LIMIT_BYTES, options), async (response, read) => {
      const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        throw new Error('Unsupported NASA image content type.');
      }
      const body = await read();
      if (!body.length) throw new Error('NASA image download is empty.');
      return { nasaId, sourceUrl, rendition, mimeType, base64: body.toString('base64') };
    });
  }
  throw new NasaProviderError('No supported NASA presentation rendition available.', 502);
}
