import { isIP } from 'node:net';
import { boundedFetch } from './bounded-fetch';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 10_000;

/** Exact known OpenAI asset hosts; custom services can also serve on their configured API host. */
export function openAiImageDownloadHosts(baseUrl: string): string[] {
  const hosts = [
    'oaidalleapiprodscus.blob.core.windows.net',
    'files.oaiusercontent.com',
  ];
  const provider = new URL(baseUrl);
  const hostname = provider.hostname;
  if (provider.protocol === 'https:' && !provider.username && !provider.password && !provider.port &&
      hostname !== 'localhost' && !hostname.endsWith('.localhost') && !hostname.endsWith('.local') &&
      !isIP(hostname.replace(/^\[|\]$/g, '')) && !/^\d+(?:\.\d+)*$/.test(hostname)) {
    hosts.push(hostname);
  }
  return hosts;
}

/** Provider-returned URLs are untrusted, even when the upstream API is trusted. */
export async function downloadProviderImage(
  url: string,
  options: { allowedHosts: readonly string[]; fetchFn?: typeof fetch },
): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port ||
      !options.allowedHosts.includes(parsed.hostname)) {
    throw new Error('Image URL is not allowed.');
  }
  return boundedFetch(url, {
    limitBytes: MAX_IMAGE_BYTES,
    timeoutMs: IMAGE_DOWNLOAD_TIMEOUT_MS,
    fetchFn: options.fetchFn,
    errors: {
      timeout: () => new Error('Image download timed out.'),
      tooLarge: () => new Error('Downloaded image is too large.'),
      http: (response) => Object.assign(new Error(`Image download failed (${response.status}).`), { status: response.status }),
    },
  }, async (response, read) => {
    if (!/^image\//i.test(response.headers.get('Content-Type')?.trim() ?? '')) {
      throw new Error('Downloaded image has an invalid content type.');
    }
    return (await read()).toString('base64');
  });
}
