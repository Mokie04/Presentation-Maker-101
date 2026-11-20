import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvokeImageProvider } from '@/lib/providers/image/invoke-api';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';

const config = {
  baseUrl: 'https://runtime.example.test', apiKey: 'secret-key-123', model: 'vendor.image-model-v1:1', aspectRatio: '16:9',
};
const request = { description: 'Volcano cross-section', title: 'Volcano', variation: 3 };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const ok = (image = 'aW1hZ2U=') => json({ images: [image], finish_reasons: [null], seeds: [1] });

let fetchFn: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchFn = vi.fn(async () => ok()); });
afterEach(() => { vi.useRealTimers(); });
const create = (over: { maxRetries?: number; backoffMs?: number } = {}) =>
  createInvokeImageProvider({ config, fetchFn: fetchFn as unknown as typeof fetch, maxRetries: 0, ...over });

describe('invoke-api ImageProvider', () => {
  it('returns raw base64 and identifies itself', async () => {
    const provider = create();
    expect(provider.id).toBe('invoke-api');
    const result = await provider.generate(request);
    expect(result).toBe('aW1hZ2U=');
    expect(result).not.toContain('data:');
  });

  it('posts the prompt, aspect ratio and bearer key to the model invoke path', async () => {
    await create().generate(request);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://runtime.example.test/model/vendor.image-model-v1%3A1/invoke');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer secret-key-123', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      prompt: IMAGE_PROMPT_PREFIX + request.description, aspect_ratio: '16:9', output_format: 'png',
    });
  });

  it('tolerates a trailing slash on the base URL', async () => {
    await createInvokeImageProvider({ config: { ...config, baseUrl: 'https://runtime.example.test/' },
      fetchFn: fetchFn as unknown as typeof fetch, maxRetries: 0 }).generate(request);
    expect(fetchFn.mock.calls[0][0]).toBe('https://runtime.example.test/model/vendor.image-model-v1%3A1/invoke');
  });

  it.each([
    ['no images', { images: [], finish_reasons: [] }],
    ['an empty image', { images: [''], finish_reasons: [null] }],
    ['a refused image', { images: ['aW1hZ2U='], finish_reasons: ['CONTENT_FILTERED'] }],
    ['an unexpected body', { message: 'nope' }],
  ])('rejects %s', async (_name, body) => {
    fetchFn.mockResolvedValue(json(body));
    await expect(create().generate(request)).rejects.toThrow(/image/i);
  });

  it('does not retry client errors other than 429 and never leaks the key or body', async () => {
    fetchFn.mockResolvedValue(new Response('{"message":"bad key secret-key-123"}', { status: 403 }));
    const error = await create({ maxRetries: 3, backoffMs: 1 }).generate(request).catch((e: Error & { status?: number }) => e);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error & { status?: number }).status).toBe(403);
    expect((error as Error).message).not.toContain('secret-key-123');
    expect((error as Error).message).not.toContain('bad key');
  });

  it('retries 429 and server errors between attempts, then succeeds', async () => {
    vi.useFakeTimers();
    fetchFn.mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(ok('c3VjY2Vzcw=='));
    const pending = create({ maxRetries: 3, backoffMs: 20 }).generate(request);
    await vi.advanceTimersByTimeAsync(40);
    expect(await pending).toBe('c3VjY2Vzcw==');
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops after the configured retries and throws the last failure', async () => {
    vi.useFakeTimers();
    fetchFn.mockImplementation(async () => new Response('{}', { status: 500 }));
    const pending = create({ maxRetries: 2, backoffMs: 5 }).generate(request).catch((e: Error & { status?: number }) => e);
    await vi.advanceTimersByTimeAsync(20);
    expect(((await pending) as Error & { status?: number }).status).toBe(500);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('retries a network failure', async () => {
    vi.useFakeTimers();
    fetchFn.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(ok());
    const pending = create({ maxRetries: 1, backoffMs: 5 }).generate(request);
    await vi.advanceTimersByTimeAsync(5);
    expect(await pending).toBe('aW1hZ2U=');
  });
});
