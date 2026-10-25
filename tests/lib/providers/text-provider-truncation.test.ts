import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { generateSlideContent, TextOutputTruncatedError } from '@/lib/providers/text-provider';
const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [] };
beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-key'); vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-model');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
it.each([null, '{"slides":', JSON.stringify(presentation)])('stops on length with one call and no backoff, even for content %j', async content => {
  const create = vi.fn().mockResolvedValue({ choices: [{ finish_reason: 'length', message: { content } }] });
  const client = { chat: { completions: { create } } } as unknown as OpenAI;
  const timer = vi.spyOn(globalThis, 'setTimeout');
  await expect(generateSlideContent('Lesson', 'Session 1', 'Science', { client, maxRetries: 5, backoffDelays: [0] }))
    .rejects.toBeInstanceOf(TextOutputTruncatedError);
  expect(create).toHaveBeenCalledOnce(); expect(timer).not.toHaveBeenCalled();
  expect(create.mock.calls[0][0]).not.toHaveProperty('max_tokens');
});
it.each(['stop', 'content_filter', 'tool_calls', null, undefined])('preserves valid JSON behavior for finish reason %s', async finish_reason => {
  const create = vi.fn().mockResolvedValue({ choices: [{ finish_reason, message: { content: JSON.stringify(presentation) } }] });
  const client = { chat: { completions: { create } } } as unknown as OpenAI;
  expect(await generateSlideContent('Lesson', 'Session 1', 'Science', { client })).toEqual(presentation);
  expect(create).toHaveBeenCalledOnce(); expect(create.mock.calls[0][0]).not.toHaveProperty('max_tokens');
});
