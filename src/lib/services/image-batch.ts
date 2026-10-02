import { generateSlideImage } from '@/lib/providers/image-provider';

export interface SlideImageBatchItem {
  visualDescription: string;
  slideIndex: number;
  part: string;
}

export function shouldGenerateImageForPart(part: string): boolean {
  if (!part || typeof part !== 'string') {
    return false;
  }
  const lower = part.toLowerCase();
  return (
    lower.includes('motivation') ||
    lower.includes('presentation') ||
    lower.includes('discussion')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processBatchImages(
  slides: SlideImageBatchItem[],
  options?: { delayMs?: number }
): Promise<Record<number, string>> {
  const images: Record<number, string> = {};
  const delayMs = options?.delayMs ?? 800;

  const eligibleSlides = slides.filter((slide) =>
    shouldGenerateImageForPart(slide.part)
  );

  for (let i = 0; i < eligibleSlides.length; i++) {
    const slide = eligibleSlides[i];
    try {
      const base64 = await generateSlideImage(slide.visualDescription);
      images[slide.slideIndex] = base64;
    } catch {
      images[slide.slideIndex] = 'failed';
    }

    if (i < eligibleSlides.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return images;
}
