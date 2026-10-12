import { Buffer } from 'node:buffer';
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';
import imageSize from 'image-size';
import { z } from 'zod';
import { commonsAssetUrlSchema, commonsSourceUrlSchema, commonsImageMetadataSchema, type CommonsImageMetadata } from '@/lib/image-metadata';

const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'SayunaPresentationMaker/0.1 (https://github.com/Mokie04/Presentation-Maker-101; manual classroom image picker)';
const JSON_LIMIT = 512 * 1024;
const IMAGE_LIMIT = 2 * 1024 * 1024; // Base64 plus metadata stays below Vercel's 4.5 MB response budget.
interface FetchOptions { fetchFn?: typeof fetch }
export interface CommonsImageCandidate {
  source: 'commons'; fileId: number; title: string; sourceUrl: string; previewUrl?: string;
  creator?: string; credit?: string; attribution?: string; attributionRequired?: boolean; usageTerms?: string; restrictions?: string; description?: string;
  licenseName?: string; licenseUrl?: string; licenseKind?: CommonsImageMetadata['licenseKind'];
  mimeType?: 'image/jpeg' | 'image/png'; selectable: boolean; unavailableReason?: string;
}
export class CommonsProviderError extends Error {
  constructor(message: string, public status = 502, public retryAfterSeconds = 60) { super(message); }
}

/** Parse untrusted metadata HTML without executing it or keeping any attributes. */
function plainText(html?: string): string | undefined {
  if (!html) return undefined;
  const walk = (node: DefaultTreeAdapterTypes.Node): string => {
    if (node.nodeName === '#text') return (node as DefaultTreeAdapterTypes.TextNode).value;
    if ('tagName' in node && ['script', 'style', 'iframe', 'object', 'svg', 'math', 'template', 'noscript'].includes(node.tagName)) return '';
    if ('attrs' in node && node.attrs.some(a => a.name === 'hidden' || (a.name === 'style' && /display\s*:\s*none/i.test(a.value)))) return '';
    const text = 'childNodes' in node ? node.childNodes.map(walk).join('') : '';
    return ['div', 'p', 'br', 'td', 'tr', 'li'].includes(node.nodeName) ? ` ${text} ` : text;
  };
  return walk(parseFragment(html)).replace(/\s+/g, ' ').trim() || undefined;
}

const infoSchema = z.object({
  descriptionurl: z.string(), mime: z.string().optional(), thumburl: z.string().optional(), thumbmime: z.string().optional(),
  extmetadata: z.record(z.string(), z.object({ value: z.string().max(20_000) })).optional(),
});
const responseSchema = z.object({
  batchcomplete: z.boolean().optional(),
  query: z.object({ pages: z.array(z.object({ pageid: z.number().int().positive(), ns: z.literal(6),
    title: z.string().startsWith('File:'), index: z.number().optional(), imageinfo: z.array(infoSchema).optional(),
  })) }).optional(),
}).refine(data => data.query || data.batchcomplete === true, 'Invalid Commons response');

async function request<T>(url: string, limit: number, options: FetchOptions | undefined,
  consume: (buffer: Buffer, response: Response) => T): Promise<T> {
  if (typeof window !== 'undefined') throw new Error('Commons provider is server-side only.');
  const parsed = new URL(url);
  if (parsed.origin !== 'https://commons.wikimedia.org' || parsed.pathname !== '/w/api.php') commonsAssetUrlSchema.parse(url);
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => {
    reject(new Error('Commons request timed out.')); controller.abort();
  }, 10_000); });
  const operation = (async () => {
    const response = await (options?.fetchFn ?? fetch)(url, { headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal, redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new CommonsProviderError(`Commons request failed (${response.status}).`, response.status === 429 ? 429 : 502,
        Math.min(300, Math.max(1, Number(response.headers.get('retry-after')) || 60)));
    }
    if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('Commons response exceeds size limit.'); }
    if (!response.body) throw new Error('Commons response body is empty.');
    const reader = response.body.getReader(); const chunks: Buffer[] = []; let bytes = 0;
    const cancel = () => { void reader.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    try {
      controller.signal.throwIfAborted();
      while (true) {
        const { done, value } = await reader.read(); controller.signal.throwIfAborted();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) { await reader.cancel(); throw new Error('Commons response exceeds size limit.'); }
        chunks.push(Buffer.from(value));
      }
      return consume(Buffer.concat(chunks, bytes), response);
    } finally { controller.signal.removeEventListener('abort', cancel); reader.releaseLock(); }
  })();
  try { return await Promise.race([operation, timeout]); } finally { clearTimeout(timer); }
}

async function query(params: Record<string, string>, options?: FetchOptions) {
  const search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'imageinfo',
    iiprop: 'url|mime|thumbmime|extmetadata', iiurlwidth: '1200', iiurlheight: '900', iiextmetadatalanguage: 'en',
    iiextmetadatafilter: 'Artist|Credit|Attribution|AttributionRequired|LicenseShortName|LicenseUrl|Copyrighted|UsageTerms|Restrictions|ImageDescription',
    ...params });
  return request(`${API}?${search}`, JSON_LIMIT, options, (buffer) => {
    let json;
    try { json = JSON.parse(buffer.toString('utf8')); } catch { throw new Error('Invalid Commons JSON response.'); }
    if (json && typeof json === 'object' && json.error) {
      throw new CommonsProviderError(`Commons API: ${json.error.code ?? 'error'}`,
        ['ratelimited', 'maxlag'].includes(json.error.code) ? 429 : 502);
    }
    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) throw new Error('Invalid Commons response shape.');
    return parsed.data.query?.pages ?? [];
  });
}

