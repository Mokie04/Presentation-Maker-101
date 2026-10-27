import type { ImageProvider, ImageRequest } from './types';

export function resolveImageProviders(source: 'ai' | 'pexels' | 'auto', options: {
  ai: () => ImageProvider;
  pexels: () => ImageProvider;
  hasPexelsKey: boolean;
  hasAiKey?: boolean;
}): ImageProvider[] {
  if (source === 'pexels') return [options.pexels()];
  const providers = source === 'auto' && options.hasAiKey === false ? [] : [options.ai()];
  if (source === 'auto' && options.hasPexelsKey) providers.push(options.pexels());
  return providers;
}

export async function generateWithFallback(providers: ImageProvider[], request: ImageRequest): Promise<string> {
  if (providers.length === 0) throw new Error('No image provider is configured.');
  let firstError: unknown;
  for (let index = 0; index < providers.length; index++) {
    try {
      return await providers[index].generate(request);
    } catch (error) {
      if (index === 0) firstError = error;
    }
  }
  throw firstError;
}
