'use client';
import React, { useState } from 'react';
import { Sparkles, Loader2, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { ImageLibraryPicker } from './ImageLibraryPicker';
import { describeImageCredit } from '@/lib/image-credit';
import { isUsableImage, toDataUrl } from '@/lib/slide-image';
import type { SlideData } from '@/types/presentation';
import type { ImageMetadata } from '@/lib/image-metadata';

export interface SlideImageControlsProps {
  slide: SlideData;
  slideId: number;
  slideImage?: string;
  isGeneratingImage?: boolean;
  imageError?: string;
  onRegenerateImage: (slideId: number, visualDescription: string) => void;
  onSelectImage?: (slideId: number, base64: string, metadata: ImageMetadata) => void;
}

export function SlideImageControls({
  slide,
  slideId,
  slideImage,
  isGeneratingImage = false,
  imageError,
  onRegenerateImage,
  onSelectImage,
}: SlideImageControlsProps) {
  const [imageLibraryPickerOpen, setImageLibraryPickerOpen] = useState(false);
  const hasValidImage = isUsableImage(slideImage);
  const imageSrc = hasValidImage && slideImage ? toDataUrl(slideImage) : undefined;
  const credit = slide.imageMetadata && describeImageCredit(slide.imageMetadata);

  if (!slide.visualDescription) return null;

  return (
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
        imageLibraryPickerOpen ? <ImageLibraryPicker title={slide.title} onCancel={() => setImageLibraryPickerOpen(false)}
          onSelect={(base64, metadata) => { onSelectImage(slideId, base64, metadata); setImageLibraryPickerOpen(false); }} />
          : <button type="button" onClick={() => setImageLibraryPickerOpen(true)}
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
  );
}
