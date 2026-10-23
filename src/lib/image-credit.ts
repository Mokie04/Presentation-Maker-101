import type { ImageMetadata } from '@/lib/image-metadata';

export type ImageSource = ImageMetadata['source'];
export type ImageSourceLabel = 'NASA' | 'Commons';

/** One library image's credit, as plain unescaped strings; each renderer formats it for its medium. */
export interface ImageCredit {
  source: ImageSource;
  sourceLabel: ImageSourceLabel;
  /** Visible PPTX prefix: 'NASA <nasaId>' or 'Commons'. */
  heading: string;
  creditLine: string;
  sourceLink: string;
  /** shareAlike: the copy in the export stays under the same license (CC BY-SA). */
  license?: { name: string; url?: string; shareAlike?: true };
  description?: string;
  notes: string;
}

const SOURCE_LABELS: Record<ImageSource, ImageSourceLabel> = { nasa: 'NASA', commons: 'Commons' };

export function imageSourceLabel(source: ImageSource): ImageSourceLabel {
  return SOURCE_LABELS[source];
}

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
    metadata.licenseKind === 'cc-by-sa' &&
      `ShareAlike: this exported copy is an adapted copy of the original image and remains licensed under ${metadata.licenseName}; see the license link above.`,
  ].filter(Boolean).join('\n');
  return [`NASA image: ${metadata.nasaId}`, metadata.title, imageCreditText(metadata),
    metadata.center && `Publishing center: ${metadata.center}`, `Source: ${metadata.sourceUrl ?? metadata.assetUrl}`,
    `Downloaded asset: ${metadata.assetUrl}`, metadata.description && `Source description: ${metadata.description}`,
    'Usage permission has not been established.'].filter(Boolean).join('\n');
}

export function describeImageCredit(metadata: ImageMetadata): ImageCredit {
  const sourceLabel = imageSourceLabel(metadata.source);
  return {
    source: metadata.source,
    sourceLabel,
    heading: metadata.source === 'commons' ? sourceLabel : `${sourceLabel} ${metadata.nasaId}`,
    creditLine: imageCreditText(metadata),
    sourceLink: metadata.sourceUrl ?? metadata.assetUrl,
    ...(metadata.source === 'commons'
      ? { license: { name: metadata.licenseName, ...(metadata.licenseUrl ? { url: metadata.licenseUrl } : {}),
        ...(metadata.licenseKind === 'cc-by-sa' ? { shareAlike: true as const } : {}) } } : {}),
    ...(metadata.description ? { description: metadata.description } : {}),
    notes: imageSourceNotes(metadata),
  };
}
