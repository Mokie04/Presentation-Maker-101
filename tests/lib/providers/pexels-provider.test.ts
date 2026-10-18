import { describe, it, expect, vi } from 'vitest';
import {
  extractSearchKeywords,
  searchPexelsPhoto,
  fetchPexelsImageBase64,
  PEXELS_RESULTS_PER_PAGE,
} from '@/lib/providers/pexels-provider';
import { generateSlideImage } from '@/lib/providers/image-provider';
import type OpenAI from 'openai';

describe('pexels-provider', () => {
  describe('extractSearchKeywords', () => {
    it('strips prompt stop-words and keeps essential subject nouns', () => {
      const prompt =
        'High-quality, bright Filipino cartoon illustration showing the water cycle with evaporation, clouds and rainfall';
      const keywords = extractSearchKeywords(prompt);

      expect(keywords).toContain('water');
      expect(keywords).toContain('cycle');
      expect(keywords).not.toContain('cartoon');
      expect(keywords).not.toContain('filipino');
      expect(keywords).not.toContain('showing');
    });

    it('falls back to title if visual description is empty', () => {
      const keywords = extractSearchKeywords('', 'The Human Digestive System');
      expect(keywords).toContain('human');
      expect(keywords).toContain('digestive');
      expect(keywords).toContain('system');
    });

    it('provides safe default if neither prompt nor title has content', () => {
      const keywords = extractSearchKeywords('');
      expect(keywords).toBe('classroom education');
    });
  });

  describe('searchPexelsPhoto', () => {
    it('throws if API key is not configured', async () => {
      await expect(searchPexelsPhoto('volcano', { apiKey: '' })).rejects.toThrow(
        /PEXELS_API_KEY is not configured/
      );
    });

    it('returns photo URL when results are found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total_results: 1,
          photos: [
            {
              src: {
                large2x: 'https://images.pexels.com/photos/123/large2x.jpg',
              },
            },
          ],
        }),
      });

      const url = await searchPexelsPhoto('science lab', {
        apiKey: 'test-pexels-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(url).toBe('https://images.pexels.com/photos/123/large2x.jpg');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=science%20lab'),
        expect.objectContaining({
          headers: { Authorization: 'test-pexels-key' },
        })
      );
    });

    it('retries with broader query if 0 results returned initially', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ total_results: 0, photos: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total_results: 1,
            photos: [
              {
                src: { large: 'https://images.pexels.com/photos/fallback.jpg' },
              },
            ],
          }),
        });

      const url = await searchPexelsPhoto('very specific biological cell mitosis', {
        apiKey: 'test-pexels-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(url).toBe('https://images.pexels.com/photos/fallback.jpg');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchPexelsImageBase64', () => {
    it('downloads the photo and converts it to base64', async () => {
      const fakeBinary = Buffer.from('fake-pexels-image-data');
      const mockFetch = vi
        .fn()
        // 1. Search endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total_results: 1,
            photos: [{ src: { large: 'https://images.pexels.com/sample.jpg' } }],
          }),
        })
        // 2. Image download
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new Uint8Array(fakeBinary).buffer,
        });

      const base64 = await fetchPexelsImageBase64('photosynthesis in plants', {
        apiKey: 'test-pexels-key',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(base64).toBe(fakeBinary.toString('base64'));
    });
  });

  describe('image-provider fallback to Pexels', () => {
    it('automatically falls back to Pexels if AI provider fails and Pexels key is present', async () => {
      const mockClient = {
        images: {
          generate: vi.fn().mockRejectedValue(new Error('AI Quota Exceeded')),
        },
      } as unknown as OpenAI;

      const fakeBinary = Buffer.from('pexels-fallback-image');
      const originalFetch = globalThis.fetch;
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            total_results: 1,
            photos: [{ src: { large: 'https://images.pexels.com/sample.jpg' } }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new Uint8Array(fakeBinary).buffer,
        });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      try {
        const result = await generateSlideImage('Solar system planets', {
          client: mockClient,
          maxRetries: 0,
          pexelsApiKey: 'test-pexels-key',
          source: 'auto',
        });

        expect(result).toBe(fakeBinary.toString('base64'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('variation', () => {
    const photos = (count: number) => Array.from({ length: count }, (_, i) => ({
      src: { medium: `https://images.pexels.com/photos/${i}/medium.jpg` },
    }));
    const results = (count: number) => ({ ok: true, json: async () => ({ total_results: count, photos: photos(count) }) });
    const search = (variation: number | undefined, mockFetch: ReturnType<typeof vi.fn>, query = 'volcano eruption') =>
      searchPexelsPhoto(query, { apiKey: 'test-pexels-key', fetchFn: mockFetch as unknown as typeof fetch, variation });

    it('asks Pexels for a page of results', async () => {
      const mockFetch = vi.fn().mockResolvedValue(results(5));
      await search(undefined, mockFetch);
      expect(mockFetch.mock.calls[0][0]).toContain(`per_page=${PEXELS_RESULTS_PER_PAGE}&`);
      expect(PEXELS_RESULTS_PER_PAGE).toBe(15);
    });

    it.each([
      ['no variation picks the first photo, as before', undefined, 0],
      ['variation 0 picks the first photo', 0, 0],
      ['variation 2 picks the third photo', 2, 2],
      ['a variation past the result count wraps around', 17, 2],
    ])('%s', async (_, variation, expected) => {
      const mockFetch = vi.fn().mockResolvedValue(results(5));
      expect(await search(variation, mockFetch)).toBe(`https://images.pexels.com/photos/${expected}/medium.jpg`);
    });

    it('applies the variation to the broader-query retry', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(results(0))
        .mockResolvedValueOnce(results(3));
      const url = await search(4, mockFetch, 'very specific biological cell mitosis');
      expect(url).toBe('https://images.pexels.com/photos/1/medium.jpg');
      expect(mockFetch.mock.calls[1][0]).toContain('query=very%20specific');
      expect(mockFetch.mock.calls[1][0]).toContain(`per_page=${PEXELS_RESULTS_PER_PAGE}&`);
    });

    it('still returns null when neither search finds a photo', async () => {
      const mockFetch = vi.fn().mockResolvedValue(results(0));
      expect(await search(3, mockFetch, 'very specific biological cell mitosis')).toBeNull();
    });

    it('fetchPexelsImageBase64 downloads the varied photo', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce(results(5))
        .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new Uint8Array(Buffer.from('third')).buffer });
      const base64 = await fetchPexelsImageBase64('volcano eruption lava', {
        apiKey: 'test-pexels-key', fetchFn: mockFetch as unknown as typeof fetch, variation: 2,
      });
      expect(mockFetch.mock.calls[1][0]).toBe('https://images.pexels.com/photos/2/medium.jpg');
      expect(base64).toBe(Buffer.from('third').toString('base64'));
    });
  });
});

