import { z } from 'zod';
import { presentationDataSchema, slideDataSchema } from '@/lib/providers/text-provider';
import { imageMetadataSchema } from '@/lib/image-metadata';
/** Export metadata is application state, never part of model generation output. */
export const exportPresentationDataSchema = presentationDataSchema.extend({
  slides: z.array(slideDataSchema.extend({ imageMetadata: imageMetadataSchema.optional() })),
});
