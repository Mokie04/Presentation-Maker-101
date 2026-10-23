import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { getNasaImageCandidate, fetchNasaImageBase64 } from '@/lib/providers/nasa-provider';
import { rethrowNasaError } from '../errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;
const input = z.object({ nasaId: z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/) });

export const POST = defineRoute({
  name: 'nasa-images/select',
  failureMessage: 'NASA image retrieval failed.',
  failureStatus: 502,
  input,
  maxBodyBytes: 8192,
  noStore: true,
  handler: async ({ input }) => {
    try {
      // Only the ID is accepted from the client. Reload metadata and the manifest at NASA.
      const candidate = await getNasaImageCandidate(input.nasaId);
      const image = await fetchNasaImageBase64(candidate.nasaId);
      return NextResponse.json({ base64: image.base64, metadata: { ...candidate, source: 'nasa',
        assetUrl: image.sourceUrl, rendition: image.rendition, mimeType: image.mimeType,
      } });
    } catch (error) {
      rethrowNasaError(error);
    }
  },
});
