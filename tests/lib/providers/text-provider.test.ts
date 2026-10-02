import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSlideContent,
  presentationDataSchema,
  createTextProviderClient,
} from '@/lib/providers/text-provider';
import type OpenAI from 'openai';

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
      })
    );
  });

  it('retries on failure up to 5 times and succeeds on a subsequent attempt', async () => {
    const mockCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockRejectedValueOnce(new Error('Server error 500'))
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

  it('fails after exceeding 5 retries', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Continuous 500 error'));
    const mockClient = {
      chat: { completions: { create: mockCreate } },
    } as unknown as OpenAI;

    await expect(
      generateSlideContent('Lesson plan text', 'Session 1', 'Science', {
        client: mockClient,
        backoffDelays: [1, 2, 4, 8, 16],
      })
    ).rejects.toThrowError('Continuous 500 error');

    // 1 initial attempt + 5 retries = 6 total calls
    expect(mockCreate).toHaveBeenCalledTimes(6);
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
