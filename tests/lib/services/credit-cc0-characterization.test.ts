import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { describeImageCredit, imageCreditText, imageSourceNotes } from '@/lib/image-credit';
import type { ImageMetadata } from '@/lib/image-metadata';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { pptxCredit, samples } from './credit-samples';

// Captured before CC BY-SA support: CC0 had no characterization yet. Any drift is a visible change.
const cc0: ImageMetadata = { source: 'commons', fileId: 7, title: 'File:Leaf_(macro).jpg', creator: 'Ana <Cruz>', credit: 'Own work',
  attributionRequired: false, licenseKind: 'cc0', licenseName: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg', assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg',
  rendition: 'thumbnail', mimeType: 'image/jpeg' };
const deck = { subject: 'Science', topic: 'Roots', originalWriters: 'Teacher', slides: [
  { slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['Observe'], visualDescription: 'roots', imageMetadata: cc0 }] };

describe('CC0 credit output', () => {
  it('keeps the credit description', () => {
    expect(describeImageCredit(cc0)).toStrictEqual({"source": "commons", "sourceLabel": "Commons", "heading": "Commons", "creditLine": "Creator: Ana <Cruz>; License: CC0 1.0", "sourceLink": "https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg", "license": {"name": "CC0 1.0", "url": "https://creativecommons.org/publicdomain/zero/1.0/"}, "notes": "Wikimedia Commons file: File:Leaf_(macro).jpg (ID 7)\nCreator: Ana <Cruz>; License: CC0 1.0\nSource: https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg\nLicense link: https://creativecommons.org/publicdomain/zero/1.0/\nCredit: Own work\nAttribution required: false\nChanges: Raster thumbnail; presentation export may resize and compress the image."});
    expect(imageCreditText(cc0)).toBe("Creator: Ana <Cruz>; License: CC0 1.0");
    expect(imageSourceNotes(cc0)).toBe("Wikimedia Commons file: File:Leaf_(macro).jpg (ID 7)\nCreator: Ana <Cruz>; License: CC0 1.0\nSource: https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg\nLicense link: https://creativecommons.org/publicdomain/zero/1.0/\nCredit: Own work\nAttribution required: false\nChanges: Raster thumbnail; presentation export may resize and compress the image.");
  });

  it('keeps the Markdown export', () => {
    expect(buildPresentationMarkdown(deck)).toBe("# Roots\n\n**Subject**: Science\n**Original Lesson Plan Writers**: Teacher\n\n## Slide 1 - Discussion\n### Roots\n- Observe\n\n*Suggested Visual:* roots\n\n**Selected Commons image**\n\nWikimedia Commons file: File:Leaf\\_\\(macro\\)\\.jpg \\(ID 7\\)  \nCreator: Ana \\<Cruz\\>; License: CC0 1\\.0  \nSource: https://commons\\.wikimedia\\.org/wiki/File:Leaf\\_\\(macro\\)\\.jpg  \nDownloaded thumbnail: https://upload\\.wikimedia\\.org/wikipedia/commons/a/ab/Leaf\\.jpg  \nLicense link: https://creativecommons\\.org/publicdomain/zero/1\\.0/  \nCredit: Own work  \nAttribution required: false  \nChanges: Raster thumbnail; presentation export may resize and compress the image\\.\n\n[Commons source](<https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg>)\n\n[License: CC0 1.0](<https://creativecommons.org/publicdomain/zero/1.0/>)\n\n---");
  });

  it('keeps the PPTX visible credit, single hyperlink and speaker notes', async () => {
    expect(await pptxCredit(await JSZip.loadAsync(await buildPresentationPptx(deck)))).toEqual({"visible": "Commons — Creator: Ana &lt;Cruz&gt;; License: CC0 1.0", "hyperlinks": ["https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg"], "notes": ["Wikimedia Commons file: File:Leaf_(macro).jpg (ID 7)\r\nCreator: Ana &lt;Cruz&gt;; License: CC0 1.0\r\nSource: https://commons.wikimedia.org/wiki/File:Leaf_(macro).jpg\r\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg\r\nLicense link: https://creativecommons.org/publicdomain/zero/1.0/\r\nCredit: Own work\r\nAttribution required: false\r\nChanges: Raster thumbnail; presentation export may resize and compress the image.", "1"]});
  });
});

describe.each([['CC BY', samples.commonsFull], ['public domain', samples.commonsMinimal], ['CC0', cc0]])('%s credit', (_, metadata) => {
  it('carries no ShareAlike marker', () => {
    expect(describeImageCredit(metadata as ImageMetadata).license).not.toHaveProperty('shareAlike');
    expect(imageSourceNotes(metadata as ImageMetadata)).not.toContain('ShareAlike');
  });
});
