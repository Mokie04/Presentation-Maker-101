import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { generateSlideContent } from '@/lib/providers/text-provider';
import { exportPresentationDataSchema } from '@/lib/schemas/presentation-export';
import type { LessonFormat } from '@/lib/pedagogy';

const deck = (parts: string[]) => ({
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: parts.map((part, i) => ({ slideNumber: i + 1, part, title: 'T', contentPoints: ['P'], visualDescription: 'V' })),
});

beforeEach(() => {
  vi.stubEnv('TEXT_PROVIDER_BASE_URL', 'http://127.0.0.1:9/v1');
  vi.stubEnv('TEXT_PROVIDER_API_KEY', 'test-key');
  vi.stubEnv('TEXT_PROVIDER_MODEL', 'test-model');
});
afterEach(() => { vi.unstubAllEnvs(); });

async function generatedParts(parts: string[], lessonFormat?: LessonFormat) {
  const create = vi.fn().mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(deck(parts)) } }] });
  const client = { chat: { completions: { create } } } as unknown as OpenAI;
  const result = await generateSlideContent('Lesson', 'Session 1', 'Science', { client, lessonFormat });
  return result.slides.map(slide => slide.part);
}

describe('canonical part names in generated presentations', () => {
  it('names Standard parts and keeps unknown parts', async () => {
    expect(await generatedParts(['Activity', 'lesson presentation', 'Assessment/Evaluation', 'Generalization']))
      .toEqual(['Activities', 'Lesson Presentation', 'Assessment', 'Generalization']);
  });

  it("names 4A's parts by the 4A's, so Activity stays Activity", async () => {
    expect(await generatedParts(['ACTIVITY', 'analysis', 'Abstraction (Generalization)', 'Application Activity', 'Assessment'], "4A's"))
      .toEqual(['Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment']);
  });

  it('names 5E parts, including Explanation and an Assessment slide', async () => {
    expect(await generatedParts(['engage', 'Exploration', 'Explanation', 'Elaboration', 'Assessment'], '5E'))
      .toEqual(['Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate']);
  });
});

describe('export input', () => {
  it('keeps parts as the deck has them, so a 4A\'s Activity is not renamed Activities', () => {
    const parts = ['Activity', 'Analysis', 'Discussion'];
    expect(exportPresentationDataSchema.parse(deck(parts)).slides.map(s => s.part)).toEqual(parts);
  });

  it('is idempotent', () => {
    const once = exportPresentationDataSchema.parse(deck(['Activity', 'Generalization']));
    expect(exportPresentationDataSchema.parse(once)).toEqual(once);
  });
});
