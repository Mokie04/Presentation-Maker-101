import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHealth } from '@/lib/health';
import { GET } from '@/app/api/health/route';
import * as textProvider from '@/lib/providers/text-provider';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-text-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-text-model');
  vi.stubEnv('IMAGE_PROVIDER_API_KEY', 'test-image-key');
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('Health Check API', () => {
  it('returns ok for both providers when text provider call succeeds and image provider is configured', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      choices: [{ message: { content: 'hello' } }],
    }));
    const mockTextClient = new OpenAI({ apiKey: 'test-key', fetch: mockFetch });
    const mockChatCreate = vi.spyOn(mockTextClient.chat.completions, 'create');

    const data = await checkHealth({
      textClient: mockTextClient,
    });

    expect(data.textProvider).toBe('ok');
    expect(data.imageProvider).toBe('ok');
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'say hello' }],
      })
    );
  });

  it('returns textProvider: error when text provider call fails', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      error: { message: 'Invalid API key: 401', type: 'invalid_request_error', code: 'invalid_api_key' },
    }, { status: 401 }));
    const mockTextClient = new OpenAI({ apiKey: 'test-key', fetch: mockFetch });

    const data = await checkHealth({
      textClient: mockTextClient,
    });

    expect(data.textProvider).toBe('error');
    expect(data.imageProvider).toBe('ok');
    expect(data.errors).toBeDefined();
    expect(data.errors?.[0]).toContain('Invalid API key: 401');
  });

  it('GET handler returns NextResponse with 200 status', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      choices: [{ message: { content: 'hello' } }],
    }));
    vi.spyOn(textProvider, 'getTextProviderClient').mockReturnValue(new OpenAI({ apiKey: 'test-key', fetch: mockFetch }));

    const response = await GET(new NextRequest('http://localhost:3000/api/health'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('textProvider');
    expect(body).toHaveProperty('imageProvider');
  });
});
