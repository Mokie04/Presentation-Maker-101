import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { requireSession, type SessionClaims } from '@/lib/sessionAuth';
import { PublicError } from './public-error';
import { BodyTooLargeError, readBodyText } from './read-body';

/** Default request body cap when a route does not set its own. */
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
/** Schema issues listed in a 400 message; the rest are dropped to keep it readable. */
const MAX_REPORTED_ISSUES = 5;

export interface RouteContext<Input = unknown> {
  /** The parsed input when the route defines a schema, otherwise the raw body. */
  input: Input;
  body: Record<string, unknown>;
  request: NextRequest;
  session: SessionClaims;
}

export interface RouteDefinition<Schema extends z.ZodType = z.ZodType<Record<string, unknown>>> {
  /** Used in server logs only. */
  name: string;
  /** Fixed client message for unexpected failures; the original error is logged, never returned. */
  failureMessage: string;
  failureStatus?: number;
  /** Skip body reads for routes such as GET health checks. Defaults to JSON parsing. */
  parse?: 'json' | 'none';
  /** Apply Cache-Control: no-store to every response, including auth and validation failures. */
  noStore?: boolean;
  input?: Schema;
  maxBodyBytes?: number;
  /** Extra fields for schema and unexpected-failure bodies, derived from the parsed request body. */
  errorExtra?: (body: Record<string, unknown>) => Record<string, unknown>;
  handler: (context: RouteContext<z.output<Schema>>) => Promise<NextResponse>;
}

// Paths and zod's messages only; zod messages describe the expected shape, never the received value.
function describeIssues(issues: z.core.$ZodIssue[]): string {
  return issues.slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issue.path.length ? issue.path.join('.') : 'body'}: ${issue.message}`)
    .join('; ');
}

export function defineRoute<Schema extends z.ZodType = z.ZodType<Record<string, unknown>>>({
  name, failureMessage, failureStatus = 500, parse = 'json', noStore = false,
  input, maxBodyBytes = DEFAULT_MAX_BODY_BYTES, errorExtra, handler,
}: RouteDefinition<Schema>) {
  const respond = (response: NextResponse): NextResponse => {
    if (noStore) response.headers.set('Cache-Control', 'no-store');
    return response;
  };

  return async function route(request: NextRequest): Promise<NextResponse> {
    // Auth runs before the body is read so unauthenticated callers cannot make us parse anything.
    const auth = requireSession(request);
    if (!auth.ok) return respond(auth.response);

    let body: Record<string, unknown> = {};
    if (parse === 'json') {
      try {
        body = (JSON.parse(await readBodyText(request, maxBodyBytes)) as Record<string, unknown>) || {};
      } catch (err) {
        if (err instanceof BodyTooLargeError) {
          return respond(NextResponse.json({ error: 'Request body exceeds the size limit.' }, { status: 413 }));
        }
        return respond(NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 }));
      }
    }

    let parsed: z.output<Schema> = body as z.output<Schema>;
    if (input) {
      const result = input.safeParse(body);
      if (!result.success) {
        return respond(NextResponse.json(
          { error: `Invalid request: ${describeIssues(result.error.issues)}`, ...errorExtra?.(body) },
          { status: 400 }
        ));
      }
      parsed = result.data;
    }

    try {
      return respond(await handler({ input: parsed, body, request, session: auth.claims }));
    } catch (err) {
      if (err instanceof PublicError) {
        return respond(NextResponse.json({ error: err.message, ...err.extra }, { status: err.status, headers: err.headers }));
      }
      // The request body may contain document text, so only the error is logged.
      console.error(`[${name}]`, err);
      return respond(NextResponse.json({ error: failureMessage, ...errorExtra?.(body) }, { status: failureStatus }));
    }
  };
}
