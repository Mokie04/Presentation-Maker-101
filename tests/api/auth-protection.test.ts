import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as generate } from '@/app/api/generate/route';
import { POST as generateImage } from '@/app/api/generate-image/route';
import { POST as generateImages } from '@/app/api/generate-images/route';
import { POST as upload } from '@/app/api/upload/route';
import { POST as downloadPptx } from '@/app/api/download-pptx/route';
import { POST as downloadMarkdown } from '@/app/api/download-markdown/route';
import { GET as health } from '@/app/api/health/route';
import * as textProvider from '@/lib/providers/text-provider';
import * as imageProvider from '@/lib/providers/image-provider';
import * as imageBatch from '@/lib/services/image-batch';
import * as documentParser from '@/lib/parsers/document-parser';
import * as pptxGenerator from '@/lib/services/pptx-generator';
import * as markdownGenerator from '@/lib/services/markdown-generator';
import * as healthService from '@/lib/health';
import {
  createSessionToken,
  getAppStoreAuthConfig,
} from '@/lib/sessionAuth';

const TEST_SECRET = 'test-shared-secret';

const validPresentation = {
  subject: 'Science',
  originalWriters: 'DepEd Teachers',
  topic: 'Water Cycle',
  slides: [
    {
      slideNumber: 1,
      part: 'Review',
      title: 'Three States of Water',
      contentPoints: ['Solid, liquid, gas'],
      visualDescription: 'A classroom water cycle diagram',
    },
  ],
};

function jsonRequest(
  url: string,
  body: unknown,
  cookie?: string
): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
  });
}

function sessionCookie(): string {
  const config = getAppStoreAuthConfig(process.env);
  const token = createSessionToken(
    { sub: 'firebase-user-1', email: 'teacher@example.com' },
    config
  );
  return `presentation_maker_pro_session=${token}`;
}

describe('protected API routes', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      APPSTORE_AUTH_ENABLED: 'true',
      APPSTORE_SHARED_SECRET: TEST_SECRET,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('rejects every protected route before parsing or downstream work', async () => {
    const generateSpy = vi.spyOn(textProvider, 'generateSlideContent');
    const imageSpy = vi.spyOn(imageProvider, 'generateSlideImage');
    const batchSpy = vi.spyOn(imageBatch, 'processBatchImages');
    const parserSpy = vi.spyOn(documentParser, 'parseDocument');
    const pptxSpy = vi.spyOn(pptxGenerator, 'buildPresentationPptx');
    const markdownSpy = vi.spyOn(markdownGenerator, 'buildPresentationMarkdown');
    const healthSpy = vi.spyOn(healthService, 'checkHealth');

    const formData = new FormData();
    formData.append('file', new File(['lesson'], 'lesson.txt', { type: 'text/plain' }));

    const responses = await Promise.all([
      generate(jsonRequest('/api/generate', 'not-json')),
      generateImage(jsonRequest('/api/generate-image', 'not-json')),
      generateImages(jsonRequest('/api/generate-images', 'not-json')),
      upload(
        new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        })
      ),
      downloadPptx(jsonRequest('/api/download-pptx', 'not-json')),
      downloadMarkdown(jsonRequest('/api/download-markdown', 'not-json')),
      health(new NextRequest('http://localhost:3000/api/health')),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401, 401,
    ]);
    expect(generateSpy).not.toHaveBeenCalled();
    expect(imageSpy).not.toHaveBeenCalled();
    expect(batchSpy).not.toHaveBeenCalled();
    expect(parserSpy).not.toHaveBeenCalled();
    expect(pptxSpy).not.toHaveBeenCalled();
    expect(markdownSpy).not.toHaveBeenCalled();
    expect(healthSpy).not.toHaveBeenCalled();
  });

  it('preserves successful response contracts for an authenticated session', async () => {
    const cookie = sessionCookie();
    vi.spyOn(textProvider, 'generateSlideContent').mockResolvedValue(validPresentation);
    vi.spyOn(imageProvider, 'generateSlideImage').mockResolvedValue('base64-image');
    vi.spyOn(imageBatch, 'processBatchImages').mockResolvedValue({ 0: 'image' });
    vi.spyOn(documentParser, 'parseDocument').mockResolvedValue('Parsed lesson text');
    vi.spyOn(pptxGenerator, 'buildPresentationPptx').mockResolvedValue(Buffer.from('pptx'));
    vi.spyOn(markdownGenerator, 'buildPresentationMarkdown').mockReturnValue('# Water Cycle');
    vi.spyOn(healthService, 'checkHealth').mockResolvedValue({
      textProvider: 'ok',
      imageProvider: 'ok',
    });

    const formData = new FormData();
    formData.append('file', new File(['lesson'], 'lesson.txt', { type: 'text/plain' }));

    const responses = await Promise.all([
      generate(
        jsonRequest(
          '/api/generate',
          { text: 'A science lesson about water.', session: 'Session 1' },
          cookie
        )
      ),
      generateImage(
        jsonRequest(
          '/api/generate-image',
          { prompt: 'Water cycle diagram', slideIndex: 0 },
          cookie
        )
      ),
      generateImages(
        jsonRequest(
          '/api/generate-images',
          { slides: [{ slideIndex: 0, part: 'Discussion', visualDescription: 'Water' }] },
          cookie
        )
      ),
      upload(
        new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
          headers: { cookie },
        })
      ),
      downloadPptx(
        jsonRequest(
          '/api/download-pptx',
          { presentationData: validPresentation, session: 'Session 1' },
          cookie
        )
      ),
      downloadMarkdown(
        jsonRequest(
          '/api/download-markdown',
          { presentationData: validPresentation, session: 'Session 1' },
          cookie
        )
      ),
      health(
        new NextRequest('http://localhost:3000/api/health', {
          headers: { cookie },
        })
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200, 200, 200, 200,
    ]);
  });
});
