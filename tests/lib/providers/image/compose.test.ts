import { describe, expect, it, vi } from 'vitest';
import { resolveImageProviders, generateWithFallback } from '@/lib/providers/image/compose';
import type { ImageProvider } from '@/lib/providers/image/types';

const request = { description: 'Earth', title: 'Planet', variation: 3 };
const provider = (id: ImageProvider['id'], generate = vi.fn().mockResolvedValue('aW1hZ2U=')): ImageProvider => ({ id, generate });

describe('resolveImageProviders', () => {
  it.each([
    { source: 'pexels', hasPexelsKey: false, ids: ['pexels'] },
    { source: 'pexels', hasPexelsKey: true, ids: ['pexels'] },
    { source: 'ai', hasPexelsKey: false, ids: ['openai'] },
    { source: 'ai', hasPexelsKey: true, ids: ['openai'] },
    { source: 'auto', hasPexelsKey: false, ids: ['openai'] },
    { source: 'auto', hasPexelsKey: true, ids: ['openai', 'pexels'] },
  ] as const)('$source with key=$hasPexelsKey resolves $ids without constructing excluded adapters', ({ source, hasPexelsKey, ids }) => {
    const ai = vi.fn(() => provider('openai')), pexels = vi.fn(() => provider('pexels'));
    expect(resolveImageProviders(source, { ai, pexels, hasPexelsKey }).map(({ id }) => id)).toEqual(ids);
    expect(ai).toHaveBeenCalledTimes(ids.some(id => id === 'openai') ? 1 : 0);
    expect(pexels).toHaveBeenCalledTimes(ids.some(id => id === 'pexels') ? 1 : 0);
  });
});

describe('generateWithFallback', () => {
  it('returns the first success without calling later providers', async () => {
    const first = provider('openai'), next = provider('pexels');
    expect(await generateWithFallback([first, next], request)).toBe('aW1hZ2U=');
    expect(first.generate).toHaveBeenCalledExactlyOnceWith(request); expect(next.generate).not.toHaveBeenCalled();
  });
  it('tries providers in order and forwards the same request after failure', async () => {
    const order: string[] = [];
    const first = provider('openai', vi.fn(async () => { order.push('openai'); throw new Error('AI failed'); }));
    const next = provider('pexels', vi.fn(async () => { order.push('pexels'); return 'fallback'; }));
    expect(await generateWithFallback([first, next], request)).toBe('fallback');
    expect(order).toEqual(['openai', 'pexels']); expect(next.generate).toHaveBeenCalledExactlyOnceWith(request);
  });
  it.each([new Error('First provider failed'), undefined, 'first rejection'])('preserves the first provider rejection when all fail: %s', async (error) => {
    const first = provider('openai', vi.fn().mockRejectedValue(error));
    const next = provider('pexels', vi.fn().mockRejectedValue(new Error('Pexels failed')));
    await expect(generateWithFallback([first, next], request)).rejects.toBe(error);
    expect(first.generate).toHaveBeenCalledOnce(); expect(next.generate).toHaveBeenCalledOnce();
  });
  it('preserves the single provider error without retry', async () => {
    const error = new Error('Pexels failed');
    const single = provider('pexels', vi.fn().mockRejectedValue(error));
    await expect(generateWithFallback([single], request)).rejects.toBe(error);
    expect(single.generate).toHaveBeenCalledOnce();
  });
});