function candidate(page: NonNullable<z.infer<typeof responseSchema>['query']>['pages'][number]): CommonsImageCandidate | null {
  const info = page.imageinfo?.[0]; if (!info) return null;
  const fields = info.extmetadata ?? {};
  const text = (key: string) => plainText(fields[key]?.value);
  const creator = text('Artist'), licenseName = text('LicenseShortName');
  let licenseUrl: string | undefined;
  try {
    const url = new URL(fields.LicenseUrl?.value ?? '');
    if (['http:', 'https:'].includes(url.protocol) && ['creativecommons.org', 'www.creativecommons.org'].includes(url.hostname) && !url.port && !url.username && !url.password) {
      url.protocol = 'https:'; url.hostname = 'creativecommons.org'; licenseUrl = url.href;
    }
  } catch { /* Missing license URL remains missing. */ }
  const preview = info.thumburl ? commonsAssetUrlSchema.safeParse(info.thumburl) : undefined;
  const previewUrl = preview?.success ? preview.data : undefined;
  const sourceUrl = commonsSourceUrlSchema.parse(info.descriptionurl);
  const type = info.thumbmime ?? info.mime;
  const mimeType = type === 'image/jpeg' || type === 'image/png' ? type : undefined;
  const required = text('AttributionRequired')?.toLowerCase();
  const attributionRequired = required === 'true' ? true : required === 'false' ? false : undefined;
  let licenseKind: CommonsImageMetadata['licenseKind'] | undefined;
  const byVersion = licenseName?.match(/^CC BY (1\.0|2\.0|2\.5|3\.0|4\.0)$/i)?.[1];
  if (licenseName?.toLowerCase() === 'public domain' && text('Copyrighted')?.toLowerCase() === 'false' &&
      (!fields.LicenseUrl?.value || licenseUrl === 'https://creativecommons.org/publicdomain/mark/1.0/')) licenseKind = 'public-domain';
  if (/^CC0(?: 1\.0(?: Universal)?)?$/i.test(licenseName ?? '') && licenseUrl === 'https://creativecommons.org/publicdomain/zero/1.0/') licenseKind = 'cc0';
  if (byVersion && licenseUrl === `https://creativecommons.org/licenses/by/${byVersion}/` && creator &&
      !/^unknown(?: author)?$/i.test(creator) && attributionRequired !== false) licenseKind = 'cc-by';
  const restrictions = text('Restrictions');
  const unavailableReason = preview && !preview.success ? 'Untrusted Commons thumbnail URL; unavailable in this version.'
    : !licenseKind ? 'License or required creator metadata is unsupported or unclear.'
    : restrictions ? 'Additional restrictions require review; unavailable in this version.'
    : !previewUrl || !mimeType ? 'No suitable JPEG/PNG thumbnail is available.' : undefined;
  return { source: 'commons', fileId: page.pageid, title: page.title, sourceUrl, previewUrl: mimeType ? previewUrl : undefined, creator,
    credit: text('Credit'), attribution: text('Attribution'), attributionRequired, usageTerms: text('UsageTerms'), restrictions,
    description: text('ImageDescription'), licenseName, licenseUrl, licenseKind, mimeType,
    selectable: !unavailableReason, unavailableReason };
}

export async function searchCommonsImages(terms: string, options?: FetchOptions): Promise<CommonsImageCandidate[]> {
  if (!terms.trim()) throw new Error('Commons search terms must not be empty.');
  const pages = await query({ generator: 'search', gsrsearch: terms, gsrnamespace: '6', gsrlimit: '5' }, options);
  return pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).slice(0, 5).map(candidate).filter((item): item is CommonsImageCandidate => item !== null);
}
export async function fetchCommonsImageBase64(fileId: number, options?: FetchOptions): Promise<{ base64: string; metadata: CommonsImageMetadata }> {
  if (!Number.isSafeInteger(fileId) || fileId <= 0) throw new Error('A valid Commons file ID is required.');
  const pages = await query({ pageids: String(fileId) }, options);
  const page = pages.find(item => item.pageid === fileId);
  if (!page) throw new Error('No matching Commons file found.');
  const selected = candidate(page);
  if (!selected?.selectable || !selected.previewUrl) throw new CommonsProviderError(selected?.unavailableReason ?? 'Commons image unavailable.', 422);
  return request(selected.previewUrl, IMAGE_LIMIT, options, (buffer, response) => {
    const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (mimeType !== selected.mimeType || (mimeType !== 'image/jpeg' && mimeType !== 'image/png')) throw new Error('Unsupported Commons image content type.');
    let dimensions;
    try { dimensions = imageSize(buffer); } catch { throw new Error('Invalid Commons image content.'); }
    if (dimensions.type !== (mimeType === 'image/jpeg' ? 'jpg' : 'png') || !dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 16_000_000) {
      throw new Error('Invalid or oversized Commons image content.');
    }
    const metadata = commonsImageMetadataSchema.parse({ ...selected, assetUrl: selected.previewUrl, rendition: 'thumbnail', mimeType });
    const result = { base64: buffer.toString('base64'), metadata };
    if (Buffer.byteLength(JSON.stringify(result)) > 3_000_000) throw new Error('Commons response exceeds deployment size limit.');
    return result;
  });
}
