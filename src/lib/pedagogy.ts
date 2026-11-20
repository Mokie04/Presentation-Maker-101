import { HEADING_START } from '@/lib/utils/session-options';

/** Lesson parts in teaching order; every slide's `part` is meant to be one of these. */
export const PEDAGOGICAL_PARTS = [
  'Title Page',
  'Review',
  'Motivation',
  'Lesson Presentation',
  'Discussion',
  'Activities',
  'Assessment',
] as const;

export type PedagogicalPart = typeof PEDAGOGICAL_PARTS[number];

const FOUR_AS_PARTS = ['Title Page', 'Review', 'Motivation', 'Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment'] as const;
const FIVE_E_PARTS = ['Title Page', 'Review', 'Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate'] as const;

/** A part name in any lesson format. */
export type LessonPart = PedagogicalPart | typeof FOUR_AS_PARTS[number] | typeof FIVE_E_PARTS[number];

/** The lesson structures a deck can follow; Standard is the six-part Daily Lesson Log flow above. */
export const LESSON_FORMATS = ['Standard', "4A's", '5E'] as const;
export type LessonFormat = typeof LESSON_FORMATS[number];
export const DEFAULT_LESSON_FORMAT: LessonFormat = 'Standard';

export function isLessonFormat(value: unknown): value is LessonFormat {
  return LESSON_FORMATS.some(format => format === value);
}

interface LessonFormatSpec {
  /** Every part in teaching order, Title Page first. */
  parts: readonly LessonPart[];
  /** Parts that get a number on their badge, in order: 1, 2, 3... */
  numbered: readonly LessonPart[];
  /** Parts the deck has only when the lesson plan has them. */
  optional: readonly LessonPart[];
  /** Checked in order; the first keyword found in the lowercased part wins. */
  rules: readonly (readonly [keyword: string, part: LessonPart])[];
}

const FORMATS: Record<LessonFormat, LessonFormatSpec> = {
  Standard: {
    parts: PEDAGOGICAL_PARTS,
    numbered: PEDAGOGICAL_PARTS.slice(1),
    optional: [],
    // "Review of Discussion" is Review.
    rules: [
      ['review', 'Review'],
      ['motivation', 'Motivation'],
      ['presentation', 'Lesson Presentation'],
      ['discussion', 'Discussion'],
      ['activit', 'Activities'],
      ['assess', 'Assessment'],
      ['title', 'Title Page'],
    ],
  },
  "4A's": {
    parts: FOUR_AS_PARTS,
    numbered: ['Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment'],
    optional: ['Review', 'Motivation'],
    // The three other A's come before 'activit', so "Application Activity" is Application.
    rules: [
      ['review', 'Review'],
      ['motivation', 'Motivation'],
      ['analys', 'Analysis'],
      ['abstract', 'Abstraction'],
      ['applica', 'Application'],
      ['activit', 'Activity'],
      ['assess', 'Assessment'],
      ['title', 'Title Page'],
    ],
  },
  '5E': {
    parts: FIVE_E_PARTS,
    numbered: ['Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate'],
    optional: ['Review'],
    rules: [
      ['review', 'Review'],
      ['engag', 'Engage'],
      ['motivation', 'Engage'],
      ['explor', 'Explore'],
      ['expla', 'Explain'],
      ['elabor', 'Elaborate'],
      ['evalu', 'Evaluate'],
      ['assess', 'Evaluate'],
      ['title', 'Title Page'],
    ],
  },
};

/** Parts that get an image in the automatic batch, in any format. */
const AUTO_IMAGE_PARTS: ReadonlySet<LessonPart> = new Set<LessonPart>([
  'Motivation', 'Lesson Presentation', 'Discussion',
  'Activity', 'Abstraction',
  'Engage', 'Explore', 'Explain',
]);

/** Every part of a format in teaching order, Title Page first. */
export function lessonFormatParts(format: LessonFormat = DEFAULT_LESSON_FORMAT): readonly LessonPart[] {
  return FORMATS[format].parts;
}

