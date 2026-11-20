import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
  IMAGE_PROMPT_PREFIX,
} from '@/lib/prompts/slide-generation';

describe('slide-generation prompts', () => {
  it('SYSTEM_PROMPT includes instructional requirements and 6 pedagogical parts', () => {
    expect(SYSTEM_PROMPT).toContain('expert instructional designer for Philippine K-12 classrooms');
    expect(SYSTEM_PROMPT).toContain('1. Review');
    expect(SYSTEM_PROMPT).toContain('2. Motivation');
    expect(SYSTEM_PROMPT).toContain('3. Lesson Presentation');
    expect(SYSTEM_PROMPT).toContain('4. Discussion');
    expect(SYSTEM_PROMPT).toContain('5. Activities');
    expect(SYSTEM_PROMPT).toContain('6. Assessment');
    expect(SYSTEM_PROMPT).toContain('Philippine setting');
  });

  it('USER_PROMPT_TEMPLATE properly injects parameters', () => {
    const text = 'Sample lesson text about photosynthesis';
    const session = 'Day 1 - Session 1';
    const subject = 'Science';

    const result = USER_PROMPT_TEMPLATE(text, session, subject);

    expect(result).toContain(text);
    expect(result).toContain('Focus strictly on the curriculum segments pertaining to: Day 1 - Session 1.');
    expect(result).toContain('Detect and apply the specific directive for "Science".');
    expect(result).toContain('"subject": "Science"');
    expect(result).toContain('Review');
    expect(result).toContain('Motivation');
    expect(result).toContain('Lesson Presentation');
    expect(result).toContain('Discussion');
    expect(result).toContain('Activities');
    expect(result).toContain('Assessment');
  });

  it('IMAGE_PROMPT_PREFIX has exact required phrasing', () => {
    expect(IMAGE_PROMPT_PREFIX).toBe(
      'Premium, bright, friendly, primary school educational cartoon vector graphic, set in a Philippine school environment: '
    );
  });

  it('SYSTEM_PROMPT includes explicit formula formatting rules for Math and Science', () => {
    expect(SYSTEM_PROMPT).toContain('FORMULA & EQUATION FORMATTING');
    expect(SYSTEM_PROMPT).toContain('chemical formulas');
    expect(SYSTEM_PROMPT).toContain('exponents');
    expect(SYSTEM_PROMPT).toContain('radicals');
  });
});

describe('whole-lesson and teacher-only prompt rules', () => {
  it('builds one deck from the whole plan without claiming it is one session', () => {
    const result = USER_PROMPT_TEMPLATE('Engage. Explore. Explain. Elaborate. Evaluate.', 'Whole lesson', 'Science');
    expect(result).toContain('Build one deck from the whole lesson plan, from start to finish, instead of a single session.');
    expect(result).toContain('do not invent unrelated content');
    expect(result).not.toContain('Focus strictly on the curriculum segments');
    expect(result).not.toContain('is taught in a single class session');
  });

  it('keeps the session focus for a numbered session', () => {
    const result = USER_PROMPT_TEMPLATE('Session 1 ... Session 2 ...', 'Session 2', 'Science');
    expect(result).toContain('Focus strictly on the curriculum segments pertaining to: Session 2.');
    expect(result).not.toContain('Build one deck from the whole lesson plan');
  });

  it('maps 5E and 4A phases to parts in canonical order, so part badges never count backwards', () => {
    expect(SYSTEM_PROMPT).toContain('Engage -> Motivation, Explore -> Lesson Presentation, Explain -> Discussion, Elaborate -> Activities, Evaluate -> Assessment');
    expect(SYSTEM_PROMPT).toContain('Activity -> Lesson Presentation, Analysis -> Discussion, Abstraction -> Discussion, Application -> Activities');
    expect(SYSTEM_PROMPT).toContain('the parts stay in the order above');
    expect(SYSTEM_PROMPT).not.toContain('Activities before Discussion');
  });

  it('leaves teacher-only notes off the slides and keeps the answer key on its own slides', () => {
    for (const phrase of ['[Pedagogy] and [Targeting Indicator] notes', 'declaration of AI use', 'signature blocks', 'exit ticket and reflection question']) {
      expect(SYSTEM_PROMPT).toContain(phrase);
    }
    expect(SYSTEM_PROMPT).toContain('Never show an answer or expected answer on a question slide');
    expect(SYSTEM_PROMPT).toContain('titled "Answer Key" at the end of the Assessment part');
  });
});
