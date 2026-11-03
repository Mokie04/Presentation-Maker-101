export interface SplitSelection {
  slideId: number;
  insertedId: number;
}

export function reconcileSelection(previousIds: readonly number[], nextIds: readonly number[], selectedId: number | null, splitSelection?: SplitSelection): number | null {
  if (nextIds.length === 0) return null;

  const previous = new Set(previousIds);
  // Deck loads allocate fresh ids, including when a reload has only one slide.
  if (!nextIds.some((id) => previous.has(id))) return firstSlideId(nextIds);

  const addedIds = nextIds.filter((id) => !previous.has(id));
  if (addedIds.length === 1) {
    if (splitSelection?.insertedId === addedIds[0] && nextIds.includes(splitSelection.slideId)) return splitSelection.slideId;
    return addedIds[0];
  }
  if (selectedId !== null && nextIds.includes(selectedId)) return selectedId;

  const previousIndex = selectedId === null ? 0 : previousIds.indexOf(selectedId);
  return nextIds[Math.min(Math.max(previousIndex, 0), nextIds.length - 1)];
}

export function firstSlideId(ids: readonly number[]): number | null {
  return ids[0] ?? null;
}

export function lastSlideId(ids: readonly number[]): number | null {
  return ids[ids.length - 1] ?? null;
}

export function nextSlideId(ids: readonly number[], selectedId: number | null): number | null {
  const index = selectedId === null ? -1 : ids.indexOf(selectedId);
  return ids[Math.min(index + 1, ids.length - 1)] ?? null;
}

export function previousSlideId(ids: readonly number[], selectedId: number | null): number | null {
  const index = selectedId === null ? -1 : ids.indexOf(selectedId);
  return ids[Math.max(index - 1, 0)] ?? null;
}
