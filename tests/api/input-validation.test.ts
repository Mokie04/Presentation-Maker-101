import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generate } from '@/app/api/generate/route';
import { POST as generateImage } from '@/app/api/generate-image/route';
import { POST as generateImages } from '@/app/api/generate-images/route';
import { POST as downloadPptx } from '@/app/api/download-pptx/route';
import { POST as downloadMarkdown } from '@/app/api/download-markdown/route';
import * as textProvider from '@/lib/providers/text-provider';
import * as imageProvider from '@/lib/providers/image-provider';
import * as imageBatch from '@/lib/services/image-batch';
import * as pptxGenerator from '@/lib/services/pptx-generator';

type Post = (request: NextRequest) => Promise<Response>;

function call(post: Post, body: unknown) {
  return post(new NextRequest('http://localhost/api/test', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  }));
}

const slide = (i: number) => ({ slideNumber: i + 1, part: 'Discussion', title: `Slide ${i + 1}`, contentPoints: ['Point'], visualDescription: 'Visual' });
const deck = (count: number) => ({ subject: 'Science', originalWriters: 'Teacher', topic: 'Plants', slides: Array.from({ length: count }, (_, i) => slide(i)) });
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const batchSlide = (i: number) => ({ slideIndex: i, part: 'Discussion', visualDescription: 'Visual' });

afterEach(() => { vi.restoreAllMocks(); });

async function expectRejected(res: Response, pattern: RegExp, hidden?: string) {
  expect(res.status).toBe(400);
  const text = await res.text();
  expect(JSON.parse(text).error).toMatch(pattern);
  if (hidden) expect(text).not.toContain(hidden);
  return JSON.parse(text);
}

describe('generate-images input', () => {
  it.each([
    ['more than 100 slides', { slides: Array.from({ length: 101 }, (_, i) => batchSlide(i)) }, /slides/],
    ['an unknown source', { slides: [batchSlide(0)], source: 'midjourney' }, /source/],
    ['a slideIndex above 999', { slides: [batchSlide(1000)] }, /slides\.0\.slideIndex/],
    ['an over-long visualDescription', { slides: [{ ...batchSlide(0), visualDescription: 'v'.repeat(4001) }] }, /visualDescription/],
  ])('rejects %s', async (_, body, pattern) => {
    const batch = vi.spyOn(imageBatch, 'processBatchImages').mockResolvedValue({});
    await expectRejected(await call(generateImages, body), pattern, 'midjourney');
    expect(batch).not.toHaveBeenCalled();
  });

  it.each([
    ['clamps an oversized delayMs to 2000', 999999, 2000],
    ['uses 800 for a negative delayMs', -5, 800],
    ['uses 800 for a non-number delayMs', 'slow', 800],
    ['keeps an in-range delayMs', 0, 0],
    ['uses 800 when delayMs is omitted', undefined, 800],
  ])('%s', async (_, delayMs, expected) => {
    const batch = vi.spyOn(imageBatch, 'processBatchImages').mockResolvedValueOnce({});
    const res = await call(generateImages, { slides: [{ ...batchSlide(0), title: 'Roots' }], ...(delayMs === undefined ? {} : { delayMs }), source: 'pexels' });
    expect(res.status).toBe(200);
    expect(batch).toHaveBeenCalledWith([{ slideIndex: 0, part: 'Discussion', visualDescription: 'Visual', title: 'Roots' }],
      { delayMs: expected, source: 'pexels' });
  });
});

