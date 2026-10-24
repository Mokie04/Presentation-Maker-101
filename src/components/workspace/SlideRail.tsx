'use client';

import React, { memo, useEffect, useId, useRef } from 'react';
import type { SlideData } from '@/types/presentation';
import { SlideView } from '@/components/SlideView';

export interface SlideRailProps {
  slides: readonly SlideData[];
  slideIds: readonly number[];
  selectedId: number | null;
  onSelect: (slideId: number) => void;
  total: number;
  slideImages?: Record<number, string>;
  originalWriters?: string;
}

interface ThumbnailProps {
  slide: SlideData;
  slideId: number;
  index: number;
  total: number;
  selected: boolean;
  optionId: string;
  image?: string;
  originalWriters?: string;
  onSelect: (slideId: number) => void;
}

const SlideThumbnail = memo(function SlideThumbnail({
  slide, slideId, index, total, selected, optionId, image, originalWriters, onSelect,
}: ThumbnailProps) {
  return (
    <button type="button" role="option" id={optionId} aria-selected={selected}
      aria-label={`Slide ${index + 1}: ${slide.title}`} tabIndex={-1}
      onClick={(event) => {
        onSelect(slideId);
        event.currentTarget.closest<HTMLElement>('[role="listbox"]')?.focus({ preventScroll: true });
      }}
      className={`grid w-44 shrink-0 grid-cols-[18px_minmax(0,1fr)] items-start gap-1.5 rounded-lg border-2 p-1 text-left transition-colors motion-reduce:transition-none md:w-full ${
        selected ? 'border-sky-500 bg-sky-50' : 'border-transparent hover:border-sky-200 hover:bg-slate-50'
      }`}>
      <span className="pt-0.5 text-right text-[11px] font-semibold tabular-nums text-slate-500">{index + 1}</span>
      <div className="min-w-0 overflow-hidden rounded border border-slate-200">
        <SlideView slide={slide} index={index} total={total} image={image} originalWriters={originalWriters} variant="thumbnail" />
      </div>
    </button>
  );
}, (previous, next) => {
  // The deck selector may wrap unchanged content in a fresh object when credit exists.
  const a = previous.slide;
  const b = next.slide;
  return a.title === b.title && a.part === b.part && a.slideNumber === b.slideNumber &&
    a.contentPoints === b.contentPoints && a.visualDescription === b.visualDescription && a.imageMetadata === b.imageMetadata &&
    previous.slideId === next.slideId && previous.index === next.index && previous.total === next.total &&
    previous.selected === next.selected && previous.optionId === next.optionId && previous.image === next.image &&
    previous.originalWriters === next.originalWriters && previous.onSelect === next.onSelect;
});

export function SlideRail({ slides, slideIds, selectedId, onSelect, total, slideImages, originalWriters }: SlideRailProps) {
  const prefix = useId();
  const rail = useRef<HTMLDivElement>(null);
  const optionId = (id: number) => `${prefix}-slide-${id}`;

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
  }, [selectedId, slides.length]);

  return (
    <div ref={rail} role="listbox" aria-label="Slides" tabIndex={0}
      aria-activedescendant={selectedId === null ? undefined : optionId(selectedId)}
      className="flex min-h-0 min-w-0 gap-2 overflow-x-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 md:flex-col md:overflow-x-hidden md:overflow-y-auto">
      {slides.map((slide, index) => (
        <SlideThumbnail key={slideIds[index]} slide={slide} slideId={slideIds[index]} index={index} total={total}
          selected={slideIds[index] === selectedId} optionId={optionId(slideIds[index])}
          image={slideImages?.[index]} originalWriters={originalWriters} onSelect={onSelect} />
      ))}
    </div>
  );
}
