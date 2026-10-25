import { afterEach, expect, it, vi } from 'vitest';
import { processBatchImages } from '@/lib/services/image-batch';
import * as provider from '@/lib/providers/image-provider';
afterEach(() => vi.restoreAllMocks());
it('skips blank visuals without a provider call or result, preserving real slide indexes', async () => {
  const generate = vi.spyOn(provider, 'generateSlideImage').mockResolvedValue('image');
  const result = await processBatchImages([
    { slideIndex: 0, part: 'Discussion', visualDescription: '' },
    { slideIndex: 2, part: 'Discussion', visualDescription: 'Diagram' },
    { slideIndex: 3, part: 'Motivation', visualDescription: ' \n ' },
    { slideIndex: 7, part: 'Motivation', visualDescription: 'Group work' },
    { slideIndex: 9, part: 'Assessment', visualDescription: 'Do not generate for this part' },
  ], { delayMs: 0 });
  expect(result).toEqual({ 2: 'image', 7: 'image' });
  expect(generate.mock.calls).toEqual([['Diagram'], ['Group work']]);
});
