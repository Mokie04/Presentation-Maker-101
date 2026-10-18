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
import * as markdownGenerator from '@/lib/services/markdown-generator';

const leak = () => new Error('LEAK TEXT_PROVIDER_API_KEY schema dump');
const presentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: [{ slideNumber: 1, part: 'Discussion', title: 'Roots', contentPoints: ['Roots'], visualDescription: 'Roots' }],
};

const routes = [
  {
    name: 'generate', post: generate, body: { text: 'A lesson about plants.', session: 'Session 1' },
    fail: () => vi.spyOn(textProvider, 'generateSlideContent').mockRejectedValueOnce(leak()),
    expected: { error: 'Failed to generate the presentation. Please try again.' },
  },
  {
    name: 'generate-image', post: generateImage, body: { prompt: 'Roots diagram', slideIndex: 4 },
    fail: () => vi.spyOn(imageProvider, 'generateSlideImage').mockRejectedValueOnce(leak()),
    expected: { error: 'Failed to render the image. Please try again.', slideIndex: 4 },
  },
  {
    name: 'generate-images', post: generateImages, body: { slides: [] },
    fail: () => vi.spyOn(imageBatch, 'processBatchImages').mockRejectedValueOnce(leak()),
    expected: { error: 'Failed to generate images. Please try again.' },
  },
  {
    name: 'download-pptx', post: downloadPptx, body: { presentationData },
    fail: () => vi.spyOn(pptxGenerator, 'buildPresentationPptx').mockRejectedValueOnce(leak()),
    expected: { error: 'Failed to compile the PowerPoint file. Please try again.' },
  },
  {
    name: 'download-markdown', post: downloadMarkdown, body: { presentationData },
    fail: () => vi.spyOn(markdownGenerator, 'buildPresentationMarkdown').mockImplementationOnce(() => { throw leak(); }),
    expected: { error: 'Failed to generate the Markdown outline. Please try again.' },
  },
];

afterEach(() => { vi.restoreAllMocks(); });

describe('sanitized 500 responses', () => {
  it.each(routes)('$name never returns the internal error text', async ({ name, post, body, fail, expected }) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fail();
    const res = await post(new NextRequest(`http://localhost/api/${name}`, {
      method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
    }));

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual(expected);
    expect(text).not.toContain('LEAK');
    expect(text).not.toContain('TEXT_PROVIDER_API_KEY');
    expect(consoleError).toHaveBeenCalledWith(`[${name}]`, expect.objectContaining({ message: expect.stringContaining('LEAK') }));
  });
});
