import { NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import { generateSlideImage } from '@/lib/providers/image-provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const slideIndexOf = (body: Record<string, unknown>) => (typeof body.slideIndex === 'number' ? body.slideIndex : 0);

export const POST = defineRoute({
  name: 'generate-image',
  failureMessage: 'Failed to render the image. Please try again.',
  errorExtra: (body) => ({ slideIndex: slideIndexOf(body) }),
  handler: async ({ body }) => {
    const { prompt, source, title } = body;
    const slideIndex = slideIndexOf(body);

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new PublicError('Field "prompt" is required and must be a non-empty string.', 400, { extra: { slideIndex } });
    }

    const imgOptions: { source?: 'ai' | 'pexels' | 'auto'; title?: string } = {};
    if (source) imgOptions.source = source as 'ai' | 'pexels' | 'auto';
    if (typeof title === 'string') imgOptions.title = title;

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
