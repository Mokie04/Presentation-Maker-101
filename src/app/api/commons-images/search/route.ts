import { readCommonsInput, CommonsInputSizeError } from '../request';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/sessionAuth';
import { searchCommonsImages, CommonsProviderError } from '@/lib/providers/commons-provider';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const input = z.object({ query: z.string().trim().min(1).max(500) });
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  let parsed;
  try { parsed = input.safeParse(await readCommonsInput(request)); }
  catch (error) { if (error instanceof CommonsInputSizeError) return NextResponse.json({ error: 'Commons request exceeds size limit.' }, { status: 413 }); return NextResponse.json({ error: 'Invalid Commons search request.' }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Commons search input.' }, { status: 400 });
  try {
    return NextResponse.json({ candidates: await searchCommonsImages(parsed.data.query) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const limited = error instanceof CommonsProviderError && error.status === 429;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Commons request failed.',
      ...(limited ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    }, { status: error instanceof CommonsProviderError ? error.status : 502,
      headers: { 'Cache-Control': 'no-store', ...(limited ? { 'Retry-After': String(error.retryAfterSeconds) } : {}) },
    });
  }
}
