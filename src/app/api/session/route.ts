import { NextRequest, NextResponse } from 'next/server';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  consumeHandoffJti,
  createSessionToken,
  getAppStoreAuthConfig,
  verifyHandoffToken,
  verifySessionToken,
  type AppStoreAuthConfig,
  type HandoffClaims,
  type SessionClaims,
  SESSION_COOKIE_NAME,
} from '@/lib/sessionAuth';

export const dynamic = 'force-dynamic';

function applyNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  cookie?: string
): NextResponse {
  const response = applyNoStoreHeaders(NextResponse.json(body, { status }));
  if (cookie) response.headers.set('Set-Cookie', cookie);
  return response;
}

function safeIdentity(claims: Pick<SessionClaims, 'sub' | 'email' | 'name' | 'role'>) {
  return {
    sub: claims.sub,
    ...(claims.email ? { email: claims.email } : {}),
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.role ? { role: claims.role } : {}),
  };
}

function unauthorized(config: AppStoreAuthConfig, clearCookie: boolean): NextResponse {
  return jsonResponse(
    {
      authenticated: false,
      error: 'Authentication required.',
    },
    401,
    clearCookie ? buildClearSessionCookie(config) : undefined
  );
}

function configurationFailure(): NextResponse {
  return jsonResponse(
    {
      authenticated: false,
      error: 'Authentication service unavailable.',
    },
    500
  );
}

function activatedResponse(
  claims: HandoffClaims,
  config: AppStoreAuthConfig,
  nowSeconds: number
): NextResponse {
  const sessionToken = createSessionToken(
    {
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      role: claims.role,
    },
    config,
    nowSeconds
  );
  const sessionClaims = verifySessionToken(sessionToken, config, nowSeconds);
  if (!sessionClaims) return configurationFailure();

  return jsonResponse(
    {
      authenticated: true,
      activated: true,
      user: safeIdentity(sessionClaims),
      expiresAt: sessionClaims.exp,
    },
    200,
    buildSessionCookie(sessionToken, config)
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  let config: AppStoreAuthConfig;
  try {
    config = getAppStoreAuthConfig();
  } catch {
    return configurationFailure();
  }

  if (!config.enabled) {
    return jsonResponse({
      authenticated: true,
      mode: 'disabled',
      user: { sub: 'dev-bypass' },
    }, 200);
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const access = request.nextUrl.searchParams.get('access')?.trim() || '';
  if (access) {
    const handoffClaims = verifyHandoffToken(access, config, nowSeconds);
    if (!handoffClaims || !consumeHandoffJti(handoffClaims.jti, handoffClaims.exp, nowSeconds)) {
      return unauthorized(config, true);
    }

    return activatedResponse(handoffClaims, config, nowSeconds);
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return unauthorized(config, false);

  const sessionClaims = verifySessionToken(sessionToken, config, nowSeconds);
  if (!sessionClaims) return unauthorized(config, true);

  return jsonResponse(
    {
      authenticated: true,
      user: safeIdentity(sessionClaims),
      expiresAt: sessionClaims.exp,
    },
    200
  );
}
