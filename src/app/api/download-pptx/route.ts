import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { exportRequestSchema } from '@/lib/schemas/presentation-export';
import { exportFilename } from '@/lib/export/filename';
import { MAX_EXPORT_BODY_BYTES } from '@/lib/export/limits';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';
import { FAILED_IMAGE, hasWireImageFormat, MAX_SLIDE_IMAGE_CHARS } from '@/lib/slide-image';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// The length has its own message; the format rule accepts '' and FAILED_IMAGE for slides without an image.
const slideImageSchema = z.string()
  .max(MAX_SLIDE_IMAGE_CHARS)
  .refine(hasWireImageFormat, `must be "", "${FAILED_IMAGE}" or a base64 PNG or JPEG image`);

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
  maxBodyBytes: MAX_EXPORT_BODY_BYTES,
  handler: async ({ input }) => {
    const { presentationData: validatedData, slideImages, session } = input;
    const sanitizedFileName = exportFilename({ topic: validatedData.topic, session, suffix: 'SayunaAI.pptx' });

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
