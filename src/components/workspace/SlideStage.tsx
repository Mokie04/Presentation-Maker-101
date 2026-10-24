'use client';

import React from 'react';
import { SlideView, type SlideViewProps } from '@/components/SlideView';
import { EditableSlideView, type SlideEditingHandlers } from './EditableSlideView';
import { useMediaQuery } from './use-media-query';
import { useSwipe } from './use-swipe';

export type SlideStageProps = Omit<SlideViewProps, 'variant' | 'renderTitle' | 'renderPoint'> & Partial<SlideEditingHandlers> & {
  onNext?: () => void;
  onPrevious?: () => void;
};

export function SlideStage({ onTitleChange, onPointChange, onPointInsert, onPointDelete, onPointAdd, onNext, onPrevious, ...props }: SlideStageProps) {
  const desktopEditing = useMediaQuery('(min-width: 768px)');
  const swipe = useSwipe({ onNext: () => onNext?.(), onPrevious: () => onPrevious?.(), disabled: !onNext || !onPrevious });
  return (
    <section aria-label="Slide stage" tabIndex={0} {...swipe} style={{ containerType: 'size', touchAction: 'pan-y pinch-zoom' }}
      className="flex aspect-[16/10] min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-4 outline-none focus-visible:ring-2 focus-visible:ring-sky-700 md:aspect-auto">
      <div className="shrink-0 shadow-sm" style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))' }}>
        {desktopEditing && onTitleChange && onPointChange && onPointInsert && onPointDelete && onPointAdd ? (
          <EditableSlideView {...props} onTitleChange={onTitleChange} onPointChange={onPointChange}
            onPointInsert={onPointInsert} onPointDelete={onPointDelete} onPointAdd={onPointAdd} />
        ) : <SlideView {...props} variant="full" />}
      </div>
    </section>
  );
}
