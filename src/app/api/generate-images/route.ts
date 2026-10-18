import { NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import {
  processBatchImages,
  type SlideImageBatchItem,
} from '@/lib/services/image-batch';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const POST = defineRoute({
  name: 'generate-images',
  failureMessage: 'Failed to generate images. Please try again.',
  handler: async ({ body }) => {
    const { slides, delayMs, source } = body;

    if (!Array.isArray(slides)) {
      throw new PublicError('Field "slides" is required and must be an array.', 400);
    }

    const parsedDelay =
      typeof delayMs === 'number' && delayMs >= 0 ? delayMs : 800;

    const images = await processBatchImages(slides as SlideImageBatchItem[], {
      delayMs: parsedDelay,
      source: (source as 'ai' | 'pexels' | 'auto') || undefined,
    });

    return NextResponse.json({ images }, { status: 200 });
  },
});