describe('generate-image input', () => {
  it.each([
    ['an unknown source', { prompt: 'Roots', slideIndex: 3, source: 'midjourney' }, /source/],
    ['a prompt over 4000 characters', { prompt: 'p'.repeat(4001), slideIndex: 3 }, /prompt/],
    ['a blank prompt', { prompt: '   ', slideIndex: 3 }, /prompt/],
    ['a non-integer slideIndex', { prompt: 'Roots', slideIndex: 2.5 }, /slideIndex/],
    ['an over-long title', { prompt: 'Roots', slideIndex: 3, title: 't'.repeat(301) }, /title/],
  ])('rejects %s and keeps slideIndex in the body', async (_, body, pattern) => {
    const generateSpy = vi.spyOn(imageProvider, 'generateSlideImage').mockResolvedValue('image');
    const json = await expectRejected(await call(generateImage, body), pattern, 'midjourney');
    expect(json).toHaveProperty('slideIndex', body.slideIndex);
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

describe('generate input', () => {
  it.each([
    ['an unknown session', { text: 'A lesson', session: 'Session 9' }, /session/],
    ['whitespace-only text', { text: ' \n\t ', session: 'Session 1' }, /text/],
  ])('rejects %s', async (_, body, pattern) => {
    const spy = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValue(deck(1));
    await expectRejected(await call(generate, body), pattern, 'Session 9');
    expect(spy).not.toHaveBeenCalled();
  });

  it('passes the original untrimmed text to the model', async () => {
    const spy = vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(deck(1));
    const res = await call(generate, { text: '  Lesson about roots  \n', session: 'Session 2' });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith('  Lesson about roots  \n', 'Session 2', expect.any(String));
  });
});

describe('export input', () => {
  it.each([
    ['download-pptx', downloadPptx],
    ['download-markdown', downloadMarkdown],
  ])('%s rejects more than 200 slides', async (_, post) => {
    await expectRejected(await call(post, { presentationData: deck(201) }), /presentationData\.slides/);
  });

  it('download-markdown rejects an over-long session', async () => {
    await expectRejected(await call(downloadMarkdown, { presentationData: deck(1), session: 's'.repeat(101) }), /session/);
  });

  it.each([
    ['an array', [png], /slideImages/],
    ['a string', png, /slideImages/],
    ['a non-numeric key', { cover: png }, /slideImages\.cover/],
    ['an out-of-range key', { 3: png }, /slideImages\.3/],
    ['a non-string value', { 0: 42 }, /slideImages\.0/],
    ['an oversized value', { 0: `/9j/${'A'.repeat(1_500_000)}` }, /slideImages\.0/],
    ['a value that is not base64', { 0: 'iVBORw0KGgo<script>alert(1)</script>' }, /slideImages\.0/],
    ['a value without an image signature', { 0: 'SGVsbG8gd29ybGQ=' }, /slideImages\.0/],
    ['a data URL of another image type', { 0: `data:image/gif;base64,${png}` }, /slideImages\.0/],
  ])('download-pptx rejects slideImages that is %s', async (_, slideImages, pattern) => {
    const json = await expectRejected(await call(downloadPptx, { presentationData: deck(3), slideImages }), pattern, '<script>');
    expect(JSON.stringify(json)).not.toContain('SGVsbG8gd29ybGQ=');
  });

  it('download-pptx still exports empty, failed, raw and data URL images', async () => {
    const res = await call(downloadPptx, {
      presentationData: deck(4), session: 'Session 1',
      slideImages: { 0: '', 1: 'failed', 2: png, 3: `data:image/png;base64,${png}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
  });
});

describe('body size caps', () => {
  it.each([
    ['generate-image', 64 * 1024, generateImage],
    ['generate-images', 256 * 1024, generateImages],
    ['generate', 4_500_000, generate],
    ['download-markdown', 4_500_000, downloadMarkdown],
    ['download-pptx', 4_500_000, downloadPptx],
  ])('%s rejects a body over %i bytes with 413', async (_, cap, post) => {
    const res = await call(post as Post, { pad: 'x'.repeat(cap) });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'Request body exceeds the size limit.' });
  });

  it('generate accepts a 2 MB lesson text under its 4.5 MB cap', async () => {
    vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValueOnce(deck(1));
    expect((await call(generate, { text: 'L'.repeat(2_000_000), session: 'Session 1' })).status).toBe(200);
  });

  it('download-pptx accepts 2 MB of images under its 4.5 MB cap', async () => {
    const build = vi.spyOn(pptxGenerator, 'buildPresentationPptx').mockResolvedValueOnce(Buffer.from('pptx'));
    const big = `/9j/${'A'.repeat(1_000_000)}`;
    const res = await call(downloadPptx, { presentationData: deck(2), slideImages: { 0: 'failed', 1: big, } });
    expect(res.status).toBe(200);
    expect(build).toHaveBeenCalledWith(expect.anything(), { 0: 'failed', 1: big });
  });
});

