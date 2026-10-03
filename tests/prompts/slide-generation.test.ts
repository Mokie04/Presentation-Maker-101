import { describe, it, expect } from 'vitest';
import {
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
  IMAGE_PROMPT_PREFIX,
} from '@/lib/prompts/slide-generation';

describe('slide-generation prompts', () => {
  it('SYSTEM_PROMPT includes instructional requirements and 6 pedagogical parts', () => {
    expect(SYSTEM_PROMPT).toContain('expert primary school instructional designer');
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
