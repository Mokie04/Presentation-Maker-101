import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { searchNasaImages } from '@/lib/providers/nasa-provider';
import { rethrowNasaError } from '../errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const input = z.object({ query: z.string().trim().min(1).max(500) });

export const POST = defineRoute({
  name: 'nasa-images/search',
  failureMessage: 'NASA search failed.',
  failureStatus: 502,
  input,
  maxBodyBytes: 8192,
  noStore: true,
  handler: async ({ input }) => {
    try {
      return NextResponse.json({ candidates: await searchNasaImages(input.query) });
    } catch (error) {
      rethrowNasaError(error);
    }
  },
});
