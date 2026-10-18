import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { imageCreditText, imageSourceNotes } from '@/lib/image-credit';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import type { PresentationData } from '@/types/presentation';
import { pptxCredit, samples } from './credit-samples';

// Captured from the renderers before the Credit module existed; any drift is a visible change.
const expected: Record<keyof typeof samples, {
  creditText: string; notes: string; markdown: string;
  pptx: { visible: string; hyperlinks: string[]; notes: string[] };
}> = {
  nasaFull: {
    creditText: "Photographer: Jane; Secondary creator: Different credit",
    notes: "NASA image: roots\nRoots *in* soil\nPhotographer: Jane; Secondary creator: Different credit\nPublishing center: JSC\nSource: https://images-assets.nasa.gov/image/roots/collection.json\nDownloaded asset: https://images-assets.nasa.gov/image/roots/roots~large.png\nSource description: Courtesy: Original team <script>plain text</script>\nUsage permission has not been established.",
    markdown: "# Roots\n\n**Subject**: Science\n**Original Lesson Plan Writers**: Teacher\n\n## Slide 1 - Discussion\n### Roots\n- Observe\n\n*Suggested Visual:* roots\n\n**Selected NASA image**\n\nNASA image: roots  \nRoots \\*in\\* soil  \nPhotographer: Jane; Secondary creator: Different credit  \nPublishing center: JSC  \nSource: https://images-assets\\.nasa\\.gov/image/roots/collection\\.json  \nDownloaded asset: https://images-assets\\.nasa\\.gov/image/roots/roots~large\\.png  \nSource description: Courtesy: Original team \\<script\\>plain text\\</script\\>  \nUsage permission has not been established\\.\n\n[NASA source](<https://images-assets.nasa.gov/image/roots/collection.json>)\n\n---",
    pptx: {
      visible: "NASA roots — Photographer: Jane; Secondary creator: Different credit",
      hyperlinks: ["https://images-assets.nasa.gov/image/roots/collection.json"],
      notes: ["NASA image: roots\r\nRoots *in* soil\r\nPhotographer: Jane; Secondary creator: Different credit\r\nPublishing center: JSC\r\nSource: https://images-assets.nasa.gov/image/roots/collection.json\r\nDownloaded asset: https://images-assets.nasa.gov/image/roots/roots~large.png\r\nSource description: Courtesy: Original team &lt;script&gt;plain text&lt;/script&gt;\r\nUsage permission has not been established.", "1"],
    },
  },
  nasaMinimal: {
    creditText: "Credit metadata not provided. See source description.",
    notes: "NASA image: bare_1\nCredit metadata not provided. See source description.\nSource: https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg\nDownloaded asset: https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg\nUsage permission has not been established.",
    markdown: "# Roots\n\n**Subject**: Science\n**Original Lesson Plan Writers**: Teacher\n\n## Slide 1 - Discussion\n### Roots\n- Observe\n\n*Suggested Visual:* roots\n\n**Selected NASA image**\n\nNASA image: bare\\_1  \nCredit metadata not provided\\. See source description\\.  \nSource: https://images-assets\\.nasa\\.gov/image/bare\\_1/bare\\_1~orig\\.jpg  \nDownloaded asset: https://images-assets\\.nasa\\.gov/image/bare\\_1/bare\\_1~orig\\.jpg  \nUsage permission has not been established\\.\n\n[NASA source](<https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg>)\n\n---",
    pptx: {
      visible: "NASA bare_1 — Credit metadata not provided. See source description.",
      hyperlinks: ["https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg"],
      notes: ["NASA image: bare_1\r\nCredit metadata not provided. See source description.\r\nSource: https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg\r\nDownloaded asset: https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg\r\nUsage permission has not been established.", "1"],
    },
  },
  commonsFull: {
    creditText: "Creator: Original artist; License: CC BY 4.0",
    notes: "Wikimedia Commons file: File:Diagram (v2).png (ID 42)\nCreator: Original artist; License: CC BY 4.0\nSource: https://commons.wikimedia.org/wiki/File:Diagram_(v2).png\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Diagram.png/1200px-Diagram.png\nLicense link: https://creativecommons.org/licenses/by/4.0/\nCredit: Original institution\nAttribution: Credit the artist & institution\nAttribution required: true\nUsage terms: Creative Commons Attribution 4.0\nRestrictions: trademarked\nSource description: A [labelled] diagram\nChanges: Raster thumbnail; presentation export may resize and compress the image.",
    markdown: "# Roots\n\n**Subject**: Science\n**Original Lesson Plan Writers**: Teacher\n\n## Slide 1 - Discussion\n### Roots\n- Observe\n\n*Suggested Visual:* roots\n\n**Selected Commons image**\n\nWikimedia Commons file: File:Diagram \\(v2\\)\\.png \\(ID 42\\)  \nCreator: Original artist; License: CC BY 4\\.0  \nSource: https://commons\\.wikimedia\\.org/wiki/File:Diagram\\_\\(v2\\)\\.png  \nDownloaded thumbnail: https://upload\\.wikimedia\\.org/wikipedia/commons/thumb/a/ab/Diagram\\.png/1200px-Diagram\\.png  \nLicense link: https://creativecommons\\.org/licenses/by/4\\.0/  \nCredit: Original institution  \nAttribution: Credit the artist & institution  \nAttribution required: true  \nUsage terms: Creative Commons Attribution 4\\.0  \nRestrictions: trademarked  \nSource description: A \\[labelled\\] diagram  \nChanges: Raster thumbnail; presentation export may resize and compress the image\\.\n\n[Commons source](<https://commons.wikimedia.org/wiki/File:Diagram_(v2).png>)\n\n[License: CC BY 4.0](<https://creativecommons.org/licenses/by/4.0/>)\n\n---",
    pptx: {
      visible: "Commons — Creator: Original artist; License: CC BY 4.0",
      hyperlinks: ["https://commons.wikimedia.org/wiki/File:Diagram_(v2).png"],
      notes: ["Wikimedia Commons file: File:Diagram (v2).png (ID 42)\r\nCreator: Original artist; License: CC BY 4.0\r\nSource: https://commons.wikimedia.org/wiki/File:Diagram_(v2).png\r\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Diagram.png/1200px-Diagram.png\r\nLicense link: https://creativecommons.org/licenses/by/4.0/\r\nCredit: Original institution\r\nAttribution: Credit the artist &amp; institution\r\nAttribution required: true\r\nUsage terms: Creative Commons Attribution 4.0\r\nRestrictions: trademarked\r\nSource description: A [labelled] diagram\r\nChanges: Raster thumbnail; presentation export may resize and compress the image.", "1"],
    },
  },
  commonsMinimal: {
    creditText: "Creator: Not provided; License: Public domain",
    notes: "Wikimedia Commons file: File:Leaf.jpg (ID 7)\nCreator: Not provided; License: Public domain\nSource: https://commons.wikimedia.org/wiki/File:Leaf.jpg\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg\nChanges: Raster thumbnail; presentation export may resize and compress the image.",
    markdown: "# Roots\n\n**Subject**: Science\n**Original Lesson Plan Writers**: Teacher\n\n## Slide 1 - Discussion\n### Roots\n- Observe\n\n*Suggested Visual:* roots\n\n**Selected Commons image**\n\nWikimedia Commons file: File:Leaf\\.jpg \\(ID 7\\)  \nCreator: Not provided; License: Public domain  \nSource: https://commons\\.wikimedia\\.org/wiki/File:Leaf\\.jpg  \nDownloaded thumbnail: https://upload\\.wikimedia\\.org/wikipedia/commons/a/ab/Leaf\\.jpg  \nChanges: Raster thumbnail; presentation export may resize and compress the image\\.\n\n[Commons source](<https://commons.wikimedia.org/wiki/File:Leaf.jpg>)\n\n---",
    pptx: {
      visible: "Commons — Creator: Not provided; License: Public domain",
      hyperlinks: ["https://commons.wikimedia.org/wiki/File:Leaf.jpg"],
      notes: ["Wikimedia Commons file: File:Leaf.jpg (ID 7)\r\nCreator: Not provided; License: Public domain\r\nSource: https://commons.wikimedia.org/wiki/File:Leaf.jpg\r\nDownloaded thumbnail: https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg\r\nChanges: Raster thumbnail; presentation export may resize and compress the image.", "1"],
    },
  },
};

function deck(name: keyof typeof samples): PresentationData {
  return { subject: 'Science', topic: 'Roots', originalWriters: 'Teacher', slides: [
    { slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['Observe'], visualDescription: 'roots', imageMetadata: samples[name] },
  ] };
}

describe.each(Object.keys(samples) as (keyof typeof samples)[])('credit output for %s', (name) => {
  it('keeps the credit line and source notes', () => {
    expect(imageCreditText(samples[name])).toBe(expected[name].creditText);
    expect(imageSourceNotes(samples[name])).toBe(expected[name].notes);
  });

  it('keeps the Markdown export', () => {
    expect(buildPresentationMarkdown(deck(name))).toBe(expected[name].markdown);
  });

  it('keeps the PPTX visible credit, single hyperlink and speaker notes', async () => {
    const zip = await JSZip.loadAsync(await buildPresentationPptx(deck(name)));
    expect(await pptxCredit(zip)).toEqual(expected[name].pptx);
  });
});
