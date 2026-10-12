import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/sessionAuth';
import { searchNasaImages } from '@/lib/providers/nasa-provider';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const input = z.object({ query: z.string().trim().min(1).max(500) });
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  let parsed;
  try { parsed = input.safeParse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid NASA search request.' }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: 'Search terms must be 1–500 characters.' }, { status: 400 });
  try {
    return NextResponse.json({ candidates: await searchNasaImages(parsed.data.query) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'NASA search failed.' }, { status: 502 });
  }
}
