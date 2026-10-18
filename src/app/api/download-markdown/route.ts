import { NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import { exportPresentationDataSchema } from '@/lib/schemas/presentation-export';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';

export const dynamic = 'force-dynamic';

export const POST = defineRoute({
  name: 'download-markdown',
  failureMessage: 'Failed to generate the Markdown outline. Please try again.',
  handler: async ({ body }) => {
    const { presentationData, session } = body;

    const validation = exportPresentationDataSchema.safeParse(presentationData);
    if (!validation.success) {
      const issues = validation.error.issues || [];
      const errorMsg = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new PublicError(`Invalid presentationData schema: ${errorMsg}`, 400);
    }

    const validatedData = validation.data;
    const sessionString =
      typeof session === 'string' && session.trim().length > 0
        ? session.trim()
        : 'session';
    const sanitizedTopic = (validatedData.topic || 'presentation')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const sanitizedSession = sessionString.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedFileName = `${sanitizedTopic}_${sanitizedSession}_Outline.md`;

    const markdown = buildPresentationMarkdown(
      validatedData,
      typeof session === 'string' ? session : undefined
    );

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
      },
    });
  },
});
