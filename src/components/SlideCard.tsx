'use client';

import React from 'react';
import {
  Trash2,
  Plus,
  X,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import type { SlideData } from '@/types/presentation';
import { FormattedFormula } from './FormattedFormula';

export const PEDAGOGICAL_PARTS = [
  'Title Page',
  'Review',
  'Motivation',
  'Lesson Presentation',
  'Discussion',
  'Activities',
  'Assessment',
] as const;

export function getPartBadgeInfo(part?: string): { bg: string; label: string } {
  if (!part) return { bg: 'bg-slate-600', label: 'SLIDE' };
  const p = part.toLowerCase();
  if (p.includes('review')) return { bg: 'bg-amber-600', label: '1. REVIEW' };
  if (p.includes('motivation')) return { bg: 'bg-emerald-600', label: '2. MOTIVATION' };
  if (p.includes('lesson presentation') || p === 'presentation') return { bg: 'bg-sky-600', label: '3. LESSON PRESENTATION' };
  if (p.includes('discussion')) return { bg: 'bg-cyan-700', label: '4. DISCUSSION' };
  if (p.includes('activit')) return { bg: 'bg-purple-600', label: '5. ACTIVITIES' };
  if (p.includes('assess')) return { bg: 'bg-rose-600', label: '6. ASSESSMENT' };
  if (p.includes('title')) return { bg: 'bg-indigo-600', label: 'TITLE PAGE' };
  return { bg: 'bg-sky-600', label: part.toUpperCase() };
}

interface SlideCardProps {
  slide: SlideData;
  index: number;
  totalSlides: number;
  isEditing: boolean;
  slideImage?: string;
  isGeneratingImage?: boolean;
  onUpdatePart?: (index: number, part: string) => void;
  onUpdateTitle: (index: number, title: string) => void;
  onUpdateBullet: (slideIndex: number, bulletIndex: number, text: string) => void;
  onAddBullet: (slideIndex: number) => void;
  onDeleteBullet: (slideIndex: number, bulletIndex: number) => void;
  onDeleteSlide: (index: number) => void;
  onRegenerateImage: (index: number, visualDescription: string) => void;
}

export function SlideCard({
  slide,
  index,
  totalSlides,
  isEditing,
  slideImage,
  isGeneratingImage = false,
  onUpdatePart,
  onUpdateTitle,
  onUpdateBullet,
  onAddBullet,
  onDeleteBullet,
  onDeleteSlide,
  onRegenerateImage,
}: SlideCardProps) {
  const hasValidImage = Boolean(slideImage && slideImage !== 'failed');
  const imageSrc = hasValidImage
    ? slideImage?.startsWith('data:')
      ? slideImage
      : `data:image/png;base64,${slideImage}`
    : undefined;

  const badgeInfo = getPartBadgeInfo(slide.part);

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-sky-100/90 overflow-hidden flex flex-col h-full">
      {/* Slide Top Strip */}
      <div className="bg-sky-50/70 px-4 py-2.5 border-b border-sky-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeInfo.bg} text-white shadow-xs`}>
            {badgeInfo.label}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Slide {slide.slideNumber || index + 1} of {totalSlides}
          </span>
        </div>

        <button
          type="button"
          aria-label="Delete Slide"
          onClick={() => onDeleteSlide(index)}
          className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Pedagogical Part
                </label>
                <select
                  aria-label="Pedagogical Part"
                  value={slide.part}
                  onChange={(e) => onUpdatePart?.(index, e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                >
                  {PEDAGOGICAL_PARTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  {!PEDAGOGICAL_PARTS.includes(slide.part as (typeof PEDAGOGICAL_PARTS)[number]) && (
                    <option value={slide.part}>{slide.part}</option>
                  )}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Slide Title
                </label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => onUpdateTitle(index, e.target.value)}
                  className="w-full text-sm sm:text-base font-bold text-sky-950 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Bullet Content Points
                </label>
                {(slide.contentPoints || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 mt-2.5 flex-shrink-0" />
                    <textarea
                      rows={2}
                      value={bullet}
                      onChange={(e) => onUpdateBullet(index, bIdx, e.target.value)}
                      className="flex-1 text-xs sm:text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y text-slate-800"
                    />
                    <button
                      type="button"
                      aria-label="Remove Bullet"
                      onClick={() => onDeleteBullet(index, bIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 mt-1 rounded hover:bg-rose-50 transition-colors"
                      title="Remove Bullet"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => onAddBullet(index)}
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
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-2 flex-shrink-0" />
                    <FormattedFormula text={bullet} className="flex-1" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Visual Section */}
        {slide.visualDescription && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {hasValidImage ? (
              <div className="relative rounded-xl overflow-hidden border border-sky-200 group aspect-video bg-slate-900 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-sky-900/80 backdrop-blur rounded text-[10px] font-bold text-sky-100 flex items-center gap-1 shadow-sm">
                  <CheckCircle className="w-3 h-3 text-sky-300" />
                  <span>Generated live</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-sky-50/50 border border-sky-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-800 uppercase tracking-wide">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Philippine Classroom Visual Prompt</span>
                </div>
                <p className="text-xs text-slate-600 italic line-clamp-3">
                  &ldquo;{slide.visualDescription}&rdquo;
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={isGeneratingImage}
              onClick={() => onRegenerateImage(index, slide.visualDescription)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 ${
                isGeneratingImage
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : hasValidImage
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
              }`}
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering Image...</span>
                </>
              ) : hasValidImage ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Regenerate AI Graphic</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-100" />
                  <span>Render Visual Concept Image</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
