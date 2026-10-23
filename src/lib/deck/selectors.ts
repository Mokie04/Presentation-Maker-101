import type { PresentationData } from '@/types/presentation';
import { FAILED_IMAGE } from '@/lib/slide-image';
import type { DeckState } from './types';

export function toPresentationData(state: DeckState): PresentationData | null {
  if (!state.presentation) return null;
  return {
    ...state.presentation,
    slides: state.slides.map(({ content, image }) => (image.metadata ? { ...content, imageMetadata: image.metadata } : content)),
  };
}

/** Index-keyed view used by SlideCard, SlideshowModal and export; FAILED_IMAGE only for Slides with no image. */
export function toSlideImages(state: DeckState): Record<number, string> {
  const images: Record<number, string> = {};
  state.slides.forEach(({ image }, index) => {
    if (image.data !== undefined) images[index] = image.data;
    else if (image.status === 'failed') images[index] = FAILED_IMAGE;
  });
  return images;
}

export function toGeneratingFlags(state: DeckState): Record<number, boolean> {
  const flags: Record<number, boolean> = {};
  state.slides.forEach(({ image }, index) => {
    if (image.status === 'pending') flags[index] = true;
  });
  return flags;
}
