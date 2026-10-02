'use client';

import React, { useState, useEffect, TouchEvent } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import type { PresentationData } from '@/types/presentation';

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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const slides = presentationData?.slides || [];
  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

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
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Touch Swipe Handling
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches.length > 0) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    if (e.changedTouches && e.changedTouches.length > 0) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (deltaX > 60) {
        // Swipe right -> Prev
        handlePrev();
      } else if (deltaX < -60) {
        // Swipe left -> Next
        handleNext();
      }
    }
    setTouchStartX(null);
  };

  if (!isOpen || !currentSlide) {
    return null;
  }

  const currentImage = slideImages[currentIndex];
  const hasValidImage = Boolean(currentImage && currentImage !== 'failed');
  const imageSrc = hasValidImage
    ? currentImage.startsWith('data:')
      ? currentImage
      : `data:image/png;base64,${currentImage}`
    : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden animate-fadeIn"
    >
      {/* Top Bar */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3.5 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md bg-emerald-600 text-white shadow-sm">
            {currentSlide.part || 'SLIDE'}
          </span>
          <span className="text-sm font-semibold text-slate-300 truncate max-w-xs sm:max-w-md">
            {presentationData.topic} {session ? `— ${session}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm font-bold bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-slate-300">
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

      {/* Center Slide Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-6xl aspect-[16/9] bg-[#F0FDF4] rounded-2xl shadow-2xl border-4 border-emerald-600/20 p-6 sm:p-12 flex flex-col justify-between overflow-hidden relative">
          {/* Slide Header: Part & Title */}
          <div className="space-y-2">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#10B981]">
              {currentSlide.part}
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#047857] tracking-tight leading-tight">
              {currentSlide.title}
            </h2>
          </div>

          {/* Slide Middle: Bullets & Visual Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-4">
            {/* Bullets List */}
            <div
              className={`${
                currentSlide.visualDescription ? 'md:col-span-7' : 'md:col-span-12'
              } space-y-3 sm:space-y-4`}
            >
              {(currentSlide.contentPoints || []).map((point, pIdx) => (
                <div key={pIdx} className="flex items-start gap-3 sm:gap-4">
                  <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-[#047857] mt-2 sm:mt-2.5 flex-shrink-0 shadow-xs" />
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-[#1E293B] leading-snug">
                    {point}
                  </p>
                </div>
              ))}
            </div>

            {/* Visual Box */}
            {currentSlide.visualDescription && (
              <div className="md:col-span-5 h-full flex items-center justify-center">
                {hasValidImage ? (
                  <div className="rounded-xl overflow-hidden shadow-lg border-2 border-emerald-300 w-full aspect-video bg-black flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={currentSlide.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-[#ECFDF5] border-2 border-dashed border-[#A7F3D0] rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#047857] mb-1">
                      [PHILIPPINES CLASSROOM VISUAL DESIGN]
                    </span>
                    <p className="text-xs sm:text-sm text-emerald-800/80 italic line-clamp-4">
                      &ldquo;{currentSlide.visualDescription}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slide Bottom: Writers & Counter */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 font-semibold pt-2 border-t border-emerald-100">
            <span>{presentationData.originalWriters || 'DepEd Tambayan'}</span>
            <span className="text-[#047857] font-bold">
              Slide {currentIndex + 1} of {totalSlides}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-slate-900/90 backdrop-blur border-t border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-white z-10">
        <p className="text-xs text-slate-400 font-medium hidden sm:block">
          Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">→</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Space</kbd> to navigate, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Esc</kbd> to exit.
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              currentIndex === 0
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Jump to Slide Dropdown */}
          <div className="relative">
            <select
              aria-label="Jump to slide"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="appearance-none bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
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
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              currentIndex === totalSlides - 1
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
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
