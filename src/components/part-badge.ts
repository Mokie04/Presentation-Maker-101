import { normalizePart, partLabel, type PedagogicalPart } from '@/lib/pedagogy';

const PART_COLORS: Record<PedagogicalPart, string> = {
  'Title Page': 'bg-indigo-600',
  Review: 'bg-amber-600',
  Motivation: 'bg-emerald-600',
  'Lesson Presentation': 'bg-sky-600',
  Discussion: 'bg-cyan-700',
  Activities: 'bg-purple-600',
  Assessment: 'bg-rose-600',
};

export function getPartBadgeInfo(part?: string): { bg: string; label: string } {
  if (!part) return { bg: 'bg-slate-600', label: partLabel(part) };
  const canonical = normalizePart(part);
  return { bg: canonical ? PART_COLORS[canonical] : 'bg-sky-600', label: partLabel(part) };
}
