import { NextRequest, NextResponse } from 'next/server';
import { requireSession, type SessionClaims } from '@/lib/sessionAuth';
import { PublicError } from './public-error';

export interface RouteContext {
  body: Record<string, unknown>;
  request: NextRequest;
  session: SessionClaims;
}

export interface RouteDefinition {
  /** Used in server logs only. */
  name: string;
  /** Fixed client message for unexpected failures; the original error is logged, never returned. */
  failureMessage: string;
  /** Extra fields for the 500 body, derived from the parsed request body. */
  errorExtra?: (body: Record<string, unknown>) => Record<string, unknown>;
  handler: (context: RouteContext) => Promise<NextResponse>;
}

export function defineRoute({ name, failureMessage, errorExtra, handler }: RouteDefinition) {
  return async function route(request: NextRequest): Promise<NextResponse> {
    // Auth runs before the body is read so unauthenticated callers cannot make us parse anything.
    const auth = requireSession(request);
    if (!auth.ok) return auth.response;

    let body: Record<string, unknown>;
    try {
      body = ((await request.json()) as Record<string, unknown>) || {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    try {
      return await handler({ body, request, session: auth.claims });
    } catch (err) {
      if (err instanceof PublicError) {
        return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status, headers: err.headers });
      }
      // The request body may contain document text, so only the error is logged.
      console.error(`[${name}]`, err);
      return NextResponse.json({ error: failureMessage, ...errorExtra?.(body) }, { status: 500 });
    }
  };
}
