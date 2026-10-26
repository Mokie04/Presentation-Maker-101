import { DEFAULT_THEME_ID } from '@/lib/themes';
import { isUsableImage } from '@/lib/slide-image';
import type { PresentationData } from '@/types/presentation';
import { CLIENT_EXPORT_BUDGET_CHARS } from './limits';

export interface PptxExportInput {
  presentationData: PresentationData;
  slideImages: Record<number, string>;
  session: string;
  themeId?: string;
}

export interface PptxExportOptions {
  compress: (image: string) => Promise<string>;
  budgetChars?: number;
}

// A dropped image takes its credit with it, so the PowerPoint never credits an image it does not contain.
function withoutCredits(presentationData: PresentationData, indexes: number[]): PresentationData {
  if (!indexes.some((index) => presentationData.slides[index]?.imageMetadata)) return presentationData;
  return {
    ...presentationData,
    slides: presentationData.slides.map((slide, index) => {
      if (!indexes.includes(index) || !slide.imageMetadata) return slide;
      const uncredited = { ...slide };
      delete uncredited.imageMetadata;
      return uncredited;
    }),
  };
}

/** The /api/download-pptx body: images compressed, then trimmed from the last slide down until it fits the budget. */
export async function buildPptxExportRequest(
  { presentationData, slideImages, session, themeId }: PptxExportInput,
  { compress, budgetChars = CLIENT_EXPORT_BUDGET_CHARS }: PptxExportOptions
): Promise<{ body: string; droppedImageIndexes: number[] }> {
  const images: Record<number, string> = {};
  await Promise.all(Object.entries(slideImages).map(async ([key, value]) => {
    images[Number(key)] = isUsableImage(value) ? await compress(value) : value;
  }));

  const candidates = Object.keys(images).map(Number)
    .filter((index) => isUsableImage(images[index]))
    .sort((a, b) => b - a);
  const droppedImageIndexes = Object.keys(images).map(Number)
    .filter((index) => isUsableImage(slideImages[index]) && !isUsableImage(images[index]));
  const serialize = () => JSON.stringify({
    presentationData: withoutCredits(presentationData, droppedImageIndexes),
    slideImages: images,
    session,
    ...(themeId !== undefined && themeId !== DEFAULT_THEME_ID && { themeId }),
  });

  let body = serialize();
  for (const index of candidates) {
    if (body.length <= budgetChars) break;
    delete images[index];
    droppedImageIndexes.push(index);
    body = serialize();
  }
  // Still over budget with every image gone: send it anyway and let the server answer 413.
  return { body, droppedImageIndexes };
}
