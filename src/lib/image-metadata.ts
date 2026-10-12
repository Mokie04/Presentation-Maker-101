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

export function imageCreditText(metadata: { source?: 'nasa' | 'commons'; photographer?: string; secondaryCreator?: string; creator?: string; licenseName?: string }): string {
  if (metadata.source === 'commons') return `Creator: ${metadata.creator ?? 'Not provided'}; License: ${metadata.licenseName ?? 'Not provided'}`;
  const fields = [metadata.photographer && `Photographer: ${metadata.photographer}`,
    metadata.secondaryCreator && `Secondary creator: ${metadata.secondaryCreator}`].filter(Boolean);
  return fields.length ? fields.join('; ') : 'Credit metadata not provided. See source description.';
}

export function imageSourceNotes(metadata: ImageMetadata): string {
  if (metadata.source === 'commons') return [
    `Wikimedia Commons file: ${metadata.title} (ID ${metadata.fileId})`, imageCreditText(metadata),
    `Source: ${metadata.sourceUrl}`, `Downloaded thumbnail: ${metadata.assetUrl}`,
    metadata.licenseUrl && `License link: ${metadata.licenseUrl}`,
    metadata.credit && `Credit: ${metadata.credit}`, metadata.attribution && `Attribution: ${metadata.attribution}`,
    metadata.attributionRequired !== undefined && `Attribution required: ${metadata.attributionRequired}`,
    metadata.usageTerms && `Usage terms: ${metadata.usageTerms}`,
    metadata.restrictions && `Restrictions: ${metadata.restrictions}`, metadata.description && `Source description: ${metadata.description}`,
    'Changes: Raster thumbnail; presentation export may resize and compress the image.',
  ].filter(Boolean).join('\n');
  return [`NASA image: ${metadata.nasaId}`, metadata.title, imageCreditText(metadata),
    metadata.center && `Publishing center: ${metadata.center}`, `Source: ${metadata.sourceUrl ?? metadata.assetUrl}`,
    `Downloaded asset: ${metadata.assetUrl}`, metadata.description && `Source description: ${metadata.description}`,
    'Usage permission has not been established.'].filter(Boolean).join('\n');
}

const commonsUrl = (host: string, path: string) => z.string().url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && !url.port && !url.username && !url.password &&
      decodeURIComponent(url.pathname).startsWith(path);
  } catch { return false; }
}, 'Untrusted Commons URL').transform((value) => new URL(value).href);
export const commonsAssetUrlSchema = commonsUrl('upload.wikimedia.org', '/wikipedia/commons/')
  .or(commonsUrl('thumb.wikimedia.org', '/wikipedia/commons/thumb/'));
export const commonsSourceUrlSchema = commonsUrl('commons.wikimedia.org', '/wiki/File:');
const licenseUrl = commonsUrl('creativecommons.org', '/');
export const commonsImageMetadataSchema = z.object({
  source: z.literal('commons'), fileId: z.number().int().positive(), title: z.string().min(1),
  creator: z.string().optional(), credit: z.string().optional(), attribution: z.string().optional(),
  attributionRequired: z.boolean().optional(), usageTerms: z.string().optional(), restrictions: z.string().optional(), description: z.string().optional(),
  licenseKind: z.enum(['public-domain', 'cc0', 'cc-by']), licenseName: z.string().min(1), licenseUrl: licenseUrl.optional(),
  sourceUrl: commonsSourceUrlSchema, previewUrl: commonsAssetUrlSchema.optional(), assetUrl: commonsAssetUrlSchema,
  rendition: z.literal('thumbnail'), mimeType: z.enum(['image/jpeg', 'image/png']),
});
export type CommonsImageMetadata = z.infer<typeof commonsImageMetadataSchema>;
export const imageMetadataSchema = z.discriminatedUnion('source', [nasaImageMetadataSchema, commonsImageMetadataSchema]);
export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
