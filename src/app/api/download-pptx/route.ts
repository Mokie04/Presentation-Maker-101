import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { exportRequestSchema } from '@/lib/schemas/presentation-export';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Vercel's request body limit; the client trims images to stay under 3.5 MB. */
const MAX_BODY_BYTES = 4_500_000;
/** One slide image in base64 characters; the client compresses to a 480px JPEG first. */
const MAX_SLIDE_IMAGE_CHARS = 1_500_000;
/** Optional PNG/JPEG data URL prefix, a JPEG or PNG signature, then base64 only. */
const SLIDE_IMAGE_PATTERN = /^(?:data:image\/(?:png|jpeg);base64,)?(?:\/9j\/|iVBORw0KGgo)[A-Za-z0-9+/]*={0,2}$/;

// '' and 'failed' are what the client sends for slides without a usable image.
const slideImageSchema = z.string()
  .max(MAX_SLIDE_IMAGE_CHARS)
  .refine((image) => image === '' || image === 'failed' || SLIDE_IMAGE_PATTERN.test(image),
    'must be "", "failed" or a base64 PNG or JPEG image');

const inputSchema = exportRequestSchema.extend({
  slideImages: z.record(z.string(), slideImageSchema).optional(),
}).superRefine(({ presentationData, slideImages }, ctx) => {
  for (const key of Object.keys(slideImages ?? {})) {
    if (!/^\d+$/.test(key) || Number(key) >= presentationData.slides.length) {
      ctx.addIssue({ code: 'custom', path: ['slideImages', key], message: 'must be the index of a slide in the presentation' });
    }
  }
});

export const POST = defineRoute({
  name: 'download-pptx',
  failureMessage: 'Failed to compile the PowerPoint file. Please try again.',
  input: inputSchema,
  maxBodyBytes: MAX_BODY_BYTES,
  handler: async ({ input }) => {
    const { presentationData: validatedData, slideImages, session } = input;
    const sessionString = typeof session === 'string' && session.trim().length > 0 ? session.trim() : 'session';
    const sanitizedTopic = (validatedData.topic || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedSession = sessionString.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedFileName = `${sanitizedTopic}_${sanitizedSession}_SayunaAI.pptx`;

    const pptxBuffer = await buildPresentationPptx(validatedData, slideImages);

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
      },
    });
  },
});
