import { afterEach, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { createOpenAiImageProvider } from '@/lib/providers/image/openai';
import { readImageProviderConfig, resetConfigCache } from '@/lib/env';
import { resolveImageProviders } from '@/lib/providers/image/compose';
afterEach(() => { vi.unstubAllEnvs(); resetConfigCache(); vi.useRealTimers(); });
it.each([400, 401, 403, 404, 408, 409])('does not retry an image HTTP %s', async status => {
  vi.useFakeTimers();
  const error = Object.assign(new Error('rejected'), { status });
  const generate = vi.fn().mockRejectedValue(error);
  const pending = createOpenAiImageProvider({ client: { images: { generate } } as unknown as OpenAI }).generate({ description: 'Earth' });
  const assertion = expect(pending).rejects.toBe(error);
  await vi.runAllTimersAsync(); await assertion;
  expect(generate).toHaveBeenCalledTimes(1);
});
it.each([429, 500])('still retries image HTTP %s', async status => {
  vi.useFakeTimers();
  const generate = vi.fn().mockRejectedValueOnce(Object.assign(new Error('busy'), { status })).mockResolvedValueOnce({ data: [{ b64_json: 'image' }] });
  const pending = createOpenAiImageProvider({ client: { images: { generate } } as unknown as OpenAI }).generate({ description: 'Earth' });
  await vi.runAllTimersAsync(); expect(await pending).toBe('image'); expect(generate).toHaveBeenCalledTimes(2);
});
it.each([['dall-e-3', '1792x1024'], ['gpt-image-1', '1536x1024'], ['gpt-image-1-mini', '1536x1024'], ['custom-image', '1024x576']])('uses an accepted landscape default for %s', async (model, size) => {
  vi.stubEnv('IMAGE_PROVIDER_MODEL', model); resetConfigCache();
  const generate = vi.fn().mockResolvedValue({ data: [{ b64_json: 'image' }] });
  await createOpenAiImageProvider({ client: { images: { generate } } as unknown as OpenAI }).generate({ description: 'Earth' });
  expect(generate.mock.calls[0][0]).toMatchObject({ model, size });
});
it('accepts configured model sizes and rejects incompatible ones before a provider call', () => {
  expect(readImageProviderConfig({ IMAGE_PROVIDER_MODEL: 'dall-e-3', IMAGE_PROVIDER_SIZE: '1024x1792' })).toHaveProperty('size', '1024x1792');
  expect(() => readImageProviderConfig({ IMAGE_PROVIDER_MODEL: 'dall-e-3', IMAGE_PROVIDER_SIZE: '1024x576' })).toThrow('IMAGE_PROVIDER_SIZE');
  expect(readImageProviderConfig({ IMAGE_PROVIDER_MODEL: 'gpt-image-1', IMAGE_PROVIDER_SIZE: '1024x1536' })).toHaveProperty('size', '1024x1536');
});
it('skips AI construction in auto mode when its key is the placeholder', () => {
  const ai = vi.fn(() => ({ id: 'openai' as const, generate: vi.fn() }));
  const pexels = vi.fn(() => ({ id: 'pexels' as const, generate: vi.fn() }));
  expect(resolveImageProviders('auto', { ai, pexels, hasPexelsKey: true, hasAiKey: false }).map(provider => provider.id)).toEqual(['pexels']);
  expect(ai).not.toHaveBeenCalled();
});
