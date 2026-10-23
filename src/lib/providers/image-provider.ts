import type OpenAI from 'openai';
import { getImageProviderConfig, getPexelsConfig } from '@/lib/env';
import { createOpenAiImageProvider, getImageProviderClient } from './image/openai';
import { createPexelsImageProvider } from './image/pexels';
import { resolveImageProviders, generateWithFallback } from './image/compose';

export { createImageProviderClient, getImageProviderClient } from './image/openai';

export interface GenerateImageOptions {
  client?: OpenAI;
  maxRetries?: number;
  backoffMs?: number;
  source?: 'ai' | 'pexels' | 'auto';
  title?: string;
  pexelsApiKey?: string;
  /** Picks a different Pexels result on regenerate; 0 is the top result. */
  variation?: number;
}

export async function generateSlideImage(
  visualDescription: string,
  options?: GenerateImageOptions
): Promise<string> {
  const chosenSource = options?.source ?? getImageProviderConfig().source ?? 'auto';
  const hasPexelsKey = Boolean(options?.pexelsApiKey || getPexelsConfig().apiKey);
  const providers = resolveImageProviders(chosenSource, {
    // Client construction failures historically bypass retries and fallback.
    ai: () => createOpenAiImageProvider({ client: options?.client ?? getImageProviderClient(),
      maxRetries: options?.maxRetries, backoffMs: options?.backoffMs }),
    pexels: () => createPexelsImageProvider({ apiKey: options?.pexelsApiKey }),
    hasPexelsKey,
  });
  return generateWithFallback(providers, { description: visualDescription, title: options?.title, variation: options?.variation });
}
