import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { requireSession, type SessionClaims } from '@/lib/sessionAuth';
import { PublicError } from './public-error';
import { BodyTooLargeError, readBodyText, readBodyForm } from './read-body';

/** Default request body cap when a route does not set its own. */
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
/** Schema issues listed in a 400 message; the rest are dropped to keep it readable. */
const MAX_REPORTED_ISSUES = 5;

type ParseMode = 'json' | 'none' | 'form';

export type RouteContext<Input = unknown, Parse extends ParseMode = ParseMode> = {
  /** The parsed input when the route defines a schema, otherwise the raw body. */
  input: Input;
  body: Record<string, unknown>;
  request: NextRequest;
  session: SessionClaims;
} & (Parse extends 'form' ? { form: FormData } : unknown);

export interface RouteDefinition<Schema extends z.ZodType = z.ZodType<Record<string, unknown>>, Parse extends ParseMode = ParseMode> {
  /** Used in server logs only. */
  name: string;
  /** Fixed client message for unexpected failures; the original error is logged, never returned. */
  failureMessage: string;
  failureStatus?: number;
  /** Skip body reads for routes such as GET health checks. Defaults to JSON parsing. */
  parse?: Parse;
  /** Apply Cache-Control: no-store to every response, including auth and validation failures. */
  noStore?: boolean;
  input?: Schema;
  maxBodyBytes?: number | (() => number);
  /** Extra fields for schema and unexpected-failure bodies, derived from the parsed request body. */
  errorExtra?: (body: Record<string, unknown>) => Record<string, unknown>;
  handler: (context: RouteContext<z.output<Schema>, Parse>) => Promise<NextResponse>;
}

// Paths and zod's messages only; zod messages describe the expected shape, never the received value.
function describeIssues(issues: z.core.$ZodIssue[]): string {
  return issues.slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issue.path.length ? issue.path.join('.') : 'body'}: ${issue.message}`)
    .join('; ');
}

export function defineRoute<Schema extends z.ZodType = z.ZodType<Record<string, unknown>>, Parse extends ParseMode = 'json'>({
  name, failureMessage, failureStatus = 500, parse, noStore = false,
  input, maxBodyBytes = DEFAULT_MAX_BODY_BYTES, errorExtra, handler,
}: RouteDefinition<Schema, Parse>) {
  const respond = (response: NextResponse): NextResponse => {
    if (noStore) response.headers.set('Cache-Control', 'no-store');
    return response;
  };

  return async function route(request: NextRequest): Promise<NextResponse> {
    // Auth runs before the body is read so unauthenticated callers cannot make us parse anything.
    const auth = requireSession(request);
    if (!auth.ok) return respond(auth.response);

    const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if (mutating && request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      return respond(NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403 }));
    }
    const parsing = parse ?? 'json';
    if (mutating && parsing === 'json' &&
        request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      return respond(NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 }));
    }

    let body: Record<string, unknown> = {};
    try {
      let form: FormData | undefined;
      if (parsing !== 'none') {
        // Resolve configuration after auth, outside the malformed-body catch.
        const limit = typeof maxBodyBytes === 'function' ? maxBodyBytes() : maxBodyBytes;
        try {
          if (parsing === 'form') {
            form = await readBodyForm(request, limit);
          } else {
            body = (JSON.parse(await readBodyText(request, limit)) as Record<string, unknown>) || {};
          }
        } catch (err) {
          if (err instanceof BodyTooLargeError) {
            return respond(NextResponse.json({ error: 'Request body exceeds the size limit.' }, { status: 413 }));
          }
          const error = parsing === 'form' ? 'Invalid form data payload.' : 'Invalid JSON request body.';
          return respond(NextResponse.json({ error }, { status: 400 }));
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

      // The parse mode guarantees a form context only after successful form parsing.
      const context = { input: parsed, body, request, session: auth.claims, ...(form ? { form } : {}) } as RouteContext<z.output<Schema>, Parse>;
      return respond(await handler(context));
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
