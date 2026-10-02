import { NextRequest, NextResponse } from 'next/server';
import { generateSlideContent } from '@/lib/providers/text-provider';
import { detectSubject } from '@/lib/utils/subject-detector';
import { requireSession } from '@/lib/sessionAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const VALID_SESSIONS = ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5'];

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

    const { text, session, subject } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Field "text" is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    if (!session || typeof session !== 'string' || !VALID_SESSIONS.includes(session)) {
      return NextResponse.json(
        {
          error: `Field "session" is required and must be one of: ${VALID_SESSIONS.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const resolvedSubject =
      subject && typeof subject === 'string' && subject.trim().length > 0
        ? subject.trim()
        : detectSubject(text);

    const presentation = await generateSlideContent(text, session, resolvedSubject);

    return NextResponse.json(presentation, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
