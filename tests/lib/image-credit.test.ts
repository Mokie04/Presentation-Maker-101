import { describe, expect, it } from 'vitest';
import { describeImageCredit, imageCreditText, imageSourceLabel, imageSourceNotes } from '@/lib/image-credit';
import type { ImageMetadata } from '@/lib/image-metadata';

const nasa: ImageMetadata = {
  source: 'nasa', nasaId: 'roots', title: 'Roots', photographer: 'Jane', secondaryCreator: 'Different credit',
  description: 'Courtesy: <b>team</b>', sourceUrl: 'https://images-assets.nasa.gov/image/roots/collection.json',
  assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.png', rendition: 'large', mimeType: 'image/png',
};
const commons: ImageMetadata = {
  source: 'commons', fileId: 42, title: 'File:Diagram.png', creator: 'Original artist', description: 'A *diagram*',
  licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Diagram.png',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Diagram.png', rendition: 'thumbnail', mimeType: 'image/png',
};

function without<T extends ImageMetadata>(metadata: T, ...keys: (keyof T)[]): T {
  const copy = { ...metadata };
  keys.forEach((key) => delete copy[key]);
  return copy;
}

describe('describeImageCredit', () => {
  it.each([
    {
      name: 'NASA with every field', metadata: nasa,
      credit: {
        source: 'nasa', sourceLabel: 'NASA', heading: 'NASA roots',
        creditLine: 'Photographer: Jane; Secondary creator: Different credit',
        sourceLink: 'https://images-assets.nasa.gov/image/roots/collection.json', description: 'Courtesy: <b>team</b>',
      },
    },
    {
      name: 'NASA without photographer, secondary creator, sourceUrl or description',
      metadata: without(nasa, 'photographer', 'secondaryCreator', 'sourceUrl', 'description'),
      credit: {
        source: 'nasa', sourceLabel: 'NASA', heading: 'NASA roots',
        creditLine: 'Credit metadata not provided. See source description.',
        sourceLink: 'https://images-assets.nasa.gov/image/roots/roots~large.png',
      },
    },
    {
      name: 'NASA with only a secondary creator', metadata: without(nasa, 'photographer'),
      credit: { creditLine: 'Secondary creator: Different credit' },
    },
    {
      name: 'Commons with every field', metadata: commons,
      credit: {
        source: 'commons', sourceLabel: 'Commons', heading: 'Commons',
        creditLine: 'Creator: Original artist; License: CC BY 4.0',
        sourceLink: 'https://commons.wikimedia.org/wiki/File:Diagram.png',
        license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' }, description: 'A *diagram*',
      },
    },
    {
      name: 'Commons without creator, licenseUrl or description',
      metadata: without(commons, 'creator', 'licenseUrl', 'description'),
      credit: {
        source: 'commons', sourceLabel: 'Commons', heading: 'Commons',
        creditLine: 'Creator: Not provided; License: CC BY 4.0',
        sourceLink: 'https://commons.wikimedia.org/wiki/File:Diagram.png', license: { name: 'CC BY 4.0' },
      },
    },
  ])('describes $name', ({ metadata, credit }) => {
    const described = describeImageCredit(metadata);
    expect(described).toMatchObject(credit);
    expect(described.creditLine).toBe(imageCreditText(metadata));
    expect(described.notes).toBe(imageSourceNotes(metadata));
  });

  it('omits license and description keys when they do not apply', () => {
    const nasaCredit = describeImageCredit(without(nasa, 'description'));
    expect('license' in nasaCredit).toBe(false);
    expect('description' in nasaCredit).toBe(false);
    expect('url' in describeImageCredit(without(commons, 'licenseUrl')).license!).toBe(false);
  });

  it('returns plain unescaped strings', () => {
    expect(describeImageCredit(commons).description).toBe('A *diagram*');
    expect(describeImageCredit(nasa).notes).toContain('Courtesy: <b>team</b>');
  });
});

describe('imageSourceLabel', () => {
  it.each([['nasa', 'NASA'], ['commons', 'Commons']] as const)('labels %s as %s', (source, label) => {
    expect(imageSourceLabel(source)).toBe(label);
  });
});
