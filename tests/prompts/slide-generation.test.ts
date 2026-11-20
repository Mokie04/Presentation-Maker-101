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
    expect(SYSTEM_PROMPT).toContain('titled "Answer Key" at the end of the last part (Assessment, or Evaluate in the 5E format)');
  });
});

describe('lesson format prompts', () => {
  it("lists the 4A's parts, makes Review and Motivation optional and shows 4A's example parts", () => {
    const result = USER_PROMPT_TEMPLATE('Lesson', 'Whole lesson', 'Mathematics', "4A's");
    expect(result).toContain("CRITICAL PEDAGOGICAL STRUCTURE (4A'S LESSON FORMAT)");
    expect(result).toContain('4. Activity (');
    expect(result).toContain('7. Application (');
    expect(result).toContain('2. Review (Only when the plan has a review or recall step; otherwise leave it out)');
    expect(result).toContain("spelled exactly: Title Page, Review, Motivation, Activity, Analysis, Abstraction, Application, Assessment.");
    expect(result).toContain('"part": "Abstraction"');
    expect(result).not.toContain('"part": "Discussion"');
    expect(result).not.toContain('ALL 6 PARTS ARE MANDATORY');
    expect(result).not.toContain('write one or two short Review slides');
  });

  it('lists the 5E parts and examples', () => {
    const result = USER_PROMPT_TEMPLATE('Lesson', 'Session 1', 'Science', '5E');
    expect(result).toContain('CRITICAL PEDAGOGICAL STRUCTURE (5E LESSON FORMAT)');
    expect(result).toContain('Engage, Explore, Explain, Elaborate and Evaluate are mandatory.');
    expect(result).toContain('"part": "Evaluate"');
    expect(result).not.toContain('"part": "Assessment"');
  });

  it('keeps the six-part prompt for the Standard format', () => {
    const result = USER_PROMPT_TEMPLATE('Lesson', 'Whole lesson', 'Science', 'Standard');
    expect(result).toBe(USER_PROMPT_TEMPLATE('Lesson', 'Whole lesson', 'Science'));
    expect(result).toContain('ALL 6 PARTS ARE MANDATORY');
    expect(result).toContain('write one or two short Review slides');
  });

  it('tells the model the request names the format', () => {
    expect(SYSTEM_PROMPT).toContain("For the 4A's and 5E formats, use the parts the request lists instead");
  });
});
