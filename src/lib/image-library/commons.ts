import { z } from 'zod';
import { PublicError } from '@/lib/api';
import { searchCommonsImages, fetchCommonsImageBase64, CommonsProviderError } from '@/lib/providers/commons-provider';
import type { ImageLibrary } from './library';
import { IMAGE_LIBRARIES } from './types';

const selectInputSchema = z.object({ fileId: z.number().int().positive().safe() });

export const commonsLibrary: ImageLibrary<typeof selectInputSchema> = {
  source: 'commons',
  label: IMAGE_LIBRARIES.commons.label,
  failureMessages: { search: 'Commons request failed.', select: 'Commons request failed.' },
  selectInputSchema,
  search: (query) => searchCommonsImages(query),
  select: ({ fileId }) => fetchCommonsImageBase64(fileId),
  mapError(error) {
    if (error instanceof CommonsProviderError) {
      throw new PublicError(error.message, error.status, error.status === 429 ? {
        extra: { retryAfterSeconds: error.retryAfterSeconds },
        headers: { 'Retry-After': String(error.retryAfterSeconds) },
      } : {});
    }
    throw error;
  },
};
