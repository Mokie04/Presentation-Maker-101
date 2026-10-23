import { z } from 'zod';
import { PublicError } from '@/lib/api';
import type { NasaImageMetadata } from '@/lib/image-metadata';
import { searchNasaImages, getNasaImageCandidate, fetchNasaImageBase64, NasaProviderError } from '@/lib/providers/nasa-provider';
import type { ImageLibrary } from './library';
import { IMAGE_LIBRARIES } from './types';

const selectInputSchema = z.object({ nasaId: z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/) });

export const nasaLibrary: ImageLibrary<typeof selectInputSchema> = {
  source: 'nasa',
  label: IMAGE_LIBRARIES.nasa.label,
  failureMessages: { search: 'NASA search failed.', select: 'NASA image retrieval failed.' },
  selectInputSchema,
  search: async (query) => (await searchNasaImages(query)).map((candidate) => ({ ...candidate, source: 'nasa', selectable: true })),
  select: async ({ nasaId }) => {
    // Only the ID is accepted from the client. Reload metadata and the manifest at NASA.
    const candidate = await getNasaImageCandidate(nasaId);
    const image = await fetchNasaImageBase64(candidate.nasaId);
    return { base64: image.base64, metadata: { ...candidate, source: 'nasa',
      assetUrl: image.sourceUrl, rendition: image.rendition,
      // The provider checks for JPEG/PNG before returning the downloaded image.
      mimeType: image.mimeType as NasaImageMetadata['mimeType'],
    } };
  },
  mapError(error) {
    if (error instanceof NasaProviderError) throw new PublicError(error.message, error.status);
    throw error;
  },
};
