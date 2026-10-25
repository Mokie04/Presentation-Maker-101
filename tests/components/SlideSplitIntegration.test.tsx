// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { openWorkspace, selectSlide, stage } from '../helpers/workspace';
import { samples } from '../lib/services/credit-samples';
import type { SlideData } from '@/types/presentation';
vi.mock('@/lib/export/compress-image', () => ({ compressImageForExport: async (image: string) => image }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const points = [
  '1. Identify the different kinds of small bodies in the Solar System like meteoroids, asteroids, and dwarf planets.',
  '2. Compare the shapes and orbits of asteroids and comets using observations from photographs.',
  '3. Explain how gravity affects the motion of small bodies as they travel around the Sun.',
  '4. Record evidence about size, composition, and movement, then discuss the results with your classmates.',
];
function stub(contentPoints = points) {
  let batch!: (response: Response) => void;
  vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:test'; } static revokeObjectURL() {} });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url === '/api/session') return Promise.resolve(Response.json({ authenticated: true }));
    if (url === '/api/generate') return Promise.resolve(Response.json({ subject: 'Science', originalWriters: 'Teacher', topic: 'Space', slides: [
      { slideNumber: 1, part: 'Title Page', title: 'Space', contentPoints: ['Science'], visualDescription: '' },
      { slideNumber: 2, part: 'Discussion', title: 'Bodies', contentPoints, visualDescription: 'Solar System', imageMetadata: samples.commonsFull },
      { slideNumber: 3, part: 'Discussion', title: 'Next', contentPoints: ['Reflect'], visualDescription: 'Stars' },
    ] }));
    if (url === '/api/generate-images') return new Promise<Response>(resolve => { batch = resolve; });
    if (url === '/api/download-pptx') return Promise.resolve(new Response('pptx'));
    throw new Error(`Unexpected request: ${url}`);
  }));
  return (images: Record<number, string>) => act(async () => { batch(Response.json({ images })); });
}
it.each(['stage', 'panel'] as const)('splits from the %s, retains original selection and focus, and exports correct images and credits', async source => {
  const batch = stub(); await openWorkspace(); selectSlide(2);
  await batch({ 1: 'original-image', 2: 'next-image' });
  expect(screen.getAllByRole('note')).toHaveLength(2);
  const location = source === 'stage' ? stage().parentElement! : screen.getByRole('complementary', { name: 'Slide settings' });
  fireEvent.click(within(location).getByRole('button', { name: 'Split into two slides' }));
  const options = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(options.map(option => option.getAttribute('aria-label'))).toEqual(['Slide 1: Space', 'Slide 2: Bodies', 'Slide 3: Bodies (cont.)', 'Slide 4: Next']);
  expect(options[1].getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(stage());
  expect(screen.getByRole('status').textContent).toBe('Slide 2 of 4 · 4. DISCUSSION');
  expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  expect(screen.queryAllByRole('note')).toHaveLength(0);
  const remaining = within(stage()).getAllByRole('button', { name: /^Edit bullet/ }).length;
  expect(remaining).toBeGreaterThan(0); expect(remaining).toBeLessThan(points.length);
  selectSlide(3);
  expect(screen.queryAllByRole('note')).toHaveLength(0);
  expect(within(stage()).queryByRole('img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Download PowerPoint' }));
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => url === '/api/download-pptx')).toBe(true));
  const call = vi.mocked(fetch).mock.calls.find(([url]) => url === '/api/download-pptx')!;
  const body = JSON.parse(String(call[1]?.body));
  const slides: SlideData[] = body.presentationData.slides;
  expect(slides.map(s => [s.slideNumber, s.title])).toEqual([[1, 'Space'], [2, 'Bodies'], [3, 'Bodies (cont.)'], [4, 'Next']]);
  expect([...slides[1].contentPoints, ...slides[2].contentPoints]).toEqual(points);
  expect(slides[2].visualDescription).toBe('');
  expect(slides[1].imageMetadata).toEqual(samples.commonsFull); expect(slides[2].imageMetadata).toBeUndefined();
  expect(body.slideImages).toEqual({ 1: 'original-image', 3: 'next-image' });
});
it('keeps warnings on impossible originals and continuations and supports splitting again', async () => {
  stub(Array.from({ length: 3 }, () => 'Evidence '.repeat(1000)));
  await openWorkspace(); selectSlide(2);
  fireEvent.click(within(screen.getByRole('complementary', { name: 'Slide settings' })).getByRole('button', { name: 'Split into two slides' }));
  expect(screen.getAllByRole('note')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Split into two slides' })).toBeNull();
  selectSlide(3);
  expect(screen.getAllByRole('note')).toHaveLength(2);
  fireEvent.click(within(screen.getByRole('complementary', { name: 'Slide settings' })).getByRole('button', { name: 'Split into two slides' }));
  expect(screen.getByRole('option', { name: 'Slide 4: Bodies (cont. 2) (text does not fit)' })).toBeTruthy();
});
