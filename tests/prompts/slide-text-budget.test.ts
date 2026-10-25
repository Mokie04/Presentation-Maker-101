import { expect, it } from 'vitest';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/prompts/slide-generation';
import type { PresentationData } from '@/types/presentation';
it('states the text budget, assessment exception and lossless continuation rule', () => {
  expect(SYSTEM_PROMPT).toContain('SLIDE TEXT BUDGET');
  expect(SYSTEM_PROMPT).toMatch(/titles[^\n]*45 characters/i);
  expect(SYSTEM_PROMPT).toMatch(/at most 4 bullets/);
  expect(SYSTEM_PROMPT).toMatch(/at most 60 characters/);
  expect(SYSTEM_PROMPT).toContain('100 characters');
  expect(SYSTEM_PROMPT).toContain('options A to D as separate bullets');
  expect(SYSTEM_PROMPT).toContain('same part');
  expect(SYSTEM_PROMPT).toContain('(cont.)');
  expect(SYSTEM_PROMPT).toContain('never cut');
  expect(SYSTEM_PROMPT).toContain('No Truncation');
  expect(SYSTEM_PROMPT).not.toMatch(/35pt|40pt|45pt/);
  expect(SYSTEM_PROMPT).toContain('25 slides');
});
it('provides fitting example bullets, all seven parts and a Discussion continuation', () => {
  const prompt = USER_PROMPT_TEMPLATE('Lesson text', 'Session 1', 'Science');
  expect(prompt).toContain('slide text budget'); expect(prompt).toContain('minimum of 25 slides');
  const example: PresentationData = JSON.parse(prompt.slice(prompt.indexOf('{\n')));
  expect(example).toMatchObject({ subject: 'Science', topic: 'Main Lesson Topic' });
  expect(example.originalWriters).toContain('JOHN M. NAVARRO');
  for (const slide of example.slides) {
    expect(slide.title.length).toBeLessThanOrEqual(45);
    for (const bullet of slide.contentPoints) expect(bullet.length).toBeLessThanOrEqual(60);
    expect(slide.contentPoints.length).toBeLessThanOrEqual(slide.part === 'Assessment' ? 5 : 4);
  }
  const continuation = example.slides.find(s => s.title === 'Concept Deep Dive (cont.)')!;
  expect(continuation.part).toBe('Discussion'); expect(continuation.visualDescription).toBe('');
});
