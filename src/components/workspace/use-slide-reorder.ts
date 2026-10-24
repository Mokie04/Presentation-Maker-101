'use client';

import { useRef, useState, type HTMLAttributes, type KeyboardEvent } from 'react';

export function useSlideReorder(onMove?: (slideId: number, toIndex: number) => void) {
  const dragged = useRef<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const clear = () => {
    dragged.current = null;
    setDraggedId(null);
    setDropTargetId(null);
  };

  return {
    draggedId,
    dropTargetId,
    itemProps: (slideId: number, index: number): HTMLAttributes<HTMLElement> & { draggable: boolean } => ({
      draggable: Boolean(onMove),
      onDragStart: event => {
        if (!onMove) return;
        dragged.current = slideId;
        setDraggedId(slideId);
        setDropTargetId(null);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('application/x-sayuna-slide', String(slideId));
        }
      },
      onDragOver: event => {
        // Transfer data alone cannot claim ownership of a drag from another deck.
        if (!onMove || dragged.current === null) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        setDropTargetId(dragged.current === slideId ? null : slideId);
      },
      onDragLeave: event => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setDropTargetId(current => current === slideId ? null : current);
      },
      onDrop: event => {
        const id = dragged.current;
        if (id === null) return;
        event.preventDefault();
        clear();
        if (id !== slideId) onMove?.(id, index);
      },
      onDragEnd: clear,
    }),
  };
}

/** Alt arrows reorder the selected slide; plain arrows belong to workspace navigation. */
export function moveSlideWithKeyboard(
  event: KeyboardEvent,
  slideIds: readonly number[],
  selectedId: number | null,
  onMove?: (slideId: number, toIndex: number) => void,
): void {
  if (!onMove || event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey ||
    (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || selectedId === null) return;
  const index = slideIds.indexOf(selectedId);
  if (index === -1) return;
  event.preventDefault();
  const target = Math.max(0, Math.min(slideIds.length - 1, index + (event.key === 'ArrowUp' ? -1 : 1)));
  if (target !== index) onMove(selectedId, target);
}
