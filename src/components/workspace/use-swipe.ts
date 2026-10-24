'use client';

import { useRef, type HTMLAttributes } from 'react';

interface UseSwipeOptions {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

function isEditing(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])'));
}

/** Touch navigation shared by the stage and full-screen slideshow. */
export function useSwipe({ onNext, onPrevious, disabled = false }: UseSwipeOptions): Pick<HTMLAttributes<HTMLElement>, 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel'> {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart(event) {
      start.current = null;
      if (disabled || event.touches.length !== 1 || isEditing(document.activeElement) || isEditing(event.target)) return;
      if (event.target instanceof Element && event.target.closest('[aria-label="Slide settings"]')) return;
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY ?? 0 };
    },
    onTouchEnd(event) {
      const origin = start.current;
      start.current = null;
      if (!origin || disabled || isEditing(document.activeElement) || event.changedTouches.length !== 1 || event.touches.length > 0) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - origin.x;
      const deltaY = (touch.clientY ?? 0) - origin.y;
      if (Math.abs(deltaX) <= 60 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (deltaX < 0) onNext();
      else onPrevious();
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
