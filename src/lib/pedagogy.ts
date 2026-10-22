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

// Checked in order; the first keyword found wins, so "Review of Discussion" is Review.
const PART_RULES: [keyword: string, part: PedagogicalPart][] = [
  ['review', 'Review'],
  ['motivation', 'Motivation'],
  ['presentation', 'Lesson Presentation'],
  ['discussion', 'Discussion'],
  ['activit', 'Activities'],
  ['assess', 'Assessment'],
  ['title', 'Title Page'],
];

/** Parts that get an image in the automatic batch. */
const AUTO_IMAGE_PARTS: ReadonlySet<PedagogicalPart> = new Set<PedagogicalPart>(['Motivation', 'Lesson Presentation', 'Discussion']);

/** Maps model and teacher wording ("Activity", "lesson presentation") to a canonical part; null when unrecognized. */
export function normalizePart(raw?: string): PedagogicalPart | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return PART_RULES.find(([keyword]) => lower.includes(keyword))?.[1] ?? null;
}

/** The canonical name when recognizable; unknown parts are kept as written. */
export function canonicalPart(raw: string): string {
  return normalizePart(raw) ?? raw;
}

/** 1 (Review) to 6 (Assessment) for the lesson parts; null for Title Page and unknown parts. */
export function partOrdinal(raw?: string): number | null {
  const part = normalizePart(raw);
  return part && part !== 'Title Page' ? PEDAGOGICAL_PARTS.indexOf(part) : null;
}

/** Badge text: "3. LESSON PRESENTATION", "TITLE PAGE", the raw text for unknown parts, "SLIDE" when empty. */
export function partLabel(raw?: string): string {
  if (!raw) return 'SLIDE';
  const part = normalizePart(raw);
  if (!part) return raw.toUpperCase();
  const ordinal = partOrdinal(part);
  return ordinal === null ? part.toUpperCase() : `${ordinal}. ${part.toUpperCase()}`;
}

export function partWantsAutoImage(raw: string): boolean {
  const part = normalizePart(raw);
  return part !== null && AUTO_IMAGE_PARTS.has(part);
}