/** The numbered parts of a format, in order. */
export function numberedParts(format: LessonFormat = DEFAULT_LESSON_FORMAT): readonly LessonPart[] {
  return FORMATS[format].numbered;
}

/** Parts a format includes only when the lesson plan has them. */
export function optionalParts(format: LessonFormat = DEFAULT_LESSON_FORMAT): readonly LessonPart[] {
  return FORMATS[format].optional;
}

/** Maps model and teacher wording ("Activity", "lesson presentation") to a part of the format; null when unrecognized. */
export function normalizePart(raw?: string, format: LessonFormat = DEFAULT_LESSON_FORMAT): LessonPart | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return FORMATS[format].rules.find(([keyword]) => lower.includes(keyword))?.[1] ?? null;
}

/** The format's name for the part when recognizable; unknown parts are kept as written. */
export function canonicalPart(raw: string, format: LessonFormat = DEFAULT_LESSON_FORMAT): string {
  return normalizePart(raw, format) ?? raw;
}

/** The part's number in its format (Standard: 1 Review to 6 Assessment); null for unnumbered and unknown parts. */
export function partOrdinal(raw?: string, format: LessonFormat = DEFAULT_LESSON_FORMAT): number | null {
  const part = normalizePart(raw, format);
  const index = part ? FORMATS[format].numbered.indexOf(part) : -1;
  return index === -1 ? null : index + 1;
}

/** Badge text: "3. LESSON PRESENTATION", "TITLE PAGE", the raw text for unknown parts, "SLIDE" when empty. */
export function partLabel(raw?: string, format: LessonFormat = DEFAULT_LESSON_FORMAT): string {
  if (!raw) return 'SLIDE';
  const part = normalizePart(raw, format);
  if (!part) return raw.toUpperCase();
  const ordinal = partOrdinal(part, format);
  return ordinal === null ? part.toUpperCase() : `${ordinal}. ${part.toUpperCase()}`;
}

export function partWantsAutoImage(raw: string, format: LessonFormat = DEFAULT_LESSON_FORMAT): boolean {
  const part = normalizePart(raw, format);
  return part !== null && AUTO_IMAGE_PARTS.has(part);
}

const PHASE_WORDS: Record<Exclude<LessonFormat, 'Standard'>, readonly string[]> = {
  "4A's": ['activity', 'analysis', 'abstraction', 'application'],
  '5E': ['engage', 'explore', 'explain', 'elaborate', 'evaluate'],
};
// Each phase as a heading (start of a line or table cell) and as a word anywhere in the plan.
const PHASES_AS_HEADINGS = phasePatterns(word => new RegExp(`${HEADING_START}${word}\\b`, 'im'));
const PHASES_ANYWHERE = phasePatterns(word => new RegExp(`\\b${word}\\b`, 'i'));
// "4As", "4A's", "4 A’s", "5E", "5Es", "5 E's"; a space only with the apostrophe, so "item 4 As shown" is not a match.
const FOUR_AS_NAME = /\b4(?: ?A['’]s|As)\b/;
const FIVE_E_NAME = /\b5(?: ?E['’]s|Es?)\b/;

function phasePatterns(toPattern: (word: string) => RegExp) {
  return (Object.keys(PHASE_WORDS) as (keyof typeof PHASE_WORDS)[])
    .map(format => ({ format, patterns: PHASE_WORDS[format].map(toPattern) }));
}

/**
 * The format a lesson plan follows. Strongest evidence first: every phase of exactly one format as a heading,
 * then every phase of exactly one format anywhere in the plan, then the approach's name ("4As Approach", "5Es")
 * to settle a tie or a plan without phase names; Standard otherwise. Teachers do not choose it.
 */
export function detectLessonFormat(text: string): LessonFormat {
  for (const candidates of [PHASES_AS_HEADINGS, PHASES_ANYWHERE]) {
    const complete = candidates.filter(({ patterns }) => patterns.every(pattern => pattern.test(text)));
    if (complete.length === 1) return complete[0].format;
    if (complete.length > 1) break;
  }
  if (FOUR_AS_NAME.test(text)) return "4A's";
  if (FIVE_E_NAME.test(text)) return '5E';
  return 'Standard';
}
