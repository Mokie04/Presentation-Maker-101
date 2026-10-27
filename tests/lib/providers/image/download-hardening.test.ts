import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPexelsImageBase64 } from '@/lib/providers/pexels-provider';
import { downloadProviderImage, openAiImageDownloadHosts } from '@/lib/providers/download-provider-image';
import { createOpenAiImageProvider } from '@/lib/providers/image/openai';
import type OpenAI from 'openai';

const imageUrl = 'https://images.pexels.com/photos/1/medium.jpg';
function download(response: Response | Promise<Response>, url = imageUrl) {
  const fetchFn = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ photos: [{ src: { medium: url } }] }))
    .mockImplementationOnce(() => Promise.resolve(response));
  return { fetchFn, pending: fetchPexelsImageBase64('water cycle', { apiKey: 'test', fetchFn }) };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('provider-hosted image downloads', () => {
  it.each(['https://attacker.example/image.jpg', 'http://images.pexels.com/image.jpg',
    'https://images.pexels.com.attacker.example/image.jpg', 'https://user@images.pexels.com/image.jpg',
    'https://images.pexels.com:8443/image.jpg'])('rejects unexpected Pexels URL %s before downloading', async (url) => {
    const { pending, fetchFn } = download(new Response('image', { headers: { 'Content-Type': 'image/jpeg' } }), url);
    await expect(pending).rejects.toThrow(/URL/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('requires an image content type and rejects redirects', async () => {
    const response = new Response('not an image', { headers: { 'Content-Type': 'text/html' } });
    const read = vi.spyOn(response.body!, 'getReader');
    const { pending, fetchFn } = download(response);
    await expect(pending).rejects.toThrow(/content type/i);
    expect(read).not.toHaveBeenCalled();
    expect(fetchFn).toHaveBeenLastCalledWith(imageUrl, expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }));
  });

  it('caps actual streamed bytes even without Content-Length', async () => {
    const cancel = vi.fn();
    let chunks = 0;
    const body = new ReadableStream<Uint8Array>({ pull(controller) {
      if (chunks++ < 5) controller.enqueue(new Uint8Array(1024 * 1024));
      else controller.close();
    }, cancel });
    const { pending } = download(new Response(body, { headers: { 'Content-Type': 'image/png' } }));
    await expect(pending).rejects.toThrow(/too large/i);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('uses a ten-second deadline across a stalled image body', async () => {
    vi.useFakeTimers();
    const { pending } = download(new Response(new ReadableStream({ pull() {} }), { headers: { 'Content-Type': 'image/png' } }));
    const rejected = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('accepts a normal image response', async () => {
    const { pending } = download(new Response('picture', { headers: { 'Content-Type': 'image/jpeg' } }));
    expect(await pending).toBe(Buffer.from('picture').toString('base64'));
  });
});


describe('OpenAI-compatible hosted URL trust', () => {
  it('allows exact configured HTTPS provider and expected asset hosts', async () => {
    const allowedHosts = openAiImageDownloadHosts('https://images.provider.example/v1');
    for (const hostname of ['images.provider.example', 'oaidalleapiprodscus.blob.core.windows.net', 'files.oaiusercontent.com']) {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('picture', { headers: { 'Content-Type': 'image/png' } }));
      await expect(downloadProviderImage(`https://${hostname}/picture`, { allowedHosts, fetchFn })).resolves.toBe(Buffer.from('picture').toString('base64'));
    }
  });

  it.each(['https://localhost/v1', 'https://127.0.0.1/v1', 'https://[::1]/v1', 'https://local.local/v1',
    'http://provider.example/v1', 'https://user@provider.example/v1'])('does not trust local, IP, credentialed or non-HTTPS configuration %s', (baseUrl) => {
    expect(openAiImageDownloadHosts(baseUrl)).not.toContain(new URL(baseUrl).hostname);
  });

  it.each(['https://arbitrary.blob.core.windows.net/image', 'https://files.oaiusercontent.com.attacker.example/image',
    'https://attacker.example/image'])('rejects unexpected storage URL %s before any fetch', async (url) => {
    const fetchFn = vi.fn<typeof fetch>();
    await expect(downloadProviderImage(url, { allowedHosts: openAiImageDownloadHosts('https://api.openai.com/v1'), fetchFn })).rejects.toThrow(/URL/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rejects an oversized declared image before reading', async () => {
    const response = new Response('picture', { headers: { 'Content-Type': 'image/png', 'Content-Length': String(3 * 1024 * 1024 + 1) } });
    const read = vi.spyOn(response.body!, 'getReader');
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(downloadProviderImage(imageUrl, { allowedHosts: ['images.pexels.com'], fetchFn })).rejects.toThrow(/too large/i);
    expect(read).not.toHaveBeenCalled();
  });
});


it('the OpenAI adapter rejects an unexpected hosted URL before fetching it', async () => {
  const generate = vi.fn().mockResolvedValue({ data: [{ url: 'https://attacker.example/image' }] });
  const fetchFn = vi.spyOn(globalThis, 'fetch');
  const provider = createOpenAiImageProvider({ client: { images: { generate } } as unknown as OpenAI, maxRetries: 0 });
  await expect(provider.generate({ description: 'Water cycle' })).rejects.toThrow(/URL/);
  expect(fetchFn).not.toHaveBeenCalled();
});

it('the OpenAI adapter does not retry a permanent hosted-image 404', async () => {
  const generate = vi.fn().mockResolvedValue({ data: [{ url: 'https://api.openai.com/image' }] });
  const fetchFn = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  const provider = createOpenAiImageProvider({ client: { images: { generate } } as unknown as OpenAI, maxRetries: 3, backoffMs: 1 });
  await expect(provider.generate({ description: 'Water cycle' })).rejects.toMatchObject({ status: 404 });
  expect(generate).toHaveBeenCalledOnce();
  expect(fetchFn).toHaveBeenCalledOnce();
});
