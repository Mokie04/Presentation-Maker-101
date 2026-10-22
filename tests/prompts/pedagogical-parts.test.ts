import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/prompts/slide-generation';
import { PEDAGOGICAL_PARTS } from '@/lib/pedagogy';

// The prompt prose is tuned by hand; this keeps it naming every part the app recognizes.
describe('prompt and pedagogical parts stay in sync', () => {
  const userPrompt = USER_PROMPT_TEMPLATE('Lesson text', 'Session 1', 'Science');

  it.each(PEDAGOGICAL_PARTS)('names %j in the system prompt', (part) => {
    expect(SYSTEM_PROMPT).toContain(part);
  });

  it.each(PEDAGOGICAL_PARTS)('names %j in the user prompt', (part) => {
    expect(userPrompt).toContain(part);
  });
});
