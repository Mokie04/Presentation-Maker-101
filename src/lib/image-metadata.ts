import { z } from 'zod';

const nasaUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && url.hostname === 'images-assets.nasa.gov' &&
    !url.username && !url.password && !url.port;
}, 'Expected a trusted HTTPS NASA asset URL').transform((value) => new URL(value).href);

export const nasaImageMetadataSchema = z.object({
  source: z.literal('nasa'),
  nasaId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  previewUrl: nasaUrl.optional(),
  sourceUrl: nasaUrl.optional(),
  assetUrl: nasaUrl,
  photographer: z.string().optional(),
  secondaryCreator: z.string().optional(),
  center: z.string().optional(),
  rendition: z.enum(['large', 'medium', 'orig']),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});
export type NasaImageMetadata = z.infer<typeof nasaImageMetadataSchema>;

export function imageCreditText(metadata: { photographer?: string; secondaryCreator?: string }): string {
  const fields = [metadata.photographer && `Photographer: ${metadata.photographer}`,
    metadata.secondaryCreator && `Secondary creator: ${metadata.secondaryCreator}`].filter(Boolean);
  return fields.length ? fields.join('; ') : 'Credit metadata not provided. See source description.';
}

export function imageSourceNotes(metadata: NasaImageMetadata): string {
  return [`NASA image: ${metadata.nasaId}`, metadata.title, imageCreditText(metadata),
    metadata.center && `Publishing center: ${metadata.center}`, `Source: ${metadata.sourceUrl ?? metadata.assetUrl}`,
    `Downloaded asset: ${metadata.assetUrl}`, metadata.description && `Source description: ${metadata.description}`,
    'Usage permission has not been established.'].filter(Boolean).join('\n');
}
