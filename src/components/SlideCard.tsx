'use client';

import React, { useState } from 'react';
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
import { NasaImagePicker } from './NasaImagePicker';
import { describeImageCredit } from '@/lib/image-credit';
import type { ImageMetadata } from '@/lib/image-metadata';
import { FormattedFormula } from './FormattedFormula';
import { getPartBadgeInfo } from './part-badge';
import { isUsableImage, toDataUrl } from '@/lib/slide-image';
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
  const [nasaPickerOpen, setNasaPickerOpen] = useState(false);
  const hasValidImage = isUsableImage(slideImage);
  const imageSrc = hasValidImage && slideImage ? toDataUrl(slideImage) : undefined;

  const badgeInfo = getPartBadgeInfo(slide.part);
  const credit = slide.imageMetadata && describeImageCredit(slide.imageMetadata);

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 border border-sky-100/90 overflow-hidden flex flex-col h-full">
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
                  onChange={(e) => onUpdatePart?.(slideId, e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Slide Title
                </label>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(e) => onUpdateTitle(slideId, e.target.value)}
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
                      onChange={(e) => onUpdateBullet(slideId, bIdx, e.target.value)}
                      className="flex-1 text-xs sm:text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y text-slate-800"
                    />
                    <button
                      type="button"
                      aria-label="Remove Bullet"
                      onClick={() => onDeleteBullet(slideId, bIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 mt-1 rounded hover:bg-rose-50 transition-colors"
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
                  className={`w-full h-full ${slide.imageMetadata?.source === 'commons' ? 'object-contain' : 'object-cover'}`}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-sky-900/80 backdrop-blur rounded text-[10px] font-bold text-sky-100 flex items-center gap-1 shadow-sm">
                  <CheckCircle className="w-3 h-3 text-sky-300" />
                  <span>{credit ? `Selected ${credit.sourceLabel} image` : 'Generated live'}</span>
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

            {credit && (
              <div className="text-xs text-slate-600 space-y-1">
                <p>{credit.creditLine}</p>
                <a href={credit.sourceLink} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">{`${credit.sourceLabel} source`}</a>
                {credit.license?.url && <>{' '}<a href={credit.license.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">{`License: ${credit.license.name}`}</a></>}
                {credit.description && <details><summary>Source description</summary><p className="whitespace-pre-wrap">{credit.description}</p></details>}
              </div>
            )}
            {onSelectImage && (
              nasaPickerOpen ? <NasaImagePicker title={slide.title} onCancel={() => setNasaPickerOpen(false)}
                onSelect={(base64, metadata) => { onSelectImage(slideId, base64, metadata); setNasaPickerOpen(false); }} />
                : <button type="button" onClick={() => setNasaPickerOpen(true)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200">Find image</button>
            )}

            {/* Fixed text only: provider errors can contain internal details */}
            {imageError && !isGeneratingImage && (
              <p className="text-[11px] font-semibold text-rose-600">
                {hasValidImage ? 'Regeneration failed. Kept the previous image.' : 'Image generation failed. Try again.'}
              </p>
            )}

            <button
              type="button"
              disabled={isGeneratingImage}
              onClick={() => onRegenerateImage(slideId, slide.visualDescription)}
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
