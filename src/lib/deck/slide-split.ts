/** Increment a trailing continuation suffix without inventing a missing title. */
export function continuationTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '';
  const suffix = /\s*\(cont\.(?:\s+(\d+))?\)$/.exec(trimmed);
  if (!suffix) return `${trimmed} (cont.)`;
  const base = trimmed.slice(0, suffix.index).trimEnd();
  const next = Number(suffix[1] ?? 1) + 1;
  return `${base ? `${base} ` : ''}(cont. ${next})`;
}
