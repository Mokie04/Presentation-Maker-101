import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { NextRequest } from 'next/server';
import { POST as md } from '@/app/api/download-markdown/route';
import { POST as ppt } from '@/app/api/download-pptx/route';
const image = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAE0lEQVR4nGNQaPhPEmIY1UALDQB5Ss+BakG97wAAAABJRU5ErkJggg==';
const metadata = { source: 'commons', fileId: 42, title: 'File:Diagram.png', creator: 'Original artist',
  credit: 'Original institution', usageTerms: 'Creative Commons Attribution 4.0', attribution: 'Credit the artist and institution', attributionRequired: true,
  licenseKind: 'cc-by', licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Diagram.png',
  assetUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Diagram.png/1200px-Diagram.png',
  mimeType: 'image/png', rendition: 'thumbnail' };
function req() { return new NextRequest('http://localhost/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  presentationData: { subject: 'English/Reading', topic: 'Observation', originalWriters: 'Teacher', slides: [
    { slideNumber: 1, title: 'Observation', contentPoints: ['Observe the diagram'], part: 'Discussion', visualDescription: 'Diagram', imageMetadata: metadata },
  ] }, slideImages: { 0: image },
}) }); }
describe('Commons attribution in real exports', () => {
  it('includes creator, source, license link, credit and attribution in Markdown', async () => {
    const response = await md(req()); expect(response.status).toBe(200); const text = await response.text();
    for (const field of ['Original artist', 'Original institution', 'Credit the artist and institution', 'CC BY 4.0']) expect(text).toContain(field);
    expect(text).toContain(metadata.sourceUrl); expect(text).toContain(metadata.licenseUrl);
  });
  it('preserves Commons proportions, visible attribution and full notes in PPTX', async () => {
    const response = await ppt(req()); expect(response.status).toBe(200);
    const zip = await JSZip.loadAsync(await response.arrayBuffer()); const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('Original artist'); expect(xml).toContain('CC BY 4.0');
    const pic = xml.match(/<p:pic>[\s\S]*?<\/p:pic>/)![0]; const ext = pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/)!.slice(1).map(Number);
    expect(ext[0] / ext[1]).toBeCloseTo(2, 5);
    const notes = await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string');
    expect(notes).toContain(metadata.usageTerms); expect(notes).toContain(metadata.sourceUrl); expect(notes).toContain(metadata.licenseUrl); expect(notes).toContain(metadata.attribution);
  });
});
