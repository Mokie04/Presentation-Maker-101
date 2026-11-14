import { afterEach, describe, it, expect, vi } from 'vitest';
import { generateSlideImage } from '@/lib/providers/image-provider';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';
import type OpenAI from 'openai';
import { ONE_PIXEL_PNG } from '../../helpers/images';

describe('image-provider', () => {
  it('successfully generates an image and returns base64 string', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      data: [
        {
          b64_json: ONE_PIXEL_PNG,
        },
      ],
    });

    const mockClient = {
      images: { generate: mockGenerate },
    } as unknown as OpenAI;

    const visualDesc = 'A smiling Filipino teacher presenting a map';
    const result = await generateSlideImage(visualDesc, {
      client: mockClient,
      backoffMs: 1,
    });

    expect(result).toBe(ONE_PIXEL_PNG);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: `${IMAGE_PROMPT_PREFIX}${visualDesc}`,
        size: '1792x1024',
        quality: 'standard',
        response_format: 'b64_json',
      })
    );
  });

  it('retries on failure up to 3 times with backoff and succeeds', async () => {
    const mockGenerate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Image generation busy'))
      .mockRejectedValueOnce(new Error('Gateway timeout'))
      .mockResolvedValueOnce({
        data: [{ b64_json: 'base64-image-data-success' }],
      });

    const mockClient = {
      images: { generate: mockGenerate },
    } as unknown as OpenAI;

    const result = await generateSlideImage('A classroom chalkboard', {
      client: mockClient,
      backoffMs: 2,
    });

    expect(result).toBe('base64-image-data-success');
    expect(mockGenerate).toHaveBeenCalledTimes(3);
  });

  it('fails after exhausting 3 retries', async () => {
    const mockGenerate = vi.fn().mockRejectedValue(new Error('Persistent image error'));

    const mockClient = {
      images: { generate: mockGenerate },
    } as unknown as OpenAI;

    await expect(
      generateSlideImage('A classroom chalkboard', {
        client: mockClient,
        backoffMs: 2,
      })
    ).rejects.toThrowError('Persistent image error');

    // 1 initial attempt + 3 retries = 4 total calls
    expect(mockGenerate).toHaveBeenCalledTimes(4);
  });

  describe('variation', () => {
    const pexelsSearch = { ok: true, json: async () => ({ total_results: 3, photos: [0, 1, 2].map((i) => ({ src: { medium: `https://images.pexels.com/${i}.jpg` } })) }) };
    const download = () => new Response('photo', { headers: { 'Content-Type': 'image/jpeg' } });

    afterEach(() => { vi.unstubAllGlobals(); });

    it('picks the varied Pexels photo when the source is pexels', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(pexelsSearch).mockResolvedValueOnce(download());
      vi.stubGlobal('fetch', mockFetch);
      await generateSlideImage('Volcano eruption with lava', { source: 'pexels', pexelsApiKey: 'test-pexels-key', variation: 2 });
      expect(mockFetch.mock.calls[1][0]).toBe('https://images.pexels.com/2.jpg');
    });

    it('passes the variation to the Pexels fallback after an AI failure', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce(pexelsSearch).mockResolvedValueOnce(download());
      vi.stubGlobal('fetch', mockFetch);
      const mockClient = { images: { generate: vi.fn().mockRejectedValue(new Error('AI down')) } } as unknown as OpenAI;
      await generateSlideImage('Volcano eruption with lava', {
        client: mockClient, maxRetries: 0, source: 'auto', pexelsApiKey: 'test-pexels-key', variation: 1,
      });
      expect(mockFetch.mock.calls[1][0]).toBe('https://images.pexels.com/1.jpg');
    });

    it('leaves the AI request unchanged', async () => {
      const mockGenerate = vi.fn().mockResolvedValue({ data: [{ b64_json: 'ai-image' }] });
      const mockClient = { images: { generate: mockGenerate } } as unknown as OpenAI;
      await generateSlideImage('A map', { client: mockClient, source: 'ai', variation: 5 });
      await generateSlideImage('A map', { client: mockClient, source: 'ai' });
      expect(mockGenerate.mock.calls[0][0]).toEqual(mockGenerate.mock.calls[1][0]);
      expect(JSON.stringify(mockGenerate.mock.calls[0][0])).not.toContain('variation');
    });
  });
});


describe('image-provider invoke-api kind', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    (await import('@/lib/env')).resetConfigCache();
  });

  const useInvokeKind = async () => {
    vi.stubEnv('IMAGE_PROVIDER_KIND', 'invoke-api');
    vi.stubEnv('IMAGE_PROVIDER_BASE_URL', 'https://runtime.example.test');
    vi.stubEnv('IMAGE_PROVIDER_API_KEY', 'test-image-key');
    vi.stubEnv('IMAGE_PROVIDER_MODEL', 'vendor.image-model-v1:1');
    (await import('@/lib/env')).resetConfigCache();
  };

  it('generates through the invoke endpoint and never builds the OpenAI-compatible client', async () => {
    await useInvokeKind();
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ images: ['aW52b2tl'], finish_reasons: [null] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', mockFetch);
    const result = await generateSlideImage('A map', { source: 'ai', maxRetries: 0 });
    expect(result).toBe('aW52b2tl');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://runtime.example.test/model/vendor.image-model-v1%3A1/invoke');
  });

  it('falls back to Pexels in auto mode when the invoke request fails', async () => {
    await useInvokeKind();
    const pexelsSearch = new Response(JSON.stringify({ photos: [{ src: { large2x: 'https://images.pexels.com/1.jpg' }, alt: 'map', photographer: 'P', url: 'https://www.pexels.com/photo/1' }] }), { status: 200 });
    const download = new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 403 }))
      .mockResolvedValueOnce(pexelsSearch)
      .mockResolvedValueOnce(download);
    vi.stubGlobal('fetch', mockFetch);
    const result = await generateSlideImage('A map', { source: 'auto', maxRetries: 0, pexelsApiKey: 'test-pexels-key' });
    expect(result).toBe(Buffer.from([1, 2, 3]).toString('base64'));
    expect(mockFetch.mock.calls[0][0]).toContain('/invoke');
  });
});
