import { NextRequest, NextResponse } from 'next/server';
import { presentationDataSchema } from '@/lib/providers/text-provider';
import { buildPresentationPptx } from '@/lib/services/pptx-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const { presentationData, slideImages, session } = body || {};

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
