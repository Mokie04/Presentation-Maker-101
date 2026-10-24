'use client';

import React, { useId } from 'react';
import {
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import type { SlideData } from '@/types/presentation';
import { SlideImageControls } from './SlideImageControls';
import type { ImageMetadata } from '@/lib/image-metadata';
import { FormattedFormula } from './FormattedFormula';
import { getPartBadgeInfo } from './part-badge';
import { normalizePart, PEDAGOGICAL_PARTS } from '@/lib/pedagogy';

interface SlideCardProps {
  slide: SlideData;
  slideId: number;
  totalSlides: number;
  isEditing: boolean;
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
}

export function SlideCard({
  slide,
  slideId,
  totalSlides,
  isEditing,
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
}: SlideCardProps) {
  const titleId = useId();
  const badgeInfo = getPartBadgeInfo(slide.part);

  return (
    <div role="group" aria-label={`Slide ${slide.slideNumber}: ${slide.title}`} data-grid-slide-id={slideId} tabIndex={-1} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-sky-100/90 overflow-hidden flex flex-col h-full">
      {/* Slide Top Strip */}
      <div className="bg-sky-50/70 px-4 py-2.5 border-b border-sky-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeInfo.bg} text-white shadow-xs`}>
            {badgeInfo.label}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Slide {slide.slideNumber} of {totalSlides}
          </span>
        </div>

        <button
          type="button"
          aria-label="Delete Slide"
          onClick={() => onDeleteSlide(slideId)}
          className="text-slate-600 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
          title="Delete Slide"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Slide Body */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        {/* Title & Bullets */}
        <div className="space-y-4">
          {/* Title and Pedagogical Part */}
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Pedagogical Part
                </label>
                <select
                  aria-label="Pedagogical Part"
                  value={slide.part}
                  onChange={(e) => onUpdatePart?.(slideId, e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 p-2.5 bg-white border border-slate-500 rounded-lg focus:ring-2 focus:ring-sky-700 focus:border-sky-700 outline-none transition-all"
                >
                  {PEDAGOGICAL_PARTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  {/* Keep a non-canonical part selectable so the select shows what the slide has */}
                  {normalizePart(slide.part) !== slide.part && (
                    <option value={slide.part}>{slide.part}</option>
                  )}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor={titleId} className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Slide Title
                </label>
                <input
                  id={titleId}
                  type="text"
                  value={slide.title}
                  onChange={(e) => onUpdateTitle(slideId, e.target.value)}
                  className="w-full text-sm sm:text-base font-bold text-sky-950 p-2 border border-slate-500 rounded-lg focus:ring-2 focus:ring-sky-700 focus:border-sky-700 outline-none transition-all"
                />
              </div>
            </div>
          ) : (
            <h3 className="text-lg sm:text-xl font-extrabold text-sky-900 tracking-tight leading-snug">
              <FormattedFormula text={slide.title} />
            </h3>
          )}

          {/* Bullets List */}
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Bullet Content Points
                </label>
                {(slide.contentPoints || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 mt-2.5 flex-shrink-0" />
                    <textarea
                      aria-label={`Bullet ${bIdx + 1}`}
                      rows={2}
                      value={bullet}
                      onChange={(e) => onUpdateBullet(slideId, bIdx, e.target.value)}
                      className="flex-1 text-xs sm:text-sm p-2 border border-slate-500 rounded-lg focus:ring-2 focus:ring-sky-700 focus:border-sky-700 outline-none resize-y text-slate-800"
                    />
                    <button
                      type="button"
                      aria-label="Remove Bullet"
                      onClick={() => onDeleteBullet(slideId, bIdx)}
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
            ) : (
              <ul className="space-y-2">
                {(slide.contentPoints || []).map((bullet, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-700 mt-2 flex-shrink-0" />
                    <FormattedFormula text={bullet} className="flex-1" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Visual Section */}
        <SlideImageControls
          slide={slide}
          slideId={slideId}
          slideImage={slideImage}
          isGeneratingImage={isGeneratingImage}
          imageError={imageError}
          onRegenerateImage={onRegenerateImage}
          onSelectImage={onSelectImage}
        />
      </div>
    </div>
  );
}
