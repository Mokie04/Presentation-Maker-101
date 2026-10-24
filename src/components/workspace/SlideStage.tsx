'use client';

import React from 'react';
import { SlideView, type SlideViewProps } from '@/components/SlideView';

export type SlideStageProps = Omit<SlideViewProps, 'variant'>;

export function SlideStage(props: SlideStageProps) {
  return (
    <section aria-label="Slide stage" tabIndex={0} style={{ containerType: 'size' }}
      className="flex aspect-[16/10] min-h-[200px] min-w-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-4 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 md:aspect-auto md:min-h-0">
      <div className="shrink-0 shadow-sm" style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))' }}>
        <SlideView {...props} variant="full" />
      </div>
    </section>
  );
}
