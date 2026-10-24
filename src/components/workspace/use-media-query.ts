'use client';

import { useEffect, useState } from 'react';

/** Match after hydration; DOM tests without matchMedia can exercise the editor. */
export function useMediaQuery(query: string, initialMatches = true): boolean {
  const [matches, setMatches] = useState(initialMatches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const update = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
