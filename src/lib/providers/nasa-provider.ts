import { Buffer } from 'node:buffer';
import { z } from 'zod';

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
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.hostname !== 'images-assets.nasa.gov' ||
      url.port || url.username || url.password) {
    throw new Error('Untrusted NASA asset URL.');
  }
  // NASA manifests can advertise HTTP; validate first and only ever return HTTPS.
  url.protocol = 'https:';
  return url.href;
}

async function readBody(response: Response, limit: number, signal: AbortSignal): Promise<Buffer> {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('NASA response exceeds size limit.');
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('NASA response exceeds size limit.');
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, size);
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

/** Server-side only. Deadline covers both response headers and body consumption. */
async function request<T>(
  url: string,
  options: NasaFetchOptions | undefined,
  consume: (response: Response, signal: AbortSignal) => Promise<T>
): Promise<T> {
  if (typeof window !== 'undefined') throw new Error('NASA provider is server-side only.');
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('NASA request timed out.'));
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    const operation = (async () => {
      // Never follow a redirect off the trusted API/asset origin.
      const response = await (options?.fetchFn ?? fetch)(url, {
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`NASA request failed (${response.status}).`);
      }
      return consume(response, controller.signal);
    })();
    return await Promise.race([operation, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function requestJson<T>(url: string, schema: z.ZodType<T>, options?: NasaFetchOptions): Promise<T> {
  return request(url, options, async (response, signal) => {
    const body = await readBody(response, JSON_LIMIT_BYTES, signal);
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
  if (!candidate) throw new Error('No matching NASA image found.');
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
    return request(sourceUrl, options, async (response, signal) => {
      const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        await response.body?.cancel();
        throw new Error('Unsupported NASA image content type.');
      }
      const body = await readBody(response, IMAGE_LIMIT_BYTES, signal);
      if (!body.length) throw new Error('NASA image download is empty.');
      return { nasaId, sourceUrl, rendition, mimeType, base64: body.toString('base64') };
    });
  }
  throw new Error('No supported NASA presentation rendition available.');
}
