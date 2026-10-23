import type { z } from 'zod';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { ImageSourceLabel } from '@/lib/image-credit';
import type { ImageCandidate, ImageSource } from './types';

/** Server-side adapter; its schema determines the validated input accepted by select. */
export interface ImageLibrary<Schema extends z.ZodType = z.ZodType> {
  source: ImageSource;
  label: ImageSourceLabel;
  failureMessages: { search: string; select: string };
  selectInputSchema: Schema;
  search(query: string): Promise<ImageCandidate[]>;
  select(input: z.output<Schema>): Promise<{ base64: string; metadata: ImageMetadata }>;
  mapError(error: unknown): never;
}
