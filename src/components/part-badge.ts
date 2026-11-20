import { DEFAULT_LESSON_FORMAT, normalizePart, partLabel, type LessonFormat, type LessonPart, type PedagogicalPart } from '@/lib/pedagogy';

// Standard parts first; the 4A's and 5E parts reuse the palette by role so every badge keeps white-text contrast.
const PART_COLORS: Record<LessonPart, string> = {
  'Title Page': 'bg-indigo-600',
  Review: 'bg-amber-700',
  Motivation: 'bg-emerald-700',
  'Lesson Presentation': 'bg-sky-700',
  Discussion: 'bg-cyan-700',
  Activities: 'bg-purple-600',
  Assessment: 'bg-rose-600',
  Activity: 'bg-purple-600',
  Analysis: 'bg-cyan-700',
  Abstraction: 'bg-sky-700',
  Application: 'bg-teal-700',
  Engage: 'bg-emerald-700',
  Explore: 'bg-purple-600',
  Explain: 'bg-cyan-700',
  Elaborate: 'bg-teal-700',
  Evaluate: 'bg-rose-600',
};

/** Background class for a decorative part-coloured edge, using the same palette as badges. */
export function getPartAccentClass(part: PedagogicalPart): string {
  return PART_COLORS[part];
}

export function getPartBadgeInfo(part?: string, format: LessonFormat = DEFAULT_LESSON_FORMAT): { bg: string; label: string } {
  if (!part) return { bg: 'bg-slate-600', label: partLabel(part, format) };
  const canonical = normalizePart(part, format);
  return { bg: canonical ? PART_COLORS[canonical] : 'bg-sky-700', label: partLabel(part, format) };
}
