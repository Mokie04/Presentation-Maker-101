import OpenAI from 'openai';
import { getImageProviderConfig } from '@/lib/env';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';
import { downloadProviderImage, openAiImageDownloadHosts } from '../download-provider-image';
import type { ImageProvider } from './types';

export function createImageProviderClient(options?: {
  baseURL?: string;
  apiKey?: string;
}): OpenAI {
  return new OpenAI({
    baseURL: options?.baseURL ?? getImageProviderConfig().baseUrl,
    apiKey: options?.apiKey ?? getImageProviderConfig().apiKey,
    maxRetries: 0,
  });
}

let defaultImageClient: OpenAI | null = null;

export function getImageProviderClient(): OpenAI {
  if (!defaultImageClient) {
    defaultImageClient = createImageProviderClient();
  }
  return defaultImageClient;
}

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_BACKOFF_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOpenAiImageProvider(options?: {
  client?: OpenAI;
  maxRetries?: number;
  backoffMs?: number;
}): ImageProvider {
  return {
    id: 'openai',
    generate: async ({ description }) => {
      const client = options?.client ?? getImageProviderClient();
      const maxRetries = options?.maxRetries ?? DEFAULT_RETRY_COUNT;
      const backoffMs = options?.backoffMs ?? DEFAULT_BACKOFF_MS;

      // variation is not sent to the AI provider: its output already differs on every call.
      const prompt = `${IMAGE_PROMPT_PREFIX}${description}`;

      let lastError: unknown;

      // 1 initial attempt + maxRetries (3 retries with 2s backoff)
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Support size and quality params where supported
          const response = await client.images.generate({
            model: getImageProviderConfig().model,
            prompt,
            size: getImageProviderConfig().size as OpenAI.Images.ImageGenerateParams['size'],
            quality: 'standard',
            response_format: 'b64_json',
            n: 1,
          });

          const firstImage = response.data?.[0];
          if (!firstImage) {
            throw new Error('No image returned from image provider.');
          }

          if (firstImage.b64_json) {
            return firstImage.b64_json;
          }

          if (firstImage.url) {
            // Fallback for providers that only return a hosted URL
            return await downloadProviderImage(firstImage.url, {
              allowedHosts: openAiImageDownloadHosts(getImageProviderConfig().baseUrl),
            });
          }

          throw new Error('Image response contained neither b64_json nor url.');
        } catch (err) {
          lastError = err;
          const status = err && typeof err === 'object' && 'status' in err ? err.status : undefined;
          if (typeof status === 'number' && status >= 400 && status < 500 && status !== 429) throw err;
          if (attempt < maxRetries) {
            await sleep(backoffMs);
          }
        }
      }
      throw lastError;
    },
  };
}
