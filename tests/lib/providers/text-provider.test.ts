import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSlideContent,
  presentationDataSchema,
} from '@/lib/providers/text-provider';
import OpenAI from 'openai';

beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-text-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-text-model');
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('text-provider', () => {
  const samplePresentation = {
    subject: 'Science',
    originalWriters: 'Maria Santos',
    topic: 'Photosynthesis',
    slides: [
      {
        slideNumber: 1,
        part: 'Review',
        title: 'Recap of Plant Parts',
        contentPoints: ['Roots absorb water', 'Leaves capture sunlight'],
        visualDescription: 'Filipino classroom diagram of a mango tree',
      },
    ],
  };

  it('validates a correct PresentationData object with presentationDataSchema', () => {
    const parsed = presentationDataSchema.parse(samplePresentation);
    expect(parsed.subject).toBe('Science');
    expect(parsed.slides).toHaveLength(1);
  });

  it('keeps model content separate from claimed provenance metadata', () => {
    expect(presentationDataSchema.parse({ ...samplePresentation, subjectEvidence: [
      { subject: 'Science', source: 'teacher-supplied' },
    ] })).toEqual(samplePresentation);
  });

  it('rejects an invalid PresentationData object missing required fields', () => {
    const invalid = {
      subject: 'Science',
      // missing originalWriters and topic
      slides: [],
    };
    expect(() => presentationDataSchema.parse(invalid)).toThrow();
  });

  it('successfully generates and parses slide content from mock client', async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify(samplePresentation),
                },
              },
            ],
          }),
        },
      },
    } as unknown as OpenAI;

    const result = await generateSlideContent(
      'Lesson plan text',
      'Session 1',
      'Science',
      { client: mockClient }
    );

    expect(result).toEqual(samplePresentation);
    expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
      }),
      expect.objectContaining({ maxRetries: 0, timeout: 150_000, signal: expect.any(AbortSignal) })
    );
  });

  it('retries transient failures and succeeds on a subsequent attempt', async () => {
    const mockCreate = vi
      .fn()
      .mockRejectedValueOnce(new OpenAI.RateLimitError(429, {}, 'Rate limit exceeded', new Headers()))
      .mockRejectedValueOnce(new OpenAI.InternalServerError(500, {}, 'Server error 500', new Headers()))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(samplePresentation),
            },
          },
        ],
      });

    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;

    const result = await generateSlideContent(
      'Lesson plan text',
      'Session 1',
      'Science',
      {
        client: mockClient,
        backoffDelays: [1, 2, 4, 8, 16], // fast delays for tests
      }
    );

    expect(result).toEqual(samplePresentation);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('fails after exceeding the two default retries', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new OpenAI.InternalServerError(500, { message: 'Continuous 500 error' }, undefined, new Headers()));
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;

    await expect(
      generateSlideContent('Lesson plan text', 'Session 1', 'Science', {
        client: mockClient,
        backoffDelays: [1, 2, 4, 8, 16],
      })
    ).rejects.toThrowError('Continuous 500 error');

    // 1 initial attempt + 2 retries = 3 total calls
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('retries when model returns invalid non-schema JSON', async () => {
    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"wrongKey": true}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(samplePresentation) } }],
      });

    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;

    const result = await generateSlideContent(
      'Lesson plan text',
      'Session 1',
      'Science',
      {
        client: mockClient,
        backoffDelays: [1, 2, 4, 8, 16],
      }
    );

    expect(result).toEqual(samplePresentation);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
