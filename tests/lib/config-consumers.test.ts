import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type OpenAI from 'openai';
import { checkHealth } from '@/lib/health';
import { POST } from '@/app/api/upload/route';
import { generateSlideImage } from '@/lib/providers/image-provider';
import { searchPexelsPhoto } from '@/lib/providers/pexels-provider';

beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', undefined);
  vi.stubEnv('TEXT_PROVIDER_API_KEY', undefined);
  vi.stubEnv('TEXT_PROVIDER_MODEL', undefined);
  vi.stubEnv('IMAGE_PROVIDER_BASE_URL', undefined);
  vi.stubEnv('IMAGE_PROVIDER_API_KEY', undefined);
  vi.stubEnv('IMAGE_PROVIDER_MODEL', undefined);
  vi.stubEnv('IMAGE_SOURCE', undefined);
  vi.stubEnv('PEXELS_API_KEY', undefined);
  vi.stubEnv('MAX_FILE_SIZE_MB', undefined);
});
afterEach(() => { vi.unstubAllEnvs(); });

function textClient() {
  return { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [] }) } } } as unknown as OpenAI;
}

function configureText() {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'https://text.example/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-text-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-model');
}

describe('configuration isolation at feature boundaries', () => {
  it('reports missing text configuration without failing a configured image provider', async () => {
    vi.stubEnv('IMAGE_PROVIDER_API_KEY', 'test-image-key');
    const client = textClient();
    const data = await checkHealth({ textClient: client });
    expect(data).toMatchObject({ textProvider: 'error', imageProvider: 'ok' });
    expect(data.errors).toHaveLength(1);
    expect(data.errors?.[0]).toMatch(/^Text Provider: Environment validation error: TEXT_PROVIDER_BASE_URL:/);
    expect(data.errors?.[0]).not.toMatch(/IMAGE_|MAX_FILE_SIZE_MB/);
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });

  it('reports missing image configuration without failing a configured text provider', async () => {
    configureText();
    expect(await checkHealth({ textClient: textClient() })).toEqual({
      textProvider: 'ok', imageProvider: 'error',
      errors: ['Image Provider: Image provider client configuration is missing or incomplete.'],
    });
  });

  it('reports an invalid image URL without failing the text provider', async () => {
    configureText();
    vi.stubEnv('IMAGE_PROVIDER_BASE_URL', 'invalid-url');
    expect(await checkHealth({ textClient: textClient() })).toEqual({
      textProvider: 'ok', imageProvider: 'error',
      errors: ['Image Provider: Environment validation error: IMAGE_PROVIDER_BASE_URL: IMAGE_PROVIDER_BASE_URL must be a valid URL'],
    });
  });

  it('checks Pexels independently of missing text and AI credentials', async () => {
    vi.stubEnv('IMAGE_SOURCE', 'pexels');
    vi.stubEnv('PEXELS_API_KEY', 'test-pexels-key');
    const data = await checkHealth({ textClient: textClient() });
    expect(data).toMatchObject({ textProvider: 'error', imageProvider: 'ok' });
    expect(data.errors).toHaveLength(1);
  });

  it('preserves the missing Pexels health error', async () => {
    configureText();
    vi.stubEnv('IMAGE_SOURCE', 'pexels');
    expect(await checkHealth({ textClient: textClient() })).toEqual({
      textProvider: 'ok', imageProvider: 'error', errors: ['Image Provider: Pexels API key is not configured.'],
    });
  });

  it('uploads a document despite missing text settings and invalid image settings', async () => {
    vi.stubEnv('IMAGE_PROVIDER_BASE_URL', 'invalid-url');
    const form = new FormData();
    form.append('file', new File(['Lesson text'], 'lesson.txt', { type: 'text/plain' }));
    const response = await POST(new NextRequest('http://localhost/api/upload', { method: 'POST', body: form }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: 'Lesson text', fileName: 'lesson.txt', fileType: 'txt', characterCount: 11 });
  });

  it('generates an image despite missing text settings and an invalid upload limit', async () => {
    vi.stubEnv('MAX_FILE_SIZE_MB', '-1');
    const client = { images: { generate: vi.fn().mockResolvedValue({ data: [{ b64_json: 'image-data' }] }) } } as unknown as OpenAI;
    await expect(generateSlideImage('Water cycle', { client, maxRetries: 0 })).resolves.toBe('image-data');
  });

  it('reads the Pexels key without validating text, AI or upload settings', async () => {
    vi.stubEnv('PEXELS_API_KEY', 'test-pexels-key');
    vi.stubEnv('IMAGE_PROVIDER_BASE_URL', 'invalid-url');
    vi.stubEnv('MAX_FILE_SIZE_MB', '-1');
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ photos: [{ src: { medium: 'https://images.pexels.com/water.jpg' } }] }),
    });
    await expect(searchPexelsPhoto('water cycle', { fetchFn })).resolves.toBe('https://images.pexels.com/water.jpg');
    expect(fetchFn).toHaveBeenCalledWith(expect.any(String), { headers: { Authorization: 'test-pexels-key' } });
  });
});
