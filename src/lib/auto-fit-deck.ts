import type { PresentationData, SlideData } from '@/types/presentation';
import { continuationTitle } from './deck/slide-split';
import { fitSlide } from './slide-fit';
import { suggestSplitIndex } from './slide-split';

const MAX_SPLITS_PER_SLIDE = 20;

/** Fit whole bullets without changing their text; roll back an unresolved capped original. */
export function autoFitDeck(presentation: PresentationData): PresentationData {
  const slides: SlideData[] = [];
  let changed = false;

  presentation.slides.forEach((original, index) => {
    if (index === 0) { slides.push(original); return; }
    const parts: SlideData[] = [];
    let remaining = original;
    while (remaining.contentPoints.length >= 2 &&
      !fitSlide(remaining, slides.length + parts.length, presentation.originalWriters).body.fits) {
      // Discard this original's tentative splits so the cap remains idempotent.
      if (parts.length === MAX_SPLITS_PER_SLIDE) {
        slides.push(original);
        return;
      }
      const at = suggestSplitIndex(remaining, slides.length + parts.length, presentation.originalWriters)!;
      parts.push({ ...remaining, contentPoints: remaining.contentPoints.slice(0, at) });
      const continuation: SlideData = {
        ...remaining, title: continuationTitle(remaining.title),
        contentPoints: remaining.contentPoints.slice(at), visualDescription: '',
      };
      delete continuation.imageMetadata;
      remaining = continuation;
    }
    if (parts.length > 0) changed = true;
    slides.push(...parts, remaining);
  });

  if (!changed) return presentation;
  return { ...presentation, slides: slides.map((slide, index) => slide.slideNumber === index + 1
    ? slide : { ...slide, slideNumber: index + 1 }) };
}
