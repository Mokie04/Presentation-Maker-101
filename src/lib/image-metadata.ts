import { z } from 'zod';

export const nasaAssetUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && url.hostname === 'images-assets.nasa.gov' &&
    !url.username && !url.password && !url.port;
}, 'Expected a trusted HTTPS NASA asset URL').transform((value) => new URL(value).href);

export const nasaImageMetadataSchema = z.object({
  source: z.literal('nasa'),
  nasaId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  previewUrl: nasaAssetUrlSchema.optional(),
  sourceUrl: nasaAssetUrlSchema.optional(),
  assetUrl: nasaAssetUrlSchema,
  photographer: z.string().optional(),
  secondaryCreator: z.string().optional(),
  center: z.string().optional(),
  rendition: z.enum(['large', 'medium', 'orig']),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});
export type NasaImageMetadata = z.infer<typeof nasaImageMetadataSchema>;

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
