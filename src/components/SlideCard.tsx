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

interface SlideCardProps {
  slide: SlideData;
  index: number;
  totalSlides: number;
  isEditing: boolean;
  slideImage?: string;
  isGeneratingImage?: boolean;
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

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-emerald-100/90 overflow-hidden flex flex-col h-full">
      {/* Slide Top Strip */}
      <div className="bg-emerald-50/70 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
            {slide.part || 'SLIDE'}
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
          {/* Title */}
          {isEditing ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Slide Title
              </label>
              <input
                type="text"
                value={slide.title}
                onChange={(e) => onUpdateTitle(index, e.target.value)}
                className="w-full text-base sm:text-lg font-bold text-emerald-950 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          ) : (
            <h3 className="text-lg sm:text-xl font-extrabold text-emerald-900 tracking-tight leading-snug">
              {slide.title}
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
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2.5 flex-shrink-0" />
                    <textarea
                      rows={2}
                      value={bullet}
                      onChange={(e) => onUpdateBullet(index, bIdx, e.target.value)}
                      className="flex-1 text-xs sm:text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y text-slate-800"
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Bullet Point</span>
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {(slide.contentPoints || []).map((bullet, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 flex-shrink-0" />
                    <span>{bullet}</span>
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
              <div className="relative rounded-xl overflow-hidden border border-emerald-200 group aspect-video bg-slate-900 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-800/80 backdrop-blur rounded text-[10px] font-bold text-emerald-100 flex items-center gap-1 shadow-sm">
                  <CheckCircle className="w-3 h-3 text-emerald-300" />
                  <span>Generated live</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
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
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering Image...</span>
                </>
              ) : hasValidImage ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Regenerate AI Graphic</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
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
