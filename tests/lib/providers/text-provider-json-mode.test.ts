import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { generateSlideContent } from '@/lib/providers/text-provider';

const presentation = { subject: 'Science', originalWriters: 'Teacher', topic: 'Water', slides: [] };

beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-model');
});
afterEach(() => { vi.unstubAllEnvs(); });

// Some compatible text services reject JSON response mode unless the conversation
// mentions JSON, and the rejection can look like a generic server error.
it('mentions JSON in the messages whenever JSON response mode is requested', async () => {
  const create = vi.fn().mockResolvedValue({
    choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(presentation) } }],
  });
  const client = { chat: { completions: { create } } } as unknown as OpenAI;
  await generateSlideContent('A lesson about water', 'Session 1', 'Science', { client });

  expect(create).toHaveBeenCalledOnce();
  const body = create.mock.calls[0][0] as {
    response_format?: { type?: string };
    messages: { role: string; content: unknown }[];
  };
  const jsonMode = body.response_format?.type === 'json_object' || body.response_format?.type === 'json_schema';
  // Pin the current request shape so this guard cannot silently stop applying.
  expect(jsonMode).toBe(true);
  const text = body.messages.map(message => (typeof message.content === 'string' ? message.content : JSON.stringify(message.content))).join('\n');
  expect(text).toMatch(/\bJSON\b/);
});
