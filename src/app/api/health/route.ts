import { NextRequest, NextResponse } from 'next/server';
import { checkHealth } from '@/lib/health';
import { requireSession } from '@/lib/sessionAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const health = await checkHealth();
  return NextResponse.json(health, { status: 200 });
}
