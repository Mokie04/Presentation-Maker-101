import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { createOpenAiImageProvider } from '@/lib/providers/image/openai';
import { createPexelsImageProvider } from '@/lib/providers/image/pexels';
import * as pexels from '@/lib/providers/pexels-provider';
import { IMAGE_PROMPT_PREFIX } from '@/lib/prompts/slide-generation';

const mocks = vi.hoisted(() => {
  const generate = vi.fn();
  return { generate, construct: vi.fn(function () { return { images: { generate } }; }) };
});
vi.mock('openai', () => ({ default: mocks.construct }));
const client = { images: { generate: mocks.generate } } as unknown as OpenAI;
const request = { description: 'Volcano with lava', title: 'Volcano', variation: 2 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.generate.mockResolvedValue({ data: [{ b64_json: 'YWk=' }] });
  vi.spyOn(pexels, 'fetchPexelsImageBase64').mockResolvedValue('cGhvdG8=');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected live fetch')));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

const adapters = [
  { id: 'openai', create: () => createOpenAiImageProvider({ client, maxRetries: 0 }),
    fail: (error: Error) => mocks.generate.mockRejectedValue(error) },
  { id: 'pexels', create: () => createPexelsImageProvider({ apiKey: 'key' }),
    fail: (error: Error) => vi.mocked(pexels.fetchPexelsImageBase64).mockRejectedValue(error) },
];
describe.each(adapters)('$id ImageProvider contract', ({ id, create, fail }) => {
  it('returns raw non-empty base64 for a valid response', async () => {
    const provider = create(); expect(provider.id).toBe(id);
    const result = await provider.generate(request);
    expect(result).toBe(id === 'openai' ? 'YWk=' : 'cGhvdG8=');
    expect(result).not.toContain('data:');
  });
  it('throws the provider failure', async () => {
    const error = new Error('Provider failed'); fail(error);
    await expect(create().generate(request)).rejects.toBe(error);
  });
});

it('OpenAI applies the prefix and retries only between attempts', async () => {
  vi.useFakeTimers();
  mocks.generate.mockRejectedValueOnce(new Error('busy')).mockResolvedValueOnce({ data: [{ b64_json: 'YWk=' }] });
  const pending = createOpenAiImageProvider({ client, maxRetries: 1, backoffMs: 20 }).generate(request);
  await vi.advanceTimersByTimeAsync(20);
  expect(await pending).toBe('YWk='); expect(mocks.generate).toHaveBeenCalledTimes(2);
  for (const [body] of mocks.generate.mock.calls) {
    expect(body).toEqual({ model: 'dall-e-3', prompt: IMAGE_PROMPT_PREFIX + request.description,
      size: '1024x576', quality: 'standard', response_format: 'b64_json', n: 1 });
  }
  expect(vi.getTimerCount()).toBe(0);
});

it('Pexels forwards title and variation and never retries a failure', async () => {
  vi.useFakeTimers();
  const error = new Error('Pexels failed'); vi.mocked(pexels.fetchPexelsImageBase64).mockRejectedValue(error);
  await expect(createPexelsImageProvider({ apiKey: 'option-key' }).generate(request)).rejects.toBe(error);
  expect(pexels.fetchPexelsImageBase64).toHaveBeenCalledExactlyOnceWith(request.description, {
    apiKey: 'option-key', title: request.title, variation: request.variation,
  });
  expect(vi.getTimerCount()).toBe(0); expect(mocks.construct).not.toHaveBeenCalled();
});

it('OpenAI defers default client construction until generation and reuses it', async () => {
  const provider = createOpenAiImageProvider({ maxRetries: 0 });
  expect(mocks.construct).not.toHaveBeenCalled();
  await provider.generate(request); await provider.generate(request);
  expect(mocks.construct).toHaveBeenCalledOnce();
  expect(mocks.construct).toHaveBeenCalledWith({ baseURL: 'https://api.openai.com/v1', apiKey: 'not-configured' });
});
