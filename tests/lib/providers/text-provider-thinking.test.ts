import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type OpenAI from 'openai';
import { generateSlideContent } from '@/lib/providers/text-provider';
import { resetConfigCache } from '@/lib/env';
import { checkHealth } from '@/lib/health';

const presentation = {
  subject: 'Science',
  originalWriters: 'Maria Santos',
  topic: 'Photosynthesis',
  slides: [{ slideNumber: 1, part: 'Review', title: 'Recap', contentPoints: ['Roots'], visualDescription: 'A tree' }],
};

function mockClient() {
  const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(presentation) } }] });
  return { create, client: { chat: { completions: { create } } } as unknown as OpenAI };
}

beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-text-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-text-model');
  resetConfigCache();
});
afterEach(() => { vi.unstubAllEnvs(); resetConfigCache(); });

describe('TEXT_PROVIDER_THINKING', () => {
  it('sends no thinking field when unset, so other providers see the same request as before', async () => {
    const { create, client } = mockClient();
    await generateSlideContent('Lesson', 'Session 1', 'Science', { client });
    expect(create.mock.calls[0][0]).not.toHaveProperty('thinking');
  });

  it.each(['enabled', 'disabled'] as const)('sends thinking.type=%s on slide generation', async (value) => {
    vi.stubEnv('TEXT_PROVIDER_THINKING', value);
    resetConfigCache();
    const { create, client } = mockClient();
    await generateSlideContent('Lesson', 'Session 1', 'Science', { client });
    expect(create.mock.calls[0][0]).toMatchObject({
      thinking: { type: value },
      response_format: { type: 'json_object' },
    });
  });

  it('sends the same thinking setting on the text health check', async () => {
    vi.stubEnv('TEXT_PROVIDER_THINKING', 'disabled');
    resetConfigCache();
    const { create, client } = mockClient();
    await checkHealth({ textClient: client });
    expect(create.mock.calls[0][0]).toMatchObject({ thinking: { type: 'disabled' }, max_tokens: 5 });
  });
});
