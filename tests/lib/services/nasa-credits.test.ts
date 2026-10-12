import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { POST as markdown } from '@/app/api/download-markdown/route';
import { POST as powerpoint } from '@/app/api/download-pptx/route';
import { NextRequest } from 'next/server';
const metadata = { source: 'nasa', nasaId: 'roots', title: '<b>Roots</b>', photographer: 'Jane',
  secondaryCreator: 'Different credit', description: 'Courtesy: Original team <script>plain text</script>',
  assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.png', rendition: 'large', mimeType: 'image/png' };
const presentationData = { subject: 'English/Reading', topic: 'Roots', originalWriters: 'Teacher', slides: [
  { slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['Root observation'], visualDescription: 'roots', imageMetadata: metadata },
] };
const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
function req() { return new NextRequest('http://localhost/export', { method: 'POST', body: JSON.stringify({ presentationData, slideImages: { 0: image } }) }); }
describe('NASA export credits', () => {
  it.each([0, 1])('preserves a 2:1 NASA image aspect ratio on exported slide %i', async (index) => {
    const widePng = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAE0lEQVR4nGNQaPhPEmIY1UALDQB5Ss+BakG97wAAAABJRU5ErkJggg==';
    const data = { ...presentationData, slides: Array.from({ length: index + 1 }, (_, i) => ({
      ...presentationData.slides[0], slideNumber: i + 1, imageMetadata: i === index ? metadata : undefined,
    })) };
    const response = await powerpoint(new NextRequest('http://localhost/export', { method: 'POST',
      body: JSON.stringify({ presentationData: data, slideImages: { [index]: widePng } }),
    }));
    expect(response.status).toBe(200);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const xml = await zip.file(`ppt/slides/slide${index + 1}.xml`)!.async('string');
    const picture = xml.match(/<p:pic>[\s\S]*?<\/p:pic>/)![0];
    const extent = picture.match(/<a:ext cx="(\d+)" cy="(\d+)"/)!.slice(1).map(Number);
    expect(extent[0] / extent[1]).toBeCloseTo(2, 5);
    expect(picture).not.toContain('<a:srcRect');
  });

  it('retains all credit fields and source through the Markdown route as plain escaped text', async () => {
    const response = await markdown(req()); expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('Photographer: Jane'); expect(text).toContain('Secondary creator: Different credit');
    expect(text).toContain('Courtesy: Original team'); expect(text).toContain(metadata.assetUrl);
    expect(text).not.toContain('<script>');
  });
  it('includes credits and full source metadata in PowerPoint content and speaker notes', async () => {
    const response = await powerpoint(req()); expect(response.status).toBe(200);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    expect(Object.keys(zip.files).some(path => path.startsWith('ppt/media/') && !zip.files[path].dir)).toBe(true);
    const slide = await zip.file('ppt/slides/slide1.xml')!.async('string');
    const notes = await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string');
    expect(slide).toContain('Photographer: Jane'); expect(slide).toContain('Secondary creator: Different credit');
    expect(notes).toContain(metadata.assetUrl); expect(notes).toContain('Courtesy: Original team');
  });
});
