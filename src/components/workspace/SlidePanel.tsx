'use client';

import React, { useEffect, useId, useRef } from 'react';
import { fitSlide } from '@/lib/slide-fit';
import { SlideFitNotice } from './SlideFitNotice';
import { Trash2, Plus, X } from 'lucide-react';
import { normalizePart, PEDAGOGICAL_PARTS } from '@/lib/pedagogy';
import { SlideImageControls } from '../SlideImageControls';
import { SlideMoveButtons } from './SlideMoveButtons';
import { useMediaQuery } from './use-media-query';
import type { SlideData } from '@/types/presentation';
import type { ImageMetadata } from '@/lib/image-metadata';

export interface SlidePanelProps {
  slide: SlideData;
  slideId: number;
  slideImage?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
  onUpdatePart?: (slideId: number, part: string) => void;
  onUpdateTitle: (slideId: number, title: string) => void;
  onUpdateBullet: (slideId: number, bulletIndex: number, text: string) => void;
  onAddBullet: (slideId: number) => void;
  onDeleteBullet: (slideId: number, bulletIndex: number) => void;
  onDeleteSlide: (slideId: number) => void;
  onRegenerateImage: (slideId: number, visualDescription: string) => void;
  onSelectImage?: (slideId: number, base64: string, metadata: ImageMetadata) => void;
  onAddSlide: () => void;
  slideIndex?: number;
  originalWriters?: string;
  totalSlides?: number;
  onMoveSlide?: (slideId: number, toIndex: number) => void;
  onDuplicateSlide?: (slideId: number) => void;
}
export function SlidePanel({
  slide,
  slideId,
  slideImage,
  isGeneratingImage = false,
  imageError,
  onUpdatePart,
  onUpdateTitle,
  onUpdateBullet,
  onAddBullet,
  onDeleteBullet,
  onDeleteSlide,
  onRegenerateImage,
  onSelectImage,
  onAddSlide,
  slideIndex,
  originalWriters,
  totalSlides,
  onMoveSlide,
  onDuplicateSlide,
}: SlidePanelProps) {
  const fit = fitSlide(slide, slideIndex ?? 0, originalWriters);
  const titleId = useId();
  const bulletsId = useId();
  const pointerDelete = useRef<{ slideId: number; index: number; points: string[] } | null>(null);
  const wide = useMediaQuery('(min-width: 768px)');
  const detailsSection = useRef<HTMLDetailsElement>(null);
  const imageSection = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    // Native disclosures retain the teacher's choice until the breakpoint changes.
    if (detailsSection.current) detailsSection.current.open = true;
    if (imageSection.current) imageSection.current.open = wide;
  }, [wide]);

  return (
    <aside aria-label="Slide settings" className="min-w-0 min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-sky-100 bg-white p-3 space-y-4">
      {(!fit.title.fits || !fit.body.fits) && <SlideFitNotice />}
      <details ref={detailsSection} open>
        <summary className="cursor-pointer rounded text-sm font-bold text-slate-700">Slide details</summary>
        <div className="space-y-4 pt-3">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
          Pedagogical Part
        </label>
        <select
          aria-label="Pedagogical Part"
          value={slide.part}
          onChange={(e) => onUpdatePart?.(slideId, e.target.value)}
          className="w-full text-xs font-bold text-slate-800 p-2.5 bg-white border border-slate-500 rounded-lg focus:ring-2 focus:ring-sky-700 focus:border-sky-700 outline-none transition-all"
        >
          {PEDAGOGICAL_PARTS.map((part) => <option key={part} value={part}>{part}</option>)}
          {normalizePart(slide.part) !== slide.part && <option value={slide.part}>{slide.part}</option>}
        </select>
      </div>

      <div>
        <label htmlFor={titleId} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
          Slide Title
        </label>
        <input
          id={titleId}
          type="text"
          value={slide.title}
          onChange={(e) => onUpdateTitle(slideId, e.target.value)}
          className="w-full min-w-0 text-sm font-bold text-sky-950 p-2 border border-slate-500 rounded-lg focus:ring-2 focus:ring-sky-700 focus:border-sky-700 outline-none transition-all"
        />
      </div>

      <div role="group" aria-labelledby={bulletsId} className="space-y-2">
        <span id={bulletsId} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Bullet Content Points
        </span>
        {(slide.contentPoints || []).map((bullet, bulletIndex) => (
          <div key={bulletIndex} className="flex items-start gap-2">
            <textarea
              aria-label={`Bullet ${bulletIndex + 1}`}
              rows={2}
              value={bullet}
              onChange={(e) => onUpdateBullet(slideId, bulletIndex, e.target.value)}
              className="flex-1 min-w-0 text-xs p-2 border border-slate-500 rounded-lg focus:ring-2 focus:ring-sky-700 focus:border-sky-700 outline-none resize-y text-slate-800"
            />
            <button
              type="button"
              aria-label="Remove Bullet"
              onMouseDown={() => { pointerDelete.current = { slideId, index: bulletIndex, points: slide.contentPoints }; }}
              onClick={(event) => {
                const pending = event.detail > 0 ? pointerDelete.current : null;
                pointerDelete.current = null;
                let index = bulletIndex;
                // Inline empty-blur can remove a point between mousedown and click.
                if (pending?.slideId === slideId && pending.points.length === slide.contentPoints.length + 1) {
                  const withoutTarget = pending.points.filter((_, i) => i !== pending.index);
                  if (withoutTarget.every((point, i) => point === slide.contentPoints[i])) return;
                  const removed = pending.points.findIndex((point, i) => point !== slide.contentPoints[i]);
                  index = pending.index - Number(removed < pending.index);
                }
                onDeleteBullet(slideId, index);
              }}
              className="text-slate-600 hover:text-rose-600 p-1.5 mt-1 rounded hover:bg-rose-50 transition-colors"
              title="Remove Bullet"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onAddBullet(slideId)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100/80 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Bullet Point</span>
        </button>
      </div>

        </div>
      </details>
      <details ref={imageSection} open>
        <summary className="cursor-pointer rounded text-sm font-bold text-slate-700">Image</summary>
        <SlideImageControls
        key={slideId}
        slide={slide}
        slideId={slideId}
        slideImage={slideImage}
        isGeneratingImage={isGeneratingImage}
        imageError={imageError}
        onRegenerateImage={onRegenerateImage}
        onSelectImage={onSelectImage}
      />
      </details>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {onMoveSlide && slideIndex !== undefined && totalSlides !== undefined && (
          <SlideMoveButtons slideId={slideId} index={slideIndex} total={totalSlides} onMove={onMoveSlide} />
        )}
        <button
          type="button"
          aria-label="Delete Slide"
          title="Delete Slide"
          onClick={() => onDeleteSlide(slideId)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Slide
        </button>
        {onDuplicateSlide && <button type="button" onClick={() => onDuplicateSlide(slideId)}
          className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50">
          Duplicate slide
        </button>}
        <button
          type="button"
          onClick={() => onAddSlide()}
          className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
        >
          + Add Slide
        </button>
      </div>
    </aside>
  );
}
