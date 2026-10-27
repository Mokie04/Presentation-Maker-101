import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { imageSourceSchema } from '@/lib/schemas/image-request';
import { processBatchImages } from '@/lib/services/image-batch';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Room for MAX_SLIDES short image prompts. */
const MAX_BODY_BYTES = 256 * 1024;
/** Generated decks have about 25 slides. */
const MAX_SLIDES = 100;
const MAX_SLIDE_INDEX = 999;
const MAX_PART_LENGTH = 100;
const MAX_VISUAL_DESCRIPTION_LENGTH = 4000;
const MAX_TITLE_LENGTH = 300;
/** Pause between provider calls. The cap stops a client from holding the 300s function open. */
const DEFAULT_DELAY_MS = 800;
const MAX_DELAY_MS = 2000;

const inputSchema = z.object({
  slides: z.array(z.object({
    slideIndex: z.number().int().min(0).max(MAX_SLIDE_INDEX),
    part: z.string().max(MAX_PART_LENGTH),
    visualDescription: z.string().max(MAX_VISUAL_DESCRIPTION_LENGTH),
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
  })).max(MAX_SLIDES),
  source: imageSourceSchema.optional(),
  // Same meaning as before validation existed: anything but a non-negative number uses the default.
  delayMs: z.unknown().optional().transform((delayMs) =>
    typeof delayMs === 'number' && delayMs >= 0 ? Math.min(delayMs, MAX_DELAY_MS) : DEFAULT_DELAY_MS),
});

export const POST = defineRoute({
  name: 'generate-images',
  noStore: true,
  failureMessage: 'Failed to generate images. Please try again.',
  input: inputSchema,
  maxBodyBytes: MAX_BODY_BYTES,
  handler: async ({ input }) => {
    const images = await processBatchImages(input.slides, {
      delayMs: input.delayMs,
      source: input.source,
    });

    return NextResponse.json({ images }, { status: 200 });
  },
});
