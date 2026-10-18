import type JSZip from 'jszip';
import type { ImageMetadata } from '@/lib/image-metadata';

export const samples = {
  nasaFull: {
    source: 'nasa', nasaId: 'roots', title: 'Roots *in* soil', photographer: 'Jane', secondaryCreator: 'Different credit',
    center: 'JSC', description: 'Courtesy: Original team <script>plain text</script>',
    sourceUrl: 'https://images-assets.nasa.gov/image/roots/collection.json',
    assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.png', rendition: 'large', mimeType: 'image/png',
  },
  nasaMinimal: {
    source: 'nasa', nasaId: 'bare_1', assetUrl: 'https://images-assets.nasa.gov/image/bare_1/bare_1~orig.jpg',
    rendition: 'orig', mimeType: 'image/jpeg',
  },
  commonsFull: {
    source: 'commons', fileId: 42, title: 'File:Diagram (v2).png', creator: 'Original artist', credit: 'Original institution',
    attribution: 'Credit the artist & institution', attributionRequired: true, usageTerms: 'Creative Commons Attribution 4.0',
    restrictions: 'trademarked', description: 'A [labelled] diagram',
    licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Diagram_(v2).png',
    assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Diagram.png/1200px-Diagram.png',
    rendition: 'thumbnail', mimeType: 'image/png',
  },
  commonsMinimal: {
    source: 'commons', fileId: 7, title: 'File:Leaf.jpg', licenseKind: 'public-domain', licenseName: 'Public domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Leaf.jpg',
    assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Leaf.jpg', rendition: 'thumbnail', mimeType: 'image/jpeg',
  },
} satisfies Record<string, ImageMetadata>;

function texts(xml: string): string[] {
  return Array.from(xml.matchAll(/<a:p>[\s\S]*?<\/a:p>/g))
    .map(([p]) => Array.from(p.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map(([, t]) => t).join(''))
    .filter(Boolean);
}

/** Visible credit run, its hyperlink target and the speaker notes of slide 1, as raw XML text. */
export async function pptxCredit(zip: JSZip) {
  const slide = await zip.file('ppt/slides/slide1.xml')!.async('string');
  const rels = await zip.file('ppt/slides/_rels/slide1.xml.rels')!.async('string');
  const notes = await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string');
  const visible = texts(slide).find((t) => t.includes(' — '));
  const hyperlinks = Array.from(rels.matchAll(/Type="[^"]*\/hyperlink" Target="([^"]*)"/g)).map(([, target]) => target);
  return { visible, hyperlinks, notes: texts(notes) };
}
