import { describe, it, expect, vi } from 'vitest';
import {
  extractSearchKeywords,
  searchPexelsPhoto,
  fetchPexelsImageBase64,
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
});
