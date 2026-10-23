import { getTextProviderConfig, getImageProviderConfig, getPexelsConfig } from '@/lib/env';
import { getTextProviderClient } from '@/lib/providers/text-provider';
import { getImageProviderClient } from '@/lib/providers/image-provider';
import type OpenAI from 'openai';

export interface HealthCheckResponse {
  textProvider: 'ok' | 'error';
  imageProvider: 'ok' | 'error';
  errors?: string[];
}

export interface HealthCheckOptions {
  textClient?: OpenAI;
  imageClient?: OpenAI;
}

export async function checkHealth(options?: HealthCheckOptions): Promise<HealthCheckResponse> {
  const errors: string[] = [];
  let textStatus: 'ok' | 'error' = 'error';
  let imageStatus: 'ok' | 'error' = 'error';

  // 1. Text Provider check: send a tiny "say hello" prompt
  try {
    const textClient = options?.textClient ?? getTextProviderClient();
    await textClient.chat.completions.create({
      model: getTextProviderConfig().model,
      messages: [{ role: 'user', content: 'say hello' }],
      max_tokens: 5,
    });
    textStatus = 'ok';
  } catch (err: unknown) {
    textStatus = 'error';
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Text Provider: ${message}`);
  }

  // 2. Image Provider check: verify client or pexels config is valid
  try {
    const imageConfig = getImageProviderConfig();
    if (imageConfig.source === 'pexels') {
      if (!getPexelsConfig().apiKey) {
        throw new Error('Pexels API key is not configured.');
      }
      imageStatus = 'ok';
    } else {
      const imageClient = options?.imageClient ?? getImageProviderClient();
      if (
        !imageClient ||
        !imageConfig.baseUrl ||
        !imageConfig.apiKey ||
        imageConfig.apiKey === 'not-configured' ||
        !imageConfig.model
      ) {
        throw new Error('Image provider client configuration is missing or incomplete.');
      }
      imageStatus = 'ok';
    }
  } catch (err: unknown) {
    imageStatus = 'error';
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Image Provider: ${message}`);
  }

  return {
    textProvider: textStatus,
    imageProvider: imageStatus,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
