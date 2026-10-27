import { NextResponse } from 'next/server';
import { defineRoute } from '@/lib/api';
import { checkHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const GET = defineRoute({
  name: 'health',
  noStore: true,
  failureMessage: 'Health check failed.',
  parse: 'none',
  handler: async () => {
    const { textProvider, imageProvider, errors: details } = await checkHealth();
    for (const detail of details ?? []) console.error('[health]', detail);
    const errors: string[] = [];
    if (textProvider === 'error') errors.push('Text provider check failed.');
    if (imageProvider === 'error') errors.push('Image provider check failed.');
    return NextResponse.json({ textProvider, imageProvider, ...(errors.length ? { errors } : {}) });
  },
});
