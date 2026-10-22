import { describe, expect, it } from 'vitest';
import {
  canonicalPart,
  normalizePart,
  partLabel,
  partOrdinal,
  partWantsAutoImage,
  PEDAGOGICAL_PARTS,
} from '@/lib/pedagogy';

describe('PEDAGOGICAL_PARTS', () => {
  it('lists the seven parts in lesson order', () => {
    expect(PEDAGOGICAL_PARTS).toEqual([
      'Title Page', 'Review', 'Motivation', 'Lesson Presentation', 'Discussion', 'Activities', 'Assessment',
    ]);
  });
});

describe('normalizePart', () => {
  it.each(PEDAGOGICAL_PARTS.map((part) => [part, part]))('keeps canonical %j', (raw, expected) => {
    expect(normalizePart(raw)).toBe(expected);
  });

  it.each([
    ['title page', 'Title Page'],
    ['REVIEW', 'Review'],
    ['motivation', 'Motivation'],
    ['lesson presentation', 'Lesson Presentation'],
    ['DISCUSSION', 'Discussion'],
    ['activities', 'Activities'],
    ['ASSESSMENT', 'Assessment'],
  ])('ignores case: %j is %j', (raw, expected) => {
    expect(normalizePart(raw)).toBe(expected);
  });

  it.each([
    ['Activity', 'Activities'],
    ['Assessment/Evaluation', 'Assessment'],
    ['Presentation', 'Lesson Presentation'],
    ['Presentation of Results', 'Lesson Presentation'],
    ['Group Discussion', 'Discussion'],
    ['Motivation Activity', 'Motivation'],
  ])('maps the model variant %j to %j', (raw, expected) => {
    expect(normalizePart(raw)).toBe(expected);
  });

  it.each([
    ['Review of Discussion', 'Review'],
    ['Discussion Activity', 'Discussion'],
    ['Activity Presentation', 'Lesson Presentation'],
    ['Assessment of Motivation', 'Motivation'],
    ['Title Page Review', 'Review'],
  ])('resolves %j by rule order to %j', (raw, expected) => {
    expect(normalizePart(raw)).toBe(expected);
  });

  it.each([[''], [undefined], ['Introduction'], ['Generalization'], ['Lesson Proper']])('returns null for %j', (raw) => {
    expect(normalizePart(raw)).toBeNull();
  });
});

describe('canonicalPart', () => {
  it('canonicalizes recognizable parts', () => {
    expect(canonicalPart('Activity')).toBe('Activities');
    expect(canonicalPart('lesson presentation')).toBe('Lesson Presentation');
  });

  it('passes unknown parts through unchanged', () => {
    expect(canonicalPart('Generalization')).toBe('Generalization');
    expect(canonicalPart('')).toBe('');
  });

  it('is idempotent', () => {
    for (const raw of ['Activity', 'Presentation of Results', 'Generalization', 'REVIEW']) {
      expect(canonicalPart(canonicalPart(raw))).toBe(canonicalPart(raw));
    }
  });
});

describe('partOrdinal', () => {
  it.each([
    ['Review', 1], ['Motivation', 2], ['Lesson Presentation', 3], ['Discussion', 4], ['Activities', 5], ['Assessment', 6],
    ['Title Page', null], ['Generalization', null], ['', null],
  ] as const)('numbers %j as %j', (part, ordinal) => {
    expect(partOrdinal(part)).toBe(ordinal);
  });
});

describe('partLabel', () => {
  it.each([
    ['', 'SLIDE'],
    [undefined, 'SLIDE'],
    ['Review', '1. REVIEW'],
    ['motivation', '2. MOTIVATION'],
    ['Presentation', '3. LESSON PRESENTATION'],
    ['Group Discussion', '4. DISCUSSION'],
    ['Activity', '5. ACTIVITIES'],
    ['Assessment/Evaluation', '6. ASSESSMENT'],
    ['title page', 'TITLE PAGE'],
    ['Generalization', 'GENERALIZATION'],
  ])('labels %j as %j', (raw, label) => {
    expect(partLabel(raw)).toBe(label);
  });
});

describe('partWantsAutoImage', () => {
  it.each([
    ['Title Page', false], ['Review', false], ['Motivation', true], ['Lesson Presentation', true],
    ['Discussion', true], ['Activities', false], ['Assessment', false],
    ['Presentation of Results', true], ['Review of Discussion', false], ['Generalization', false], ['', false],
  ] as const)('%j wants an auto image: %j', (part, wanted) => {
    expect(partWantsAutoImage(part)).toBe(wanted);
  });
});
