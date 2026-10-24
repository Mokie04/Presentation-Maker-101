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

export function getPartBadgeInfo(part?: string): { bg: string; label: string } {
  if (!part) return { bg: 'bg-slate-600', label: partLabel(part) };
  const canonical = normalizePart(part);
  return { bg: canonical ? PART_COLORS[canonical] : 'bg-sky-700', label: partLabel(part) };
}
