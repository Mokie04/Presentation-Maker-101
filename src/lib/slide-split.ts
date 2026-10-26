import type { SlideData } from '@/types/presentation';
import { fitSlide } from './slide-fit';
import { DEFAULT_THEME, type SlideTheme } from './themes';

/** Keep as many whole bullets as fit on the original; leave at least one to move. */
export function suggestSplitIndex(slide: SlideData, index: number, originalWriters?: string, theme: SlideTheme = DEFAULT_THEME): number | null {
  if (index === 0 || slide.contentPoints.length < 2) return null;
  for (let prefix = slide.contentPoints.length - 1; prefix >= 1; prefix--) {
    if (fitSlide({ ...slide, contentPoints: slide.contentPoints.slice(0, prefix) }, index, originalWriters, theme).body.fits) return prefix;
  }
  return 1;
}
