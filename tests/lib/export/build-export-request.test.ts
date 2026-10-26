import { describe, expect, it, vi } from 'vitest';
import { buildPptxExportRequest } from '@/lib/export/build-export-request';
import { CLIENT_EXPORT_BUDGET_CHARS } from '@/lib/export/limits';
import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData } from '@/types/presentation';

const credit: ImageMetadata = {
  source: 'nasa', nasaId: 'roots', assetUrl: 'https://images-assets.nasa.gov/image/roots/roots~large.jpg', rendition: 'large', mimeType: 'image/jpeg',
};
const deck = (count: number, credited: number[] = []): PresentationData => ({
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: Array.from({ length: count }, (_, i) => ({
    slideNumber: i + 1, part: 'Discussion', title: `Slide ${i + 1}`, contentPoints: ['P'], visualDescription: 'V',
    ...(credited.includes(i) ? { imageMetadata: credit } : {}),
  })),
});
const image = (i: number, size = 20) => `/9j/${String(i).repeat(size)}`;
const shrink = async (value: string) => value.slice(0, 12);
const parse = (body: string) => JSON.parse(body) as { presentationData: PresentationData; slideImages: Record<string, string>; session: string };

describe('buildPptxExportRequest', () => {
  it('compresses only usable images and sends the compressed values', async () => {
    const compress = vi.fn(shrink);
    const slideImages = { 0: image(0), 1: '', 2: 'failed', 3: `data:image/png;base64,iVBORw0KGgo${'A'.repeat(30)}` };
    const { body, droppedImageIndexes } = await buildPptxExportRequest({ presentationData: deck(4), slideImages, session: 'Session 1' }, { compress });
    expect(compress.mock.calls.map(([value]) => value)).toEqual([slideImages[0], slideImages[3]]);
    expect(parse(body).slideImages).toEqual({ 0: '/9j/00000000', 1: '', 2: 'failed', 3: 'data:image/p' });
    expect(droppedImageIndexes).toEqual([]);
  });

  it('builds the same body as JSON.stringify of the payload when under budget', async () => {
    const presentationData = deck(3, [1]);
    const { body } = await buildPptxExportRequest(
      { presentationData, slideImages: { 2: image(2), 0: image(0) }, session: 'Session 2' }, { compress: async (v) => v });
    expect(body).toBe(JSON.stringify({ presentationData, slideImages: { 0: image(0), 2: image(2) }, session: 'Session 2' }));
  });

  it('uses the shared client budget by default', async () => {
    const big = `/9j/${'A'.repeat(CLIENT_EXPORT_BUDGET_CHARS)}`;
    const { droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData: deck(2), slideImages: { 0: image(0), 1: big }, session: 'Session 1' }, { compress: async (v) => v });
    expect(droppedImageIndexes).toEqual([1]);
  });

  it('drops images from the last slide down and stops as soon as the body fits', async () => {
    const presentationData = deck(5);
    const slideImages = Object.fromEntries([0, 1, 2, 3, 4].map((i) => [i, image(i, 100)]));
    const full = (await buildPptxExportRequest({ presentationData, slideImages, session: 'S' }, { compress: async (v) => v })).body.length;
    const { body, droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData, slideImages, session: 'S' }, { compress: async (v) => v, budgetChars: full - 150 });
    expect(droppedImageIndexes).toEqual([4, 3]);
    expect(Object.keys(parse(body).slideImages)).toEqual(['0', '1', '2']);
    expect(body.length).toBeLessThanOrEqual(full - 150);
  });

  it('removes the credit of a dropped image and keeps the others', async () => {
    const presentationData = deck(3, [0, 2]);
    const slideImages = { 0: image(0, 100), 1: image(1, 100), 2: image(2, 100) };
    const full = (await buildPptxExportRequest({ presentationData, slideImages, session: 'S' }, { compress: async (v) => v })).body.length;
    const { body, droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData, slideImages, session: 'S' }, { compress: async (v) => v, budgetChars: full - 50 });
    expect(droppedImageIndexes).toEqual([2]);
    const sent = parse(body).presentationData.slides;
    expect(sent[0].imageMetadata).toEqual(credit);
    expect(sent[2]).not.toHaveProperty('imageMetadata');
    expect(sent[2]).toEqual({ slideNumber: 3, part: 'Discussion', title: 'Slide 3', contentPoints: ['P'], visualDescription: 'V' });
  });

  it('does not mutate its inputs', async () => {
    const presentationData = deck(3, [0, 1, 2]);
    const slideImages = { 0: image(0, 100), 1: image(1, 100), 2: image(2, 100) };
    const before = structuredClone({ presentationData, slideImages });
    await buildPptxExportRequest({ presentationData, slideImages, session: 'S' }, { compress: async (v) => v, budgetChars: 10 });
    expect({ presentationData, slideImages }).toEqual(before);
  });

  it('never drops empty or failed entries and returns an over-budget body without throwing', async () => {
    const { body, droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData: deck(4, [1]), slideImages: { 0: image(0), 1: image(1), 2: '', 3: 'failed' }, session: 'S' },
      { compress: async (v) => v, budgetChars: 10 });
    expect(droppedImageIndexes).toEqual([1, 0]);
    expect(parse(body).slideImages).toEqual({ 2: '', 3: 'failed' });
    expect(body.length).toBeGreaterThan(10);
  });

  it('keeps the empty string compress returns for a large image it cannot decode', async () => {
    const { body, droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData: deck(2), slideImages: { 0: image(0), 1: image(1) }, session: 'S' },
      { compress: async (v) => (v === image(1) ? '' : v), budgetChars: 10 });
    expect(parse(body).slideImages[1]).toBe('');
    expect(droppedImageIndexes).toEqual([1, 0]);
  });

  it.each(['', 'failed'])('strips credits and records the index when compression returns %j', async (compressed) => {
    const presentationData = deck(2, [0, 1]);
    const { body, droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData, slideImages: { 0: image(0), 1: image(1) }, session: 'S' },
      { compress: async (value) => value === image(1) ? compressed : value });
    expect(droppedImageIndexes).toEqual([1]);
    expect(parse(body).presentationData.slides[0].imageMetadata).toEqual(credit);
    expect(parse(body).presentationData.slides[1]).not.toHaveProperty('imageMetadata');
    expect(presentationData.slides[1].imageMetadata).toEqual(credit);
  });

  it('drops a larger retained PNG from the last slide when it exceeds the budget', async () => {
    const { body, droppedImageIndexes } = await buildPptxExportRequest(
      { presentationData: deck(2, [1]), slideImages: { 0: image(0), 1: 'iVBORw0KGgoAAAA' }, session: 'S' },
      { compress: async (value) => value.startsWith('iVB') ? `iVBORw0KGgo${'A'.repeat(2000)}` : value, budgetChars: 1000 });
    expect(droppedImageIndexes).toEqual([1]);
    expect(parse(body).slideImages).toEqual({ 0: image(0) });
    expect(parse(body).presentationData.slides[1]).not.toHaveProperty('imageMetadata');
    expect(body.length).toBeLessThanOrEqual(1000);
  });
});
