import type { KeyboardEvent } from 'react';

interface SlideNavigation {
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
}

/** One workspace listener handles both the stage and rail, leaving form keys alone. */
export function navigateSlides(event: KeyboardEvent, navigation: SlideNavigation): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  const actions: Record<string, () => void> = {
    ArrowDown: navigation.next, PageDown: navigation.next,
    ArrowUp: navigation.previous, PageUp: navigation.previous,
    Home: navigation.first, End: navigation.last,
  };
  const action = actions[event.key];
  if (!action) return;
  event.preventDefault();
  action();
}
