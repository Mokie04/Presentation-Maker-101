import { NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import { exportPresentationDataSchema } from '@/lib/schemas/presentation-export';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export const POST = defineRoute({
  name: 'download-pptx',
  failureMessage: 'Failed to compile the PowerPoint file. Please try again.',
  handler: async ({ body }) => {
    const { presentationData, slideImages, session } = body;

    const validation = exportPresentationDataSchema.safeParse(presentationData);
    if (!validation.success) {
      const issues = validation.error.issues || [];
      const errorMsg = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new PublicError(`Invalid presentationData schema: ${errorMsg}`, 400);
    }

    const validatedData = validation.data;
    const sessionString = typeof session === 'string' && session.trim().length > 0 ? session.trim() : 'session';
    const sanitizedTopic = (validatedData.topic || 'presentation').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedSession = sessionString.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedFileName = `${sanitizedTopic}_${sanitizedSession}_SayunaAI.pptx`;

    const pptxBuffer = await buildPresentationPptx(
      validatedData,
      slideImages as Record<number, string> | undefined
    );

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
