import { NextRequest, NextResponse } from 'next/server';
import {
  processBatchImages,
  type SlideImageBatchItem,
} from '@/lib/services/image-batch';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    const { slides, delayMs, source } = body || {};

    if (!Array.isArray(slides)) {
      return NextResponse.json(
        { error: 'Field "slides" is required and must be an array.' },
        { status: 400 }
      );
    }

    const parsedDelay =
      typeof delayMs === 'number' && delayMs >= 0 ? delayMs : 800;

    const images = await processBatchImages(slides as SlideImageBatchItem[], {
      delayMs: parsedDelay,
      source: (source as 'ai' | 'pexels' | 'auto') || undefined,
    });

    return NextResponse.json({ images }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
