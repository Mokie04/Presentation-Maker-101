'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { describeImageCredit } from '@/lib/image-credit';
import type { PresentationData } from '@/types/presentation';
import { getPartBadgeInfo } from './part-badge';
import { isUsableImage } from '@/lib/slide-image';
import { SlideView } from './SlideView';
import { useMediaQuery } from './workspace/use-media-query';
import { useSwipe } from './workspace/use-swipe';
import { useDialogFocus } from './workspace/use-dialog-focus';

interface SlideshowModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentationData: PresentationData;
  session: string;
  slideImages: Record<number, string>;
  initialIndex?: number;
}

export function SlideshowModal({
  isOpen,
  onClose,
  presentationData,
  session,
  slideImages,
  initialIndex = 0,
}: SlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hintDismissed, setHintDismissed] = useState(false);
  const portraitPhone = useMediaQuery('(max-width: 767px) and (orientation: portrait)', false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setHintDismissed(false);
    }
  }, [isOpen, initialIndex]);

  const slides = presentationData?.slides || [];
  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];
  const dialogRef = useDialogFocus(isOpen && Boolean(currentSlide));

  const handleNext = React.useCallback(() => {
    setCurrentIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const handlePrev = React.useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return;
      if (e.key === ' ' && target?.closest('button, a[href], summary, [role="button"]')) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  const swipe = useSwipe({ onNext: handleNext, onPrevious: handlePrev, disabled: !isOpen });

  if (!isOpen || !currentSlide) {
    return null;
  }

  const currentImage = slideImages[currentIndex];
  const hasValidImage = isUsableImage(currentImage);
  const credit = hasValidImage && currentSlide.imageMetadata ? describeImageCredit(currentSlide.imageMetadata) : undefined;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Slideshow: ${presentationData.topic}`}
      tabIndex={-1}
      {...swipe}
      className="touch-workspace fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden animate-fadeIn outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 motion-reduce:animate-none motion-reduce:[&_*]:transition-none"
    >
      {/* Top Bar */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-6 py-3.5 [@media(max-height:500px)]:py-1.5 flex flex-wrap shrink-0 items-center justify-between gap-2 sm:gap-3 text-white z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-full">
          {(() => {
            const badge = getPartBadgeInfo(currentSlide.part);
            return (
              <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md truncate shrink-0 max-w-[45vw] ${badge.bg} text-white shadow-sm`}>
                {badge.label}
              </span>
            );
          })()}
          <span className="text-sm font-semibold text-slate-300 truncate max-w-xs sm:max-w-md">
            {presentationData.topic} {session ? `— ${session}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <span role="status" aria-live="polite" aria-atomic="true" className="text-xs sm:text-sm font-bold bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300 whitespace-nowrap">
            Slide {currentIndex + 1} of {totalSlides}
          </span>
          <button
            type="button"
            aria-label="Exit Slideshow"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-400 text-slate-400 border border-slate-700 transition-colors"
            title="Exit (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* The shared 16:9 slide fits both dimensions after the bars and caption. */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-2 p-2 sm:p-6 [@media(max-height:500px)]:p-1 overflow-hidden">
        {portraitPhone && !hintDismissed && (
          <div className="shrink-0 flex items-center justify-center gap-2 text-xs text-slate-300">
            <span>Rotate your phone for a larger slide</span>
            <button type="button" aria-label="Dismiss rotate hint" onClick={() => setHintDismissed(true)}
              className="shrink-0 rounded p-1 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center" style={{ containerType: 'size' }}>
          <figure className="m-0 w-full max-h-full min-h-0 flex flex-col items-center">
            <div className="w-full aspect-video min-h-0 shrink flex items-center justify-center" style={{ containerType: 'size' }}>
              <div className="shrink-0 shadow-2xl" style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))' }}>
                <SlideView slide={currentSlide} index={currentIndex} total={totalSlides}
                  image={currentImage} originalWriters={presentationData.originalWriters} variant="full" />
              </div>
            </div>
            {credit && (
              <figcaption className="shrink-0 w-full pt-1.5 text-center text-[11px] sm:text-xs leading-snug text-slate-300 break-words">
                <span aria-hidden="true">{credit.creditLine}</span>{' '}
                <a href={credit.sourceLink} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">{`${credit.sourceLabel} source`}</a>
                {credit.license?.url && <>{' '}<a href={credit.license.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">{`License: ${credit.license.name}`}</a></>}
              </figcaption>
            )}
          </figure>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur border-t border-slate-800 px-3 sm:px-6 py-3.5 [@media(max-height:500px)]:py-1.5 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-white z-10">
        <p className="text-xs text-slate-400 font-medium hidden sm:block">
          Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">→</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Space</kbd> to navigate, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Esc</kbd> to exit.
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 transition-all ${
              currentIndex === 0
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Jump to Slide Dropdown */}
          <div className="relative min-w-0 flex-1 sm:flex-initial">
            <select
              aria-label="Jump to slide"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="appearance-none w-full truncate bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-sm"
            >
              {slides.map((s, idx) => (
                <option key={idx} value={idx}>
                  Slide {idx + 1}: {s.title.slice(0, 24)}...
                </option>
              ))}
            </select>
            <Layers className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            disabled={currentIndex === totalSlides - 1}
            onClick={handleNext}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 transition-all ${
              currentIndex === totalSlides - 1
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-sky-700 hover:bg-sky-800 text-white shadow-md active:scale-95'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
