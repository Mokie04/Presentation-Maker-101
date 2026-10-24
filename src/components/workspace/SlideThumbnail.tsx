'use client';

import React, { memo } from 'react';
import { SlideView, type SlideViewProps } from '@/components/SlideView';

export type SlideThumbnailProps = Omit<SlideViewProps, 'variant'>;

/** Keep passive previews independent of changing drag, selection and action handlers. */
export const SlideThumbnail = memo(function SlideThumbnail(props: SlideThumbnailProps) {
  return <SlideView {...props} variant="thumbnail" />;
}, (previous, next) => {
  // Credit selectors can wrap unchanged content in a fresh SlideData object.
  const a = previous.slide;
  const b = next.slide;
  return a.title === b.title && a.part === b.part && a.slideNumber === b.slideNumber &&
    a.contentPoints === b.contentPoints && a.visualDescription === b.visualDescription && a.imageMetadata === b.imageMetadata &&
    previous.index === next.index && previous.total === next.total && previous.image === next.image &&
    previous.originalWriters === next.originalWriters;
});
