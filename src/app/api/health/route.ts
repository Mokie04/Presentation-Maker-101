import { NextResponse } from 'next/server';
import { checkHealth, type HealthCheckResponse } from '@/lib/health';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const health = await checkHealth();
  return NextResponse.json(health, { status: 200 });
}
