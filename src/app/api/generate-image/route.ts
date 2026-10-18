import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { generateSlideImage } from '@/lib/providers/image-provider';
import { imageSourceSchema } from '@/lib/schemas/image-request';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** One image prompt plus a few small fields. */
const MAX_BODY_BYTES = 64 * 1024;
/** Matches the batch route's visualDescription limit. */
const MAX_PROMPT_LENGTH = 4000;
const MAX_TITLE_LENGTH = 300;
/** Far above any real deck; only guards against nonsense indexes. */
const MAX_SLIDE_INDEX = 100_000;

const inputSchema = z.object({
  prompt: z.string().max(MAX_PROMPT_LENGTH).refine((prompt) => prompt.trim().length > 0, 'must be a non-empty string'),
  slideIndex: z.number().int().min(0).max(MAX_SLIDE_INDEX).optional(),
  source: imageSourceSchema.optional(),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
});

const slideIndexOf = (body: Record<string, unknown>) => (typeof body.slideIndex === 'number' ? body.slideIndex : 0);

export const POST = defineRoute({
  name: 'generate-image',
  failureMessage: 'Failed to render the image. Please try again.',
  input: inputSchema,
  maxBodyBytes: MAX_BODY_BYTES,
  errorExtra: (body) => ({ slideIndex: slideIndexOf(body) }),
  handler: async ({ input }) => {
    const { prompt, source, title, slideIndex = 0 } = input;

    const imgOptions: { source?: 'ai' | 'pexels' | 'auto'; title?: string } = {};
    if (source) imgOptions.source = source;
    if (title !== undefined) imgOptions.title = title;

    const base64 = Object.keys(imgOptions).length > 0
      ? await generateSlideImage(prompt.trim(), imgOptions)
      : await generateSlideImage(prompt.trim());

    return NextResponse.json(
      {
        base64,
        slideIndex,
      },
      { status: 200 }
    );
  },
});
