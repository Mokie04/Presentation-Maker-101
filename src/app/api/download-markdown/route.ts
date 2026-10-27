import { NextResponse } from 'next/server';
import { defineRoute } from '@/lib/api';
import { exportRequestSchema } from '@/lib/schemas/presentation-export';
import { exportFilename } from '@/lib/export/filename';
import { MAX_EXPORT_BODY_BYTES } from '@/lib/export/limits';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;


export const POST = defineRoute({
  name: 'download-markdown',
  noStore: true,
  failureMessage: 'Failed to generate the Markdown outline. Please try again.',
  input: exportRequestSchema,
  maxBodyBytes: MAX_EXPORT_BODY_BYTES,
  handler: async ({ input }) => {
    const { presentationData: validatedData, session } = input;
    const sanitizedFileName = exportFilename({ topic: validatedData.topic, session, suffix: 'Outline.md' });

    const markdown = buildPresentationMarkdown(validatedData, session);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
      },
    });
  },
});
