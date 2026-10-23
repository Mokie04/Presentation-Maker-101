import { fetchPexelsImageBase64 } from '@/lib/providers/pexels-provider';
import type { ImageProvider } from './types';

export function createPexelsImageProvider(options?: { apiKey?: string }): ImageProvider {
  return {
    id: 'pexels',
    generate: ({ description, title, variation }) => fetchPexelsImageBase64(description, {
      apiKey: options?.apiKey, title, variation,
    }),
  };
}
