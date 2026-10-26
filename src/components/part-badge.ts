import { normalizePart, partLabel, type PedagogicalPart } from '@/lib/pedagogy';

const PART_COLORS: Record<PedagogicalPart, string> = {
  'Title Page': 'bg-indigo-600',
  Review: 'bg-amber-700',
  Motivation: 'bg-emerald-700',
  'Lesson Presentation': 'bg-sky-700',
  Discussion: 'bg-cyan-700',
  Activities: 'bg-purple-600',
  Assessment: 'bg-rose-600',
};

/** Background class for a decorative part-coloured edge, using the same palette as badges. */
export function getPartAccentClass(part: PedagogicalPart): string {
  return PART_COLORS[part];
}

export function getPartBadgeInfo(part?: string): { bg: string; label: string } {
  if (!part) return { bg: 'bg-slate-600', label: partLabel(part) };
  const canonical = normalizePart(part);
  return { bg: canonical ? PART_COLORS[canonical] : 'bg-sky-700', label: partLabel(part) };
}
