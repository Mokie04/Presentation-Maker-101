import { useState } from 'react';
import { firstSlideId, lastSlideId, nextSlideId, previousSlideId } from '@/lib/deck/slide-selection';

/**
 * Selection state for component tests that need a selection API without a deck.
 * Production selection lives in the session deck reducer and is exposed by useSlideDeck().selection.
 */
export function useTestSelection(ids: readonly number[]) {
  const [selectedId, setSelectedId] = useState<number | null>(firstSlideId(ids));
  return {
    selectedId,
    selectSlide: (id: number) => setSelectedId((current) => (ids.includes(id) ? id : current)),
    next: () => setSelectedId((current) => nextSlideId(ids, current)),
    previous: () => setSelectedId((current) => previousSlideId(ids, current)),
    first: () => setSelectedId(firstSlideId(ids)),
    last: () => setSelectedId(lastSlideId(ids)),
  };
}
