import { getImageProviderConfig } from '@/lib/env';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';
import { boundedFetch } from '../bounded-fetch';
import type { ImageProvider } from './types';

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_BACKOFF_MS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;

interface InvokeConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  aspectRatio: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Provider error bodies can echo credentials, so only the status is kept. */
function httpError(response: Response): Error {
  return Object.assign(new Error(`Image request failed (${response.status}).`), { status: response.status });
}

async function requestImage(config: InvokeConfig, prompt: string, fetchFn?: typeof fetch): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/model/${encodeURIComponent(config.model)}/invoke`;
  const body = await boundedFetch(url, {
    limitBytes: MAX_RESPONSE_BYTES,
    timeoutMs: REQUEST_TIMEOUT_MS,
    fetchFn: (input, init) => (fetchFn ?? fetch)(input, {
      ...init, method: 'POST', body: JSON.stringify({ prompt, aspect_ratio: config.aspectRatio, output_format: 'png' }),
    }),
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    errors: {
      timeout: () => new Error('Image request timed out.'),
      tooLarge: () => new Error('Image response is too large.'),
      http: httpError,
    },
  }, async (_response, read) => JSON.parse((await read()).toString('utf8')) as unknown);

  const result = body as { images?: unknown; finish_reasons?: unknown } | null;
  const image = Array.isArray(result?.images) ? result.images[0] : undefined;
  const reason = Array.isArray(result?.finish_reasons) ? result.finish_reasons[0] : undefined;
  if (reason) throw new Error('Image was not produced by the image service.');
  if (typeof image !== 'string' || !image) throw new Error('No image returned from image provider.');
  return image;
}

/** Opt-in provider for image services reached through a signed-in `POST /model/{id}/invoke` endpoint. */
export function createInvokeImageProvider(options?: {
  config?: InvokeConfig;
  fetchFn?: typeof fetch;
  maxRetries?: number;
  backoffMs?: number;
}): ImageProvider {
  return {
    id: 'invoke-api',
    generate: async ({ description }) => {
      const config = options?.config ?? getImageProviderConfig();
      const maxRetries = options?.maxRetries ?? DEFAULT_RETRY_COUNT;
      const backoffMs = options?.backoffMs ?? DEFAULT_BACKOFF_MS;
      // variation is not sent: the service output already differs on every call.
      const prompt = `${IMAGE_PROMPT_PREFIX}${description}`;
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await requestImage(config, prompt, options?.fetchFn);
        } catch (err) {
          lastError = err;
          const status = err && typeof err === 'object' && 'status' in err ? err.status : undefined;
          if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) throw err;
          if (attempt < maxRetries) await sleep(backoffMs);
        }
      }
      throw lastError;
    },
  };
}
