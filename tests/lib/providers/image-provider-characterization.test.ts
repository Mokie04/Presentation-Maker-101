import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { generateSlideImage } from '@/lib/providers/image-provider';
import * as config from '@/lib/env';
import * as pexels from '@/lib/providers/pexels-provider';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';

const construction = vi.hoisted(() => {
  const error = new Error('OpenAI client construction failed');
  return { error, create: vi.fn(function () { throw error; }) };
});
vi.mock('openai', () => ({ default: construction.create }));
const imageConfig = { baseUrl: 'https://example.test/v1', apiKey: 'test-key', model: 'test-model', source: 'auto' as const };
const description = 'Volcano eruption and lava';
function client(generate = vi.fn().mockResolvedValue({ data: [{ b64_json: 'YWk=' }] })) {
  return { client: { images: { generate } } as unknown as OpenAI, generate };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(config, 'getImageProviderConfig').mockReturnValue(imageConfig);
  vi.spyOn(config, 'getPexelsConfig').mockReturnValue({ apiKey: undefined });
  vi.spyOn(pexels, 'fetchPexelsImageBase64').mockResolvedValue('cGhvdG8=');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected download')));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('generateSlideImage characterization before extracting adapters', () => {
  it.each([false, true])('Pexels-only never constructs or calls OpenAI (injected client: %s)', async (injected) => {
    const ai = client();
    const result = await generateSlideImage(description, { source: 'pexels', pexelsApiKey: 'option-key',
      title: 'Volcano', variation: 2, ...(injected ? { client: ai.client } : {}) });
    expect(result).toBe('cGhvdG8=');
    expect(construction.create).not.toHaveBeenCalled(); expect(ai.generate).not.toHaveBeenCalled();
    expect(pexels.fetchPexelsImageBase64).toHaveBeenCalledExactlyOnceWith(description, { apiKey: 'option-key', title: 'Volcano', variation: 2 });
  });

  it('Pexels-only propagates its exact error without retry', async () => {
    vi.useFakeTimers();
    const error = new Error('Pexels unavailable'); vi.mocked(pexels.fetchPexelsImageBase64).mockRejectedValue(error);
    await expect(generateSlideImage(description, { source: 'pexels', maxRetries: 5 })).rejects.toBe(error);
    expect(pexels.fetchPexelsImageBase64).toHaveBeenCalledOnce(); expect(construction.create).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('AI-only retries with backoff, throws the last error, and never calls Pexels', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const times: number[] = [];
    const errors = [new Error('first'), new Error('second'), new Error('last')];
    const ai = client(vi.fn().mockImplementation(async () => { times.push(Date.now()); throw errors[times.length - 1]; }));
    const assertion = expect(generateSlideImage(description, { client: ai.client, source: 'ai', pexelsApiKey: 'key',
      maxRetries: 2, backoffMs: 25 })).rejects.toBe(errors[2]);
    await vi.advanceTimersByTimeAsync(50); await assertion;
    expect(times).toEqual([0, 25, 50]); expect(vi.getTimerCount()).toBe(0);
    expect(pexels.fetchPexelsImageBase64).not.toHaveBeenCalled();
  });

  it('defaults to three retries at two-second intervals, with no final sleep', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const times: number[] = []; const error = new Error('AI failed');
    const ai = client(vi.fn().mockImplementation(async () => { times.push(Date.now()); throw error; }));
    const assertion = expect(generateSlideImage(description, { client: ai.client, source: 'ai' })).rejects.toBe(error);
    await vi.advanceTimersByTimeAsync(6000); await assertion;
    expect(times).toEqual([0, 2000, 4000, 6000]); expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['option', 'config'])('auto exhausts AI retries before Pexels with a key from %s', async (keyFrom) => {
    vi.useFakeTimers();
    if (keyFrom === 'config') vi.mocked(config.getPexelsConfig).mockReturnValue({ apiKey: 'config-key' });
    const order: string[] = [];
    const ai = client(vi.fn().mockImplementation(async () => { order.push('ai'); throw new Error('AI failed'); }));
    vi.mocked(pexels.fetchPexelsImageBase64).mockImplementation(async () => { order.push('pexels'); return 'cGhvdG8='; });
    const pending = generateSlideImage(description, { client: ai.client, source: 'auto', maxRetries: 1, backoffMs: 10,
      pexelsApiKey: keyFrom === 'option' ? 'option-key' : undefined, title: 'Volcano', variation: 3 });
    await vi.advanceTimersByTimeAsync(10);
    expect(await pending).toBe('cGhvdG8='); expect(order).toEqual(['ai', 'ai', 'pexels']);
    expect(pexels.fetchPexelsImageBase64).toHaveBeenCalledWith(description, {
      apiKey: keyFrom === 'option' ? 'option-key' : undefined, title: 'Volcano', variation: 3,
    });
  });

  it('auto returns the last AI attempt error if Pexels also fails', async () => {
    const first = new Error('first AI attempt'), last = new Error('last AI attempt');
    const ai = client(vi.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(last));
    vi.mocked(pexels.fetchPexelsImageBase64).mockRejectedValue(new Error('Pexels failed'));
    await expect(generateSlideImage(description, { client: ai.client, source: 'auto', pexelsApiKey: 'key', maxRetries: 1, backoffMs: 0 })).rejects.toBe(last);
    expect(pexels.fetchPexelsImageBase64).toHaveBeenCalledOnce();
  });

  it('auto without a key propagates the AI error without calling Pexels', async () => {
    const error = new Error('AI failed'); const ai = client(vi.fn().mockRejectedValue(error));
    await expect(generateSlideImage(description, { client: ai.client, source: 'auto', maxRetries: 0 })).rejects.toBe(error);
    expect(pexels.fetchPexelsImageBase64).not.toHaveBeenCalled();
  });

  it('auto returns AI success without calling Pexels even when configured', async () => {
    const ai = client();
    expect(await generateSlideImage(description, { client: ai.client, source: 'auto', pexelsApiKey: 'key' })).toBe('YWk=');
    expect(pexels.fetchPexelsImageBase64).not.toHaveBeenCalled();
  });

  it.each(['ai', 'pexels', 'auto'] as const)('takes omitted source from configuration: %s', async (source) => {
    vi.mocked(config.getImageProviderConfig).mockReturnValue({ ...imageConfig, source });
    const ai = client();
    expect(await generateSlideImage(description, { client: ai.client })).toBe(source === 'pexels' ? 'cGhvdG8=' : 'YWk=');
    expect(ai.generate).toHaveBeenCalledTimes(source === 'pexels' ? 0 : 1);
    expect(pexels.fetchPexelsImageBase64).toHaveBeenCalledTimes(source === 'pexels' ? 1 : 0);
  });

  it('sends exactly the existing OpenAI request and prefers b64_json over URL', async () => {
    const ai = client(vi.fn().mockResolvedValue({ data: [{ b64_json: 'raw-base64', url: 'https://example.test/unused' }] }));
    expect(await generateSlideImage(description, { client: ai.client, source: 'ai', title: 'Not sent', variation: 8 })).toBe('raw-base64');
    expect(ai.generate).toHaveBeenCalledExactlyOnceWith({ model: 'test-model', prompt: IMAGE_PROMPT_PREFIX + description,
      size: '1024x576', quality: 'standard', response_format: 'b64_json', n: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('downloads and base64-encodes URL-only responses', async () => {
    const ai = client(vi.fn().mockResolvedValue({ data: [{ url: 'https://example.test/image' }] }));
    vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array([0, 255, 3])));
    expect(await generateSlideImage(description, { client: ai.client, source: 'ai' })).toBe('AP8D');
    expect(fetch).toHaveBeenCalledExactlyOnceWith('https://example.test/image');
  });

  it.each([
    { response: { data: [] }, message: 'No image returned from image provider.' },
    { response: {}, message: 'No image returned from image provider.' },
    { response: { data: [{}] }, message: 'Image response contained neither b64_json nor url.' },
    { response: { data: [{ url: 'https://example.test/image' }] }, message: 'Failed to download image from URL: Bad Gateway' },
  ])('preserves response error: $message', async ({ response, message }) => {
    const ai = client(vi.fn().mockResolvedValue(response));
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 502, statusText: 'Bad Gateway' }));
    await expect(generateSlideImage(description, { client: ai.client, source: 'ai', maxRetries: 0 })).rejects.toThrow(message);
  });

  it('does not fall back or retry when OpenAI client construction fails', async () => {
    await expect(generateSlideImage(description, { source: 'auto', pexelsApiKey: 'key', maxRetries: 3 })).rejects.toBe(construction.error);
    expect(construction.create).toHaveBeenCalledOnce(); expect(pexels.fetchPexelsImageBase64).not.toHaveBeenCalled();
  });
});
