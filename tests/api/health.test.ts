import { describe, it, expect, vi } from 'vitest';
import { checkHealth } from '@/lib/health';
import { GET } from '@/app/api/health/route';
import * as textProvider from '@/lib/providers/text-provider';

describe('Health Check API', () => {
  it('returns ok for both providers when text provider call succeeds and image provider is configured', async () => {
    const mockChatCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'hello' } }],
    });

    const mockTextClient = {
      chat: { completions: { create: mockChatCreate } },
    };

    const data = await checkHealth({
      textClient: mockTextClient as any,
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
    const mockChatCreate = vi.fn().mockRejectedValue(new Error('Invalid API key: 401'));

    const mockTextClient = {
      chat: { completions: { create: mockChatCreate } },
    };

    const data = await checkHealth({
      textClient: mockTextClient as any,
    });

    expect(data.textProvider).toBe('error');
    expect(data.imageProvider).toBe('ok');
    expect(data.errors).toBeDefined();
    expect(data.errors?.[0]).toContain('Invalid API key: 401');
  });

  it('GET handler returns NextResponse with 200 status', async () => {
    vi.spyOn(textProvider, 'getTextProviderClient').mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'hello' } }],
          }),
        },
      },
    } as any);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('textProvider');
    expect(body).toHaveProperty('imageProvider');
  });
});

