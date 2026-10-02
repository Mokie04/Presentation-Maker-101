import { NextRequest, NextResponse } from 'next/server';
import { generateSlideImage } from '@/lib/providers/image-provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let slideIndex: number = 0;
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

    const { prompt, slideIndex: rawIndex, source, title } = body || {};

    if (typeof rawIndex === 'number') {
      slideIndex = rawIndex;
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Field "prompt" is required and must be a non-empty string.', slideIndex },
        { status: 400 }
      );
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      {
        error: message,
        slideIndex,
      },
      { status: 500 }
    );
  }
}
