import { describe, it, expect, vi } from 'vitest';
import {
  generateSlideImage,
  createImageProviderClient,
} from '@/lib/providers/image-provider';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';
import type OpenAI from 'openai';

describe('image-provider', () => {
  it('successfully generates an image and returns base64 string', async () => {
    const mockGenerate = vi.fn().mockResolvedValue({
      data: [
        {
          b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
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

    expect(result).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: `${IMAGE_PROMPT_PREFIX}${visualDesc}`,
        size: '1024x576',
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
});
