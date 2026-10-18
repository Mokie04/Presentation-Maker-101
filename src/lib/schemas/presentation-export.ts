import { z } from 'zod';
import { presentationDataSchema, slideDataSchema } from '@/lib/providers/text-provider';
import { imageMetadataSchema } from '@/lib/image-metadata';
/** Most slides an export accepts; generated decks have about 25. */
export const MAX_EXPORT_SLIDES = 200;
/** Export metadata is application state, never part of model generation output. */
export const exportPresentationDataSchema = presentationDataSchema.extend({
  slides: z.array(slideDataSchema.extend({ imageMetadata: imageMetadataSchema.optional() })).max(MAX_EXPORT_SLIDES),
});

/** Session label echoed into export file names and headings. */
export const MAX_EXPORT_SESSION_LENGTH = 100;
/** Request body shared by the Markdown and PowerPoint export routes. */
export const exportRequestSchema = z.object({
  presentationData: exportPresentationDataSchema,
  session: z.string().max(MAX_EXPORT_SESSION_LENGTH).optional(),
});
