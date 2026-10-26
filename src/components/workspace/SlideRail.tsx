'use client';

import React, { useEffect, useId, useRef } from 'react';
import { DEFAULT_THEME, type SlideTheme } from '@/lib/themes';
import type { SlideData } from '@/types/presentation';
import { getSlideOverflow } from '@/lib/slide-fit';
import { SlideThumbnail } from './SlideThumbnail';
import { moveSlideWithKeyboard, useSlideReorder } from './use-slide-reorder';

export interface SlideRailProps {
  slides: readonly SlideData[];
  theme?: SlideTheme;
  slideIds: readonly number[];
  selectedId: number | null;
  onSelect: (slideId: number) => void;
  onMove?: (slideId: number, toIndex: number) => void;
  total: number;
  slideImages?: Record<number, string>;
  originalWriters?: string;
}

export function SlideRail({ slides, slideIds, selectedId, onSelect, onMove, total, slideImages, originalWriters, theme = DEFAULT_THEME }: SlideRailProps) {
  const prefix = useId();
  const rail = useRef<HTMLDivElement>(null);
  const optionId = (id: number) => `${prefix}-slide-${id}`;
  const reorder = useSlideReorder(onMove);
  const selectedIndex = selectedId === null ? -1 : slideIds.indexOf(selectedId);

  useEffect(() => {
    const page = document.scrollingElement;
    const top = page?.scrollTop;
    const left = page?.scrollLeft;
    rail.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    // scrollIntoView also scrolls outer ancestors; selection should move only the rail.
    if (page && top !== undefined && left !== undefined) {
      page.scrollTop = top;
      page.scrollLeft = left;
    }
  }, [selectedId, selectedIndex, slides.length]);

  return (
    <div ref={rail} role="listbox" aria-label="Slides" tabIndex={0}
      aria-activedescendant={selectedId === null ? undefined : optionId(selectedId)}
      onKeyDown={event => moveSlideWithKeyboard(event, slideIds, selectedId, onMove)}
      className="flex min-h-0 min-w-0 gap-2 overflow-x-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-700 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
      {slides.map((slide, index) => {
        const overflow = getSlideOverflow(slide, index, originalWriters, theme).any;
        return (
          <button key={slideIds[index]} type="button" role="option" id={optionId(slideIds[index])}
            {...reorder.itemProps(slideIds[index], index)}
            aria-selected={slideIds[index] === selectedId} aria-label={`Slide ${index + 1}: ${slide.title}${overflow ? ' (text does not fit)' : ''}`} tabIndex={-1}
            onClick={event => {
              onSelect(slideIds[index]);
              event.currentTarget.closest<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });
            }}
            className={`grid w-44 shrink-0 grid-cols-[18px_minmax(0,1fr)] items-start gap-1.5 rounded-lg border-2 p-1 text-left transition-colors motion-reduce:transition-none md:w-full ${
              reorder.dropTargetId === slideIds[index] ? 'border-dashed border-sky-700 bg-sky-50' :
                slideIds[index] === selectedId ? 'border-sky-700 bg-sky-50' : 'border-transparent hover:border-sky-200 hover:bg-slate-50'
            }`}>
            <span className="pt-0.5 text-right text-[11px] font-semibold tabular-nums text-slate-600">{index + 1}{overflow && <span aria-hidden="true" className="block font-bold text-amber-700">!</span>}</span>
            <div className="min-w-0 overflow-hidden rounded border border-slate-200">
              <SlideThumbnail theme={theme} slide={slide} index={index} total={total} image={slideImages?.[index]} originalWriters={originalWriters} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
