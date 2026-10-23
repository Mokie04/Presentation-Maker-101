// @vitest-environment node
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { commonsImageMetadataSchema, type ImageMetadata } from '@/lib/image-metadata';
import { describeImageCredit, imageSourceNotes } from '@/lib/image-credit';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';

const shareAlikeLine = 'ShareAlike: this exported copy is an adapted copy of the original image and remains licensed under CC BY-SA 4.0; see the license link above.';
const bySa: ImageMetadata = {
  source: 'commons', fileId: 31415, title: 'File:2014 Meteor.jpg', creator: 'Jane Skywatcher', attributionRequired: true,
  licenseKind: 'cc-by-sa', licenseName: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:2014_Meteor.jpg',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/2014_Meteor.jpg/1200px-2014_Meteor.jpg',
  rendition: 'thumbnail', mimeType: 'image/jpeg',
};
const deck = { subject: 'Science', topic: 'Meteors', originalWriters: 'Teacher', slides: [
  { slideNumber: 1, part: 'Discussion', title: 'Meteors', contentPoints: ['Look up'], visualDescription: 'meteor', imageMetadata: bySa }] };

describe('Commons metadata schema', () => {
  it('accepts licenseKind cc-by-sa', () => {
    expect(commonsImageMetadataSchema.parse(bySa).licenseKind).toBe('cc-by-sa');
  });

  it.each(['cc-by-nc', 'cc-by-nd', 'cc-by-nc-sa', 'gfdl'])('still rejects licenseKind %s', (licenseKind) => {
    expect(commonsImageMetadataSchema.safeParse({ ...bySa, licenseKind }).success).toBe(false);
  });
});

describe('CC BY-SA credit', () => {
  it('marks the license as ShareAlike', () => {
    expect(describeImageCredit(bySa).license).toEqual({ name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', shareAlike: true });
  });

  it('adds one ShareAlike line after the Changes line', () => {
    const lines = imageSourceNotes(bySa).split('\n');
    expect(lines.slice(-2)).toEqual(['Changes: Raster thumbnail; presentation export may resize and compress the image.', shareAlikeLine]);
    expect(lines.filter((line) => line.includes('ShareAlike'))).toHaveLength(1);
    expect(lines).toContain('License link: https://creativecommons.org/licenses/by-sa/4.0/');
  });

  it('keeps one source hyperlink and puts the ShareAlike line in the PowerPoint notes', async () => {
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck));
    const notes = await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string');
    const rels = await zip.file('ppt/slides/_rels/slide1.xml.rels')!.async('string');
    expect(notes).toContain(shareAlikeLine);
    expect(notes).toContain('License link: https://creativecommons.org/licenses/by-sa/4.0/');
    expect(Array.from(rels.matchAll(/\/hyperlink" Target="([^"]*)"/g)).map(([, target]) => target)).toEqual([bySa.sourceUrl]);
  });

  it('puts the ShareAlike line and the license link in the Markdown export', () => {
    const markdown = buildPresentationMarkdown(deck);
    expect(markdown).toContain('ShareAlike: this exported copy is an adapted copy of the original image and remains licensed under CC BY-SA 4\\.0; see the license link above\\.');
    expect(markdown).toContain('[License: CC BY-SA 4.0](<https://creativecommons.org/licenses/by-sa/4.0/>)');
  });
});
