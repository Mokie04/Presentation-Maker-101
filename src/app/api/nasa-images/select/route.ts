import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/sessionAuth';
import { getNasaImageCandidate, fetchNasaImageBase64 } from '@/lib/providers/nasa-provider';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;
const input = z.object({ nasaId: z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/) });
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;
  let parsed;
  try { parsed = input.safeParse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid NASA selection request.' }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: 'A valid NASA asset ID is required.' }, { status: 400 });
  try {
    // Only the ID is accepted from the client. Reload metadata and the manifest at NASA.
    const candidate = await getNasaImageCandidate(parsed.data.nasaId);
    const image = await fetchNasaImageBase64(candidate.nasaId);
    return NextResponse.json({ base64: image.base64, metadata: { ...candidate, source: 'nasa',
      assetUrl: image.sourceUrl, rendition: image.rendition, mimeType: image.mimeType,
    } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'NASA image retrieval failed.' }, { status: 502 });
  }
}
