import { NextResponse } from 'next/server';
import { defineRoute } from '@/lib/api';
import { exportRequestSchema } from '@/lib/schemas/presentation-export';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';

export const dynamic = 'force-dynamic';

/** Vercel's request body limit. */
const MAX_BODY_BYTES = 4_500_000;

export const POST = defineRoute({
  name: 'download-markdown',
  failureMessage: 'Failed to generate the Markdown outline. Please try again.',
  input: exportRequestSchema,
  maxBodyBytes: MAX_BODY_BYTES,
  handler: async ({ input }) => {
    const { presentationData: validatedData, session } = input;
    const sessionString =
      typeof session === 'string' && session.trim().length > 0
        ? session.trim()
        : 'session';
    const sanitizedTopic = (validatedData.topic || 'presentation')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const sanitizedSession = sessionString.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedFileName = `${sanitizedTopic}_${sanitizedSession}_Outline.md`;

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
