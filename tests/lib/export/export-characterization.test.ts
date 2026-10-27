import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { NextRequest } from 'next/server';
import { POST as downloadMarkdown } from '@/app/api/download-markdown/route';
import { POST as downloadPptx } from '@/app/api/download-pptx/route';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';

// Captured from the routes and the PPTX generator before slide-image.ts and export/filename.ts existed.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const JPG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKAA/9k=';
const slide = (n: number) => ({ slideNumber: n, part: 'Discussion', title: 'Roots', contentPoints: ['P'], visualDescription: 'V' });
const deck = (topic: string) => ({ subject: 'Science', originalWriters: 'T', topic, slides: [slide(1)] });

describe.each([
  ['Water Cycle', 'Session 1', 'water_cycle_session_1'],
  ['Plants: Roots & Shoots!', '  Session 2 ', 'plants__roots___shoots__session_2'],
  ['MiXeD Case', 'SESSION 3', 'mixed_case_session_3'],
  ['', 'Session 1', 'presentation_session_1'],
  ['Topic', '', 'topic_session'],
  ['Topic', undefined, 'topic_session'],
  ['Fotosíntesis 🌱', 'Session 4', 'fotos_ntesis____session_4'],
  ['   ', '   ', '____session'],
])('export filename for topic %j and session %j', (topic, session, stem) => {
  const request = () => new NextRequest('http://localhost/api/export', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presentationData: deck(topic), ...(session === undefined ? {} : { session }) }),
  });

  it('names the Markdown outline', async () => {
    expect((await downloadMarkdown(request())).headers.get('Content-Disposition')).toBe(`attachment; filename="${stem}_Outline.md"`);
  });

  it('names the PowerPoint file', async () => {
    expect((await downloadPptx(request())).headers.get('Content-Disposition')).toBe(`attachment; filename="${stem}_SayunaAI.pptx"`);
  });
});

describe.each([
  ['empty', '', null],
  ['failed', 'failed', null],
  ['raw PNG', PNG, 'png'],
  ['raw JPEG', JPG, 'jpeg'],
  ['PNG data URL', `data:image/png;base64,${PNG}`, 'png'],
  ['JPEG data URL', `data:image/jpeg;base64,${JPG}`, 'jpeg'],
])('PPTX embed of a %s image', (_, image, extension) => {
  it.each([false, true])('with library credit %s', async (library) => {
    const credited = { ...slide(2), ...(library ? { imageMetadata: {
      source: 'nasa' as const, nasaId: 'x', assetUrl: 'https://images-assets.nasa.gov/image/x/x~large.jpg', rendition: 'large' as const, mimeType: 'image/png' as const,
    } } : {}) };
    const zip = await JSZip.loadAsync(await buildPresentationPptx({ ...deck('t'), slides: [slide(1), credited] }, { 1: image }));
    const media = Object.values(zip.files).filter((file) => !file.dir && file.name.startsWith('ppt/media/'));
    if (extension === null) {
      expect(media).toHaveLength(0);
      return;
    }
    expect(media.map((file) => file.name)).toEqual([`ppt/media/image-2-1.${extension}`]);
    expect(await media[0].async('base64')).toBe(image.replace(/^data:image\/[a-z]+;base64,/, ''));
  });
});
