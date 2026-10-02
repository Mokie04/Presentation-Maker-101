import { NextRequest, NextResponse } from 'next/server';
import { presentationDataSchema } from '@/lib/providers/text-provider';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';
import { requireSession } from '@/lib/sessionAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const { presentationData, session } = body || {};

    const validation = presentationDataSchema.safeParse(presentationData);
    if (!validation.success) {
      const issues = validation.error.issues || [];
      const errorMsg = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json(
        { error: `Invalid presentationData schema: ${errorMsg}` },
        { status: 400 }
      );
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
