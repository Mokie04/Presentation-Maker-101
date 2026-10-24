'use client';

import React from 'react';
import type { SlideData } from '@/types/presentation';
import { partLabel } from '@/lib/pedagogy';
import { SlideThumbnail } from './SlideThumbnail';
import { SlideMoveButtons } from './SlideMoveButtons';
import { useSlideReorder } from './use-slide-reorder';

export interface SlideSorterProps {
  slides: readonly SlideData[];
  slideIds: readonly number[];
  selectedId: number | null;
  onSelect: (slideId: number) => void;
  onOpen: (slideId: number) => void;
  onMove: (slideId: number, toIndex: number) => void;
  onDuplicate: (slideId: number) => void;
  onDelete: (slideId: number) => void;
  slideImages?: Record<number, string>;
  originalWriters?: string;
}

export function SlideSorter({ slides, slideIds, selectedId, onSelect, onOpen, onMove, onDuplicate, onDelete, slideImages, originalWriters }: SlideSorterProps) {
  const reorder = useSlideReorder(onMove);
  return (
    <section aria-label="Slide sorter" className="min-w-0 space-y-3">
      <ul aria-label="Slides in sorter" className="grid min-w-0 gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
        {slides.map((slide, index) => {
          const id = slideIds[index];
          return <li key={id} {...reorder.itemProps(id, index)} tabIndex={0}
            aria-label={`Slide ${index + 1}: ${slide.title}`} aria-current={selectedId === id ? 'true' : undefined}
            onClick={() => onSelect(id)} onDoubleClick={() => onOpen(id)}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && event.key === 'Enter') {
                event.preventDefault(); onOpen(id);
              }
            }}
            className={`min-w-0 cursor-grab space-y-2 rounded-xl border-2 p-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-700 ${
              reorder.dropTargetId === id ? 'border-dashed border-cyan-700 bg-cyan-50'
                : selectedId === id ? 'border-sky-700 bg-sky-50' : 'border-slate-200 bg-white'
            }`}>
            <div className="overflow-hidden rounded border border-slate-200">
              <SlideThumbnail slide={slide} index={index} total={slides.length} image={slideImages?.[index]} originalWriters={originalWriters} />
            </div>
            <div className="flex min-w-0 items-start gap-2 text-xs text-slate-600">
              <span className="font-bold tabular-nums text-sky-800">{index + 1}</span>
              <span className="min-w-0 break-words">{partLabel(slide.part)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
              <button type="button" aria-label={`Duplicate slide ${index + 1}`} onClick={() => onDuplicate(id)}
                className="min-h-11 rounded-lg border border-sky-200 bg-white px-2 py-2 text-xs font-semibold text-sky-700">Duplicate</button>
              <button type="button" aria-label={`Delete slide ${index + 1}`} disabled={slides.length === 1} onClick={() => onDelete(id)}
                className="min-h-11 rounded-lg px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">Delete</button>
              <SlideMoveButtons slideId={id} index={index} total={slides.length} onMove={onMove} />
            </div>
          </li>;
        })}
      </ul>
      <p className="text-xs text-slate-500">The first slide uses the title layout in the exported file.</p>
    </section>
  );
}
