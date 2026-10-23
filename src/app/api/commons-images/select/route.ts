import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/api';
import { fetchCommonsImageBase64 } from '@/lib/providers/commons-provider';
import { rethrowCommonsError } from '../errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const input = z.object({ fileId: z.number().int().positive().safe() });

export const POST = defineRoute({
  name: 'commons-images/select',
  failureMessage: 'Commons request failed.',
  failureStatus: 502,
  input,
  maxBodyBytes: 8192,
  noStore: true,
  handler: async ({ input }) => {
    try {
      return NextResponse.json(await fetchCommonsImageBase64(input.fileId));
    } catch (error) {
      rethrowCommonsError(error);
    }
  },
});
